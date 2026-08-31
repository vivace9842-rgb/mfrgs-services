import { createClient } from "@supabase/supabase-js";
import { executeVerification } from "./verify.js";

let supabaseInstance = null;

function getSupabase() {
  if (!supabaseInstance) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase env missing");
    supabaseInstance = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabaseInstance;
}

function sanitize(value, max = 255) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function getPaidOrder(sessionId) {
  const cleanSessionId = sanitize(sessionId);
  if (!cleanSessionId) return null;

  const { data, error } = await getSupabase()
    .from("orders")
    .select("id, email, amount, currency, status, session_id, metadata, created_at")
    .eq("session_id", cleanSessionId)
    .eq("status", "approved")
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function generateReportForSession(sessionId) {
  const order = await getPaidOrder(sessionId);
  if (!order) {
    const error = new Error("Pedido pago não encontrado.");
    error.statusCode = 402;
    throw error;
  }

  const metadata = order.metadata && typeof order.metadata === "object" ? order.metadata : {};
  const verification = await executeVerification({
    email: order.email,
    empresa: metadata.company || metadata.companyName || "",
    cnpj: metadata.cnpj || metadata.number || "",
    country: metadata.country || "Brazil",
    sessionId: order.session_id,
  });

  if (verification.statusCode !== 200) {
    const error = new Error(verification.payload?.error || "Falha na verificação.");
    error.statusCode = verification.statusCode;
    throw error;
  }

  const result = verification.payload;
  return {
    cliente: result.email,
    empresa: result.empresa,
    company_number: result.company_number || null,
    encontrada: result.encontrada,
    status: result.status || null,
    data_registro: result.data_registro || null,
    endereco: result.endereco || null,
    diretores: result.diretores || [],
    ubo_declarado: result.ubo_declarado ?? null,
    quantidade_psc: result.quantidade_psc ?? 0,
    analise: {
      risco: result.risco,
      score: result.score,
      flags: result.flags || [],
    },
    fonte: result.fonte || "Fonte oficial consultada",
    session_id: order.session_id,
    pedido_id: order.id,
    valor_pago: order.amount,
    moeda: order.currency,
    gerado_em: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const sessionId = sanitize(body.session_id || body.sessionId);
  if (!sessionId) return res.status(400).json({ error: "session_id é obrigatório" });

  try {
    const report = await generateReportForSession(sessionId);
    return res.status(200).json(report);
  } catch (err) {
    const statusCode = Number(err?.statusCode) || 502;
    return res.status(statusCode).json({
      error: err instanceof Error ? err.message : "Falha ao gerar relatório",
    });
  }
}
