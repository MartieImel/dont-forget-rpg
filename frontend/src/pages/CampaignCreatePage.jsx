import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BattleBox from "../components/BattleBox";
import { api } from "../api";

export default function CampaignCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Dê um nome à campanha.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.createCampaign({ name, description });
      navigate(`/campaigns/${res.campaign.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container center-screen">
      <div style={{ maxWidth: 480, width: "100%" }}>
        <BattleBox accent="gold">
          <span className="eyebrow">VOCÊ SERÁ O MESTRE</span>
          <h1>NOVA CAMPANHA</h1>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">Nome da campanha</label>
              <input id="name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="description">Descrição / sinopse (opcional)</label>
              <textarea
                id="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <div className="btn-row">
              <button type="submit" className="btn btn-gold" disabled={loading}>
                {loading ? "Criando..." : "Criar campanha"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
                Cancelar
              </button>
            </div>
          </form>
        </BattleBox>
      </div>
    </div>
  );
}
