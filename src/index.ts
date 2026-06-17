import express from 'express';
import dotenv from 'dotenv';
import { errorHandler, AppError } from './middlewares/errorHandler.middleware.js';
import type { NextFunction } from 'express';
import { logger } from './utils/logger.js';

dotenv.config();

const app = express();
const PORT = process.env['PORT'] ?? 3000;

app.get('/', (_req, res) => {
  res.send('Hello from Secure Scalable Backend!');
});


app.all('/{*splat}', (_req, _res, next: NextFunction) => {
  const error = new AppError(`Can't find on this server!`, 404);
  next(error);
});
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});
