import { app } from './app';
import { appConfig } from './config';
import { logger } from './util'

const server = app.listen(appConfig.PORT, () => {
  logger.info(`Server was started on http://localhost:${appConfig.PORT}`);
});

function gracefulShutdown() {
  logger.info('Received kill signal, shutting down gracefully.');
  server.close(() => {
    console.error('HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGINT', gracefulShutdown);

process.on('SIGTERM', gracefulShutdown);

process.on('unhandledRejection', (reason, promise) => {
  logger.info('Unhandled Rejection at: ', promise, ' reason: ', reason);
  gracefulShutdown();
});