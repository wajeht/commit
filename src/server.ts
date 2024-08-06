import { app } from './app';
import { logger } from './util';
import { appConfig } from './config';
import { notify } from './notification';

const server = app.listen(appConfig.PORT, () => {
	logger.info(`Server was started on http://localhost:${appConfig.PORT}`);
});

function gracefulShutdown() {
	logger.info('Received kill signal, shutting down gracefully.');

	server.close(() => {
		logger.info('HTTP server closed.');
		process.exit(0);
	});

	setTimeout(() => {
		logger.error('Could not close connections in time, forcefully shutting down');
		process.exit(1);
	}, 5000);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGQUIT', gracefulShutdown);

process.on('uncaughtException', async (error, origin) => {
	logger.error('Uncaught Exception:', error, 'Origin:', origin);

	if (appConfig.NODE_ENV === 'production') {
		try {
			await notify(appConfig.DISCORD_WEBHOOK_URL, fetch).discord(error.message, error.stack);
		} catch (error) {
			logger.error('Failed to send error notification:', error);
		}
	}

	gracefulShutdown();
});

process.on('unhandledRejection', async (reason, promise) => {
	logger.error('Unhandled Rejection:', promise, 'reason:', reason);

	if (appConfig.NODE_ENV === 'production') {
		try {
			const message = reason instanceof Error ? reason.message : String(reason);
			const stack = reason instanceof Error ? reason.stack : 'No stack trace available';
			await notify(appConfig.DISCORD_WEBHOOK_URL, fetch).discord(message, stack);
		} catch (error) {
			logger.error('Failed to send error notification:', error);
		}
	}

	gracefulShutdown();
});
