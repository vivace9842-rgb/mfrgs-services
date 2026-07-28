import { app } from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.log('=================================================');
  console.log('🚀 MFRGS VERIFICATION ENGINE v1.2 ONLINE');
  console.log(`📡 URL Base: http://0.0.0.0:${env.PORT}`);
  console.log(`🌎 Environment: ${env.NODE_ENV}`);
  console.log('=================================================');
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`[shutdown] sinal recebido: ${signal}`);
  server.close(() => {
    console.log('[shutdown] servidor HTTP encerrado');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[shutdown] encerramento forçado por timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
