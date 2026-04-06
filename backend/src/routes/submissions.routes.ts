import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { submissions, tasks } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { io } from '../index';
const sevenBin = require('7zip-bin');
const sevenZipPath = path.resolve(sevenBin.path7za || sevenBin.path || sevenBin);
const { list, extractFull } = require('node-7z');

const router = Router();

// Konfiguracja multer dla ZIPów
const storage = multer.diskStorage({
  destination: (req: any, file, cb) => {
    const userId = req.user.id;
    const taskId = req.query.taskId || req.body.taskId;
    const relativeDir = path.join('uploads', 'submissions', String(userId), String(taskId || 'unknown'));
    const uploadDir = path.join(process.cwd(), relativeDir);
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err: any) {
      cb(err, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

const saveSubmission = async (req: any, type: string, codeContent: string, language: string) => {
  const { taskId } = req.body;
  const task = await db.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
  if (!task) throw new Error('Nie znaleziono zadania');
  if (new Date(task.deadline) < new Date() && req.user.role !== 'admin') {
    throw new Error('Termin oddania zadania już minął.');
  }

  // Sprawdzamy KAŻDĄ istniejącą submisję dla tego zadania i użytkownika (niezależnie od typu)
  const existing = await db.query.submissions.findFirst({
    where: (s, { and }) => and(eq(s.taskId, taskId), eq(s.userId, req.user.id))
  });

  // Blokada edycji — sprawdzana PRZED próbą zapisu, niezależnie od typu submisji
  if (existing && req.user.role !== 'admin') {
    if (existing.canEdit === false) {
      throw new Error('Zadanie zostało zablokowane do edycji przez administratora.');
    }
    if (existing.grade !== null) {
      throw new Error('Zadanie zostało już ocenione i nie można go modyfikować.');
    }
  }

  let submission;
  if (existing) {
    [submission] = await db.update(submissions).set({
      type, codeContent, language, updatedAt: new Date(), grade: null, feedback: null, gradedAt: null, status: 'pending'
    }).where(eq(submissions.id, existing.id)).returning();
  } else {
    [submission] = await db.insert(submissions).values({
      taskId, userId: req.user.id, type, codeContent, language
    }).returning();
  }
  if (task.createdBy) {
    io.to(`admin_${task.createdBy}`).emit('newSubmission', { submission, user: req.user });
  }
  return submission;
};

router.post('/code', authMiddleware, async (req: any, res) => {
  const { codeContent, language } = req.body;
  try {
    const submission = await saveSubmission(req, 'code', codeContent, language);
    res.status(200).json(submission);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/zip', authMiddleware, (req: any, res: any) => {
  upload.single('file')(req, res, async (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Plik za duży (max 100MB)' });
      return res.status(400).json({ error: `Błąd Multer: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: `Błąd serwera: ${err.message}` });
    }
    if (!req.file) return res.status(400).json({ error: 'Brak pliku w żądaniu' });
    try {
      const taskId = req.query.taskId || req.body.taskId;
      if (!taskId) return res.status(400).json({ error: 'Brak taskId w żądaniu' });
      const fullPath = req.file.path.replace(/\\/g, '/');
      const cwd = process.cwd().replace(/\\/g, '/');
      const relativePath = fullPath.replace(cwd, '').replace(/^\//, '');
      const extension = path.extname(req.file.originalname).replace('.', '').toLowerCase();
      req.body.taskId = Number(taskId);
      const submission = await saveSubmission(req, 'zip', `[ZIP_FILE] ${relativePath}`, extension);
      res.status(200).json(submission);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
});

// Eksplorator archiwum (ZIP, RAR, 7Z)
router.get('/:id/explore', authMiddleware, requireAdmin, async (req: any, res: any) => {
  try {
    const sub = await db.query.submissions.findFirst({ where: eq(submissions.id, Number(req.params.id)) });
    if (!sub || sub.type !== 'zip' || !sub.codeContent) return res.status(404).json({ error: 'Nie znaleziono archiwum' });

    const relativePath = sub.codeContent.replace('[ZIP_FILE] ', '').trim();
    const filePath = path.join(process.cwd(), relativePath);

    console.log(`[Archive Explorer] Attempting to list contents of: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.error(`[Archive Explorer] File does not exist: ${filePath}`);
      return res.status(404).json({ error: 'Plik fizycznie nie istnieje na serwerze' });
    }

    const files: string[] = [];
    console.log(`[7z DEBUG] Using binary at: ${sevenZipPath}`);
    const stream = list(filePath, { $bin: sevenZipPath });

    stream.on('data', (data: any) => {
      // Próbujemy wyciągnąć ścieżkę z różnych możliwych pól w zależności od wersji node-7z
      const p = data.path || data.file || data.name || (typeof data === 'string' ? data : null);

      if (p) {
        const isDir = data.method === 'Directory' || p.endsWith('/') || p.endsWith('\\') || data.attributes?.includes('D');
        if (!isDir) files.push(p);
      }
    });

    stream.on('end', () => {
      console.log(`[Archive Explorer] Final file list:`, files);
      if (!res.headersSent) res.json({ files });
    });

    stream.on('error', (err: any) => {
      console.error('[Archive Explorer] 7z Error:', err.message);
      if (!res.headersSent) res.status(500).json({ error: `Błąd 7z: ${err.message}` });
    });
  } catch (e: any) {
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

// Podgląd konkretnego pliku z wnętrza archiwum
router.get('/:id/file-content', authMiddleware, requireAdmin, async (req: any, res: any) => {
  try {
    const { fileInside } = req.query;
    const sub = await db.query.submissions.findFirst({ where: eq(submissions.id, Number(req.params.id)) });
    if (!sub || !sub.codeContent) return res.status(404).json({ error: 'Nie znaleziono' });

    const archivePath = path.join(process.cwd(), sub.codeContent.replace('[ZIP_FILE] ', ''));
    const tmpDir = path.join(process.cwd(), 'tmp', 'extract', String(sub.id), String(Date.now()));

    fs.mkdirSync(tmpDir, { recursive: true });

    const stream = extractFull(archivePath, tmpDir, {
      $bin: sevenZipPath,
      $files: [fileInside as string]
    });

    stream.on('end', () => {
      const extractedFilePath = path.join(tmpDir, fileInside as string);
      if (fs.existsSync(extractedFilePath)) {
        try {
          const content = fs.readFileSync(extractedFilePath, 'utf-8');
          if (!res.headersSent) res.json({ content });
        } catch (readErr: any) {
          if (!res.headersSent) res.status(500).json({ error: 'Plik binarny lub nieczytelny' });
        }
      } else {
        if (!res.headersSent) res.status(404).json({ error: 'Nie udało się wypakować pliku' });
      }
      // Cleanup tmp?
    });

    stream.on('error', (err: any) => {
      console.error('7z Extract Error:', err);
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });
  } catch (e: any) {
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

router.put('/:id/grade', authMiddleware, requireAdmin, async (req: any, res: any) => {
  const { id } = req.params;
  const { grade, feedback, canEdit } = req.body;
  try {
    const [sub] = await db.update(submissions).set({
      grade, feedback, canEdit: canEdit ?? false, gradedAt: new Date(), status: 'graded'
    }).where(eq(submissions.id, Number(id))).returning();
    if (!sub) return res.status(404).json({ message: 'Nie znaleziono' });
    io.to(`user_${sub.userId}`).emit('newGrade', { submissionId: sub.id, grade });
    res.status(200).json(sub);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/reject', authMiddleware, requireAdmin, async (req: any, res: any) => {
  const { id } = req.params;
  const { feedback } = req.body;
  try {
    const [sub] = await db.update(submissions).set({
      status: 'rejected', grade: null, feedback, canEdit: true, gradedAt: null
    }).where(eq(submissions.id, Number(id))).returning();
    if (!sub) return res.status(404).json({ message: 'Nie znaleziono' });
    io.to(`user_${sub.userId}`).emit('submissionRejected', { submissionId: sub.id, feedback });
    res.status(200).json(sub);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// [Admin] Usuń submisję (i plik fizyczny)
router.delete('/:id', authMiddleware, requireAdmin, async (req: any, res) => {
  try {
    const sub = await db.query.submissions.findFirst({
      where: eq(submissions.id, Number(req.params.id))
    });
    if (!sub) return res.status(404).json({ message: 'Nie znaleziono' });

    if (sub.type === 'zip' && sub.codeContent) {
      const fs = require('fs');
      const relativePath = sub.codeContent.replace('[ZIP_FILE] ', '').trim();
      const fullPath = path.resolve(process.cwd(), relativePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    await db.delete(submissions).where(eq(submissions.id, sub.id));
    res.json({ success: true, message: 'Submisja usunięta.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
