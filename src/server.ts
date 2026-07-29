import express from 'express';
import osintRoutes from './routes/osintRoutes.js';

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

// Middleware CORS Nativo
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Middleware de Segurança Nativo
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json({ limit: '5mb' }));

// Rotas OSINT ativas
app.use('/api/v1', osintRoutes);

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server rodando localmente na porta ${port}`);
  });
}

export { app };
export default app;
