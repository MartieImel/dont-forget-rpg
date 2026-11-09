# Don't Forget — Caderno de Receptáculo

Site para gerenciar personagens e campanhas do **Don't Forget RPG** (regras v0.5.2).
Cada pessoa cria sua conta e seus personagens; quem cria uma campanha vira o **mestre**
(vê NPCs, inimigos e as fichas de todos); os jogadores entram com um **código** e escolhem
qual personagem vai jogar.

**Stack:** React + Vite (site, Vercel) · Node/Express (API, Render) · PostgreSQL (banco, Neon).

```
dfrpg/
  backend/     API (Express + Postgres)
  frontend/    Site (React + Vite)
  render.yaml  Receita de deploy do Render (só a API)
  DEPLOY.md    Passo a passo da publicação (Neon + Render + Vercel)
```

---

## Publicar online — 100% grátis (Neon + Render + Vercel)

| Peça | Onde | O quê |
|---|---|---|
| Banco de dados | **Neon** | Postgres (nada se perde quando a API dorme) |
| API | **Render** | `backend/` (Node/Express) |
| Site | **Vercel** | `frontend/` (React + Vite) |

O passo a passo completo, com os comandos, as variáveis de cada lugar, um teste automático e a tabela de problemas
comuns, está em **[DEPLOY.md](DEPLOY.md)**. Resumo da ordem: `Neon → GitHub → Render → Vercel → liberar o site na API
(CORS) → testar com npm run smoke`.

Depois de no ar, `cd backend && BASE_URL=https://SUA-API.onrender.com FRONTEND_ORIGIN=https://SEU-SITE.vercel.app npm run smoke`
confere banco, API e CORS de ponta a ponta.

---

## Rodar no seu computador (desenvolvimento)

Precisa do [Node.js](https://nodejs.org) 20+ e de uma string de conexão Postgres
(a mesma do Neon serve; ou um Postgres local).

```bash
# backend
cd backend
cp .env.example .env     # edite: cole as strings do Neon (ou de um Postgres local) e invente um JWT_SECRET
                         # (o backend também lê o .env.local que o `neon env pull` grava na raiz do projeto)
npm install
npm run dev              # http://localhost:4000

# frontend (outro terminal)
cd frontend
npm install
npm run dev              # http://localhost:5173
```

O site aponta para `http://localhost:4000/api` por padrão. Para outro endereço, crie
`frontend/.env` com `VITE_API_URL=https://seu-backend/api`.

---

## Tabuleiro tático

Na tela da campanha, **Abrir tabuleiro**. O mestre cria um ou mais tabuleiros (tamanho, nome e imagem de
fundo por link `https://...`), escolhe qual está **ativo** (é o que os jogadores veem), adiciona as fichas
dos jogadores e NPCs/inimigos, e passa os turnos.

- **Mover:** clique na sua ficha e depois numa casa; ou arraste a ficha; ou use as **setas do teclado**
  (Esc solta a seleção). Funciona com mouse e com toque. **+ / −** mudam o tamanho das casas.
- **Alcance por turno = movimento base da campanha (padrão 3) + Rapidez da ficha.** A distância conta
  diagonal como 1 casa. O alcance é medido a partir de onde a ficha estava **no começo do turno** — dá pra
  reposicionar à vontade dentro dele. O mestre muda o movimento base no painel e passa o turno com
  **Passar turno**, o que zera o ponto de partida de todo mundo.
- **Jogador** só move a própria ficha, nunca para casa ocupada. **Mestre** move qualquer ficha para
  qualquer casa livre, sem limite de alcance.
- **Inimigos e NPCs só aparecem para os jogadores quando marcados como "Revelado"** na tela da campanha:
  o servidor nem envia os ocultos (nem o nome) aos jogadores. O HP de inimigos só o mestre vê.
- A tela se atualiza sozinha a cada ~1,5 s. O movimento é validado no servidor.
- Limitação conhecida: o alcance é em linha reta, sem paredes/obstáculos.

## Cenas de Fuga (bullet hell)

Cenas em que os jogadores **jogam de verdade**, controlando a alma dentro de uma caixa para desviar dos ataques que o
mestre montou. **Setas ou WASD** movem, **Shift** deixa lento e preciso, e no celular basta **arrastar o dedo na tela**.
Só o pontinho branco no meio do coração machuca. Cada acerto tira um **dano fixo por encontro** (definido pelo mestre na
cena) e dá 1 s de invulnerabilidade.

**6 tipos de ataque**

| Tipo | O que faz |
|---|---|
| Bala | Sai de um ponto com direção e velocidade. |
| Rajada | Várias balas em círculo ou em leque, em vários anéis; com giro entre os anéis vira **espiral**. |
| Órbita | Balas girando em volta de um ponto (que pode andar à deriva, com raio crescente). |
| Perseguidor | Persegue a alma devagar, com curva limitada. **Curva 0 = tiro mirado** na alma. |
| Parede | Barra que atravessa a caixa com uma brecha (4 direções). |
| Laser | Faixa horizontal ou vertical que **avisa** (tracejado vermelho) antes de disparar. |

Rajada, órbita e perseguidor aparecem 0,3 s como um aviso tracejado e inofensivo antes de machucar.

**Editor do mestre** — botão **Editor de Fugas** no tabuleiro (ou `/campaigns/ID/fuga`):
- Escolha uma ferramenta e **clique no palco** para pôr o item no instante atual; **arraste** para definir a direção da
  bala, o leque da rajada ou o raio da órbita. Com **Selecionar**, clique num item para editar e arraste para mover;
  **clicar de novo** no mesmo ponto alterna entre itens empilhados. **Del** apaga, **Esc** volta a Selecionar.
- O formulário do item mostra todos os campos. A **linha do tempo** e o **slider** mostram a cena em qualquer instante
  (itens que ainda não apareceram ficam como marcadores), e **▶ Prévia** roda a cena sozinha.
- **Testar jogando** abre a cena para você mesmo jogar. **Dá pra vencer?** confere por prova matemática se existe um
  caminho seguro do começo ao fim (perseguidores ficam fora da prova, porque dependem de cada jogador).
- **Biblioteca:** salve cenas na campanha (até 50); os jogadores da campanha podem ler, só o mestre edita.
  **Exportar/Importar JSON** serve de backup. O editor avisa antes de sair com alterações não salvas.
- Limites (o servidor revalida tudo): 400 itens, 6000 balas no total, até 120 s por cena.

**Laboratório** (`/fuga/teste`, botão no tabuleiro): duas cenas de demonstração jogáveis, com HP e dano ajustáveis.

Por baixo há um motor de simulação puro e determinístico (`frontend/src/escape/engine.js`): a posição de cada projétil é
uma função do tempo, então vários aparelhos podem rodar a mesma cena sincronizados só sabendo "começou em tal instante".
Os testes rodam sem instalar nada extra: `cd frontend && npm run test:engine`.

**Ainda não existe:** o mestre **lançar** a cena para os jogadores da campanha (com o HP real das fichas e o início
sincronizado). É o próximo passo.

## Importar ficha do Survey Program (.txt)

Na Home, em **Meus Personagens → Importar .txt**, escolha o arquivo `Receptaculo_...txt` que o
`SURVEY_PROGRAM.EXE` salvou na Área de Trabalho. A ficha abre já preenchida e **nada é salvo até você
clicar em "Salvar ficha"**. O personagem fica na conta de quem importa.

Fichas feitas com versões antigas do `.exe` (12 pontos de atributo) são adaptadas às regras atuais:
atributos reduzidos proporcionalmente até 10 pontos (teto 4), perícias ajustadas ao teto e ao orçamento
de cada atributo, e a trilha "Sanguessuga" vira "Vampiro". Um aviso na tela lista tudo que foi mudado.
Como o Survey antigo não pedia o bônus de perícia da Classe, ele precisa ser escolhido na aba Info.

## Como jogar

1. Cada jogador cria conta e monta personagens em **Meus Personagens** (criação estilo
   SURVEY_PROGRAM.EXE, ou preenchimento manual).
2. Quem for mestrar clica em **Criar campanha** e passa o código de 6 caracteres.
3. Os jogadores usam **Entrar em campanha**, colam o código e escolhem um personagem livre.
4. O mestre cria NPCs/inimigos e marca **Revelado** pra que os jogadores passem a vê-los.
5. Pontos de Tensão (TP) são compartilhados; HP/HOPE podem ser ajustados na tela da campanha.

## Regras implementadas (livro v0.5.2)

- Atributos: 10 pontos no Nível 1 (+2 por Nível até o 6, +5 no 7); limite por atributo 4 no Nível 1, +1 por Nível.
- Perícias: teto por perícia = metade do limite de atributo; a soma das perícias de um atributo não passa do valor dele.
- HP = HP da Classe + DEF + 15 por Nível a partir do Nível 2 + 5 por ponto de LOVE além do primeiro (+ bônus manual).
  LOVE também dá +2 ATK e +2 DEF por ponto além do primeiro.
- 15 Elementos de Monstro; Curandeiro com HP base 80; trilha "Vampiro".
- Bônus de perícia da Classe: +1 em uma de 3 perícias à escolha (aba Info e passo no Survey). Soma por cima
  dos seus pontos e não usa o orçamento (o livro diz que bônus de Classe não podem ser redistribuídos).
- **Ainda não implementado:** o bônus de atributo da Classe (ex.: Ator +1 Charme / −1 Garra), que o livro
  permite passar do limite de atributo.
- Magias, Habilidades, Aspectos e itens são listas livres (você adiciona o que escolheu no livro).

## Personalização (arquivos que você solta nas pastas do frontend)

| O quê | Onde (dentro de `frontend/public/`) |
|---|---|
| Música da criação de personagem | `audio/survey-theme.mp3` |
| Fundo da criação de personagem | `images/survey-background.gif` (ou `.png` / `.jpg`) |
| Ícones das 4 abas da ficha | `images/tabs/personagem.png`, `equipamento.png`, `magias.png`, `info.png` |

Sem esses arquivos o site funciona normalmente (sem música, fundo padrão, emojis nas abas).
Depois de adicionar, faça um novo deploy (ou `npm run build`).

## Segurança

Feito para uma mesa de amigos, não para escala comercial. Senhas são guardadas com hash (bcrypt) e
o login usa JWT, mas não há recuperação de senha por e-mail. Use um `JWT_SECRET` longo e secreto.
