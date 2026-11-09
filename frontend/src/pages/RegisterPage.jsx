import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BattleBox from "../components/BattleBox";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(username, password, displayName);
      navigate("/home");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container center-screen">
      <div style={{ maxWidth: 400, width: "100%" }}>
        <BattleBox>
          <span className="eyebrow">NOVO RECEPTÁCULO</span>
          <h1>CRIAR CONTA</h1>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="displayName">Nome de exibição</label>
              <input
                id="displayName"
                autoFocus
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Como os outros vão te ver na campanha"
              />
            </div>
            <div className="field">
              <label htmlFor="username">Usuário</label>
              <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </div>
            <div className="field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <span className="hint">Mínimo de 4 caracteres.</span>
            </div>
            {error && <p className="error-text">{error}</p>}
            <div className="btn-row" style={{ marginTop: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Criando..." : "Criar conta"}
              </button>
            </div>
          </form>
          <p className="hint" style={{ marginTop: 18 }}>
            Já tem conta? <Link to="/login">Entrar</Link>
          </p>
        </BattleBox>
      </div>
    </div>
  );
}
