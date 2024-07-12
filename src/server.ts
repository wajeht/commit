import { app } from './app';
import { appConfig } from './config';

const server = app.listen(appConfig.PORT, async () => {
  console.log(`Server was started on http://localhost:${appConfig.PORT}`);
});

function gracefulShutdown() {
  console.log('Received kill signal, shutting down gracefully.');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
}

process.on('SIGINT', gracefulShutdown);

process.on('SIGTERM', gracefulShutdown);

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at: ', promise, ' reason: ', reason);
  gracefulShutdown();
});
