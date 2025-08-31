import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { DataSource } from 'typeorm';
import { User } from '../entities/User';

interface AuthRequest extends Request {
  user?: User;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Токен отсутствует' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string };
    
    const dataSource: DataSource = req.app.get('dataSource');
    const userRepo = dataSource.getRepository(User);
    const user = await userRepo.findOne({ 
      where: { id: decoded.id },
      select: ['id', 'username', 'email', 'createdAt']
    });

    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Неверный токен' });
  }
};