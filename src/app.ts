import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';

if (process.env.NODE_ENV !== 'test') {
  dotenv.config();
}

const app: Application = express();

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/auth', authRoutes);

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ОК' });
});

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'API социальной платформы',
    version: '1.0.0'
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Не найдено' });
});

app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Ошибка:', err);
  res.status(500).json({ error: 'Внутренняя ошибка' });
});

export default app;