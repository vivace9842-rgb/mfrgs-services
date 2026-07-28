import dotenv from 'dotenv';

dotenv.config();

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: toPositiveInt(process.env.PORT, 5000),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? '*',
  TRUST_PROXY: process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1'
};
