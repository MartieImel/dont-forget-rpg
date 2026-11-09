import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SurveyWindow from "../components/SurveyWindow";
import SurveyMenu from "../components/SurveyMenu";
import KeyboardNameInput from "../components/KeyboardNameInput";
import AttributeGrid from "../components/AttributeGrid";
import { api } from "../api";
import { useGameData } from "../hooks/useGameData";
import { useTypewriter } from "../hooks/useTypewriter";
import { useSurveyMusic } from "../hooks/useSurveyMusic";
import { useSurveyBackground } from "../hooks/useSurveyBackground";
import { computeStatus } from "../gameDataHelpers";
import { soulColor, elementColor } from "../soulColors";
import { RACE_OPTIONS, TRACO_FLAVOR, ATTR_QUESTIONS, ORIGEM_OPTIONS, CONSENT_STEPS } from "../surveyContent";

const EMPTY_ATTRS = { GRR: 0, ESP: 0, FRM: 0, CHR: 0, RPZ: 0, MRL: 0 };

function buildSteps(race) {
  const steps = ["boot", "name", "race"];
  if (race === "Humano") steps.push("traco");
  else if (race === "Monstro") steps.push("elemento");
  else if (race === "Darkner") steps.push("origem");
  steps.push("classe", "subclasse", "bonus");
  ATTR_QUESTIONS.forEach((_, i) => steps.push(`q${i}`));
  CONSENT_STEPS.forEach((_, i) => steps.push(`consent${i}`));
  steps.push("review");
  return steps;
}

export default function SurveyCreatePage() {
  const navigate = useNavigate();
  const gameData = useGameData();
  const { muted, toggleMuted, ensurePlaying } = useSurveyMusic();
  const backgroundUrl = useSurveyBackground();

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({
    name: "",
    race: "Humano",
    tracoOuElemento: "",
    classe: "",
    subclasse: "",
    periciaBonusClasse: "",
    origem: "",
  });
  const [quizAnswers, setQuizAnswers] = useState({});
  const [manualAttrs, setManualAttrs] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const steps = useMemo(() => buildSteps(answers.race), [answers.race]);
  const stepId = steps[Math.min(stepIndex, steps.length - 1)];

  const classeInfo = useMemo(
    () => (gameData ? gameData.CLASSES.find((c) => c.key === answers.classe) : null),
    [gameData, answers.classe]
  );

  const quizAttrs = useMemo(() => {
    const base = { ...EMPTY_ATTRS };
    Object.values(quizAnswers).forEach((attr) => {
      if (attr) base[attr] = Math.min(5, base[attr] + 2);
    });
    return base;
  }, [quizAnswers]);

  useEffect(() => {
    setManualAttrs(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(quizAnswers)]);

  const effectiveAttrs = manualAttrs || quizAttrs;

  function advance() {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }
  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }
  function patch(fields) {
    setAnswers((a) => ({ ...a, ...fields }));
  }

  const prompt = useMemo(() => {
    if (!gameData) return "";
    switch (stepId) {
      case "boot":
        return "CARREGANDO SURVEY_PROGRAM.EXE...\n\nESTE QUESTIONÁRIO VAI MOLDAR O SEU RECEPTÁCULO.";
      case "name":
        return "NAME YOUR VESSEL.";
      case "race":
        return `PRAZER, ${answers.name || "RECEPTÁCULO"}.\nO QUE VOCÊ É?`;
      case "traco":
        return "TODO HUMANO CARREGA UM FRAGMENTO\nDE SI NAS PROFUNDEZAS DA ALMA.\nQUAL FRAGMENTO É O SEU?";
      case "elemento":
        return "SUA ALMA RESSOA COM UM ELEMENTO\nDA NATUREZA. QUAL ELEMENTO TE CHAMA?";
      case "origem":
        return "VOCÊ NASCEU DO CORAÇÃO DE UMA FONTE\nNEGRA, MOLDADO POR UM SONHO.\nQUE SONHO FOI ESSE?";
      case "classe":
        return "COMO VOCÊ PREFERE AGIR NO MUNDO?";
      case "subclasse":
        return `DENTRO DO CAMINHO DE ${answers.classe?.toUpperCase()},\nQUAL TRILHA É A SUA?`;
      case "bonus":
        return `UM(A) ${answers.classe?.toUpperCase()} SE DESTACA EM ALGO.\nEM QUAL PERÍCIA VOCÊ É MELHOR?\n(+1 NA ESCOLHIDA)`;
      case "review":
        return `TUDO PRONTO, ${answers.name || "RECEPTÁCULO"}.\nCONFIRA SUA FICHA ANTES DE GRAVAR.`;
      default:
        if (/^q\d$/.test(stepId)) {
          return ATTR_QUESTIONS[Number(stepId.slice(1))].prompt.toUpperCase();
        }
        if (/^consent\d$/.test(stepId)) {
          return CONSENT_STEPS[Number(stepId.slice(7))].prompt;
        }
        return "";
    }
  }, [stepId, answers, gameData]);

  const { shown, done, skip } = useTypewriter(prompt, 14);

  // Monta as opções do menu de coração para o passo atual.
  const menuOptions = useMemo(() => {
    if (!gameData) return [];
    switch (stepId) {
      case "boot":
        return [{ key: "start", label: "Iniciar", onSelect: () => (ensurePlaying(), advance()) }];
      case "race":
        return RACE_OPTIONS.map((r) => ({
          key: r.key,
          label: r.key,
          sub: r.sub,
          onSelect: () => {
            patch({ race: r.key, tracoOuElemento: "" });
            advance();
          },
        }));
      case "traco":
        return gameData.TRACOS_HUMANOS.map((t) => ({
          key: t,
          label: t,
          sub: TRACO_FLAVOR[t],
          dot: true,
          color: soulColor(t),
          onSelect: () => {
            patch({ tracoOuElemento: t });
            advance();
          },
        }));
      case "elemento":
        return gameData.ELEMENTOS_MONSTRO.map((el) => ({
          key: el.key,
          label: el.key,
          sub: `fraqueza: ${el.fraqueza} · vantagem: ${el.vantagem}`,
          dot: true,
          color: elementColor(el.key),
          onSelect: () => {
            patch({ tracoOuElemento: el.key });
            advance();
          },
        }));
      case "origem":
        return ORIGEM_OPTIONS.map((o) => ({
          key: o,
          label: o,
          onSelect: () => {
            patch({ origem: o === "Prefiro não dizer." ? "" : o });
            advance();
          },
        }));
      case "classe":
        return gameData.CLASSES.map((c) => ({
          key: c.key,
          label: c.key,
          sub: `"${c.lema}"`,
          onSelect: () => {
            patch({ classe: c.key, subclasse: "", periciaBonusClasse: "" });
            advance();
          },
        }));
      case "subclasse":
        return classeInfo
          ? classeInfo.subclasses.map((s) => ({
              key: s,
              label: s,
              onSelect: () => {
                patch({ subclasse: s });
                advance();
              },
            }))
          : [];
      case "bonus":
        return classeInfo
          ? classeInfo.periciaOpcoesKeys.map((key) => {
              const per = gameData.PERICIAS.find((x) => x.key === key);
              return {
                key,
                label: per ? per.name : key,
                sub: per ? `ligada a ${per.attr}` : "",
                onSelect: () => {
                  patch({ periciaBonusClasse: key });
                  advance();
                },
              };
            })
          : [];
      default:
        if (/^q\d$/.test(stepId)) {
          return ATTR_QUESTIONS[Number(stepId.slice(1))].options.map((opt) => ({
            key: opt.attr,
            label: opt.label,
            onSelect: () => {
              setQuizAnswers((qa) => ({ ...qa, [stepId]: opt.attr }));
              advance();
            },
          }));
        }
        if (/^consent\d$/.test(stepId)) {
          return CONSENT_STEPS[Number(stepId.slice(7))].options.map((label, i) => ({
            key: `${stepId}-${i}`,
            label,
            onSelect: advance,
          }));
        }
        return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId, gameData, answers, classeInfo]);

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      const pericias = {};
      gameData.PERICIAS.forEach((p) => (pericias[p.key] = 0));
      const historiaSeed =
        answers.race === "Darkner" && answers.origem ? `Nasceu de ${answers.origem.toLowerCase()}` : "";
      const payload = {
        name: answers.name.trim(),
        race: answers.race,
        tracoOuElemento: answers.race === "Darkner" ? "" : answers.tracoOuElemento,
        classe: answers.classe,
        subclasse: answers.subclasse,
        periciaBonusClasse: answers.periciaBonusClasse,
        level: 1,
        lv: 1,
        karma: 0,
        attrs: effectiveAttrs,
        pericias,
        inventory: [],
        equipment: {},
        abilities: [],
        aspectos: [],
        historia: historiaSeed,
        personalidade: "",
        aparencia: "",
        notes: "",
      };
      const res = await api.createCharacter(payload);
      navigate(`/characters/${res.character.id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (!gameData) {
    return (
      <div className="container center-screen">
        <SurveyWindow>
          <div className="survey-text">Carregando...</div>
        </SurveyWindow>
      </div>
    );
  }

  const progressDots = steps.slice(1, -1).map((_, i) => i < stepIndex - 1);

  return (
    <div className="container">
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div className="row-between" style={{ marginBottom: 12 }}>
          <span className="eyebrow" style={{ marginBottom: 0 }}>
            NOVO RECEPTÁCULO
          </span>
          {stepId === "boot" && (
            <Link to="/characters/new/manual" className="link-button" style={{ fontSize: 11 }}>
              prefiro preencher manualmente
            </Link>
          )}
        </div>

        <div className="bg-upload-row" style={{ marginBottom: 10 }}>
          <button type="button" className="link-button" style={{ fontSize: 11 }} onClick={toggleMuted}>
            {muted ? "🔇 música desligada" : "🔈 música ligada"}
          </button>
        </div>

        <SurveyWindow
          progress={stepId !== "boot" && stepId !== "review" ? progressDots : null}
          backgroundUrl={backgroundUrl}
        >
          <div onClick={() => !done && skip()} style={{ cursor: done ? "default" : "pointer" }}>
            <div className="survey-text">
              {shown}
              {!done && <span className="survey-cursor">&nbsp;</span>}
            </div>
          </div>

          {done && stepId === "name" && (
            <KeyboardNameInput initialValue={answers.name} onConfirm={(v) => (patch({ name: v }), advance())} />
          )}

          {done && stepId === "review" && (
            <ReviewStep
              answers={answers}
              attrs={effectiveAttrs}
              gameData={gameData}
              onAttrsChange={setManualAttrs}
              onSubmit={handleSubmit}
              submitting={submitting}
              error={error}
            />
          )}

          {done && stepId !== "name" && stepId !== "review" && (
            <SurveyMenu options={menuOptions} resetKey={stepId} />
          )}

          {stepIndex > 0 && stepId !== "review" && (
            <button type="button" className="link-button" style={{ fontSize: 11, alignSelf: "flex-start" }} onClick={goBack}>
              ‹ voltar
            </button>
          )}
        </SurveyWindow>
      </div>
    </div>
  );
}

function ReviewStep({ answers, attrs, gameData, onAttrsChange, onSubmit, submitting, error }) {
  const status = computeStatus(attrs, answers.classe, gameData.CLASSES);
  const traitColor =
    answers.race === "Humano"
      ? soulColor(answers.tracoOuElemento)
      : answers.race === "Monstro"
      ? elementColor(answers.tracoOuElemento)
      : "var(--accent-cyan)";

  return (
    <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text)" }}>
      <div className="row" style={{ gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <span className="pill">{answers.name}</span>
        <span className="pill" style={{ borderColor: traitColor, color: traitColor }}>
          {answers.race}
          {answers.tracoOuElemento ? ` · ${answers.tracoOuElemento}` : ""}
        </span>
        <span className="pill">
          {answers.classe} · {answers.subclasse}
        </span>
      </div>

      <div className="box box-tight" style={{ marginBottom: 14 }}>
        <AttributeGrid attrs={attrs} onChange={onAttrsChange} level={1} attributesRef={gameData.ATTRIBUTES} />
      </div>

      <div className="row" style={{ gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
        <span className="pill">ATK {status.atk}</span>
        <span className="pill">DEF {status.def}</span>
        <span className="pill">MAG {status.mag}</span>
        <span className="pill">HP {status.hpMax}</span>
        <span className="pill">HOPE {status.hope}</span>
      </div>

      {error && <p className="error-text">{error}</p>}

      <button type="button" className="btn btn-primary" disabled={submitting} onClick={onSubmit}>
        {submitting ? "Gravando..." : "✦ Gravar Receptáculo"}
      </button>
    </div>
  );
}
