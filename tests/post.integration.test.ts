import request from 'supertest'
import { DataSource } from 'typeorm'
import app from '../src/app'
import { getDataSource } from '../src/config/database'
import { Post } from '../src/entities/Post'
import { User } from '../src/entities/User'

describe('Интеграционные тесты API для постов', () => {
	let dataSource: DataSource
	let token: string
	let userId: string

	const createUserAndLogin = async () => {
		const userData = {
			username: 'postuser',
			email: 'postuser@example.com',
			password: 'password123',
		}

		await request(app).post('/auth/register').send(userData)

		const loginResponse = await request(app).post('/auth/login').send({
			username: userData.username,
			password: userData.password,
		})

		token = loginResponse.body.token
		userId = loginResponse.body.user.id
	}

	beforeAll(async () => {
		dataSource = getDataSource('test')
		await dataSource.initialize()
		app.set('dataSource', dataSource)
	})

	afterAll(async () => {
		await dataSource.destroy()
	})

	beforeEach(async () => {
		const postRepo = dataSource.getRepository(Post)
		await postRepo.query('DELETE FROM posts')
		const userRepo = dataSource.getRepository(User)
		await userRepo.query('DELETE FROM users')

		await createUserAndLogin()
	})

	describe('POST /posts - Создание поста', () => {
		it('должен создать новый пост для авторизованного пользователя', async () => {
			const postData = {
				title: 'Мой первый пост',
				content: 'Это содержимое моего первого поста.',
			}

			const response = await request(app)
				.post('/posts')
				.set('Authorization', `Bearer ${token}`)
				.send(postData)

			expect(response.status).toBe(201)
			expect(response.body.title).toBe(postData.title)
			expect(response.body.content).toBe(postData.content)
			expect(response.body.authorId).toBe(userId)
		})

		it('должен вернуть ошибку 401, если пользователь не авторизован', async () => {
			const postData = {
				title: 'Пост без автора',
				content: 'Этот пост не должен быть создан.',
			}

			const response = await request(app).post('/posts').send(postData)

			expect(response.status).toBe(401)
		})

		it('должен вернуть ошибку 400, если не указан заголовок', async () => {
			const postData = {
				content: 'Пост без заголовка.',
			}

			const response = await request(app)
				.post('/posts')
				.set('Authorization', `Bearer ${token}`)
				.send(postData)

			expect(response.status).toBe(400)
			expect(response.body.error).toBe(
				'Заголовок и содержимое поста обязательны'
			)
		})

		it('должен вернуть ошибку 400, если не указано содержимое', async () => {
			const postData = {
				title: 'Пост без содержимого',
			}

			const response = await request(app)
				.post('/posts')
				.set('Authorization', `Bearer ${token}`)
				.send(postData)

			expect(response.status).toBe(400)
			expect(response.body.error).toBe(
				'Заголовок и содержимое поста обязательны'
			)
		})
	})

	describe('GET /posts - Получение постов', () => {
		it('должен вернуть список всех постов для любого пользователя', async () => {
			await request(app)
				.post('/posts')
				.set('Authorization', `Bearer ${token}`)
				.send({ title: 'Пост 1', content: 'Содержимое 1' })
			await request(app)
				.post('/posts')
				.set('Authorization', `Bearer ${token}`)
				.send({ title: 'Пост 2', content: 'Содержимое 2' })

			const response = await request(app).get('/posts')

			expect(response.status).toBe(200)
			expect(Array.isArray(response.body.data)).toBe(true)
			expect(response.body.data.length).toBe(2)
			expect(response.body.data[0].title).toBe('Пост 1')
		})

		it('должен вернуть один пост по ID', async () => {
			const postData = { title: 'Пост для поиска', content: 'Найди меня' }
			const createResponse = await request(app)
				.post('/posts')
				.set('Authorization', `Bearer ${token}`)
				.send(postData)

			const postId = createResponse.body.id
			const response = await request(app).get(`/posts/${postId}`)

			expect(response.status).toBe(200)
			expect(response.body.id).toBe(postId)
			expect(response.body.title).toBe(postData.title)
		})

		it('должен вернуть ошибку 404, если пост не найден', async () => {
			const nonExistentId = '123e4567-e89b-12d3-a456-426614174000'
			const response = await request(app).get(`/posts/${nonExistentId}`)
			expect(response.status).toBe(404)
		})
	})

	describe('PUT /posts/:id - Обновление поста', () => {
		it('должен обновить пост, если пользователь является автором', async () => {
			const createResponse = await request(app)
				.post('/posts')
				.set('Authorization', `Bearer ${token}`)
				.send({ title: 'Исходный заголовок', content: 'Исходное содержимое' })

			const postId = createResponse.body.id
			const updatedData = {
				title: 'Обновленный заголовок',
				content: 'Обновленное содержимое',
			}

			const response = await request(app)
				.put(`/posts/${postId}`)
				.set('Authorization', `Bearer ${token}`)
				.send(updatedData)

			expect(response.status).toBe(200)
			expect(response.body.title).toBe(updatedData.title)
			expect(response.body.content).toBe(updatedData.content)
		})

		it('должен вернуть ошибку 403, если пользователь не является автором', async () => {
			const createResponse = await request(app)
				.post('/posts')
				.set('Authorization', `Bearer ${token}`)
				.send({ title: 'Чужой пост', content: 'Не трогать' })

			const postId = createResponse.body.id

			await request(app).post('/auth/register').send({
				username: 'otheruser',
				email: 'other@user.com',
				password: 'password',
			})
			const loginResponse = await request(app)
				.post('/auth/login')
				.send({ username: 'otheruser', password: 'password' })
			const otherToken = loginResponse.body.token

			const response = await request(app)
				.put(`/posts/${postId}`)
				.set('Authorization', `Bearer ${otherToken}`)
				.send({ title: 'Попытка взлома', content: '...' })

			expect(response.status).toBe(403)
		})

		it('должен вернуть ошибку 401, если пользователь не авторизован', async () => {
			const createResponse = await request(app)
				.post('/posts')
				.set('Authorization', `Bearer ${token}`)
				.send({ title: 'Пост для анонима', content: '...' })
			const postId = createResponse.body.id

			const response = await request(app)
				.put(`/posts/${postId}`)
				.send({ title: 'Новый заголовок', content: '...' })

			expect(response.status).toBe(401)
		})
	})

	describe('DELETE /posts/:id - Удаление поста', () => {
		it('должен удалить пост, если пользователь является автором', async () => {
			const createResponse = await request(app)
				.post('/posts')
				.set('Authorization', `Bearer ${token}`)
				.send({ title: 'Пост на удаление', content: '...' })
			const postId = createResponse.body.id

			const deleteResponse = await request(app)
				.delete(`/posts/${postId}`)
				.set('Authorization', `Bearer ${token}`)

			expect(deleteResponse.status).toBe(204)

			const getResponse = await request(app).get(`/posts/${postId}`)
			expect(getResponse.status).toBe(404)
		})

		it('должен вернуть ошибку 403, если пользователь не является автором', async () => {
			const createResponse = await request(app)
				.post('/posts')
				.set('Authorization', `Bearer ${token}`)
				.send({ title: 'Чужой пост', content: '...' })
			const postId = createResponse.body.id

			await request(app).post('/auth/register').send({
				username: 'deleter',
				email: 'deleter@user.com',
				password: 'password',
			})
			const loginResponse = await request(app)
				.post('/auth/login')
				.send({ username: 'deleter', password: 'password' })
			const otherToken = loginResponse.body.token

			const response = await request(app)
				.delete(`/posts/${postId}`)
				.set('Authorization', `Bearer ${otherToken}`)

			expect(response.status).toBe(403)
		})
	})

	describe('GET /posts - Пагинация постов', () => {
		beforeEach(async () => {
			const postRepo = dataSource.getRepository(Post)
			await postRepo.query('DELETE FROM posts')
			for (let i = 1; i <= 25; i++) {
				await request(app)
					.post('/posts')
					.set('Authorization', `Bearer ${token}`)
					.send({ title: `Пост ${i}`, content: `Содержимое ${i}` })
			}
		})

		it('должен вернуть первую страницу с 10 постами', async () => {
			const response = await request(app).get('/posts?page=1&limit=10')

			expect(response.status).toBe(200)
			expect(response.body.data.length).toBe(10)
			expect(response.body.data[0].title).toBe('Пост 1')
			expect(response.body.data[9].title).toBe('Пост 10')
		})

		it('должен вернуть вторую страницу с 10 постами', async () => {
			const response = await request(app).get('/posts?page=2&limit=10')

			expect(response.status).toBe(200)
			expect(response.body.data.length).toBe(10)
			expect(response.body.data[0].title).toBe('Пост 11')
			expect(response.body.data[9].title).toBe('Пост 20')
		})

		it('должен вернуть третью страницу с 5 последними постами', async () => {
			const response = await request(app).get('/posts?page=3&limit=10')

			expect(response.status).toBe(200)
			expect(response.body.data.length).toBe(5)
			expect(response.body.data[0].title).toBe('Пост 21')
			expect(response.body.data[4].title).toBe('Пост 25')
		})

		it('должен вернуть первую страницу с 5 постами', async () => {
			const response = await request(app).get('/posts?page=1&limit=5')

			expect(response.status).toBe(200)
			expect(response.body.data.length).toBe(5)
			expect(response.body.data[0].title).toBe('Пост 1')
			expect(response.body.data[4].title).toBe('Пост 5')
		})

		it('должен вернуть все посты, если параметры пагинации не указаны', async () => {
			const response = await request(app).get('/posts')

			expect(response.status).toBe(200)
			expect(response.body.data.length).toBe(20)
		})

		it('должен вернуть пустой массив, если запрошенная страница не существует', async () => {
			const response = await request(app).get('/posts?page=4&limit=10')

			expect(response.status).toBe(200)
			expect(response.body.data.length).toBe(0)
		})
	})
})
