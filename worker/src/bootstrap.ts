import "dotenv/config";
import http from "node:http";
import { workerReadiness } from "./readiness.js";

const readiness = workerReadiness(process.env);
let state = { ...readiness, state: readiness.transactionsEnabled ? "starting" : "waiting" };
let runtime:()=>{state:string;reason:string|null}=()=>({state:"idle",reason:null});
const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") { res.writeHead(405, { Allow: "GET" }); res.end('{"error":"Method not allowed"}'); return; }
  const url = new URL(req.url || "/", "http://localhost"),path=url.pathname;
  if(path==="/rewards") {
    if(state.state!=="running") {res.end(JSON.stringify({state:"awaiting-activation",epochMinutes:5,payouts:[]}));return;}
    try {const {rewardFeed}=await import("./reward-feed.js");const feed=await rewardFeed(url.searchParams.get("wallet"));res.end(JSON.stringify({...feed,state:["paused","failed"].includes(runtime().state)?"paused":"active"}));}
    catch(error){res.statusCode=error instanceof Error&&error.message==="INVALID_WALLET"?400:503;res.end(JSON.stringify({error:res.statusCode===400?"Enter a valid Solana wallet address.":"Reward receipts are temporarily unavailable."}));}
    return;
  }
  if (!["/health", "/ready", "/status"].includes(path)) { res.writeHead(404); res.end('{"error":"Not found"}'); return; }
  const epoch=runtime();
  const live = state.state === "running"&&!['paused','failed'].includes(epoch.state);
  res.statusCode = path === "/ready" && !live ? 503 : 200;
  res.end(JSON.stringify({ ...state, epoch, transactionsEnabled: live, healthy: true }));
});
server.listen(Number(process.env.PORT || 8080), "0.0.0.0", async () => {
  console.log(JSON.stringify({ ...state, port: (server.address() as {port:number}).port }));
  if (!readiness.transactionsEnabled) return;
  try {
    const { preflight } = await import("./preflight.js");
    await preflight();
    const { startScheduler } = await import("./scheduler.js");
    runtime=await startScheduler();
    state = { ...state, state: "running" };
  } catch {
    // Configuration errors may contain credentials; expose only a stable error code.
    state = { ...state, state: "waiting", transactionsEnabled: false, blockers: [...state.blockers, "worker-initialization-failed"] };
    console.error("NSTR initialization failed. Review the private configuration; transactions remain disabled.");
  }
});
for (const signal of ["SIGTERM", "SIGINT"] as const) process.once(signal, () => server.close(() => process.exit(0)));
