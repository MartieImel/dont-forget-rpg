// Teste de fumaça ponta a ponta: confere se a API, o banco e o CORS estão funcionando de verdade.
//   Local:      npm run smoke
//   No ar:      BASE_URL=https://SUA-API.onrender.com FRONTEND_ORIGIN=https://SEU-SITE.vercel.app npm run smoke
// Cria um usuário e uma campanha "smoke-..." de teste (não há endpoint para apagar usuário/campanha).
const BASE = (process.env.BASE_URL || "http://localhost:4000").replace(/\/+$/, "");
const ORIGIN = (process.env.FRONTEND_ORIGIN || "").replace(/\/+$/, "");
const API = BASE + "/api";
let fail = 0, n = 0;
const check = (ok, msg) => { n++; if (!ok) fail++; console.log((ok ? "OK    " : "FALHOU ") + msg); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(method, path, token, body, headers = {}) {
  const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await r.json(); } catch { /* sem corpo */ }
  return { status: r.status, json, headers: r.headers };
}

(async () => {
  console.log(`Testando ${BASE}\n`);

  // 1) a API responde (no plano grátis do Render, a 1ª chamada pode levar ~1 min: ele estava dormindo)
  let health = null;
  for (let i = 0; i < 20 && !health; i++) {
    try {
      const r = await call("GET", "/health");
      if (r.status === 200 && r.json && r.json.ok) health = r;
    } catch { /* ainda acordando */ }
    if (!health) { if (i === 0) console.log("   (API ainda não respondeu; esperando ela acordar, até ~100 s...)"); await sleep(5000); }
  }
  check(!!health, "API responde em /api/health");
  if (!health) return finish();

  const gd = (await call("GET", "/game-data")).json;
  check(gd && gd.ELEMENTOS_MONSTRO && gd.ELEMENTOS_MONSTRO.length === 15 && gd.CLASSES.length === 8, "dados do jogo carregam (15 elementos, 8 classes)");

  // 2) o banco: escrever e ler de volta
  const u = "smoke-" + Date.now().toString(36);
  const reg = await call("POST", "/auth/register", null, { username: u, password: "1234", displayName: "Smoke" });
  check(reg.status === 201 && reg.json.token, "banco: cria usuário (INSERT)");
  if (!reg.json || !reg.json.token) return finish();
  const T = reg.json.token;
  check((await call("GET", "/auth/me", T)).json?.user?.username === u, "banco: lê o usuário de volta (SELECT)");
  const login = await call("POST", "/auth/login", null, { username: u, password: "1234" });
  check(login.status === 200 && login.json.token, "login com a senha (hash bcrypt) funciona");

  const ch = await call("POST", "/characters", T, { name: "Smoke", race: "Humano", classe: "Lutador", level: 1, attrs: { GRR: 2, ESP: 2, FRM: 2, CHR: 1, RPZ: 2, MRL: 1 } });
  check(ch.status === 201 && ch.json.character.hpMax === 106, `personagem criado com as regras certas (HP ${ch.json?.character?.hpMax}, esperado 106)`);
  check((await call("GET", "/characters", T)).json?.characters?.length === 1, "lista o personagem salvo");

  // 3) campanha, tabuleiro e cena de fuga (tabelas novas)
  const camp = (await call("POST", "/campaigns", T, { name: "smoke" })).json?.campaign;
  check(!!camp && camp.code?.length === 6, "campanha criada (código de 6 caracteres)");
  const bd = await call("POST", `/campaigns/${camp.id}/boards`, T, { name: "Teste", cols: 8, rows: 6 });
  check(bd.status === 201, "tabuleiro criado");
  check((await call("GET", `/campaigns/${camp.id}/board`, T)).json?.board?.cols === 8, "tabuleiro lido de volta");
  const es = await call("POST", `/campaigns/${camp.id}/escapes`, T, { scene: { name: "smoke", duration: 5, damage: 5, items: [{ type: "bullet", t: 0, x: 10, y: 10, vx: 0, vy: 100, r: 5 }] } });
  check(es.status === 201, "cena de fuga salva");
  check((await call("GET", `/campaigns/${camp.id}/escapes/${es.json.id}`, T)).json?.scene?.items?.length === 1, "cena de fuga lida de volta");
  check((await call("POST", `/campaigns/${camp.id}/escapes`, T, { scene: { items: [{ type: "nuke" }] } })).status === 400, "servidor recusa cena inválida");

  // limpeza do que dá pra apagar
  await call("DELETE", `/campaigns/${camp.id}/escapes/${es.json.id}`, T);
  await call("DELETE", `/characters/${ch.json.character.id}`, T);

  // 4) CORS: o site da Vercel consegue falar com a API?
  if (ORIGIN) {
    const pre = (origin) => fetch(API + "/auth/login", { method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,authorization" } });
    const ok = await pre(ORIGIN);
    check(ok.headers.get("access-control-allow-origin") === ORIGIN, `CORS: aceita o site ${ORIGIN}`);
    const bad = await pre("https://site-qualquer.example");
    const leaked = bad.headers.get("access-control-allow-origin");
    if (leaked === null) check(true, "CORS: recusa sites de fora");
    else if (process.env.ALLOW_OPEN_CORS === "1") check(true, "CORS aberto a qualquer site (permitido por ALLOW_OPEN_CORS=1)");
    else check(false, "CORS aceita QUALQUER site: troque CORS_ORIGIN pela URL exata do seu site (normal só no 1º deploy, com *)");
  } else {
    console.log("   (CORS não testado: informe FRONTEND_ORIGIN=https://seu-site.vercel.app)");
  }
  finish();
})().catch((e) => { console.log("FALHOU: " + e.message); process.exit(1); });

function finish() {
  console.log(`\n${n - fail}/${n} verificações passaram` + (fail ? ` — ${fail} FALHA(S)` : " — TUDO OK"));
  process.exit(fail ? 1 : 0);
}
