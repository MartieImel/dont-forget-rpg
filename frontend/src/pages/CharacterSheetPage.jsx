import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import BattleBox from "../components/BattleBox";
import CharacterTabBar from "../components/CharacterTabBar";
import TabPersonagem from "../components/tabs/TabPersonagem";
import TabEquipamentoStatus from "../components/tabs/TabEquipamentoStatus";
import TabMagias from "../components/tabs/TabMagias";
import TabInfo from "../components/tabs/TabInfo";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { useGameData } from "../hooks/useGameData";
import { computeStatus } from "../gameDataHelpers";
import { soulColor, elementColor } from "../soulColors";

const EMPTY_ATTRS = { GRR: 0, ESP: 0, FRM: 0, CHR: 0, RPZ: 0, MRL: 0 };

function emptyForm(periciasRef) {
  const pericias = {};
  (periciasRef || []).forEach((p) => (pericias[p.key] = 0));
  return {
    name: "",
    titulo: "",
    race: "Humano",
    tracoOuElemento: "",
    classe: "",
    subclasse: "",
    level: 1,
    lv: 1,
    karma: 0,
    attrs: { ...EMPTY_ATTRS },
    pericias,
    periciaBonusClasse: "",
    hpCurrent: 70,
    hpMax: 70,
    hpBonusManual: 0,
    hopeCurrent: 5,
    hopeMax: 5,
    hopeBonusManual: 0,
    atkBonus: 0,
    defBonus: 0,
    magBonus: 0,
    inventory: [],
    equipment: {},
    abilities: [],
    abilitiesExtra: "",
    aspectos: [],
    historia: "",
    personalidade: "",
    aparencia: "",
    notes: "",
    portraitUrl: "",
  };
}

export default function CharacterSheetPage() {
  const { id } = useParams();
  const location = useLocation();
  const importNotes = (location.state && location.state.importNotes) || null;
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { user } = useAuth();
  const gameData = useGameData();

  const [form, setForm] = useState(null);
  const [ownerId, setOwnerId] = useState(null);
  const [editable, setEditable] = useState(true);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("personagem");

  useEffect(() => {
    if (!gameData) return;
    if (isNew) {
      const base = emptyForm(gameData.PERICIAS);
      const draft = location.state && location.state.draft;
      // rascunho vindo da importação do Survey: sobrepõe o formulário vazio
      setForm(draft ? { ...base, ...draft, pericias: { ...base.pericias, ...draft.pericias } } : base);
      setOwnerId(user?.id);
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .getCharacter(id)
      .then((data) => {
        if (cancelled) return;
        setForm(data.character);
        setOwnerId(data.character.ownerId);
        setEditable(data.editable);
      })
      .catch((err) => setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew, gameData]);

  const classeInfo = useMemo(
    () => (gameData && form ? gameData.CLASSES.find((c) => c.key === form.classe) : null),
    [gameData, form?.classe]
  );

  const suggestedStatus = useMemo(() => {
    if (!form || !gameData) return null;
    return computeStatus(
      form.attrs,
      form.classe,
      gameData.CLASSES,
      form.hpBonusManual,
      form.hopeBonusManual,
      form.level,
      form.lv
    );
  }, [form, gameData]);

  function set(patch) {
    setForm((f) => ({ ...f, ...patch }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) {
      setError("Dê um nome ao personagem.");
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const res = await api.createCharacter(form);
        setSaved(true);
        setTimeout(() => navigate(returnTo ? returnTo : `/characters/${res.character.id}`), 400);
      } else {
        const res = await api.updateCharacter(id, form);
        setForm(res.character);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Excluir "${form.name}" permanentemente?`)) return;
    try {
      await api.deleteCharacter(id);
      navigate("/home");
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading || !gameData || !form) {
    return <div className="container center-screen muted">Carregando ficha...</div>;
  }

  const isMasterEditing = ownerId && user && ownerId !== user.id;

  return (
    <div className="container stack">
      <div className="row-between">
        <div>
          <span className="eyebrow">{isNew ? "NOVO RECEPTÁCULO" : "FICHA DE PERSONAGEM"}</span>
          <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!isNew && form.race && (
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background:
                    form.race === "Humano"
                      ? soulColor(form.tracoOuElemento)
                      : form.race === "Monstro"
                      ? elementColor(form.tracoOuElemento)
                      : "var(--accent-cyan)",
                }}
              />
            )}
            {isNew ? "Criar personagem" : form.name || "Personagem"}
          </h1>
        </div>
        <div className="btn-row">
          {saved && <span style={{ color: "var(--accent-green)", fontSize: 12 }}>Salvo ✓</span>}
          {!isNew && form.ownerId === user?.id && (
            <button className="btn btn-danger btn-sm" onClick={handleDelete}>
              Excluir
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(returnTo || "/home")}>
            Voltar
          </button>
        </div>
      </div>

      {isMasterEditing && (
        <BattleBox tight accent="gold">
          <span style={{ fontSize: 12 }}>Você está vendo isso como mestre da campanha deste personagem.</span>
        </BattleBox>
      )}

      {importNotes && importNotes.length > 0 && (
        <BattleBox tight accent="gold">
          <strong style={{ fontSize: 12 }}>IMPORTADO DO SURVEY — ajustes automáticos</strong>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>
            {importNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
          <p className="hint" style={{ marginTop: 8 }}>
            Nada foi salvo ainda: revise as abas e clique em "Salvar ficha".
          </p>
        </BattleBox>
      )}

      <CharacterTabBar active={activeTab} onChange={setActiveTab} />

      <form onSubmit={handleSave} className="stack">
        <fieldset disabled={!editable} style={{ border: "none", padding: 0, margin: 0 }}>
          {activeTab === "personagem" && (
            <TabPersonagem form={form} set={set} gameData={gameData} isNew={isNew} />
          )}
          {activeTab === "equipamento" && (
            <TabEquipamentoStatus form={form} set={set} suggestedStatus={suggestedStatus} />
          )}
          {activeTab === "magias" && <TabMagias form={form} set={set} />}
          {activeTab === "info" && (
            <TabInfo form={form} set={set} gameData={gameData} classeInfo={classeInfo} />
          )}
        </fieldset>

        {error && <p className="error-text">{error}</p>}
        {editable && (
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: "flex-start" }}>
            {saving ? "Salvando..." : "Salvar ficha"}
          </button>
        )}
      </form>
    </div>
  );
}
