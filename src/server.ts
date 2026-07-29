import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import systemRoutes from './routes/systemRoutes.js';
import hashRoutes from './routes/hashRoutes.js';
import certRoutes from './routes/certRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import kybRoutes from './routes/kybRoutes.js';
import osintRoutes from './routes/osintRoutes.js';

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '5mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'RATE_LIMIT_EXCEEDED' }
});
app.use('/api/', limiter);

// Registro das Rotas da Engine
app.use(systemRoutes);
app.use('/api/v1', hashRoutes);
app.use('/api/v1', certRoutes);
app.use('/api/v1', auditRoutes);
app.use('/api/v1', kybRoutes);
app.use('/api/v1', osintRoutes);

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const port = process.env.PORT || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server rodando localmente na porta ${port}`);
  });
}

export { app };
export default app;
