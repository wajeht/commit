import h from 'helmet';
import { logger } from './logger';
import { appConfig } from './config';
import { rateLimit } from 'express-rate-limit';
import { NextFunction, Request, Response } from 'express';
import { statusCode, html, sendNotificationQueue } from './util';
import { HttpError, NotFoundError, ForbiddenError } from './error';

export function helmet() {
	return h({
		contentSecurityPolicy: {
			directives: {
				...h.contentSecurityPolicy.getDefaultDirectives(),
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
	});
}

export function limitIPsMiddleware(
	appConfig: { IPS: string },
	getIpAddress: (req: Request) => string,
) {
	const allowedIPs = new Set(appConfig.IPS.split(/,\s*/));

	return (req: Request, _res: Response, next: NextFunction) => {
		try {
			const apiKey = req.headers['x-api-key'] || req.query.apiKey;
			if (apiKey) {
				return next();
			}

			const ip = getIpAddress(req);

			if (!allowedIPs.has(ip)) {
				logger.info(`Unauthorized access attempt from IP: ${ip}`);
				throw new ForbiddenError();
			}

			next();
		} catch (error) {
			next(error);
		}
	};
}

export function notFoundMiddleware(_req: Request, _res: Response, _next: NextFunction) {
	throw new NotFoundError();
}

export function errorMiddleware() {
	return async (error: Error, req: Request, res: Response, _next: NextFunction) => {
		logger.error('[errorMiddleware]: ', error);

		if (appConfig.NODE_ENV === 'production') {
			try {
				await sendNotificationQueue.push({ req, error });
			} catch (error) {
				logger.error('[sendNotificationQueue]: ', error);
			}
		}

		let statusCode = 500;
		let message = 'Oh no, something went wrong!';

		if (error instanceof HttpError) {
			statusCode = error.statusCode;
			message = error.message;
		}

		if (req.get('Content-Type') === 'application/json' || req.path.startsWith('/api')) {
			res.status(statusCode).json({ message });
			return;
		}

		res.setHeader('Content-Type', 'text/html').status(statusCode).send(html(message));
		return;
	};
}

export function rateLimitMiddleware(getIpAddress: (req: Request) => string) {
	const message = 'Too many requests, please try again later.';
	const ips = appConfig.IPS.split(', ');

	return rateLimit({
		windowMs: 15 * 60 * 1000, // 15 minutes
		limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
		standardHeaders: 'draft-7',
		legacyHeaders: false,
		handler: (req: Request, res: Response) => {
			if (req.get('Content-Type') === 'application/json') {
				return res.status(statusCode.TOO_MANY_REQUESTS).json({ message });
			}

			return res
				.setHeader('Content-Type', 'text/html')
				.status(statusCode.TOO_MANY_REQUESTS)
				.send(html(message));
		},
		skip: (req: Request, _res: Response) => {
			const ip = getIpAddress(req);
			return ips.includes(ip);
		},
	});
}
