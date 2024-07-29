import {
	HttpError,
	ForbiddenError,
	UnauthorizedError,
	NotFoundError,
	ValidationError,
	UnimplementedFunctionError,
} from './error';
import { appConfig } from './config';
import { logger, statusCode } from './util';
import { rateLimit } from 'express-rate-limit';
import { NextFunction, Request, Response } from 'express';

export function limitIPsMiddleware(
	appConfig: { IPS: string },
	getIpAddress: (req: Request) => string,
) {
	return (req: Request, res: Response, next: NextFunction) => {
		try {
			const ips = appConfig.IPS.split(', ');
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

export function errorMiddleware(error: Error, req: Request, res: Response, next: NextFunction) {
	const errorMap = new Map([
		[ForbiddenError, 403],
		[UnauthorizedError, 401],
		[NotFoundError, 404],
		[ValidationError, 422],
		[UnimplementedFunctionError, 501],
	]);

	for (const [ErrorClass, statusCode] of errorMap) {
		if (error instanceof ErrorClass) {
			return res.status(statusCode).json({ message: error.message });
		}
	}

	if (error instanceof HttpError) {
		return res.status(error.statusCode).json({ message: error.message });
	}

	// Note: At this point, the error type is unknown, so we log it for further investigation.
	logger.error(error);

	return res.status(500).json({ message: 'Oh no, something went wrong!' });
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
	return rateLimit({
		windowMs: 15 * 60 * 1000, // 15 minutes
		limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
		standardHeaders: 'draft-7',
		legacyHeaders: false,
		handler: (req, res) => {
			return res
				.status(statusCode.TOO_MANY_REQUESTS)
				.json({ message: 'Too many requests, please try again later.' });
		},
		skip: (req, res) => {
			const ips = appConfig.IPS.split(', ');
			const ip = getIpAddress(req);
			return ips.includes(ip);
		},
	});
}
