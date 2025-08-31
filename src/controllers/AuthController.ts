import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { User } from '../entities/User';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';
import { DataSource } from 'typeorm';

export class AuthController {
  /**
   * @swagger
   * /auth/register:
   *   post:
   *     summary: Регистрация нового пользователя
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - username
   *               - email
   *               - password
   *             properties:
   *               username:
   *                 type: string
   *                 description: Имя пользователя
   *                 example: newuser
   *               email:
   *                 type: string
   *                 format: email
   *                 description: Email пользователя
   *                 example: newuser@example.com
   *               password:
   *                 type: string
   *                 format: password
   *                 description: Пароль пользователя (минимум 6 символов)
   *                 example: securepassword123
   *     responses:
   *       201:
   *         description: Регистрация успешна
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Регистрация успешна
   *                 token:
   *                   type: string
   *                   description: JWT токен для авторизации
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *       400:
   *         description: Неверные входные данные или пользователь уже существует
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: Пользователь уже существует
   *       500:
   *         description: Внутренняя ошибка сервера
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: Внутренняя ошибка сервера
   */
  static async register(req: Request, res: Response) {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Заполните все поля' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
    }

    try {
      const dataSource: DataSource = req.app.get('dataSource');
      const userRepo = dataSource.getRepository(User);

      const existingUser = await userRepo.findOne({ where: [{ username }, { email }] });
      if (existingUser) {
        return res.status(400).json({ error: 'Пользователь уже существует' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User();
      user.username = username;
      user.email = email;
      user.password = hashedPassword;

      await userRepo.save(user);

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

      return res.status(201).json({ message: 'Регистрация успешна', token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (error) {
      console.error('Ошибка при регистрации:', error);
      return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  }

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Авторизация пользователя
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - username
   *               - password
   *             properties:
   *               username:
   *                 type: string
   *                 description: Имя пользователя или email
   *                 example: testuser123
   *               password:
   *                 type: string
   *                 format: password
   *                 description: Пароль пользователя
   *                 example: securepassword
   *     responses:
   *       200:
   *         description: Вход успешен
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Вход успешен
   *                 token:
   *                   type: string
   *                   description: JWT токен для авторизации
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *       400:
   *         description: Неверные входные данные
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: Введите логин и пароль
   *       401:
   *         description: Неверные учетные данные
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: Неверные данные
   *       500:
   *         description: Внутренняя ошибка сервера
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: Внутренняя ошибка сервера
   */
  static async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      const dataSource: DataSource = req.app.get('dataSource');

      if (!username || !password) {
        return res.status(400).json({ error: 'Введите логин и пароль' });
      }

      const userRepo = dataSource.getRepository(User);
      
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

  /**
   * @swagger
   * /auth/profile:
   *   get:
   *     summary: Получение профиля текущего пользователя
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Профиль пользователя успешно получен
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: Профиль пользователя
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *       401:
   *         description: Неавторизованный доступ
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: Токен отсутствует
   *       404:
   *         description: Пользователь не найден
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: Пользователь не найден
   *       500:
   *         description: Внутренняя ошибка сервера
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: Внутренняя ошибка сервера
   */
  static async getProfile(req: any, res: Response) {
}
}