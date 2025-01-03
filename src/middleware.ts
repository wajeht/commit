import {
	HttpError,
	NotFoundError,
	ForbiddenError,
	ValidationError,
	UnauthorizedError,
	UnimplementedFunctionError,
} from './error';
import h from 'helmet';
import { appConfig } from './config';
import { rateLimit } from 'express-rate-limit';
import { logger, statusCode, html, sendNotificationQueue } from './util';
import { NextFunction, Request, Response } from 'express';

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
	const ips = appConfig.IPS.split(', ');
	return (req: Request, res: Response, next: NextFunction) => {
		try {
			if (req.body?.apiKey && req.body?.apiKey?.length) {
				return next();
			}

			const ip = getIpAddress(req);

			if (!ips.includes(ip)) {
				throw new ForbiddenError();
			}

			next();
		} catch (error) {
			next(error);
		}
	};
}

export function notFoundMiddleware(req: Request, res: Response, next: NextFunction) {
	throw new NotFoundError();
}

export function errorMiddleware() {
	const message = 'Oh no, something went wrong!';

	const errorMap = new Map([
		[ForbiddenError, 403],
		[UnauthorizedError, 401],
		[NotFoundError, 404],
		[ValidationError, 422],
		[UnimplementedFunctionError, 501],
	]);

	return async (error: Error, req: Request, res: Response, next: NextFunction) => {
		if (appConfig.NODE_ENV === 'production') {
			try {
				await sendNotificationQueue.push({ req, error });
			} catch (error) {
				logger.error(error);
			}
		}

		for (const [ErrorClass, statusCode] of errorMap) {
			if (error instanceof ErrorClass) {
				if (req.get('Content-Type') === 'application/json') {
					res.status(statusCode).json({ message: error.message });
					return;
				}

				res
					.setHeader('Content-Type', 'text/html')
					.status(error.statusCode)
					.send(html(error.message));
				return;
			}
		}

		if (error instanceof HttpError) {
			if (req.get('Content-Type') === 'application/json') {
				res.status(error.statusCode).json({ message: error.message });
				return;
			}

			res.setHeader('Content-Type', 'text/html').status(error.statusCode).send(html(error.message));
			return;
		}

		// Note: At this point, the error type is unknown, so we log it for further investigation.
		logger.error(error);

		if (req.get('Content-Type') === 'application/json') {
			res.status(statusCode.INTERNAL_SERVER_ERROR).json({ message });
			return;
		}

		res
			.setHeader('Content-Type', 'text/html')
			.status(statusCode.INTERNAL_SERVER_ERROR)
			.send(html(message));
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
		skip: (req: Request, res: Response) => {
			const ip = getIpAddress(req);
			return ips.includes(ip);
		},
	});
}
