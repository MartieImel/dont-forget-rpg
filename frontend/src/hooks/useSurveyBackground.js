import { useEffect, useState } from "react";

// Tenta, nessa ordem, achar um fundo que a pessoa tenha colocado em
// frontend/public/images/. Usa o primeiro que carregar com sucesso — se
// nenhum existir, retorna null e a tela fica com o fundo padrão.
const CANDIDATES = ["/images/survey-background.gif", "/images/survey-background.png", "/images/survey-background.jpg"];

export function useSurveyBackground() {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function tryNext(index) {
      if (cancelled || index >= CANDIDATES.length) return;
      const candidate = CANDIDATES[index];
      const img = new Image();
      img.onload = () => {
        if (!cancelled) setUrl(candidate);
      };
      img.onerror = () => tryNext(index + 1);
      img.src = candidate;
    }

    tryNext(0);
    return () => {
      cancelled = true;
    };
  }, []);

  return url;
}
