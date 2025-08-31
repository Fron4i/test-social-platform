import request from 'supertest'
import { DataSource } from 'typeorm'
import app from '../src/app'
import { getDataSource } from '../src/config/database'
import { User } from '../src/entities/User'

describe('Интеграционные тесты API авторизации', () => {
	let dataSource: DataSource

	beforeAll(async () => {
		try {
			dataSource = getDataSource('test')
			if (!dataSource.isInitialized) {
				await dataSource.initialize()
			}
			app.set('dataSource', dataSource)
		} catch (error) {
			console.error('Ошибка подключения к БД в тестах авторизации:', error)
			process.exit(1)
		}
	})

	afterAll(async () => {
		if (dataSource && dataSource.isInitialized) {
			await dataSource.destroy()
		}
	})

	beforeEach(async () => {
		const userRepo = dataSource.getRepository(User)
		await userRepo.query('DELETE FROM users')
	})

	describe('Полный цикл регистрации и авторизации', () => {
		it('должен успешно зарегистрировать пользователя', async () => {
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

			const userRepo = dataSource.getRepository(User)
			const savedUser = await userRepo.findOne({
				where: { username: userData.username },
			})
			expect(savedUser).toBeTruthy()
			expect(savedUser?.email).toBe(userData.email)
			expect(savedUser?.username).toBe(userData.username)
		})

		it('должен успешно авторизовать существующего пользователя', async () => {
			const userData = {
				username: 'logintest',
				email: 'logintest@example.com',
				password: 'mypassword123',
			}

			await request(app).post('/auth/register').send(userData)

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
			const userData = {
				username: 'emailtest',
				email: 'emailtest@example.com',
				password: 'password456',
			}

			await request(app).post('/auth/register').send(userData)

			const loginResponse = await request(app).post('/auth/login').send({
				username: userData.email,
				password: userData.password,
			})

			expect(loginResponse.status).toBe(200)
			expect(loginResponse.body.message).toBe('Вход успешен')
			expect(loginResponse.body.user.email).toBe(userData.email)
		})

		it('должен получить профиль авторизованного пользователя', async () => {
			const userData = {
				username: 'profiletest',
				email: 'profiletest@example.com',
				password: 'profilepass123',
			}

			const registerResponse = await request(app)
				.post('/auth/register')
				.send(userData)

			const token = registerResponse.body.token

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
			const userData = {
				username: 'duplicate_user',
				email: 'first@example.com',
				password: 'password123',
			}

			const firstResponse = await request(app)
				.post('/auth/register')
				.send(userData)

			expect(firstResponse.status).toBe(201)

			const secondResponse = await request(app)
				.post('/auth/register')
				.send({
					...userData,
					email: 'second@example.com',
				})

			expect(secondResponse.status).toBe(400)
			expect(secondResponse.body.error).toBe('Пользователь уже существует')
		})

		it('должен отклонить дублирующий email', async () => {
			const userData = {
				username: 'first_user',
				email: 'duplicate@example.com',
				password: 'password123',
			}

			await request(app).post('/auth/register').send(userData)

			const secondResponse = await request(app)
				.post('/auth/register')
				.send({
					...userData,
					username: 'second_user',
				})

			expect(secondResponse.status).toBe(400)
			expect(secondResponse.body.error).toBe('Пользователь уже существует')
		})
	})

	describe('Тесты безопасности паролей', () => {
		it('должен корректно хэшировать пароли в базе данных', async () => {
			const userData = {
				username: 'hashtest',
				email: 'hashtest@example.com',
				password: 'plainpassword123',
			}

			await request(app).post('/auth/register').send(userData)

			const userRepo = dataSource.getRepository(User)
			const savedUser = await userRepo.findOne({
				where: { username: userData.username },
				select: ['id', 'username', 'password'],
			})

			expect(savedUser).toBeTruthy()
			expect(savedUser?.password).not.toBe(userData.password)
			expect(savedUser?.password).toMatch(/^\$2b\$/)
		})

		it('должен корректно проверять пароли при входе', async () => {
			const userData = {
				username: 'passcheck',
				email: 'passcheck@example.com',
				password: 'correctpassword',
			}

			await request(app).post('/auth/register').send(userData)

			const correctLogin = await request(app).post('/auth/login').send({
				username: userData.username,
				password: userData.password,
			})

			expect(correctLogin.status).toBe(200)

			const wrongLogin = await request(app).post('/auth/login').send({
				username: userData.username,
				password: 'wrongpassword',
			})

			expect(wrongLogin.status).toBe(401)
			expect(wrongLogin.body.error).toBe('Неверные данные')
		})
	})
})
