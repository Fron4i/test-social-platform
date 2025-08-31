import { Request, Response } from 'express'
import { DataSource } from 'typeorm'
import { Post } from '../entities/Post'

export class PostController {
    /**
     * @swagger
     * /posts:
     *   post:
     *     summary: Создание нового поста
     *     tags: [Posts]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - title
     *               - content
     *             properties:
     *               title:
     *                 type: string
     *                 description: Заголовок поста
     *                 example: Мой первый пост
     *               content:
     *                 type: string
     *                 description: Содержимое поста
     *                 example: Это содержимое моего первого поста.
     *     responses:
     *       201:
     *         description: Пост успешно создан
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Post'
     *       400:
     *         description: Неверные входные данные
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     *                   example: Заголовок и содержимое поста обязательны
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
    static async createPost(req: any, res: Response) {
		const { title, content } = req.body
		const userId = req.user.id

		if (!title || !content) {
			return res
				.status(400)
				.json({ error: 'Заголовок и содержимое поста обязательны' })
		}

		try {
			const dataSource: DataSource = req.app.get('dataSource')
			const postRepo = dataSource.getRepository(Post)

			const post = new Post()
			post.title = title
			post.content = content
			post.authorId = userId

			await postRepo.save(post)

			return res.status(201).json(post)
		} catch (error) {
			console.error('Ошибка при создании поста:', error)
			return res.status(500).json({ error: 'Внутренняя ошибка сервера' })
		}
	}

    /**
     * @swagger
     * /posts:
     *   get:
     *     summary: Получение списка всех постов с пагинацией
     *     tags: [Posts]
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           minimum: 1
     *         description: Номер страницы (по умолчанию 1)
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           minimum: 1
     *           maximum: 100
     *         description: Количество постов на странице (по умолчанию 20)
     *     responses:
     *       200:
     *         description: Список постов успешно получен
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 data:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/Post'
     *                 meta:
     *                   type: object
     *                   properties:
     *                     total:
     *                       type: integer
     *                       description: Общее количество постов
     *                     page:
     *                       type: integer
     *                       description: Текущая страница
     *                     limit:
     *                       type: integer
     *                       description: Количество постов на странице
     *                     totalPages:
     *                       type: integer
     *                       description: Общее количество страниц
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
    static async getAllPosts(req: Request, res: Response) {
		try {
			const page = parseInt(req.query.page as string) || 1
			const limit = parseInt(req.query.limit as string) || 20
			const skip = (page - 1) * limit

			const dataSource: DataSource = req.app.get('dataSource')
			const postRepo = dataSource.getRepository(Post)

			const [posts, total] = await postRepo.findAndCount({
				order: { createdAt: 'DESC' },
				take: limit,
				skip: skip,
			})

			const totalPages = Math.ceil(total / limit)

			return res.status(200).json({
				data: posts,
				meta: {
					total,
					page,
					limit,
					totalPages,
				},
			})
		} catch (error) {
			console.error('Ошибка при получении постов:', error)
			return res.status(500).json({ error: 'Внутренняя ошибка сервера' })
		}
	}

    /**
     * @swagger
     * /posts/{id}:
     *   get:
     *     summary: Получение поста по ID
     *     tags: [Posts]
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: string
     *           format: uuid
     *         required: true
     *         description: ID поста
     *     responses:
     *       200:
     *         description: Пост успешно получен
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Post'
     *       404:
     *         description: Пост не найден
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     *                   example: Пост не найден
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
    static async getPostById(req: Request, res: Response) {
		try {
			const { id } = req.params
			const dataSource: DataSource = req.app.get('dataSource')
			const postRepo = dataSource.getRepository(Post)
			const post = await postRepo.findOneBy({ id })

			if (!post) {
				return res.status(404).json({ error: 'Пост не найден' })
			}

			return res.status(200).json(post)
		} catch (error) {
			console.error('Ошибка при получении поста:', error)
			return res.status(500).json({ error: 'Внутренняя ошибка сервера' })
		}
	}

    /**
     * @swagger
     * /posts/{id}:
     *   put:
     *     summary: Обновление существующего поста
     *     tags: [Posts]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: string
     *           format: uuid
     *         required: true
     *         description: ID поста
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               title:
     *                 type: string
     *                 description: Новый заголовок поста
     *                 example: Обновленный заголовок
     *               content:
     *                 type: string
     *                 description: Новое содержимое поста
     *                 example: Обновленное содержимое поста.
     *     responses:
     *       200:
     *         description: Пост успешно обновлен
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Post'
     *       400:
     *         description: Неверные входные данные
     *       401:
     *         description: Неавторизованный доступ
     *       403:
     *         description: Доступ запрещен (пользователь не является автором поста)
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     *                   example: Доступ запрещен
     *       404:
     *         description: Пост не найден
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     *                   example: Пост не найден
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
    static async updatePost(req: any, res: Response) {
		try {
			const { id } = req.params
			const { title, content } = req.body
			const userId = req.user.id

			const dataSource: DataSource = req.app.get('dataSource')
			const postRepo = dataSource.getRepository(Post)
			const post = await postRepo.findOneBy({ id })

			if (!post) {
				return res.status(404).json({ error: 'Пост не найден' })
			}

			if (post.authorId !== userId) {
				return res.status(403).json({ error: 'Доступ запрещен' })
			}

			post.title = title || post.title
			post.content = content || post.content

			await postRepo.save(post)

			return res.status(200).json(post)
		} catch (error) {
			console.error('Ошибка при обновлении поста:', error)
			return res.status(500).json({ error: 'Внутренняя ошибка сервера' })
		}
	}

    /**
     * @swagger
     * /posts/{id}:
     *   delete:
     *     summary: Удаление поста по ID
     *     tags: [Posts]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         schema:
     *           type: string
     *           format: uuid
     *         required: true
     *         description: ID поста
     *     responses:
     *       204:
     *         description: Пост успешно удален (нет содержимого)
     *       401:
     *         description: Неавторизованный доступ
     *       403:
     *         description: Доступ запрещен (пользователь не является автором поста)
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     *                   example: Доступ запрещен
     *       404:
     *         description: Пост не найден
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 error:
     *                   type: string
     *                   example: Пост не найден
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
    static async deletePost(req: any, res: Response) {
		try {
			const { id } = req.params
			const userId = req.user.id

			const dataSource: DataSource = req.app.get('dataSource')
			const postRepo = dataSource.getRepository(Post)
			const post = await postRepo.findOneBy({ id })

			if (!post) {
				return res.status(404).json({ error: 'Пост не найден' })
			}

			if (post.authorId !== userId) {
				return res.status(403).json({ error: 'Доступ запрещен' })
			}

			await postRepo.remove(post)

			return res.status(204).send()
		} catch (error) {
			console.error('Ошибка при удалении поста:', error)
			return res.status(500).json({ error: 'Внутренняя ошибка сервера' })
		}
	}
}
