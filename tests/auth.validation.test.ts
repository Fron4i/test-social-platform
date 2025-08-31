import request from 'supertest';
import app from '../src/app';

describe('Тесты авторизации API', () => {
  describe('POST /auth/register', () => {
    it('должен отклонить регистрацию с пустыми полями', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Заполните все поля');
    });

    it('должен отклонить короткий пароль', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Пароль должен быть минимум 6 символов');
    });

    it('должен отклонить регистрацию с отсутствующими полями', async () => {
      const userData = {
        username: 'testuser',
        password: 'password123'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Заполните все поля');
    });
  });

  describe('POST /auth/login', () => {
    it('должен отклонить вход с пустыми полями', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Введите логин и пароль');
    });

    it('должен отклонить вход без пароля', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'testuser' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Введите логин и пароль');
    });

    it('должен отклонить вход без имени пользователя', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Введите логин и пароль');
    });
  });

  describe('GET /auth/profile', () => {
    it('должен отклонить запрос без токена', async () => {
      const response = await request(app)
        .get('/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Токен отсутствует');
    });

    it('должен отклонить неверный токен', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalidtoken');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Неверный токен');
    });

    it('должен отклонить токен без Bearer префикса', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'sometoken');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Неверный токен');
    });

    it('должен отклонить пустой заголовок Authorization', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', '');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Токен отсутствует');
    });
  });

  describe('Несуществующие маршруты', () => {
    it('должен возвращать 404 для POST /auth/unknown', async () => {
      const response = await request(app)
        .post('/auth/unknown')
        .send({});

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Не найдено');
    });

    it('должен возвращать 404 для GET /auth/unknown', async () => {
      const response = await request(app)
        .get('/auth/unknown');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Не найдено');
    });
  });
});