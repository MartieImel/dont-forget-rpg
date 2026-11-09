# Publicar o Don't Forget: Neon + Render + Vercel

Tudo grátis, sem cartão. Tempo total: **30 a 40 minutos**, na primeira vez.

```
 Jogadores (navegador)
        │  abrem o site
        ▼
 ┌──────────────┐  chama   ┌──────────────────┐  consulta  ┌────────────────┐
 │   VERCEL     │ ───────▶ │      RENDER      │ ─────────▶ │      NEON      │
 │ site (React) │          │ API (Node/Express)│            │ banco Postgres │
 │  frontend/   │          │     backend/     │            │                │
 └──────────────┘          └──────────────────┘            └────────────────┘
```

**Ordem importa** (cada passo precisa de uma informação do anterior):
`Neon → GitHub → Render → Vercel → amarrar (CORS) → testar`

### Onde cada variável mora

| Variável | Onde configurar | Valor |
|---|---|---|
| `DATABASE_URL` | Render | string **pooled** do Neon (host com `-pooler`) |
| `DATABASE_URL_UNPOOLED` | Render | string **direta** do Neon (sem `-pooler`) |
| `JWT_SECRET` | Render | texto longo e aleatório (o Blueprint gera sozinho) |
| `CORS_ORIGIN` | Render | URL exata do site na Vercel (no 1º deploy: `*`) |
| `VITE_API_URL` | Vercel | `https://SUA-API.onrender.com/api` (**com `/api` no fim**) |

---

## Passo 0 — Antes de começar (5 min)

- [ ] **Node.js 20 ou mais novo** no seu computador (`node -v`). Serve para a CLI da Neon e para os testes.
- [ ] Contas: **GitHub**, **Neon** (você já tem), **Render** e **Vercel**. Entrar nas duas últimas com o GitHub facilita.
- [ ] O zip `dont-forget-rpg-site.zip` extraído. Daqui em diante, `dfrpg/` é a pasta com `backend/`, `frontend/` e este arquivo.

---

## Passo 1 — Subir o código para o GitHub (5 min)

Crie um repositório **vazio** no GitHub (sem README, sem .gitignore), copie a URL dele e, na pasta `dfrpg/`:

```bash
git init -b main
git add .
git status            # CONFIRA: nenhum ".env.local" pode aparecer na lista
git commit -m "Don't Forget RPG"
git remote add origin https://github.com/SEU_USUARIO/dont-forget-rpg.git
git push -u origin main
```

- [ ] Conferir que não subiu segredo: `git ls-files | grep -i env` deve listar **só** `backend/.env.example`.

> O arquivo `.env.local` (que o Neon cria no Passo 2) tem a senha do banco. O `.gitignore` já o protege, mas confira.

---

## Passo 2 — Banco na Neon (10 min)

### 2A. Pela CLI (o caminho que o painel da Neon pediu)

Na pasta `dfrpg/` (a raiz, onde ficam `backend/` e `frontend/`):

```bash
npm i -g neon@latest        # se falhar, use  npx neon@latest  no lugar de  neon
neon login                  # abre o navegador: conclua o login lá e volte
neon init -y --org-id org-fancy-dust-73848655 --project-id super-cake-58862009 --branch production --services postgres
neon deploy                 # cria os serviços e grava as variáveis em .env.local
```

- O `neon login` vem **antes**. Sem ele o `init` avisa "Project linked, not verified" e não confirma nada.
- O `init` cria `neon.ts`, `.neon`, um `package.json` na raiz, `.agents/` e `skills-lock.json`. **Nenhum tem senha**; pode commitar.
- O `deploy` grava `.env.local` com **duas** strings. Se ele só gravar uma, rode `neon env pull`.
- Conferir sem mostrar a senha:
  ```bash
  grep -E "^DATABASE_URL(_UNPOOLED)?=" .env.local | sed 's#//[^@]*@#//***@#'
  ```
  Devem aparecer as duas linhas: uma com `-pooler` no endereço, outra sem.

**Por que duas?** A **pooled** (`DATABASE_URL`) aguenta muitas conexões curtas: é a que a API usa o tempo todo. A **direta** (`DATABASE_URL_UNPOOLED`) é usada só quando a API sobe, para criar/ajustar as tabelas (o pooler não é próprio para isso). O backend já faz essa divisão sozinho.

### 2B. Alternativa pelo painel (sem CLI)

Painel da Neon → seu projeto → **Connect** → escolha o branch `production`. Copie a string com **Connection pooling ligado** (→ `DATABASE_URL`) e depois com ele **desligado** (→ `DATABASE_URL_UNPOOLED`). Elas terminam em `?sslmode=require`; copie inteiras.

### 2C. Testar o banco no seu computador (recomendado)

```bash
cd backend
npm install
npm run dev          # lê ../.env.local sozinho; deve mostrar "Banco: tráfego via conexão pooled; esquema via conexão direta."
```
Em **outro terminal**, também em `backend/`:
```bash
npm run smoke
```
- [ ] Esperado: `13/13 verificações passaram — TUDO OK` (o teste de CORS só roda no Passo 6).

Na primeira subida a API cria as 8 tabelas sozinha. Se estiver tudo certo, pare o `npm run dev` (Ctrl+C).

---

## Passo 3 — API no Render (10 min)

### 3A. Pelo Blueprint (mais rápido)

1. Render → **New** → **Blueprint** → escolha o repositório. Ele lê o `render.yaml` e cria o serviço `dfrpg-api`.
2. Ele vai pedir os valores marcados no arquivo:
   - `DATABASE_URL` → a string **pooled**
   - `DATABASE_URL_UNPOOLED` → a string **direta**
   - `CORS_ORIGIN` → digite `*` por enquanto (você troca no Passo 5)
3. **Apply**.

### 3B. Manualmente (se preferir)

Render → **New** → **Web Service** → o repositório:

| Campo | Valor |
|---|---|
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |
| Instance Type | Free |

E em **Environment**, as variáveis da tabela do início (mais `NODE_VERSION` = `22`). Para o `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Conferir

- [ ] O deploy termina em **Live**. Copie a URL, algo como `https://dfrpg-api.onrender.com` (pode ter um sufixo).
- [ ] Abra `https://SUA-API.onrender.com/api/health`: deve mostrar `{"ok":true,"name":"Don't Forget RPG API"}`.
- [ ] Nos **Logs** devem aparecer `Banco: tráfego via conexão pooled; esquema via conexão direta.` e `rodando na porta ...`.

> **Plano grátis:** a API "dorme" depois de ~15 minutos sem uso, e a primeira chamada depois disso demora até 1 minuto. Os dados não se perdem (ficam na Neon).

---

## Passo 4 — Site na Vercel (10 min)

1. Vercel → **Add New** → **Project** → importe o mesmo repositório.
2. Em **Root Directory**, clique em **Edit** e escolha **`frontend`**. *(Se esquecer isso, o build falha.)*
3. **Framework Preset**: Vite (ele detecta sozinho; o `vercel.json` já traz o resto).
4. Em **Environment Variables**, adicione:
   - Nome: `VITE_API_URL`
   - Valor: `https://SUA-API.onrender.com/api` ← **com `/api` no final**
5. **Deploy**.

- [ ] Copie a URL do site, algo como `https://dont-forget-rpg.vercel.app`.

Notas:
- O `frontend/vercel.json` faz qualquer endereço (ex.: `/home`) abrir o site em vez de dar 404 ao recarregar a página.
- `VITE_API_URL` é gravada **na hora do build**: se mudar depois, faça **Redeploy**.
- O plano **Hobby** da Vercel é para uso pessoal/não comercial.

---

## Passo 5 — Amarrar: liberar o site na API (2 min)

Render → `dfrpg-api` → **Environment** → edite:

```
CORS_ORIGIN = https://dont-forget-rpg.vercel.app
```
(a URL **exata** do seu site, **sem barra no final**; para mais de um endereço, separe por vírgula). **Save**: o Render refaz o deploy sozinho (~1 min).

Sem isso o navegador bloqueia as chamadas do site à API ("blocked by CORS policy").

---

## Passo 6 — Provar que tudo funciona (5 min)

### 6A. Teste automático

No seu computador, em `backend/`:

```bash
# Mac / Linux
BASE_URL=https://SUA-API.onrender.com FRONTEND_ORIGIN=https://SEU-SITE.vercel.app npm run smoke
```
```powershell
# Windows (PowerShell)
$env:BASE_URL="https://SUA-API.onrender.com"; $env:FRONTEND_ORIGIN="https://SEU-SITE.vercel.app"; npm run smoke
```

- [ ] Esperado: `15/15 verificações passaram — TUDO OK`.
  - Se a API estiver dormindo, ele espera até ~100 s por ela.
  - Ele cria um usuário `smoke-...` e uma campanha "smoke" de teste (não dá para apagá-los pela API; ignore).
  - Se aparecer *"CORS aceita QUALQUER site"*, você ainda está com `*`: volte ao Passo 5.

### 6B. Roteiro no navegador (no site da Vercel)

- [ ] Criar conta e entrar
- [ ] Criar um personagem (as regras: 10 pontos de atributo, limite 4 por atributo)
- [ ] **Recarregar a página** estando em outra tela (não pode dar 404)
- [ ] Criar uma campanha e abrir o **Tabuleiro**
- [ ] No **Editor de Fugas**, montar uma cena, **Salvar**, recarregar a página e abrir da biblioteca
- [ ] Sair, entrar de novo e conferir que o personagem continua lá (é o banco da Neon funcionando)

---

## Dia a dia

- **Atualizar o site/API:** `git push`. A Vercel e o Render refazem o deploy sozinhos. Tabelas novas são criadas sozinhas na subida.
- **Evitar a API dormindo na hora do jogo:** crie um monitor gratuito em uptimerobot.com apontando para `https://SUA-API.onrender.com/api/health` a cada 5 minutos.
- **Trocar o `JWT_SECRET`** desloga todo mundo (os logins antigos deixam de valer).
- **Senha do banco vazou?** Neon → seu projeto → Roles → redefina a senha, rode `neon env pull` e atualize as duas variáveis no Render.
- **Nunca** suba `.env.local` para o GitHub nem cole strings de conexão em chats ou prints.

---

## Problemas comuns

| O que aparece | Causa provável | O que fazer |
|---|---|---|
| Login demora ~1 min no primeiro acesso do dia | API dormindo (plano grátis do Render) | Normal. Use o monitor do UptimeRobot. |
| Console: `blocked by CORS policy` ou `Failed to fetch` | `CORS_ORIGIN` diferente da URL exata do site (`http` vs `https`, barra no final, domínio errado) | Corrija no Render e confira com o `npm run smoke` do Passo 6. |
| O site tenta chamar `localhost:4000` | `VITE_API_URL` ausente ou errada **no momento do build** | Vercel → Settings → Environment Variables → corrija → **Redeploy**. |
| 404 ao recarregar uma página do site | Root Directory da Vercel não é `frontend` (o `vercel.json` não foi lido) | Settings → General → Root Directory = `frontend`. |
| Vercel: `vite: not found` ou `no package.json` | Mesmo problema: Root Directory errado | Idem. |
| Render: `Banco: ... não definida` ou erro de conexão | `DATABASE_URL` vazia | Preencha a variável e salve. |
| `password authentication failed` | String copiada errada ou senha redefinida | `neon env pull` (ou copie de novo do painel) e atualize no Render. |
| Erro de SSL / `no pg_hba.conf entry` | String sem `?sslmode=require` | Use a string inteira como a Neon entrega. |
| `relation "users" does not exist` | `DATABASE_URL` e `DATABASE_URL_UNPOOLED` apontam para bancos/branches **diferentes** | Devem ser o mesmo banco; só muda `-pooler`. |
| `too many connections` | Usando a string direta para tudo | Coloque a string **pooled** em `DATABASE_URL`. |
| Todo mundo deslogado de repente | `JWT_SECRET` mudou | Esperado; é só entrar de novo. |
| `neon init` mostra "Project linked, not verified" | Você não rodou `neon login` antes | `neon login` e repita o `neon init`. |
| `npm i -g neon@latest` falha | Permissão de instalação global | Use `npx neon@latest` no lugar de `neon`. |

---

## Checklist final

- [ ] Código no GitHub, sem `.env.local`
- [ ] Neon: `DATABASE_URL` (pooled) e `DATABASE_URL_UNPOOLED` (direta) em mãos
- [ ] Render: API **Live**, `/api/health` responde, logs sem erro
- [ ] Vercel: site no ar com `VITE_API_URL` terminando em `/api`
- [ ] Render: `CORS_ORIGIN` = URL exata do site
- [ ] `npm run smoke` com `15/15`
- [ ] Roteiro do navegador feito
