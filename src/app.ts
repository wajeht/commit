import express from 'express';
import { notFoundMiddleware, errorMiddleware, limitIPsMiddleware } from './middleware';
import { generateCommitMessageHandler, healthzHandler, indexHandler } from './handler';

const app = express();

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.get('/healthz', healthzHandler)

app.get('/', limitIPsMiddleware, indexHandler)

app.post('/', limitIPsMiddleware, generateCommitMessageHandler)

app.use(notFoundMiddleware)

app.use(errorMiddleware)

export { app };
