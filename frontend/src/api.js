const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function getToken() {
  return localStorage.getItem("dfrpg_token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message = (data && data.error) || `Erro ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // auth
  register: (payload) => request("/auth/register", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
  me: () => request("/auth/me"),

  // game data
  gameData: () => request("/game-data", { auth: false }),

  // characters
  listCharacters: () => request("/characters"),
  createCharacter: (payload) => request("/characters", { method: "POST", body: payload }),
  getCharacter: (id) => request(`/characters/${id}`),
  updateCharacter: (id, payload) => request(`/characters/${id}`, { method: "PUT", body: payload }),
  deleteCharacter: (id) => request(`/characters/${id}`, { method: "DELETE" }),

  // campaigns
  createCampaign: (payload) => request("/campaigns", { method: "POST", body: payload }),
  listCampaignsAsMaster: () => request("/campaigns/mine"),
  listCampaignsJoined: () => request("/campaigns/joined"),
  joinCampaign: (payload) => request("/campaigns/join", { method: "POST", body: payload }),
  leaveCampaign: (id) => request(`/campaigns/${id}/leave`, { method: "POST" }),
  getCampaignState: (id) => request(`/campaigns/${id}`),
  updateCampaignMeta: (id, payload) => request(`/campaigns/${id}`, { method: "PUT", body: payload }),
  createNpc: (id, payload) => request(`/campaigns/${id}/npcs`, { method: "POST", body: payload }),
  updateNpc: (id, npcId, payload) => request(`/campaigns/${id}/npcs/${npcId}`, { method: "PUT", body: payload }),
  deleteNpc: (id, npcId) => request(`/campaigns/${id}/npcs/${npcId}`, { method: "DELETE" }),
  addLog: (id, message) => request(`/campaigns/${id}/log`, { method: "POST", body: { message } }),
  // tabuleiro
  getBoard: (id) => request(`/campaigns/${id}/board`),
  moveToken: (id, tokenId, x, y) => request(`/campaigns/${id}/board/tokens/${tokenId}/move`, { method: "PUT", body: { x, y } }),
  nextTurn: (id) => request(`/campaigns/${id}/board/next-turn`, { method: "POST" }),
  createBoard: (id, payload) => request(`/campaigns/${id}/boards`, { method: "POST", body: payload }),
  updateBoard: (id, boardId, payload) => request(`/campaigns/${id}/boards/${boardId}`, { method: "PUT", body: payload }),
  deleteBoard: (id, boardId) => request(`/campaigns/${id}/boards/${boardId}`, { method: "DELETE" }),
  activateBoard: (id, boardId) => request(`/campaigns/${id}/boards/${boardId}/activate`, { method: "POST" }),
  addBoardTokens: (id, boardId, payload) => request(`/campaigns/${id}/boards/${boardId}/tokens`, { method: "POST", body: payload }),
  removeBoardToken: (id, boardId, tokenId) => request(`/campaigns/${id}/boards/${boardId}/tokens/${tokenId}`, { method: "DELETE" }),
  // cenas de fuga (biblioteca da campanha)
  listEscapes: (id) => request(`/campaigns/${id}/escapes`),
  getEscape: (id, sceneId) => request(`/campaigns/${id}/escapes/${sceneId}`),
  createEscape: (id, scene) => request(`/campaigns/${id}/escapes`, { method: "POST", body: { scene } }),
  updateEscape: (id, sceneId, scene) => request(`/campaigns/${id}/escapes/${sceneId}`, { method: "PUT", body: { scene } }),
  deleteEscape: (id, sceneId) => request(`/campaigns/${id}/escapes/${sceneId}`, { method: "DELETE" }),
};

export function setToken(token) {
  if (token) localStorage.setItem("dfrpg_token", token);
  else localStorage.removeItem("dfrpg_token");
}

export function getStoredToken() {
  return getToken();
}
