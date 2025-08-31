import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { initializeDatabase, closeDatabase } from './config/database';
import { Server } from 'http';

const PORT = parseInt(process.env.PORT || '3000');

let serverInstance: Server | undefined;

const startServer = async () => {
	try {
		await initializeDatabase();

		serverInstance = app.listen(PORT, '0.0.0.0', () => {
			console.log(`Сервер запущен на порту ${PORT}`);
		});

		serverInstance.on('error', (error: any) => {
			if (error.code === 'EADDRINUSE') {
				console.error(`Порт ${PORT} уже используется`);
			} else {
				console.error('Ошибка сервера:', error);
			}
			process.exit(1);
		});

		return serverInstance;
	} catch (error) {
		console.error('Ошибка запуска:', error);
		process.exit(1);
	}
};

const gracefulShutdown = async () => {
	console.log('Остановка сервера...');
	try {
		await closeDatabase();
		if (serverInstance) {
			serverInstance.close(() => {
				console.log('Сервер остановлен');
				process.exit(0);
			});
		}
	} catch (error) {
		console.error('Ошибка остановки:', error);
		process.exit(1);
	}
};

startServer();
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default serverInstance;
