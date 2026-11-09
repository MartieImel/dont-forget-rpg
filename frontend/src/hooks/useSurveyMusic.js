import { useEffect, useRef, useState } from "react";

const TRACK_URL = "/audio/survey-theme.mp3";
const DEFAULT_VOLUME = 0.35;
const MUTE_STORAGE_KEY = "dfrpg_survey_muted";

function safePlay(audio) {
  try {
    const result = audio.play();
    if (result && typeof result.catch === "function") {
      result.catch(() => {});
    }
  } catch {
    // alguns ambientes não suportam play() plenamente — sem problema, ignora
  }
}

export function useSurveyMusic() {
  const audioRef = useRef(null);
  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem(MUTE_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Cria o áudio uma vez e tenta tocar assim que monta. Navegadores podem
  // bloquear autoplay com som antes de qualquer interação — nesse caso a
  // reprodução real só começa no clique de "Iniciar" (via ensurePlaying).
  useEffect(() => {
    const audio = new Audio(TRACK_URL);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = muted ? 0 : DEFAULT_VOLUME;
    audioRef.current = audio;
    safePlay(audio);

    return () => {
      const a = audioRef.current;
      if (!a) return;
      // fade-out rápido em vez de cortar a música seco ao sair da tela
      let vol = a.volume;
      const fade = setInterval(() => {
        vol -= 0.08;
        if (vol <= 0) {
          a.pause();
          a.currentTime = 0;
          clearInterval(fade);
        } else {
          a.volume = vol;
        }
      }, 40);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : DEFAULT_VOLUME;
    try {
      localStorage.setItem(MUTE_STORAGE_KEY, muted ? "1" : "0");
    } catch {
      // localStorage indisponível — sem problema, só não persiste a preferência
    }
  }, [muted]);

  function ensurePlaying() {
    const a = audioRef.current;
    if (a && a.paused) safePlay(a);
  }

  function toggleMuted() {
    setMuted((m) => !m);
  }

  return { muted, toggleMuted, ensurePlaying };
}
