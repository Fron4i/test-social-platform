import { Request, Response } from 'express'
import { DataSource } from 'typeorm'
import { Post } from '../entities/Post'

export class PostController {
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
