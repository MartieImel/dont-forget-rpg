import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BattleBox from "../components/BattleBox";
import RosterCard from "../components/RosterCard";
import NpcCard from "../components/NpcCard";
import NpcCreateForm from "../components/NpcCreateForm";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { usePolling } from "../hooks/usePolling";

export default function CampaignDashboardPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logMessage, setLogMessage] = useState("");
  const [error, setError] = useState("");
  const [tpDraft, setTpDraft] = useState(null);

  const { data, reload } = usePolling(() => api.getCampaignState(id), 4000, [id]);

  if (!data) {
    return <div className="container center-screen muted">Carregando campanha...</div>;
  }

  const { campaign, role, characters, ownersByCharacterId, npcs, log } = data;
  const isMaster = role === "mestre";
  const tp = tpDraft !== null ? tpDraft : campaign.tensionPoints;

  async function handleCharacterUpdate(charId, patch) {
    await api.updateCharacter(charId, patch);
    reload();
  }

  async function handleCreateNpc(payload) {
    await api.createNpc(id, payload);
    reload();
  }

  async function handleUpdateNpc(npcId, patch) {
    await api.updateNpc(id, npcId, patch);
    reload();
  }

  async function handleDeleteNpc(npcId) {
    if (!confirm("Remover este NPC/inimigo?")) return;
    await api.deleteNpc(id, npcId);
    reload();
  }

  async function handleTpCommit(value) {
    const v = Math.max(0, Math.min(100, value));
    setTpDraft(v);
    try {
      await api.updateCampaignMeta(id, { tensionPoints: v });
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddLog(e) {
    e.preventDefault();
    if (!logMessage.trim()) return;
    try {
      await api.addLog(id, logMessage);
      setLogMessage("");
      reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLeave() {
    if (!confirm("Sair desta campanha? Seu personagem volta para 'livre'.")) return;
    await api.leaveCampaign(id);
    navigate("/home");
  }

  return (
    <div className="container stack">
      <div className="row-between">
        <div>
          <span className="eyebrow">{isMaster ? "VOCÊ É O MESTRE" : "VOCÊ ESTÁ JOGANDO"}</span>
          <h1>{campaign.name}</h1>
          {campaign.description && <p className="muted">{campaign.description}</p>}
        </div>
        <div className="btn-row">
          {!isMaster && (
            <button className="btn btn-ghost btn-sm" onClick={handleLeave}>
              Sair da campanha
            </button>
          )}
          <button className="btn btn-gold btn-sm" onClick={() => navigate(`/campaigns/${id}/board`)}>
            Abrir tabuleiro
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/home")}>
            Voltar
          </button>
        </div>
      </div>

      {isMaster && (
        <BattleBox tight accent="gold">
          <div className="row-between">
            <span className="muted" style={{ fontSize: 12 }}>
              Código para os jogadores entrarem:
            </span>
            <span className="code-display" style={{ padding: 0 }}>
              {campaign.code}
            </span>
          </div>
        </BattleBox>
      )}

      {/* Pontos de Tensão */}
      <BattleBox accent="red">
        <div className="row-between" style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>PONTOS DE TENSÃO (TP)</h2>
          <span className="muted" style={{ fontSize: 12 }}>
            Recurso compartilhado da equipe
          </span>
        </div>
        <div className="stat-bar-wrap">
          <span className="stat-bar-label">TP</span>
          <div className="stat-bar-track">
            <div className="stat-bar-fill tp" style={{ width: `${tp}%` }} />
          </div>
          <span className="stat-bar-value">{tp}%</span>
        </div>
        <div className="btn-row" style={{ marginTop: 10 }}>
          <button className="btn btn-sm" onClick={() => handleTpCommit(tp - 10)}>
            -10%
          </button>
          <button className="btn btn-sm" onClick={() => handleTpCommit(tp + 10)}>
            +10%
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => handleTpCommit(0)}>
            Zerar
          </button>
        </div>
      </BattleBox>

      {/* Grupo */}
      <BattleBox>
        <h2>GRUPO</h2>
        {characters.length === 0 && <p className="empty-state">Ninguém entrou na campanha ainda.</p>}
        <div className="grid grid-2">
          {characters.map((c) => (
            <RosterCard
              key={c.id}
              character={c}
              ownerName={ownersByCharacterId[c.id]}
              campaignId={id}
              canEdit={isMaster || c.ownerId === user.id}
              onUpdate={handleCharacterUpdate}
            />
          ))}
        </div>
      </BattleBox>

      {/* NPCs e inimigos */}
      <BattleBox accent={isMaster ? "gold" : undefined}>
        <div className="row-between" style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>NPCs E INIMIGOS</h2>
        </div>
        {npcs.length === 0 && (
          <p className="empty-state">
            {isMaster ? "Nenhum NPC ou inimigo criado ainda." : "Nada revelado pelo mestre ainda."}
          </p>
        )}
        <div className="grid grid-2">
          {npcs.map((n) => (
            <NpcCard key={n.id} npc={n} isMaster={isMaster} onUpdate={handleUpdateNpc} onDelete={handleDeleteNpc} />
          ))}
        </div>
        {isMaster && (
          <div style={{ marginTop: 12 }}>
            <NpcCreateForm onCreate={handleCreateNpc} />
          </div>
        )}
      </BattleBox>

      {/* Log da sessão */}
      <BattleBox>
        <h2>REGISTRO DA SESSÃO</h2>
        <form onSubmit={handleAddLog} className="row" style={{ gap: 8, marginBottom: 12 }}>
          <input
            style={{ flex: 1 }}
            placeholder="Anote um acontecimento..."
            value={logMessage}
            onChange={(e) => setLogMessage(e.target.value)}
          />
          <button className="btn btn-sm btn-primary" type="submit">
            Registrar
          </button>
        </form>
        {error && <p className="error-text">{error}</p>}
        <div className="stack" style={{ gap: 6, maxHeight: 260, overflowY: "auto" }}>
          {log.length === 0 && <p className="muted" style={{ fontSize: 12 }}>Nada registrado ainda.</p>}
          {log.map((entry) => (
            <div key={entry.id} style={{ fontSize: 12, borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
              <span style={{ color: "var(--accent-cyan)" }}>{entry.authorName}</span>{" "}
              <span className="muted">— {entry.message}</span>
            </div>
          ))}
        </div>
      </BattleBox>
    </div>
  );
}
