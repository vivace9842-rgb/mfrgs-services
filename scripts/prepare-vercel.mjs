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

const expectedLinks = planTypes.map(
  (planType) => `/checkout.html?planType=${planType}`
);

const alreadyWired = expectedLinks.every(
  (link) => html.includes(`href="${link}"`)
);

if (alreadyWired) {
  console.log(
    `[MFRGS] ${planTypes.length} production plan checkout links already wired.`
  );
  process.exit(0);
}

let planIndex = 0;

const updated = html.replace(
  /<a href="#" class="btn (btn-primary|btn-ghost) rippleable" style="justify-content:center;">Order Now<\/a>/g,
  (_match, buttonClass) => {
    const planType = planTypes[planIndex++];

    if (!planType) {
      return _match;
    }

    return `<a href="/checkout.html?planType=${planType}" class="btn ${buttonClass} rippleable" style="justify-content:center;">Order Now</a>`;
  }
);

if (planIndex !== planTypes.length) {
  throw new Error(
    `Expected either ${planTypes.length} already-wired checkout links or ${planTypes.length} standard plan links, found ${planIndex}. Refusing to alter the landing page.`
  );
}

writeFileSync(indexPath, updated);

console.log(
  `[MFRGS] Wired ${planIndex} production plan checkout links.`
);
