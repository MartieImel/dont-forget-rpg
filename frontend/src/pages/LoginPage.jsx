import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BattleBox from "../components/BattleBox";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
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
          <span className="eyebrow">ACESSO</span>
          <h1>ENTRAR</h1>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="username">Usuário</label>
              <input
                id="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <div className="btn-row" style={{ marginTop: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </div>
          </form>
          <p className="hint" style={{ marginTop: 18 }}>
            Não tem conta? <Link to="/register">Criar uma agora</Link>
          </p>
        </BattleBox>
      </div>
    </div>
  );
}
