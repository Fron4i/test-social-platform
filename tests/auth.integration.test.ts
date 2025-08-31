import request from 'supertest'
import app from '../src/app'
import { AppDataSource } from '../src/config/database'
import { User } from '../src/entities/User'

describe('Интеграционные тесты API авторизации', () => {
	let isConnected = false

	beforeAll(async () => {
		try {
			if (!AppDataSource.isInitialized) {
				await AppDataSource.initialize()
			}
			isConnected = true
			console.log('БД подключена для интеграционных тестов')
		} catch (error) {
			console.log('БД недоступна, пропускаем интеграционные тесты')
			isConnected = false
		}
	})

	afterAll(async () => {
		if (isConnected && AppDataSource.isInitialized) {
			await AppDataSource.destroy()
		}
	})

	beforeEach(async () => {
		if (isConnected) {
			// Очищаем таблицу пользователей перед каждым тестом
			const userRepo = AppDataSource.getRepository(User)
			await userRepo.query('SET FOREIGN_KEY_CHECKS = 0')
			await userRepo.clear()
			await userRepo.query('SET FOREIGN_KEY_CHECKS = 1')
		}
	})

	describe('Полный цикл регистрации и авторизации', () => {
		it('должен успешно зарегистрировать пользователя', async () => {
			if (!isConnected) {
				console.log('Пропускаем тест - БД недоступна')
				return
			}

			const userData = {
				username: 'testuser123',
				email: 'test123@example.com',
				password: 'securepassword',
			}

			const response = await request(app).post('/auth/register').send(userData)

			expect(response.status).toBe(201)
			expect(response.body.message).toBe('Регистрация успешна')
			expect(response.body.token).toBeDefined()
			expect(response.body.token).toMatch(
				/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/
			)
			expect(response.body.user).toBeDefined()
			expect(response.body.user.id).toBeDefined()
			expect(response.body.user.username).toBe(userData.username)
			expect(response.body.user.email).toBe(userData.email)
			expect(response.body.user.password).toBeUndefined()
			expect(response.body.user.createdAt).toBeDefined()

			// Проверяем что пользователь действительно сохранился в БД
			const userRepo = AppDataSource.getRepository(User)
			const savedUser = await userRepo.findOne({
				where: { username: userData.username },
			})
			expect(savedUser).toBeTruthy()
			expect(savedUser?.email).toBe(userData.email)
			expect(savedUser?.username).toBe(userData.username)
		})

		it('должен успешно авторизовать существующего пользователя', async () => {
			if (!isConnected) {
				console.log('Пропускаем тест - БД недоступна')
				return
			}

			// Сначала регистрируем пользователя
			const userData = {
				username: 'logintest',
				email: 'logintest@example.com',
				password: 'mypassword123',
			}

			await request(app).post('/auth/register').send(userData)

			// Теперь пробуем войти
			const loginResponse = await request(app).post('/auth/login').send({
				username: userData.username,
				password: userData.password,
			})

			expect(loginResponse.status).toBe(200)
			expect(loginResponse.body.message).toBe('Вход успешен')
			expect(loginResponse.body.token).toBeDefined()
			expect(loginResponse.body.token).toMatch(
				/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/
			)
			expect(loginResponse.body.user.username).toBe(userData.username)
			expect(loginResponse.body.user.email).toBe(userData.email)
			expect(loginResponse.body.user.password).toBeUndefined()
		})

		it('должен успешно авторизовать пользователя по email', async () => {
			if (!isConnected) {
				console.log('Пропускаем тест - БД недоступна')
				return
			}

			const userData = {
				username: 'emailtest',
				email: 'emailtest@example.com',
				password: 'password456',
			}

			await request(app).post('/auth/register').send(userData)

			// Входим используя email вместо username
			const loginResponse = await request(app).post('/auth/login').send({
				username: userData.email, // используем email как username
				password: userData.password,
			})

			expect(loginResponse.status).toBe(200)
			expect(loginResponse.body.message).toBe('Вход успешен')
			expect(loginResponse.body.user.email).toBe(userData.email)
		})

		it('должен получить профиль авторизованного пользователя', async () => {
			if (!isConnected) {
				console.log('Пропускаем тест - БД недоступна')
				return
			}

			const userData = {
				username: 'profiletest',
				email: 'profiletest@example.com',
				password: 'profilepass123',
			}

			// Регистрируемся и получаем токен
			const registerResponse = await request(app)
				.post('/auth/register')
				.send(userData)

			const token = registerResponse.body.token

			// Получаем профиль с токеном
			const profileResponse = await request(app)
				.get('/auth/profile')
				.set('Authorization', `Bearer ${token}`)

			expect(profileResponse.status).toBe(200)
			expect(profileResponse.body.message).toBe('Профиль пользователя')
			expect(profileResponse.body.user).toBeDefined()
			expect(profileResponse.body.user.id).toBeDefined()
			expect(profileResponse.body.user.username).toBe(userData.username)
			expect(profileResponse.body.user.email).toBe(userData.email)
			expect(profileResponse.body.user.password).toBeUndefined()
			expect(profileResponse.body.user.createdAt).toBeDefined()
		})
	})

	describe('Тесты дублирования данных', () => {
		it('должен отклонить дублирующий username', async () => {
			if (!isConnected) {
				console.log('Пропускаем тест - БД недоступна')
				return
			}

			const userData = {
				username: 'duplicate_user',
				email: 'first@example.com',
				password: 'password123',
			}

			// Первая регистрация должна пройти успешно
			const firstResponse = await request(app)
				.post('/auth/register')
				.send(userData)

			expect(firstResponse.status).toBe(201)

			// Вторая регистрация с тем же username должна быть отклонена
			const secondResponse = await request(app)
				.post('/auth/register')
				.send({
					...userData,
					email: 'second@example.com', // другой email
				})

			expect(secondResponse.status).toBe(400)
			expect(secondResponse.body.error).toBe('Пользователь уже существует')
		})

		it('должен отклонить дублирующий email', async () => {
			if (!isConnected) {
				console.log('Пропускаем тест - БД недоступна')
				return
			}

			const userData = {
				username: 'first_user',
				email: 'duplicate@example.com',
				password: 'password123',
			}

			// Первая регистрация должна пройти успешно
			await request(app).post('/auth/register').send(userData)

			// Вторая регистрация с тем же email должна быть отклонена
			const secondResponse = await request(app)
				.post('/auth/register')
				.send({
					...userData,
					username: 'second_user', // другой username
				})

			expect(secondResponse.status).toBe(400)
			expect(secondResponse.body.error).toBe('Пользователь уже существует')
		})
	})

	describe('Тесты безопасности паролей', () => {
		it('должен корректно хэшировать пароли в базе данных', async () => {
			if (!isConnected) {
				console.log('Пропускаем тест - БД недоступна')
				return
			}

			const userData = {
				username: 'hashtest',
				email: 'hashtest@example.com',
				password: 'plainpassword123',
			}

			await request(app).post('/auth/register').send(userData)

			// Проверяем что в БД пароль хэширован
			const userRepo = AppDataSource.getRepository(User)
			const savedUser = await userRepo.findOne({
				where: { username: userData.username },
				select: ['id', 'username', 'password'], // явно запрашиваем пароль
			})

			expect(savedUser).toBeTruthy()
			expect(savedUser?.password).not.toBe(userData.password) // пароль должен быть хэширован
			expect(savedUser?.password).toMatch(/^\$2b\$/) // bcrypt hash format
		})

		it('должен корректно проверять пароли при входе', async () => {
			if (!isConnected) {
				console.log('Пропускаем тест - БД недоступна')
				return
			}

			const userData = {
				username: 'passcheck',
				email: 'passcheck@example.com',
				password: 'correctpassword',
			}

			await request(app).post('/auth/register').send(userData)

			// Правильный пароль должен работать
			const correctLogin = await request(app).post('/auth/login').send({
				username: userData.username,
				password: userData.password,
			})

			expect(correctLogin.status).toBe(200)

			// Неправильный пароль должен быть отклонен
			const wrongLogin = await request(app).post('/auth/login').send({
				username: userData.username,
				password: 'wrongpassword',
			})

			expect(wrongLogin.status).toBe(401)
			expect(wrongLogin.body.error).toBe('Неверные данные')
		})
	})
})
