import assert from "node:assert/strict";
import test from "node:test";
import { ESSENTIAL_VERIFICATION } from "../api/verify.js";
import { generateReportPdf } from "../api/pdf.js";

test("Essential Verification keeps the live catalog price", () => {
  assert.equal(ESSENTIAL_VERIFICATION.price, 99);
});

test("PDF engine generates a valid PDF header without external PDF dependencies", async () => {
  const pdf = await generateReportPdf({
    cliente: "test@example.com",
    empresa: "MFRGS Test Company",
    company_number: "TEST-001",
    status: "active",
    data_registro: "2020-01-01",
    diretores: [],
    analise: { risco: "Baixo", score: 100, flags: [] },
    fonte: "Test source",
    session_id: "cs_test_smoke",
  });

  assert.ok(Buffer.isBuffer(pdf));
  assert.equal(pdf.subarray(0, 8).toString("latin1"), "%PDF-1.4");
  assert.ok(pdf.toString("latin1").includes("%%EOF"));
});
