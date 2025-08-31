import request from 'supertest'
import app from '../src/app'

describe('Базовая проверка', () => {
	describe('GET /health', () => {
		it('возвращает статус OK', async () => {
			const response = await request(app).get('/health').expect(200)

			expect(response.body).toEqual({ status: 'ОК' })
		})
	})

	describe('GET /', () => {
		it('возвращает информацию об API', async () => {
			const response = await request(app).get('/').expect(200)

			expect(response.body).toHaveProperty(
				'message',
				'API социальной платформы'
			)
			expect(response.body).toHaveProperty('version', '1.0.0')
		})
	})

	describe('404 Handler', () => {
		it('возвращает 404 для несуществующих маршрутов', async () => {
			const response = await request(app).get('/nonexistent-route').expect(404)

			expect(response.body).toHaveProperty('error', 'Не найдено')
		})
	})
})
