import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

router.get('/profile', authMiddleware, (req: any, res) => {
  res.json({
    message: 'Профиль пользователя',
    user: req.user
  });
});

export default router;