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
import { logger, statusCode, html } from './util';
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
		if (appConfig.NODE_ENV === 'production' && !(error instanceof NotFoundError)) {
			await fetch(appConfig.NOTIFY_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-API-KEY': appConfig.NOTIFY_X_API_KEY,
				},
				body: JSON.stringify({
					appId: appConfig.NOTIFY_APP_ID,
					message: error.message,
					details: error.stack,
				}),
			});
		}

		for (const [ErrorClass, statusCode] of errorMap) {
			if (error instanceof ErrorClass) {
				if (req.get('Content-Type') === 'application/json') {
					return res.status(statusCode).json({ message: error.message });
				}

				return res
					.setHeader('Content-Type', 'text/html')
					.status(error.statusCode)
					.send(html(error.message));
			}
		}

		if (error instanceof HttpError) {
			if (req.get('Content-Type') === 'application/json') {
				return res.status(error.statusCode).json({ message: error.message });
			}

			return res
				.setHeader('Content-Type', 'text/html')
				.status(error.statusCode)
				.send(html(error.message));
		}

		// Note: At this point, the error type is unknown, so we log it for further investigation.
		logger.error(error);

		if (req.get('Content-Type') === 'application/json') {
			return res.status(statusCode.INTERNAL_SERVER_ERROR).json({ message });
		}

		return res
			.setHeader('Content-Type', 'text/html')
			.status(statusCode.INTERNAL_SERVER_ERROR)
			.send(html(message));
	};
}

export function catchAsyncErrorMiddleware<P = any, ResBody = any, ReqBody = any, ReqQuery = any>(
	fn: (
		req: Request<P, ResBody, ReqBody, ReqQuery>,
		res: Response<ResBody>,
		next: NextFunction,
	) => Response | Promise<Response<any>> | void | Promise<void>,
): (
	req: Request<P, ResBody, ReqBody, ReqQuery>,
	res: Response<ResBody>,
	next: NextFunction,
) => Promise<void> {
	return async (
		req: Request<P, ResBody, ReqBody, ReqQuery>,
		res: Response<ResBody>,
		next: NextFunction,
	): Promise<void> => {
		try {
			await fn(req, res, next);
		} catch (err) {
			next(err);
		}
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
