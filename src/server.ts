import { app } from './app';
import { Server } from 'http';
import { AddressInfo } from 'net';
import { logger } from './logger';
import { appConfig } from './config';

const server: Server = app.listen(appConfig.PORT);

process.title = 'commit';

server.on('listening', () => {
	const addr: string | AddressInfo | null = server.address();
	// prettier-ignore
	const bind: string = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + (addr as AddressInfo).port;
	logger.info(`Server is listening on ${bind}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
	if (error.syscall !== 'listen') {
		throw error;
	}

	// prettier-ignore
	const bind: string = typeof appConfig.PORT === 'string' ? 'Pipe ' + appConfig.PORT : 'Port ' + appConfig.PORT;

	switch (error.code) {
		case 'EACCES':
			logger.error(`${bind} requires elevated privileges`);
			process.exit(1);
		// eslint-disable-next-line no-fallthrough
		case 'EADDRINUSE':
			logger.error(`${bind} is already in use`);
			process.exit(1);
		// eslint-disable-next-line no-fallthrough
		default:
			throw error;
	}
});

function gracefulShutdown(signal: string): void {
	logger.info(`Received ${signal}, shutting down gracefully.`);

	server.close(() => {
		logger.info('HTTP server closed.');
		process.exit(0);
	});

	setTimeout(() => {
		logger.error('Could not close connections in time, forcefully shutting down');
		process.exit(1);
	}, 10000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));

process.on('uncaughtException', async (error: Error, origin: string) => {
	logger.error('Uncaught Exception:', error, 'Origin:', origin);

	if (appConfig.NODE_ENV === 'production') {
		try {
			await fetch(appConfig.NOTIFY_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-API-KEY': appConfig.NOTIFY_X_API_KEY,
				},
				body: JSON.stringify({
					message: error.message,
					details: error.stack,
				}),
			});
		} catch (error) {
			logger.error('Failed to send error notification:', error);
		}
	}
});

process.on('warning', async (warning: Error) => {
	logger.error('Process warning:', warning.name, warning.message);

	if (appConfig.NODE_ENV === 'production') {
		try {
			const message: string = warning instanceof Error ? warning.message : String(warning);

			const stack: string =
				warning instanceof Error ? warning.stack || '' : 'No stack trace available';

			await fetch(appConfig.NOTIFY_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-API-KEY': appConfig.NOTIFY_X_API_KEY,
				},
				body: JSON.stringify({
					message,
					details: stack,
				}),
			});
		} catch (error) {
			logger.error('Failed to send error notification:', error);
		}
	}
});

process.on('unhandledRejection', async (reason: unknown, promise: Promise<unknown>) => {
	logger.error('Unhandled Rejection:', promise, 'reason:', reason);

	if (appConfig.NODE_ENV === 'production') {
		try {
			const message: string = reason instanceof Error ? reason.message : String(reason);

			const stack: string =
				reason instanceof Error ? reason.stack || '' : 'No stack trace available';

			await fetch(appConfig.NOTIFY_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-API-KEY': appConfig.NOTIFY_X_API_KEY,
				},
				body: JSON.stringify({
					message,
					details: stack,
				}),
			});
		} catch (error) {
			logger.error('Failed to send error notification:', error);
		}
	}
});
