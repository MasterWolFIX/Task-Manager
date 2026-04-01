import { Router } from 'express';
import { db } from '../db';
import { tasks, taskAssignments, users, classUser } from '../db/schema';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { eq, desc } from 'drizzle-orm';
import { io } from '../index';

const router = Router();

// [Wszyscy] Pobierz moje zadania
router.get('/', authMiddleware, async (req: any, res) => {
  try {
    if (req.user.role === 'admin') {
      const allTasks = await db.query.tasks.findMany({
        orderBy: [desc(tasks.createdAt)],
        with: {
            author: { columns: { name: true, email: true } },
            submissions: { columns: { id: true, type: true } }
        }
      });
      return res.json(allTasks);
    } 

    // Uczeń pobiera zadania
    const myAssignments = await db.query.taskAssignments.findMany({
      where: eq(taskAssignments.userId, req.user.id),
      with: { task: true }
    });

    res.json(myAssignments.map(a => a.task));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// [Admin] Stwórz zadanie
router.post('/', authMiddleware, requireAdmin, async (req: any, res) => {
  const { title, description, language, deadline, starterFilePath, assignedUserIds, assignedClassIds, submissionType } = req.body;

  try {
    const [newTask] = await db.insert(tasks).values({
      title,
      description,
      language,
      deadline: new Date(deadline),
      submissionType: submissionType || 'both',
      starterFilePath,
      createdBy: req.user.id
    }).returning();

    const usersToAssign = new Set<number>(assignedUserIds || []);

    // Pobierz użytkowników z przypisanych klas
    if (assignedClassIds && assignedClassIds.length > 0) {
        for (const cid of assignedClassIds) {
            const classMembers = await db.query.classUser.findMany({ where: eq(classUser.classId, cid) });
            classMembers.forEach(m => usersToAssign.add(m.userId));
        }
    }

    // Automatyczne przypisania do ucznia
    if (usersToAssign.size > 0) {
      for (const uid of usersToAssign) {
        await db.insert(taskAssignments).values({ taskId: newTask.id, userId: uid });
        io.to(`user_${uid}`).emit('newTask', newTask);
      }
    }
    
    res.status(201).json(newTask);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// [Admin] Edycja zadania
router.put('/:id', authMiddleware, requireAdmin, async (req: any, res) => {
    const { title, description, language, deadline, assignedUserIds, submissionType } = req.body;
    const taskId = Number(req.params.id);
    try {
        const [updated] = await db.update(tasks)
            .set({ title, description, language, deadline: new Date(deadline), submissionType: submissionType || 'both', updatedAt: new Date() })
            .where(eq(tasks.id, taskId)).returning();
        
        if (!updated) return res.status(404).json({ message: 'Nie znaleziono' });

        // Aktualizacja przypisań jeśli zostały przesłane
        if (assignedUserIds) {
            // Najpierw usuwamy stare
            await db.delete(taskAssignments).where(eq(taskAssignments.taskId, taskId));
            
            // Dodajemy nowe
            if (assignedUserIds.length > 0) {
                for (const uid of assignedUserIds) {
                    await db.insert(taskAssignments).values({ taskId, userId: uid });
                }
            }
        }

        res.json(updated);
    } catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

// [Admin] Usunięcie zadania
router.delete('/:id', authMiddleware, requireAdmin, async (req: any, res) => {
    try {
        await db.delete(tasks).where(eq(tasks.id, Number(req.params.id)));
        res.json({ message: 'Usunięto' });
    } catch(err: any) {
        res.status(400).json({ error: err.message });
    }
});

// [Admin] Pobierz ogólne statystyki systemu
router.get('/stats/dashboard', authMiddleware, requireAdmin, async (req: any, res) => {
  try {
    const totalUsers = await db.query.users.findMany({ columns: { id: true } });
    const totalTasks = await db.query.tasks.findMany({ columns: { id: true } });
    const totalSubs = await db.query.submissions.findMany({ 
      where: (s, { isNull }) => isNull(s.grade) // Wszystkie nieocenione
    });

    res.json({
      activeStudents: totalUsers.length,
      tasksCount: totalTasks.length,
      ungradedSubmissions: totalSubs.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// [Admin/Uczeń] Pobierz pojedyncze zadanie z rozwiązaniami (jeśli admin)
router.get('/:id', authMiddleware, async (req: any, res) => {
  try {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, Number(req.params.id)),
      with: {
        submissions: req.user.role === 'admin' ? { 
            with: { 
                user: { 
                    columns: { name: true, email: true },
                    with: { classUsers: { with: { class: true } } }
                } 
            } 
        } : {
            where: (s, { eq }) => eq(s.userId, Number(req.user.id))
        },
        assignments: { with: { user: { columns: { name: true, email: true } } } }
      }
    });

    if (!task) return res.status(404).json({ message: 'Zadanie nie istnieje' });

    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
