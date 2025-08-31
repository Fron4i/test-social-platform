import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import type { StringValue } from 'ms';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Заполните все поля' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
      }

      const userRepo = AppDataSource.getRepository(User);

      const existingUser = await userRepo.findOne({
        where: [{ username }, { email }]
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Пользователь уже существует' });
      }

      const user = new User();
      user.username = username;
      user.email = email;
      user.password = password;

      await userRepo.save(user);

      const jwtSecret = process.env.JWT_SECRET || 'secret';
      const jwtExpiration = process.env.JWT_EXPIRES_IN || '15m';
      const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: jwtExpiration as StringValue });

      res.status(201).json({
        message: 'Регистрация успешна',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Ошибка регистрации:', error);
      }
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Введите логин и пароль' });
      }

      const userRepo = AppDataSource.getRepository(User);
      
      const user = await userRepo.findOne({
        where: [{ username }, { email: username }],
        select: ['id', 'username', 'email', 'password', 'createdAt']
      });

      if (!user) {
        return res.status(401).json({ error: 'Неверные данные' });
      }

      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Неверные данные' });
      }

      const jwtSecret = process.env.JWT_SECRET || 'secret';
      const jwtExpiration = process.env.JWT_EXPIRES_IN || '15m';
      const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: jwtExpiration as StringValue });

      res.json({
        message: 'Вход успешен',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Ошибка входа:', error);
      }
      return res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
}