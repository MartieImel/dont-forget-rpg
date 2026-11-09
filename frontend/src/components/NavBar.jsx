import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header
      style={{
        borderBottom: "2px solid var(--border-bright)",
        background: "var(--bg-void)",
      }}
    >
      <div
        className="container"
        style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <Link to={user ? "/home" : "/"} style={{ textDecoration: "none" }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "12px",
              color: "var(--text)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ color: "var(--accent-red)" }}>♥</span>
            DON'T FORGET
          </span>
        </Link>
        {user && (
          <div className="row" style={{ gap: "14px" }}>
            <span className="muted" style={{ fontSize: "12px" }}>
              {user.displayName}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Sair
            </button>
          </div>
        )}
      </div>
      <div className="checker-strip" style={{ margin: 0 }} aria-hidden="true" />
    </header>
  );
}
