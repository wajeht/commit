import cors from 'cors';
import path from 'node:path';
import express from 'express';
import { router } from './router';
import compression from 'compression';
import { getIpAddress } from './util';
import { notFoundMiddleware, errorMiddleware, rateLimitMiddleware, helmet } from './middleware';

const app = express()
	.set('trust proxy', true)
	.use(express.json({ limit: '1mb' }))
	.use(express.urlencoded({ extended: true }))
	.use(helmet())
	.use(cors())
	.use(compression())
	.use(rateLimitMiddleware(getIpAddress))
	.use(express.static(path.resolve(path.join(process.cwd(), 'public')), { maxAge: '30d' }))
	.use(router)
	.use(notFoundMiddleware)
	.use(errorMiddleware());

export { app };
