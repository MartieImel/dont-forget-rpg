import { Link } from "react-router-dom";
import BattleBox from "../components/BattleBox";

export default function LandingPage() {
  return (
    <div className="container center-screen">
      <div style={{ maxWidth: 480, width: "100%" }}>
        <BattleBox accent="red">
          <span className="eyebrow">SISTEMA · DON'T FORGET RPG</span>
          <h1>CADERNO DE RECEPTÁCULO</h1>
          <p className="muted" style={{ fontSize: 13 }}>
            Crie seus Receptáculos, guarde suas fichas e conduza (ou participe de) campanhas
            de Don't Forget — HP, LOVE, Nível, itens e tudo mais, salvos automaticamente.
          </p>
          <div className="btn-row" style={{ marginTop: 20 }}>
            <Link to="/login" className="btn btn-primary">
              Entrar
            </Link>
            <Link to="/register" className="btn">
              Criar conta
            </Link>
          </div>
        </BattleBox>
      </div>
    </div>
  );
}
