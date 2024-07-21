import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import express from 'express';
import { router } from './router';
import compression from 'compression';
import { notFoundMiddleware, errorMiddleware, rateLimitMiddleware } from './middleware';
import { getIpAddress } from './util';

const app = express();

app.use(express.json({ limit: '1mb' }));

app.use(express.urlencoded({ extended: true }));

app.use(helmet());

app.use(cors());

app.use(compression());

app.use(express.static(path.resolve(path.join(process.cwd(), 'public')), { maxAge: '30d' }));

app.use(rateLimitMiddleware(getIpAddress));

app.use(router);

app.use(notFoundMiddleware);

app.use(errorMiddleware);

export { app };
