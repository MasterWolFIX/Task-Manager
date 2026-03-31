import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { classes, classUser, users, settings } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

// Zabezpieczenie wszystkich endpointów w tym routerze
router.use(authMiddleware, requireAdmin);

// Pobierz wszystkie klasy
router.get('/', async (req, res) => {
  try {
    const allClasses = await db.query.classes.findMany({
      with: { classUsers: { with: { user: true } } }
    });
    res.json(allClasses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Stwórz nową klasę
router.post('/', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Nazwa klasy jest wymagana' });

  try {
    const [newClass] = await db.insert(classes).values({ name, description }).returning();
    res.status(201).json(newClass);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Usuń klasę
router.delete('/:id', async (req, res) => {
  try {
    await db.delete(classes).where(eq(classes.id, Number(req.params.id)));
    res.json({ message: 'Klasa usunięta' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Pobierz wszystkich uczniów (niezależnie od klasy, by admin mógł zarządzać)
router.get('/users', async (req, res) => {
  try {
    const allUsers = await db.query.users.findMany({
      columns: { password: false } // Zwracamy wszystkich bez hasła
    });
    res.json(allUsers);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Stwórz nowego ucznia
router.post('/users', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'Imię i email są wymagane' });
    
    try {
        let actualPassword = password;
        if (!actualPassword) {
            const defaultPassSetting = await db.query.settings.findFirst({
                where: eq(settings.key, 'default_student_password')
            });
            actualPassword = defaultPassSetting?.value || 'uczen123';
        }

        const hashedPassword = await bcrypt.hash(actualPassword, 10);
        const [newUser] = await db.insert(users).values({
            name, email, password: hashedPassword, role: 'student', isActive: true
        }).returning({ id: users.id, name: users.name, email: users.email });
        
        res.status(201).json(newUser);
    } catch (err: any) {
        res.status(400).json({ error: 'Użytkownik o tym emailu już istnieje lub błąd BD.' });
    }
});

// Zarządzaj przypisaniem ucznia do klasy (Max jedna klasa na ucznia!)
router.post('/:classId/assign', async (req, res) => {
  const { userId } = req.body;
  const classId = Number(req.params.classId);

  try {
    // 1. Usuń go z każdej innej klasy (wymuszenie relacji 1:N)
    await db.delete(classUser).where(eq(classUser.userId, userId));
    
    // 2. Przypisz do nowej
    const [assignment] = await db.insert(classUser).values({ classId, userId }).returning();
    res.json(assignment);
  } catch (err: any) {
    res.status(400).json({ error: 'Błąd przypisania użytkownika.' });
  }
});

router.delete('/:classId/assign/:userId', async (req, res) => {
  const { classId, userId } = req.params;
  try {
    await db.delete(classUser).where(
      and(
        eq(classUser.classId, Number(classId)),
        eq(classUser.userId, Number(userId))
      )
    );
    res.json({ message: 'Usunięto przypisanie' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
