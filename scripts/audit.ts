import { runAudit } from "../src/lib/runAudit";

// tsx does not load .env files; Node can.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // file not present
  }
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: npm run audit:cli -- <url>");
    process.exit(2);
  }
  if (!process.env.PSI_API_KEY) {
    console.error("[warn] PSI_API_KEY not set: mobile_speed and lcp will be unavailable.");
  }

  const started = Date.now();
  const result = await runAudit(url, "cli");
  if (!result.ok) {
    console.error(`Audit failed: ${result.messageBg}`);
    process.exit(1);
  }
  console.log(JSON.stringify(result.audit, null, 2));
  console.error(`[done] ${((Date.now() - started) / 1000).toFixed(1)}s, score ${result.audit.score}`);
}

main();
