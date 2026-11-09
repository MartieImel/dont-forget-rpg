import TabIcon from "./TabIcon";

const TABS = [
  { key: "personagem", label: "Personagem", icon: "/images/tabs/personagem.png", fallback: "👤" },
  { key: "equipamento", label: "Equipamento & Status", icon: "/images/tabs/equipamento.png", fallback: "⚔️" },
  { key: "magias", label: "Magias e Habilidades", icon: "/images/tabs/magias.png", fallback: "🔥" },
  { key: "info", label: "Info & Anotações", icon: "/images/tabs/info.png", fallback: "📖" },
];

export default function CharacterTabBar({ active, onChange }) {
  return (
    <div className="char-tab-bar" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          className={`char-tab-btn ${active === tab.key ? "active" : ""}`}
          onClick={() => onChange(tab.key)}
          title={tab.label}
        >
          <TabIcon src={tab.icon} fallback={tab.fallback} alt={tab.label} />
          <span className="char-tab-label">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
