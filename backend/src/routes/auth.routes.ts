import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Zaloguj użytkownika
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Brak emaila lub hasła' });

  const user = await db.query.users.findFirst({
    where: eq(users.email, email)
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'Nieprawidłowe dane docelowe lub konto nieaktywne' });
  }

  const validPass = await bcrypt.compare(password, user.password);
  if (!validPass) {
    return res.status(401).json({ message: 'Nieprawidłowe dane docelowe' });
  }

  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any }
  );

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dni
  });

  res.json({
    accessToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  });
});

// Wyloguj użytkownika
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Wylogowano pomyślnie' });
});

// Odśwież token
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ message: 'Brak refreshToken' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as { id: number };
    const user = await db.query.users.findFirst({ where: eq(users.id, decoded.id) });

    if (!user || !user.isActive) return res.status(401).json({ message: 'Brak dostępu' });

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any }
    );
    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ message: 'Nieprawidłowy lub wygasły refreshToken' });
  }
});

// Zmiana hasła użytkownika
router.put('/password', authMiddleware, async (req: any, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ message: 'Wypełnij oba pola' });

  try {
    const user = await db.query.users.findFirst({ where: eq(users.id, req.user.id) });
    if (!user) return res.status(404).json({ message: 'Użytkownik nie istnieje' });

    const isValid = await bcrypt.compare(oldPassword, user.password);
    if (!isValid) return res.status(400).json({ message: 'Obecne hasło jest nieprawidłowe' });

    const hashedNew = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password: hashedNew }).where(eq(users.id, req.user.id));
    
    res.json({ message: 'Hasło zostało zmienione' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Odczytaj profil (current user)
router.get('/me', authMiddleware, async (req: any, res) => {
  const user = await db.query.users.findFirst({ where: eq(users.id, req.user.id) });
  if (!user) return res.status(404).json({ message: 'Użytkownik nie istnieje' });
  
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

export default router;
