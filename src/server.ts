import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import systemRoutes from './routes/systemRoutes.js';
import hashRoutes from './routes/hashRoutes.js';
import certRoutes from './routes/certRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import kybRoutes from './routes/kybRoutes.js';

const app = express();

if (env.TRUST_PROXY) {
  app.set('trust proxy', 1);
}
app.disable('x-powered-by');

// Middlewares Globais
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '5mb' }));

// Rate Limiter para a API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'RATE_LIMIT_EXCEEDED' }
});
app.use('/api/', limiter);

// Registro das Rotas Modulares
app.use(systemRoutes); // Rotas de / e /health
app.use('/api/v1', hashRoutes); // Rotas de /api/v1/verify e /api/v1/verify/batch
app.use('/api/v1', certRoutes); // Rota de /api/v1/verify/cert
app.use('/api/v1', auditRoutes); // Rota de /api/v1/audit/report
app.use('/api/v1', kybRoutes); // Rota de /api/v1/kyb/intake

// Middlewares de Tratamento de Erros (sempre por último)
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.log('=================================================');
  console.log('🚀 MFRGS VERIFICATION ENGINE v1.3 ONLINE');
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

export { app };
