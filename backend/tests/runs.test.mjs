// Teste de API do "Lançar Cena de Fuga" (precisa do servidor no ar e de um Postgres):
//   npm run dev            (em outro terminal)
//   BASE_URL=http://localhost:4000 npm run test:runs        (leva ~30 s: espera relógios reais)
const API = (process.env.BASE_URL || "http://localhost:4000").replace(/\/+$/, "") + "/api";
let fail = 0, n = 0;
const check = (c, m) => { n++; if (!c) fail++; console.log((c ? "OK    " : "FALHOU ") + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (method, path, token, body) => { const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined }); let j = null; try { j = await r.json(); } catch {} return { s: r.status, j }; };
const reg = async (u) => (await call("POST", "/auth/register", null, { username: u + Date.now() + Math.floor(Math.random() * 999), password: "1234", displayName: u })).j.token;
const mk = async (t, name, attrs) => (await call("POST", "/characters", t, { name, race: "Humano", classe: "Lutador", level: 1, attrs })).j.character.id;
const A = { GRR: 2, ESP: 2, FRM: 2, CHR: 1, RPZ: 2, MRL: 1 };

const M = await reg("Mestre"), P1 = await reg("Jog1"), P2 = await reg("Jog2"), P3 = await reg("Jog3"), X = await reg("Fora");
const c1 = await mk(P1, "Kris", A), c2 = await mk(P2, "Susie", A), c3 = await mk(P3, "Noelle", A);
const camp = (await call("POST", "/campaigns", M, { name: "Poço" })).j.campaign; const CID = camp.id;
for (const [t, c] of [[P1, c1], [P2, c2], [P3, c3]]) await call("POST", "/campaigns/join", t, { code: camp.code, characterId: c });
const scene = { name: "Cena curta", duration: 3, damage: 20, items: [{ type: "bullet", t: 0, x: 240, y: 20, vx: 0, vy: 50, r: 5 }] };
const SID = (await call("POST", `/campaigns/${CID}/escapes`, M, { scene })).j.id;
const R = `/campaigns/${CID}/escape/runs`;
const hpOf = async (t, id) => (await call("GET", `/characters/${id}`, t)).j.character.hpCurrent;

console.log("== lançar ==");
check((await call("POST", R, P1, { sceneId: SID })).s === 403, "jogador não lança");
check((await call("POST", R, M, { sceneId: "naoexiste" })).s === 404, "cena inexistente = 404");
const l1 = await call("POST", R, M, { sceneId: SID });
check(l1.s === 201 && l1.j.run.status === "lobby" && l1.j.run.damage === 20, "mestre lança: sala de espera, dano 20 (fixo da cena)");
const RUN = l1.j.run.id;
check((await call("POST", R, M, { sceneId: SID })).s === 409, "não dá pra lançar outra com uma ativa (409)");
await call("PUT", `/campaigns/${CID}/escapes/${SID}`, M, { scene: { ...scene, damage: 99 } });  // edita a biblioteca DEPOIS de lançar

console.log("\n== aviso aos jogadores ==");
const b = (await call("GET", `/campaigns/${CID}/board`, P2)).j;
check(b.activeEscape && b.activeEscape.id === RUN && b.activeEscape.status === "lobby", "o tabuleiro avisa os jogadores (activeEscape)");
check((await call("GET", `/campaigns/${CID}`, P2)).j.activeEscape?.id === RUN, "a tela da campanha também avisa");
check((await call("GET", `${R}/${RUN}`, X)).s === 403, "estranho à campanha não vê o encontro");

console.log("\n== sala de espera ==");
const g = (await call("GET", `${R}/${RUN}`, P1)).j;
check(g.joined === false && g.myCharacters.length === 1 && g.myCharacters[0].id === c1, "jogador vê o personagem que pode levar");
check((await call("GET", `${R}/${RUN}/scene`, P1)).s === 403, "quem não entrou não baixa a cena");
check((await call("GET", `${R}/${RUN}/scene`, M)).j.scene.damage === 20, "a cena do encontro é a CÓPIA do lançamento (dano 20, não os 99 editados depois)");
check((await call("POST", `${R}/${RUN}/join`, P1, { characterId: c2 })).s === 403, "não entra com personagem dos outros");
check((await call("POST", `${R}/${RUN}/join`, P1, { characterId: c1 })).s === 201, "P1 entra com a Kris");
check((await call("POST", `${R}/${RUN}/join`, P1, { characterId: c1 })).s === 409, "não entra duas vezes");
check((await call("POST", `${R}/${RUN}/join`, M, { characterId: c1 })).s === 400, "mestre não entra como jogador");
check((await call("POST", `${R}/${RUN}/join`, P2, { characterId: c2 })).s === 201, "P2 entra com a Susie");
check((await call("GET", `${R}/${RUN}`, M)).j.players.length === 2, "mestre vê 2 jogadores na sala");
check((await call("POST", `${R}/${RUN}/start`, P1)).s === 403, "jogador não começa");

console.log("\n== começar (relógio do servidor) ==");
const st = await call("POST", `${R}/${RUN}/start`, M);
const lead = st.j.run.startsAt - st.j.run.serverTime;
check(st.s === 200 && st.j.run.status === "running" && lead >= 3000 && lead <= 5000, `mestre começa: contagem de ~4 s (${lead} ms)`);
check((await call("POST", `${R}/${RUN}/join`, P3, { characterId: c3 })).s === 409, "depois de começar ninguém mais entra");
check((await call("POST", `${R}/${RUN}/hit`, P1, { t: 0.1 })).s === 400, "acerto ANTES da cena começar é recusado (janela de tempo)");
check((await call("POST", `${R}/${RUN}/state`, P3, { x: 1, y: 1 })).s === 403, "quem não entrou não manda estado");

console.log("\n== tempo real: posições ==");
await call("POST", `${R}/${RUN}/state`, P1, { x: 100, y: 50 });
const s2 = await call("POST", `${R}/${RUN}/state`, P2, { x: 300, y: 200 });
const kris = s2.j.players.find((p) => p.name === "Kris");
check(kris && kris.x === 100 && kris.y === 50, "P2 recebe a posição da Kris ao mandar a dela");
const live = (await call("GET", `${R}/${RUN}/live`, M)).j.players;
check(live.find((p) => p.name === "Susie").x === 300, "mestre acompanha as duas almas ao vivo");
check((await call("GET", `${R}/${RUN}/live`, X)).s === 403, "estranho não acompanha");

console.log("\n== acertos (a cena começa de verdade em ~5 s) ==");
await sleep(Math.max(0, Number(st.j.run.startsAt) + 1000 + 250 - Date.now()));
const h1 = await call("POST", `${R}/${RUN}/hit`, P1, { t: 0.25 });
check(h1.s === 200 && h1.j.hp === 86, `acerto desconta o dano FIXO da cena (106 → ${h1.j.hp})`);
check((await hpOf(P1, c1)) === 86, "o HP da FICHA mudou de verdade (a ficha é o que vale)");
check((await call("POST", `${R}/${RUN}/hit`, P1, { t: 0.3 })).s === 429, "acertos em sequência são recusados (ritmo)");
check((await call("POST", `${R}/${RUN}/hit`, P2, { t: 50 })).s === 400, "acerto com instante absurdo é recusado");
await sleep(900);
const h2 = await call("POST", `${R}/${RUN}/hit`, P1, { t: 1.2 });
check(h2.s === 200 && h2.j.hp === 66, `depois do intervalo, outro acerto vale (66)`);
check((await call("POST", `${R}/${RUN}/finish`, P1)).s === 400, "terminar antes do fim da cena é recusado");

console.log("\n== fim ==");
await sleep(Math.max(0, Number(st.j.run.startsAt) + 1000 + 3000 - Date.now()) + 200);
const f1 = await call("POST", `${R}/${RUN}/finish`, P1);
check(f1.s === 200 && f1.j.status === "running", "P1 termina (ainda falta a P2)");
const f2 = await call("POST", `${R}/${RUN}/finish`, P2);
check(f2.s === 200 && f2.j.status === "finished", "quando todos terminam, o encontro acaba sozinho");
const res = (await call("GET", `${R}/${RUN}`, M)).j.players;
const rk = res.find((p) => p.name === "Kris"), rs = res.find((p) => p.name === "Susie");
check(rk.hits === 2 && rk.damageTaken === 40 && rk.result === "alive" && rk.hp === 66, `resultado da Kris: ${rk.hits} acertos, ${rk.damageTaken} de dano, ${rk.result}, HP ${rk.hp}`);
check(rs.hits === 0 && rs.result === "alive", "resultado da Susie: sem acertos, sobreviveu");
check((await call("GET", `/campaigns/${CID}/board`, P1)).j.activeEscape === null, "terminou: o aviso some");
check((await call("GET", `${R}/${RUN}/live`, M)).j.players.every((p) => p.x === null), "posições em memória foram limpas");

console.log("\n== cancelar ==");
const l2 = (await call("POST", R, M, { sceneId: SID })).j.run;
check((await call("POST", `${R}/${l2.id}/start`, M)).s === 400, "não começa sem ninguém na sala");
await call("POST", `${R}/${l2.id}/join`, P1, { characterId: c1 });
check((await call("POST", `${R}/${l2.id}/cancel`, P1)).s === 403, "jogador não cancela");
check((await call("POST", `${R}/${l2.id}/cancel`, M)).s === 200 && (await call("GET", `${R}/${l2.id}`, M)).j.run.status === "cancelled", "mestre cancela");

console.log("\n== morte ==");
await call("PUT", `/characters/${c2}`, P2, { hpCurrent: 20 });
const l3 = (await call("POST", R, M, { sceneId: SID })).j.run;
await call("PUT", `/characters/${c3}`, P3, { hpCurrent: 0 });
check((await call("POST", `${R}/${l3.id}/join`, P3, { characterId: c3 })).s === 400, "personagem com 0 de HP não entra");
await call("POST", `${R}/${l3.id}/join`, P2, { characterId: c2 });
const st3 = await call("POST", `${R}/${l3.id}/start`, M);
await sleep(Math.max(0, Number(st3.j.run.startsAt) + 1000 + 300 - Date.now()));
const d = await call("POST", `${R}/${l3.id}/hit`, P2, { t: 0.3 });
check(d.s === 200 && d.j.hp === 0 && d.j.dead === true, "acerto que zera o HP: ficha em 0 e jogador cai");
check((await hpOf(P2, c2)) === 0, "a ficha ficou com 0 de HP");
check((await call("GET", `${R}/${l3.id}`, M)).j.run.status === "finished", "todos caídos/terminados: o encontro acaba sozinho");
check((await call("POST", `${R}/${l3.id}/hit`, P2, { t: 0.5 })).s === 409, "depois de acabar, acerto é recusado");

console.log("\n== fim por tempo (ninguém avisa que terminou) ==");
await call("PUT", `/characters/${c1}`, P1, { hpCurrent: 50 });
const l4 = (await call("POST", R, M, { sceneId: SID })).j.run;
await call("POST", `${R}/${l4.id}/join`, P1, { characterId: c1 });
const st4 = await call("POST", `${R}/${l4.id}/start`, M);
await sleep(Math.max(0, Number(st4.j.run.startsAt) + 1000 + 3000 + 3000 - Date.now()) + 500);
const r4 = (await call("GET", `${R}/${l4.id}`, M)).j;
check(r4.run.status === "finished" && r4.players[0].result === "alive", "passou do fim + folga: o servidor encerra sozinho, jogador conta como sobrevivente");
console.log(`\n${n - fail}/${n} verificações passaram` + (fail ? ` — ${fail} FALHA(S)` : " — TUDO OK"));
process.exit(fail ? 1 : 0);
