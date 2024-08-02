import { Logger } from './types';
import * as Sentry from '@sentry/node';
import { Application, NextFunction, Request, Response } from 'express';

export function sentry(
	app: Application,
	env: 'production' | 'development',
	dsn: string,
	logger: Logger,
): {
	requestHandler: () => (req: Request, res: Response, next: NextFunction) => void;
	tracingHandler: () => (req: Request, res: Response, next: NextFunction) => void;
	errorHandler: () => (err: Error, req: Request, res: Response, next: NextFunction) => void;
} {
	const isProduction = env === 'production';

	if (isProduction) {
		Sentry.init({
			dsn,
			integrations: [
				new Sentry.Integrations.Http({ tracing: true }),
				new Sentry.Integrations.Express({ app }),
			],
			tracesSampleRate: 1.0,
			profilesSampleRate: 1.0,
		});
	}

	return {
		requestHandler: function (): (req: Request, res: Response, next: NextFunction) => void {
			if (!isProduction) {
				return (req: Request, res: Response, next: NextFunction): void => {
					logger.info('skipping sentry request handler on non production environment');
					next();
				};
			}
			return Sentry.Handlers.requestHandler();
		},
		tracingHandler: function (): (req: Request, res: Response, next: NextFunction) => void {
			if (!isProduction) {
				return (req: Request, res: Response, next: NextFunction): void => {
					logger.info('skipping sentry request handler on non production environment');
					next();
				};
			}
			return Sentry.Handlers.tracingHandler();
		},
		errorHandler: function (): (
			err: Error,
			req: Request,
			res: Response,
			next: NextFunction,
		) => void {
			if (!isProduction) {
				return (err: Error, req: Request, res: Response, next: NextFunction): void => {
					logger.info('skipping sentry request handler on non production environment');
					next();
				};
			}
			return Sentry.Handlers.errorHandler();
		},
	};
}
