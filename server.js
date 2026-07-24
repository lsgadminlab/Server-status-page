const express = require("express");

const app = express();
const PORT = process.env.PORT || 8080;

// Internal endpoints (reachable from THIS server, not from clients)
const SERVICES = [
  { id: "lobby",  name: "Lobby",  type: "paper",    url: "http://10.105.70.255:8123/status" },
  { id: "paper-lobby", name: "Paper Lobby", type: "paper",    url: "http://paper-lobby.minecraft.svc.cluster.local:8123/status" },
  { id: "velocity",    name: "Velocity",    type: "velocity", url: "http://YOUR_PROXY_PRIVATE_IP:8124/status" }
];

async function fetchService(service, timeoutMs = 2500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(service.url, {
      method: "GET",
      headers: { "accept": "application/json" },
      signal: controller.signal
    });

    if (!res.ok) {
      return { ...service, state: "down", error: `HTTP ${res.status}`, data: null };
    }

    const data = await res.json();
    let state = "up";

    if (service.type === "paper" && typeof data.tps === "number" && data.tps > 0 && data.tps < 16) {
      state = "degraded";
    }
    if (service.type === "velocity" && (data.registeredServers ?? 0) < 1) {
      state = "degraded";
    }

    return { ...service, state, error: null, data };
  } catch (e) {
    return { ...service, state: "down", error: e.name === "AbortError" ? "Timeout" : e.message, data: null };
  } finally {
    clearTimeout(timeout);
  }
}

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusBadge(state) {
  if (state === "up") return `<span class="status up"><span class="dot"></span>UP</span>`;
  if (state === "degraded") return `<span class="status degraded"><span class="dot"></span>DEGRADED</span>`;
  return `<span class="status down"><span class="dot"></span>DOWN</span>`;
}

function renderCard(s) {
  let details = `<div class="k">Type</div><div>${esc(s.type)}</div>`;

  if (s.data) {
    if (s.type === "paper") {
      details += `
        <div class="k">Server</div><div>${esc(s.data.serverName || "-")}</div>
        <div class="k">Players</div><div>${esc((s.data.playersOnline ?? 0) + " / " + (s.data.playersMax ?? 0))}</div>
        <div class="k">TPS</div><div>${esc(s.data.tps ?? "-")}</div>
        <div class="k">Version</div><div>${esc(s.data.version ?? "-")}</div>
      `;
    } else {
      details += `
        <div class="k">Proxy</div><div>${esc(s.data.proxyName || "Velocity")}</div>
        <div class="k">Online</div><div>${esc(s.data.onlinePlayers ?? 0)}</div>
        <div class="k">Backends</div><div>${esc(s.data.registeredServers ?? 0)}</div>
        <div class="k">Version</div><div>${esc(s.data.version ?? "-")}</div>
      `;
    }
  } else {
    details += `<div class="k">Error</div><div>${esc(s.error || "Unknown")}</div>`;
  }

  return `
    <article class="card">
      <h2>${esc(s.name)}</h2>
      <div class="meta">${esc(s.id)}</div>
      ${statusBadge(s.state)}
      <div class="kv">${details}</div>
    </article>
  `;
}

function renderPage(results) {
  const cards = results.map(renderCard).join("");
  const now = new Date().toLocaleString();

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Network Status</title>
  <style>
    :root {
      --bg: #0f1220; --card:#171a2b; --muted:#9aa3b2; --text:#eef2ff;
      --ok:#22c55e; --warn:#f59e0b; --bad:#ef4444; --border:#2a2f45;
    }
    *{box-sizing:border-box}
    body{
      margin:0;font-family:Inter,system-ui,Arial,sans-serif;color:var(--text);
      background:linear-gradient(135deg,#0b1020,#121833 60%,#0f1220);
      min-height:100vh;padding:24px;
    }
    .wrap{max-width:1000px;margin:0 auto}
    .head{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
    h1{margin:0;font-size:clamp(1.4rem,3vw,2rem)}
    .btn{border:1px solid var(--border);background:#12162a;color:var(--text);padding:8px 12px;border-radius:10px;text-decoration:none}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}
    .card{background:rgba(23,26,43,.92);border:1px solid var(--border);border-radius:16px;padding:16px}
    h2{margin:0 0 8px;font-size:1.05rem}
    .meta{color:var(--muted);font-size:.9rem;margin-bottom:10px}
    .status{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;font-size:.86rem;font-weight:700;border:1px solid transparent}
    .dot{width:10px;height:10px;border-radius:50%}
    .up{color:#bbf7d0;background:rgba(34,197,94,.15);border-color:rgba(34,197,94,.35)} .up .dot{background:var(--ok)}
    .degraded{color:#fde68a;background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.35)} .degraded .dot{background:var(--warn)}
    .down{color:#fecaca;background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.35)} .down .dot{background:var(--bad)}
    .kv{display:grid;grid-template-columns:auto 1fr;gap:6px 10px;margin-top:12px;font-size:.92rem}
    .k{color:var(--muted)}
    .foot{color:var(--muted);font-size:.82rem;margin-top:14px;text-align:right}
  </style>
</head>
<body>
  <main class="wrap">
    <div class="head">
      <h1>Minecraft Network Status</h1>
      <a class="btn" href="/">Refresh</a>
    </div>
    <section class="grid">${cards}</section>
    <div class="foot">Last updated: ${esc(now)}</div>
  </main>
</body>
</html>`;
}

app.get("/", async (_req, res) => {
  const results = await Promise.all(SERVICES.map(s => fetchService(s)));
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(renderPage(results));
});

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Status web listening on :${PORT}`);
});
