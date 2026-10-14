import "dotenv/config";
import http from "node:http";
import { workerReadiness } from "./readiness.js";

const readiness = workerReadiness(process.env);
let state = { ...readiness, state: readiness.transactionsEnabled ? "starting" : "waiting" };
const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") { res.writeHead(405, { Allow: "GET" }); res.end('{"error":"Method not allowed"}'); return; }
  const path = new URL(req.url || "/", "http://localhost").pathname;
  if (!["/health", "/ready", "/status"].includes(path)) { res.writeHead(404); res.end('{"error":"Not found"}'); return; }
  const live = state.state === "running";
  res.statusCode = path === "/ready" && !live ? 503 : 200;
  res.end(JSON.stringify({ ...state, transactionsEnabled: live, healthy: true }));
});
server.listen(Number(process.env.PORT || 8080), "0.0.0.0", async () => {
  console.log(JSON.stringify({ ...state, port: (server.address() as {port:number}).port }));
  if (!readiness.transactionsEnabled) return;
  try {
    const { preflight } = await import("./preflight.js");
    await preflight();
    const { startScheduler } = await import("./scheduler.js");
    await startScheduler();
    state = { ...state, state: "running" };
  } catch {
    // Configuration errors may contain credentials; expose only a stable error code.
    state = { ...state, state: "waiting", transactionsEnabled: false, blockers: [...state.blockers, "worker-initialization-failed"] };
    console.error("NSTR initialization failed. Review the private configuration; transactions remain disabled.");
  }
});
for (const signal of ["SIGTERM", "SIGINT"] as const) process.once(signal, () => server.close(() => process.exit(0)));
