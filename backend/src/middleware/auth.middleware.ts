import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'Brak tokenu autoryzacyjnego' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: number; email: string; role: string };
    
    // Zabezpieczenie: sprawdzenie czy użytkownik wciąż istnieje i jest aktywny
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.id)
    });

    if (!user || !user.isActive) {
      res.status(401).json({ message: 'Konto nieaktywne lub usunięte' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: 'Token wygasł', expired: true });
      return;
    }
    res.status(401).json({ message: 'Nieprawidłowy token' });
  }
};
