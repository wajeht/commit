import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import express from 'express';
import compression from 'compression';
import { notFoundMiddleware, errorMiddleware, limitIPsMiddleware } from './middleware';
import { downloadCommitDotShHandler, generateCommitMessageHandler, healthzHandler, indexHandler } from './handler';

const app = express();

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(helmet());

app.use(cors());

app.use(compression());

app.use(express.static(path.resolve(path.join(process.cwd(), 'public')), { maxAge: '30d' }));

app.get('/healthz', healthzHandler)

app.get('/commit.sh', downloadCommitDotShHandler)

app.get('/', indexHandler)

app.post('/', limitIPsMiddleware, generateCommitMessageHandler)

app.use(notFoundMiddleware)

app.use(errorMiddleware)

export { app };
