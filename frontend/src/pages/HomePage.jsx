import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BattleBox from "../components/BattleBox";
import { api } from "../api";
import { useGameData } from "../hooks/useGameData";
import { parseSurveyTxt, buildDraft } from "../importSurveyTxt";
import { useAuth } from "../context/AuthContext";
import { soulColor, elementColor } from "../soulColors";

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const gameData = useGameData();
  const importInputRef = useRef(null);
  const [importError, setImportError] = useState("");
  const [characters, setCharacters] = useState(null);
  const [mastered, setMastered] = useState(null);
  const [joined, setJoined] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinCharId, setJoinCharId] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  async function loadAll() {
    const [c, m, j] = await Promise.all([
      api.listCharacters(),
      api.listCampaignsAsMaster(),
      api.listCampaignsJoined(),
    ]);
    setCharacters(c.characters);
    setMastered(m.campaigns);
    setJoined(j.campaigns);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const freeCharacters = characters ? characters.filter((c) => !c.campaignId) : [];

  // Lê o .txt gerado pelo Survey Program, adapta às regras atuais e abre a
  // ficha já preenchida pra revisão (nada é salvo até clicar em "Salvar ficha").
  async function handleImportFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setImportError("");
    if (!gameData) {
      setImportError("Os dados do jogo ainda estão carregando. Tente de novo em um instante.");
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseSurveyTxt(text);
      if (!parsed.ok) {
        setImportError(parsed.error);
        return;
      }
      const { draft, notes } = buildDraft(parsed.raw, gameData);
      navigate("/characters/new/manual", { state: { draft, importNotes: notes } });
    } catch {
      setImportError("Não consegui ler esse arquivo.");
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    setJoinError("");
    if (!joinCharId) {
      setJoinError("Escolha qual personagem vai entrar na campanha.");
      return;
    }
    setJoinLoading(true);
    try {
      const res = await api.joinCampaign({ code: joinCode.trim().toUpperCase(), characterId: joinCharId });
      navigate(`/campaigns/${res.campaign.id}`);
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setJoinLoading(false);
    }
  }

  return (
    <div className="container stack">
      <div>
        <span className="eyebrow">BEM-VINDO(A) DE VOLTA</span>
        <h1>{user?.displayName}</h1>
      </div>

      <div className="grid grid-2">
        {/* Personagens */}
        <BattleBox>
          <div className="row-between">
            <h2>MEUS PERSONAGENS</h2>
            <div className="btn-row">
              <input ref={importInputRef} type="file" accept=".txt,text/plain" style={{ display: "none" }} onChange={handleImportFile} />
              <button type="button" className="btn btn-sm" onClick={() => importInputRef.current?.click()} title="Importar a ficha .txt gerada pelo Survey Program">
                Importar .txt
              </button>
              <Link to="/characters/new" className="btn btn-primary btn-sm">
                + Novo
              </Link>
            </div>
          </div>
          {importError && <p className="error-text">{importError}</p>}
          {characters === null && <p className="muted">Carregando...</p>}
          {characters && characters.length === 0 && (
            <p className="empty-state narration">Nenhum personagem ainda. Crie seu primeiro Receptáculo.</p>
          )}
          <div className="stack" style={{ gap: 10 }}>
            {characters &&
              characters.map((c) => {
                const dotColor =
                  c.race === "Humano"
                    ? soulColor(c.tracoOuElemento)
                    : c.race === "Monstro"
                    ? elementColor(c.tracoOuElemento)
                    : "var(--accent-cyan)";
                return (
                  <Link
                    key={c.id}
                    to={`/characters/${c.id}`}
                    className="box box-tight"
                    style={{ textDecoration: "none", display: "block" }}
                  >
                    <div className="row-between">
                      <div>
                        <strong style={{ color: "var(--text)" }}>{c.name}</strong>
                        <div className="muted" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              display: "inline-block",
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: dotColor,
                            }}
                          />
                          {c.race} {c.classe ? `· ${c.classe}` : ""} · Nível {c.level} · LV {c.lv}
                        </div>
                      </div>
                      {c.campaignId ? (
                        <span className="tag tag-equipped">Em campanha</span>
                      ) : (
                        <span className="tag">Livre</span>
                      )}
                    </div>
                  </Link>
                );
              })}
          </div>
        </BattleBox>

        {/* Campanhas que eu mestro */}
        <BattleBox accent="gold">
          <div className="row-between">
            <h2>CAMPANHAS QUE MESTRO</h2>
            <Link to="/campaigns/new" className="btn btn-gold btn-sm">
              + Criar
            </Link>
          </div>
          {mastered === null && <p className="muted">Carregando...</p>}
          {mastered && mastered.length === 0 && (
            <p className="empty-state narration">Você ainda não mestra nenhuma campanha.</p>
          )}
          <div className="stack" style={{ gap: 10 }}>
            {mastered &&
              mastered.map((c) => (
                <Link
                  key={c.id}
                  to={`/campaigns/${c.id}`}
                  className="box box-tight"
                  style={{ textDecoration: "none", display: "block" }}
                >
                  <strong style={{ color: "var(--text)" }}>{c.name}</strong>
                  <div className="muted" style={{ fontSize: 11 }}>
                    Código: <span style={{ color: "var(--accent-gold)" }}>{c.code}</span>
                  </div>
                </Link>
              ))}
          </div>
        </BattleBox>
      </div>

      <div className="grid grid-2">
        {/* Campanhas que participo */}
        <BattleBox>
          <h2>CAMPANHAS QUE PARTICIPO</h2>
          {joined === null && <p className="muted">Carregando...</p>}
          {joined && joined.length === 0 && <p className="empty-state narration">Você ainda não entrou em nenhuma campanha.</p>}
          <div className="stack" style={{ gap: 10 }}>
            {joined &&
              joined.map((c) => (
                <Link
                  key={c.id}
                  to={`/campaigns/${c.id}`}
                  className="box box-tight"
                  style={{ textDecoration: "none", display: "block" }}
                >
                  <strong style={{ color: "var(--text)" }}>{c.name}</strong>
                </Link>
              ))}
          </div>
        </BattleBox>

        {/* Entrar em campanha */}
        <BattleBox accent="red">
          <h2>ENTRAR EM CAMPANHA</h2>
          <p className="hint">Peça o código de 6 letras/números para o mestre.</p>
          <form onSubmit={handleJoin}>
            <div className="field">
              <label htmlFor="code">Código da sessão</label>
              <input
                id="code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="EX: ZEZKF4"
                style={{ textTransform: "uppercase", letterSpacing: 2 }}
                maxLength={8}
              />
            </div>
            <div className="field">
              <label htmlFor="charSelect">Personagem</label>
              <select id="charSelect" value={joinCharId} onChange={(e) => setJoinCharId(e.target.value)}>
                <option value="">Escolha um personagem livre...</option>
                {freeCharacters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.race})
                  </option>
                ))}
              </select>
              {freeCharacters.length === 0 && characters && (
                <span className="hint">Você precisa de um personagem sem campanha para entrar.</span>
              )}
            </div>
            {joinError && <p className="error-text">{joinError}</p>}
            <button type="submit" className="btn btn-primary" disabled={joinLoading}>
              {joinLoading ? "Entrando..." : "Entrar na campanha"}
            </button>
          </form>
        </BattleBox>
      </div>
    </div>
  );
}
