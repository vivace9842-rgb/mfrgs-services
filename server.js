import "dotenv/config";
import express, { Request, Response, NextFunction, Application } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { Server } from "http";

import webhookHandler from "./api/webhook.js";
import verifyHandler from "./api/verify.js";
import checkoutHandler from "./api/checkout.js";

// Instanciação da aplicação Express
const app: Application = express();

// ==========================================
// CONFIGURAÇÕES DE SEGURANÇA E MIDDLEWARES
// ==========================================

// Proteção de Cabeçalhos HTTP com Helmet
app.use(helmet());

// Configuração de CORS (Cross-Origin Resource Sharing)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "*").split(",");
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Acesso não permitido por política de CORS."));
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Signature"],
  })
);

// Controladores de Taxa de Requisição (Rate Limiting)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Janela de 15 minutos
  max: 200, // Limite de 200 requisições por IP por janela
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Muitas requisições originadas deste IP. Tente novamente mais tarde."
  }
});

const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // Janela de 5 minutos
  max: 50, // Limite de 50 requisições de verificação/checkout por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Limite de requisições de API excedido. Aguarde alguns minutos."
  }
});

// Aplicação do rate limit geral
app.use(generalLimiter);

// ==========================================
// ROTAS DA APLICAÇÃO
// ==========================================

// Endpoint de Webhook com corpo bruto (RAW) para validação de assinaturas HMAC/Stripe
app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  webhookHandler
);

// Middlewares globais de parsing JSON para as demais rotas
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Endpoints da API MFRGS com rate limit específico
app.post("/api/verify", apiLimiter, verifyHandler);
app.post("/api/checkout", apiLimiter, checkoutHandler);

// Endpoint de Verificação de Saúde (Health Check)
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "online",
    service: "MFRGS Services - Digital Verification",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Middleware para tratamento de rotas não encontradas (404)
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Rota não encontrada",
    path: req.originalUrl
  });
});

// Middleware global de tratamento de erros (500)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const isProduction = process.env.NODE_ENV === "production";
  
  console.error(`[MFRGS ERROR] ${new Date().toISOString()} - ${err.stack || err.message}`);

  res.status(500).json({
    error: "Erro Interno do Servidor",
    message: isProduction ? "Ocorreu um erro inesperado no processamento." : err.message
  });
});

// ==========================================
// INICIALIZAÇÃO E GRACEFUL SHUTDOWN
// ==========================================

const PORT: number = Number(process.env.PORT) || 3000;

const server: Server = app.listen(PORT, () => {
  console.info(`[MFRGS Services] Servidor executando com sucesso na porta ${PORT}`);
  console.info(`[MFRGS Services] Ambiente: ${process.env.NODE_ENV || "development"}`);
});

// Manipulação de exceções não capturadas
process.on("uncaughtException", (error: Error) => {
  console.error(`[MFRGS FATAL] Uncaught Exception: ${error.message}`, error.stack);
  // Recomenda-se um encerramento controlado em cenários críticos
});

process.on("unhandledRejection", (reason: unknown) => {
  console.error(`[MFRGS FATAL] Unhandled Rejection:`, reason);
});

// Função para encerrar o servidor de forma graciosa (Graceful Shutdown)
const gracefulShutdown = (signal: string) => {
  console.info(`[MFRGS Services] Sinal ${signal} recebido. Encerrando conexões com segurança...`);
  
  server.close(() => {
    console.info("[MFRGS Services] Servidor HTTP encerrado.");
    process.exit(0);
  });

  // Forçar encerramento após 10 segundos caso conexões pendentes não fechem
  setTimeout(() => {
    console.error("[MFRGS Services] Encerramento forçado por timeout de conexões ativas.");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default app;