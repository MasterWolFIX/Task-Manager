import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export const requireRole = (role: 'admin' | 'student') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Brak autoryzacji' });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({ message: 'Brak uprawnień do tego zasobu' });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole('admin');
export const requireStudent = requireRole('student');
