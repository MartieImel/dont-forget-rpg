import { useEffect, useState } from "react";
import { api } from "../api";

let cache = null;
let pending = null;

export function useGameData() {
  const [data, setData] = useState(cache);

  useEffect(() => {
    if (cache) {
      setData(cache);
      return;
    }
    if (!pending) pending = api.gameData();
    pending.then((d) => {
      cache = d;
      setData(d);
    });
  }, []);

  return data;
}
