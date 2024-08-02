import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import express from 'express';
import { router } from './router';
import { appConfig } from './config';
import compression from 'compression';
import { getIpAddress, logger } from './util';
import { sentry as sentryConfig } from './sentry';
import { notFoundMiddleware, errorMiddleware, rateLimitMiddleware } from './middleware';

const app = express();

const sentry = sentryConfig(app, appConfig.NODE_ENV, appConfig.SENTRY_DSN_URL, logger);

app.use(sentry.requestHandler());

app.use(sentry.tracingHandler());

app.use(express.json({ limit: '1mb' }));

app.use(express.urlencoded({ extended: true }));

app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				...helmet.contentSecurityPolicy.getDefaultDirectives(),
				'default-src': ["'self'", 'plausible.jaw.dev '],
				'script-src': [
					"'self'",
					"'unsafe-inline'",
					'commit.jaw.dev',
					'localhost',
					'plausible.jaw.dev',
				],
			},
		},
	}),
);

app.use(cors());

app.use(compression());

app.use(rateLimitMiddleware(getIpAddress));

app.use(express.static(path.resolve(path.join(process.cwd(), 'public')), { maxAge: '30d' }));

app.use(router);

app.use(sentry.errorHandler());

app.use(notFoundMiddleware);

app.use(errorMiddleware);

export { app };
