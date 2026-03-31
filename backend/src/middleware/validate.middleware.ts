import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: 'Błąd walidacji danych',
          errors: (error as any).errors.map((e: any) => ({ path: e.path.join('.'), message: e.message }))
        });
        return;
      }
      res.status(400).json({ message: 'Przekazano nieprawidłowe dane' });
    }
  };
};
