/**
 * Delete every Vercel deployment of the PlanSifu project except the newest production one.
 *
 * Run by .github/workflows/prune-deployments.yml after each production deploy (and weekly as a safety net).
 *   VERCEL_TOKEN   required (a repository secret)
 *   DRY_RUN=1      only list what would be deleted
 *
 * The project and team ids are fixed on purpose and are NOT read from VERCEL_PROJECT_ID / VERCEL_ORG_ID, which on some
 * machines point at a different project in the same account. Nothing is deleted unless every deployment listed belongs to
 * "plansifu" and the newest production deployment is READY and serves the live domain.
 */
const TOKEN = process.env.VERCEL_TOKEN;
const TEAM = "team_FdOJU6k0aSSHE2P7hHTWrNuP";
const PROJECT = "prj_Y2NnzYcORPD4pPm37MSLBl0qBQTZ";
const PROJECT_NAME = "plansifu";
const LIVE_DOMAIN = "plansifu.khaw.cc";
const DRY_RUN = ["1", "true"].includes(String(process.env.DRY_RUN ?? "").toLowerCase());

if (!TOKEN) {
  console.error("VERCEL_TOKEN is not set (add it under Settings > Secrets and variables > Actions).");
  process.exit(1);
}

async function api(method, path) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://api.vercel.com${path}`, { method, headers: { authorization: `Bearer ${TOKEN}` }, signal: AbortSignal.timeout(60_000) });
    if (res.status === 429 && attempt < 4) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    const body = await res.text();
    if (!res.ok) throw new Error(`${method} ${path.split("?")[0]} -> ${res.status} ${body.slice(0, 200)}`);
    return body ? JSON.parse(body) : {};
  }
}

const deployments = [];
let until;
for (;;) {
  const page = await api("GET", `/v6/deployments?projectId=${PROJECT}&teamId=${TEAM}&limit=100${until ? `&until=${until}` : ""}`);
  deployments.push(...page.deployments);
  until = page.pagination?.next;
  if (!until || page.deployments.length === 0) break;
}
if (deployments.some((d) => d.name !== PROJECT_NAME)) throw new Error("The listing contains deployments of another project; refusing to delete anything.");

deployments.sort((a, b) => b.created - a.created);
const production = deployments.filter((d) => d.target === "production");
const newest = production[0];
console.log(`${deployments.length} deployments (${production.length} production)`);
if (!newest) {
  console.log("No production deployment found; nothing to do.");
  process.exit(0);
}
if (newest.state !== "READY") {
  console.log(`The newest production deployment is ${newest.state}, not READY yet; skipping this run.`);
  process.exit(0);
}
const aliases = (await api("GET", `/v2/deployments/${newest.uid}/aliases?teamId=${TEAM}`)).aliases?.map((a) => a.alias) ?? [];
if (!aliases.includes(LIVE_DOMAIN)) {
  console.error(`The newest production deployment ${newest.uid} does not serve ${LIVE_DOMAIN} (aliases: ${aliases.join(", ") || "none"}); refusing to delete anything.`);
  process.exit(1);
}

const doomed = deployments.filter((d) => d.uid !== newest.uid);
console.log(`Keeping ${newest.uid} (${newest.url}); ${DRY_RUN ? "would delete" : "deleting"} ${doomed.length} older deployment${doomed.length === 1 ? "" : "s"}.`);
let deleted = 0;
let failed = 0;
for (const d of doomed) {
  if (DRY_RUN) {
    console.log(`  would delete ${d.uid} ${d.target ?? "preview"} ${d.state} ${new Date(d.created).toISOString()}`);
    continue;
  }
  try {
    await api("DELETE", `/v13/deployments/${d.uid}?teamId=${TEAM}`);
    deleted++;
  } catch (err) {
    failed++;
    console.error(`  failed to delete ${d.uid}: ${err.message}`);
  }
}
if (!DRY_RUN) console.log(`Deleted ${deleted}, failed ${failed}.`);
process.exit(failed ? 1 : 0);
