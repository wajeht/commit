import { Server } from 'http';
import { AddressInfo } from 'net';
import { app } from './app';
import { logger } from './util';
import { appConfig } from './config';
import { notify } from './notification';

const server: Server = app.listen(appConfig.PORT);

server.on('listening', () => {
	const addr: string | AddressInfo | null = server.address();
	const bind: string =
		typeof addr === 'string' ? 'pipe ' + addr : 'port ' + (addr as AddressInfo).port;
	logger.info(`Server is listening on ${bind}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
	if (error.syscall !== 'listen') {
		throw error;
	}

	const bind: string =
		typeof appConfig.PORT === 'string' ? 'Pipe ' + appConfig.PORT : 'Port ' + appConfig.PORT;

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
			await notify(appConfig.DISCORD_WEBHOOK_URL, fetch).discord(error.message, error.stack || '');
		} catch (error) {
			logger.error('Failed to send error notification:', error);
		}
	}

	gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', async (reason: unknown, promise: Promise<unknown>) => {
	logger.error('Unhandled Rejection:', promise, 'reason:', reason);

	if (appConfig.NODE_ENV === 'production') {
		try {
			const message: string = reason instanceof Error ? reason.message : String(reason);
			const stack: string =
				reason instanceof Error ? reason.stack || '' : 'No stack trace available';
			await notify(appConfig.DISCORD_WEBHOOK_URL, fetch).discord(message, stack);
		} catch (error) {
			logger.error('Failed to send error notification:', error);
		}
	}

	gracefulShutdown('unhandledRejection');
});
