import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API социальной платформы',
      version: '1.0.0',
      description: 'Документация для REST API социальной платформы, разработанной на Node.js, Express и TypeScript.',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Локальный сервер',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/entities/*.ts',
    './src/middlewares/*.ts' // Для документации схем, если они определены в мидлварах
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;