export interface EnvConfig {
  // Servidor & Ambiente
  port: number;
  nodeEnv: 'development' | 'production' | 'test';

  // Stripe
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripePublishableKey?: string;

  // Supabase
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseAnonKey?: string;

  // Integrações Externas
  companiesHouseApiKey?: string;
  openAiApiKey?: string;
  emailServiceApiKey?: string;
  emailFromAddress: string;
}

function getEnvVariable(key: string, required: boolean = true, defaultValue: string = ''): string {
  const value = process.env[key] || defaultValue;

  if (required && !value) {
    throw new Error(`[CONFIG ERROR] Variável de ambiente obrigatória ausente: ${key}`);
  }

  return value;
}

export function loadEnvConfig(): EnvConfig {
  const nodeEnv = (process.env.NODE_ENV as EnvConfig['nodeEnv']) || 'development';

  // Validação em produção para evitar inconsistências no deploy da Vercel
  const isProduction = nodeEnv === 'production';

  return {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv,

    // Stripe
    stripeSecretKey: getEnvVariable('STRIPE_SECRET_KEY', isProduction),
    stripeWebhookSecret: getEnvVariable('STRIPE_WEBHOOK_SECRET', isProduction),
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,

    // Supabase
    supabaseUrl: getEnvVariable('SUPABASE_URL', isProduction),
    supabaseServiceRoleKey: getEnvVariable('SUPABASE_SERVICE_ROLE_KEY', isProduction),
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,

    // Opcionais / Fallbacks
    companiesHouseApiKey: process.env.COMPANIES_HOUSE_API_KEY,
    openAiApiKey: process.env.OPENAI_API_KEY,
    emailServiceApiKey: process.env.EMAIL_SERVICE_API_KEY,
    emailFromAddress: process.env.EMAIL_FROM_ADDRESS || 'nao-responda@mfrgs.com',
  };
}

export const env = loadEnvConfig();