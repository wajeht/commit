import { NextFunction, Request, Response } from 'express';
import {
	HttpError,
	ForbiddenError,
	UnauthorizedError,
	NotFoundError,
	ValidationError,
	UnimplementedFunctionError,
} from './error';

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
