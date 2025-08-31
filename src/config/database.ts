import { DataSource } from 'typeorm';
import { User } from '../entities/User';
import { Post } from '../entities/Post';

export const AppDataSource = new DataSource({
  type: 'mariadb',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'social_platform',
  synchronize: process.env.NODE_ENV === 'development',
  dropSchema: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Post],
  migrations: ['dist/migrations/*.js'],
  poolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
  extra: {
    idleTimeout: 300000
  }
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('БД подключена');
    console.log('Пул соединений:', AppDataSource.options.poolSize);
  } catch (error) {
    console.error('Ошибка подключения БД:', error);
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.destroy();
    console.log('БД отключена');
  } catch (error) {
    console.error('Ошибка закрытия БД:', error);
  }
};

export const getDataSource = (env: string) => {
  if (env === 'test') {
    return new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      synchronize: true,
      dropSchema: true,
      entities: [User, Post],
      logging: false
    });
  }
  return AppDataSource;
};
