import { useNavigate } from "react-router-dom";

// Aviso de que há uma Cena de Fuga lançada (sala de espera ou em andamento).
export default function EscapeBanner({ campaignId, active, master }) {
  const navigate = useNavigate();
  if (!active) return null;
  const lobby = active.status === "lobby";
  const text = master
    ? lobby ? "sala de espera aberta" : "em andamento"
    : lobby ? "o mestre lançou! Entre agora" : "em andamento";
  const action = master ? "Abrir" : lobby ? "Entrar" : "Acompanhar";
  return (
    <div className="live-banner" role="status" data-testid="escape-banner">
      <span>
        ⚔ Cena de Fuga <strong>{active.sceneName}</strong> — {text}
      </span>
      <button className="btn btn-sm btn-gold" onClick={() => navigate(`/campaigns/${campaignId}/fuga/ao-vivo/${active.id}`)}>
        {action}
      </button>
    </div>
  );
}
