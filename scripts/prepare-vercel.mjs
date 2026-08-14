import { readFileSync, writeFileSync } from "node:fs";

const indexPath = "index.html";
const html = readFileSync(indexPath, "utf8");

const planTypes = [
  "essential_verification",
  "individual_verification",
  "website_trust_audit",
  "professional_due_diligence",
  "supplier_verification",
  "enterprise_portfolio_review",
  "corporate_monitoring",
  "international_due_diligence",
];

let planIndex = 0;
const updated = html.replace(
  /<a href="#" class="btn (?:btn-primary|btn-ghost) rippleable" style="justify-content:center;">Order Now<\/a>/g,
  (match) => {
    const planType = planTypes[planIndex++];
    if (!planType) return match;
    return `<a href="/checkout.html?planType=${planType}" class="btn btn-primary rippleable" style="justify-content:center;">Order Now</a>`;
  }
);

if (planIndex !== planTypes.length) {
  throw new Error(
    `Expected ${planTypes.length} standard plan checkout links, found ${planIndex}. Refusing to alter the landing page.`
  );
}

writeFileSync(indexPath, updated);
console.log(`[MFRGS] Wired ${planIndex} production plan checkout links.`);
