/**
 * @swagger
 * components:
 *   schemas:
 *     Post:
 *       type: object
 *       required:
 *         - title
 *         - content
 *         - authorId
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Уникальный идентификатор поста
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         title:
 *           type: string
 *           description: Заголовок поста
 *           example: Мой первый пост
 *         content:
 *           type: string
 *           description: Содержимое поста
 *           example: Это содержимое моего первого поста.
 *         authorId:
 *           type: string
 *           format: uuid
 *           description: ID автора поста
 *           example: 098f6bcd-4621-3373-85ee-090000000000
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Дата и время создания поста
 *           example: 2023-10-27T10:00:00Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Дата и время последнего обновления поста
 *           example: 2023-10-27T10:30:00Z
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { User } from './User';

@Entity('posts')
@Index(['authorId', 'createdAt'])
@Index(['title'])
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ 
    type: 'varchar', 
    length: 200 
  })
  title: string;

  @Column('text')
  content: string;

  @Column({ 
    type: 'uuid', 
    name: 'author_id' 
  })
  authorId: string;

  @ManyToOne(() => User, (user) => user.posts, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}