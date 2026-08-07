import { agentCore } from "./core";
import { checkoutAgent } from "./checkoutAgent";
import { webhookAgent } from "./webhookAgent";
import { verificationAgent } from "./verificationAgent";
import { pdfAgent } from "./pdfAgent";
import { emailAgent } from "./emailAgent";
import { companiesHouseAgent } from "./companiesHouseAgent";
import { openaiAgent } from "./openaiAgent";
import { supabaseAgent } from "./supabaseAgent";
import { auditAgent } from "./auditAgent";
import { sentinelAgent } from "./sentinelAgent";

/**
 * Registra todos os agentes no orquestrador central AgentCore.
 */
export function registerAllAgents(): void {
  agentCore.register(checkoutAgent);
  agentCore.register(webhookAgent);
  agentCore.register(verificationAgent);
  agentCore.register(pdfAgent);
  agentCore.register(emailAgent);
  agentCore.register(companiesHouseAgent);
  agentCore.register(openaiAgent);
  agentCore.register(supabaseAgent);
  agentCore.register(auditAgent);
  agentCore.register(sentinelAgent);
}

export {
  agentCore,
  checkoutAgent,
  webhookAgent,
  verificationAgent,
  pdfAgent,
  emailAgent,
  companiesHouseAgent,
  openaiAgent,
  supabaseAgent,
  auditAgent,
  sentinelAgent,
};