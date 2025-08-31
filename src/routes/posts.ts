import { Router } from 'express';
import { PostController } from '../controllers/PostController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.post('/', authMiddleware, PostController.createPost);
router.get('/', PostController.getAllPosts);
router.get('/:id', PostController.getPostById);
router.put('/:id', authMiddleware, PostController.updatePost);
router.delete('/:id', authMiddleware, PostController.deletePost);

export default router;
