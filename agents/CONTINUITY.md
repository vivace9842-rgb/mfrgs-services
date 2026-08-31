# MFRGS — Continuidade Operacional dos Agentes

## Regra
Cada função crítica possui um agente responsável por fiscalização preventiva. Quando uma função falhar, o agente deve:

1. detectar e registrar a anomalia;
2. proteger pedido, pagamento e dados;
3. usar uma contingência somente se ela já for segura e suportada;
4. tentar recuperação do setor responsável;
5. validar o resultado antes de devolver a operação;
6. escalar quando não houver uma recuperação segura.

## Funções cobertas

- Checkout e pagamentos: `StripeAgent`
- Eventos de pagamento: `WebhookAgent`
- Persistência: `SupabaseAgent`
- Execução/API: `BackendAgent`
- Verificação: `VerificationAgent`
- PDF/relatório: `PdfAgent`
- E-mail/entrega: `EmailAgent`
- Auditoria: `AuditAgent`
- Fiscalização transversal: `SentinelAgent`
- Mercado do nicho: `FarejadorAgent`

## Limites

O agente não deve inventar uma substituição, alterar preço/produto ou modificar dados de negócio apenas para parecer saudável. Sem fallback seguro, registra, preserva o estado e escala para o orquestrador.

## Objetivo pré-LIVE

Esta camada deve ser mínima e não pode bloquear o fluxo comercial. O objetivo imediato permanece: compra → pagamento → webhook → pedido → verificação → laudo → entrega.
