import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { submissions, tasks } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { io } from '../index';

const router = Router();

// Konfiguracja multer dla ZIPów
const storage = multer.diskStorage({
  destination: (req: any, file, cb) => {
    const userId = req.user.id;
    // Pobieramy z query, bo body może nie być jeszcze dostępne przy uploadzie pliku
    const taskId = req.query.taskId || req.body.taskId;
    
    // Katalog docelowy: uploads/submissions/{user_id}/{task_id}/
    const relativeDir = path.join('uploads', 'submissions', String(userId), String(taskId || 'unknown'));
    const uploadDir = path.join(process.cwd(), relativeDir);
    
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Wspólna logika zapisywania submissions
const saveSubmission = async (req: any, type: string, codeContent: string, language: string) => {
    const { taskId } = req.body;
    const existing = await db.query.submissions.findFirst({
      where: (s, { and }) => and(eq(s.taskId, taskId), eq(s.userId, req.user.id))
    });

    let submission;
    if (existing) {
      [submission] = await db.update(submissions).set({
        type, codeContent, language, updatedAt: new Date(), grade: null, feedback: null, gradedAt: null
      }).where(eq(submissions.id, existing.id)).returning();
    } else {
      [submission] = await db.insert(submissions).values({
        taskId, userId: req.user.id, type, codeContent, language
      }).returning();
    }

    const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
    if (task && task.createdBy) {
      io.to(`admin_${task.createdBy}`).emit('newSubmission', { submission, user: req.user });
    }
    return submission;
};

// Uczeń: Wyślij/zaktualizuj kod z edytora
router.post('/code', authMiddleware, async (req: any, res) => {
  const { codeContent, language } = req.body;
  
  try {
    const submission = await saveSubmission(req, 'code', codeContent, language);
    res.status(200).json(submission);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Uczeń: Wyślij kod przez ZIP
router.post('/zip', authMiddleware, upload.single('file'), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ message: 'Brak pliku w żądaniu' });
    
    try {
        // Zapisujemy ścieżkę WZGLĘDNĄ względem folderu głównego projektu
        const fullPath = req.file.path.replace(/\\/g, '/');
        const cwd = process.cwd().replace(/\\/g, '/');
        const relativePath = fullPath.replace(cwd, '').replace(/^\//, '');

        const submission = await saveSubmission(req, 'zip', `[ZIP_FILE] ${relativePath}`, 'zip');
        res.status(200).json(submission);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Nauczyciel: Wystaw ocenę
router.put('/:id/grade', authMiddleware, requireAdmin, async (req: any, res) => {
  const { id } = req.params;
  const { grade, feedback } = req.body;

  try {
    const [sub] = await db.update(submissions).set({
      grade,
      feedback,
      gradedAt: new Date()
    }).where(eq(submissions.id, Number(id))).returning();

    if (!sub) return res.status(404).json({ message: 'Nie znaleziono rozwiązania' });

    // Powiadom ucznia
    io.to(`user_${sub.userId}`).emit('newGrade', { submissionId: sub.id, taskId: sub.taskId, grade });

    res.status(200).json(sub);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
