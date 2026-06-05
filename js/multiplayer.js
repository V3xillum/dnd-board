(function () {
  const SESSION_KEY = "gbSessionId";
  const GAME_PARAM = "game";

  let gameId = null;
  let sessionId = null;
  let isHost = false;
  let suppressSync = false;
  let pendingLocalWrite = false;
  let lastSeenLogSeq = -1;
  let hasRemoteState = false;
  let hostHeartbeatTimer = null;
  let hostTakeoverTimer = null;

  const HOST_STALE_MS = 45_000;
  const HOST_HEARTBEAT_MS = 15_000;
  const HOST_TAKEOVER_CHECK_MS = 10_000;

  function getSessionId() {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  function generateGameId() {
    const words = ["avontuur", "tocht", "draak", "kerker", "quest", "gilde"];
    const word = words[Math.floor(Math.random() * words.length)];
    const suffix = Math.random().toString(36).slice(2, 6);
    return `${word}-${suffix}`;
  }

  function readGameIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get(GAME_PARAM)?.trim() || null;
  }

  function setGameIdInUrl(id) {
    const url = new URL(window.location.href);
    url.searchParams.set(GAME_PARAM, id);
    history.replaceState(null, "", url);
  }

  function cloneSpecialSpaces(spaces) {
    if (typeof structuredClone === "function") return structuredClone(spaces);
    return JSON.parse(JSON.stringify(spaces));
  }

  /** Firebase weigert `undefined` — strip uit objecten vóór write. */
  function stripUndefined(value) {
    if (value === undefined) return null;
    if (value === null || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(stripUndefined);
    const out = {};
    Object.entries(value).forEach(([key, entry]) => {
      if (entry !== undefined) out[key] = stripUndefined(entry);
    });
    return out;
  }

  function normalizeAmbushPits(pits) {
    if (!pits || typeof pits !== "object") return {};
    const normalized = {};
    Object.entries(pits).forEach(([key, pit]) => {
      normalized[String(key)] = pit;
    });
    return normalized;
  }

  function serializeGame(game) {
    return stripUndefined({
      players: cloneSpecialSpaces(game.players),
      currentIndex: game.currentIndex,
      pendingExtraTurn: game.pendingExtraTurn,
      gameOver: game.gameOver,
      winnerId: game.winner?.id ?? null,
      bossActive: game.bossActive,
      bossHp: game.bossHp,
      bossMaxHp: game.bossMaxHp,
      bossConfig: game.bossConfig ? cloneSpecialSpaces(game.bossConfig) : null,
      bossMultiplier: game.bossMultiplier ?? 1,
      bossDmgPerHit: game.bossDmgPerHit ?? 1,
      bossRevealRoll: game.bossRevealRoll ?? null,
      bossMinions: (game.bossMinions ?? []).map((m) => ({
        config: m.config ? cloneSpecialSpaces(m.config) : null,
        hp: m.hp ?? 0,
        maxHp: m.maxHp ?? 0,
      })),
      ambushPits: cloneSpecialSpaces(normalizeAmbushPits(game.ambushPits)),
      revealedSpaces: cloneSpecialSpaces(normalizeAmbushPits(game.revealedSpaces)),
      specialSpaces: cloneSpecialSpaces(window.SPECIAL_SPACES),
      activeModal: typeof window.getActiveModal === "function" ? window.getActiveModal() : null,
      updatedBy: sessionId,
      updatedAt: Date.now(),
    });
  }

  function deserializeGame(data, game) {
    if (!data || !game) return;

    game.players = cloneSpecialSpaces(data.players ?? []);
    game.currentIndex = data.currentIndex ?? 0;
    game.pendingExtraTurn = Boolean(data.pendingExtraTurn);
    game.gameOver = Boolean(data.gameOver);
    game.winner = data.winnerId
      ? game.players.find((p) => p.id === data.winnerId) ?? null
      : null;
    game.bossActive = Boolean(data.bossActive);
    game.bossHp = data.bossHp ?? 0;
    game.bossMaxHp = data.bossMaxHp ?? 0;
    game.bossConfig = data.bossConfig ? cloneSpecialSpaces(data.bossConfig) : null;
    game.bossMultiplier = data.bossMultiplier ?? 1;
    game.bossDmgPerHit = data.bossDmgPerHit ?? 1;
    game.bossRevealRoll = data.bossRevealRoll ?? null;
    game.bossMinions = (data.bossMinions ?? []).map((m) => ({
      config: m.config ? cloneSpecialSpaces(m.config) : null,
      hp: m.hp ?? 0,
      maxHp: m.maxHp ?? 0,
    }));
    game.ambushPits = normalizeAmbushPits(data.ambushPits);
    game.revealedSpaces = normalizeAmbushPits(data.revealedSpaces);

    if (data.specialSpaces && typeof window.applySpecialSpaces === "function") {
      window.applySpecialSpaces(cloneSpecialSpaces(data.specialSpaces));
    }
  }

  function updateStatusBar() {
    const statusEl = document.getElementById("mp-status");
    const gameIdEl = document.getElementById("mp-game-id");
    if (!statusEl || !gameIdEl) return;

    gameIdEl.textContent = gameId ? `Spel: ${gameId}` : "";

    if (isHost) {
      statusEl.textContent = "Jij bent de host — speel en anderen kijken mee";
      return;
    }

    if (hasRemoteState) {
      statusEl.textContent = "Je kijkt mee (alleen lezen)";
      return;
    }

    statusEl.textContent = "Wacht op host…";
  }

  function applyRemoteState(data) {
    if (!data || typeof window.getGame !== "function") return;

    if (pendingLocalWrite && data.updatedBy === sessionId) {
      pendingLocalWrite = false;
      return;
    }

    suppressSync = true;
    hasRemoteState = true;
    if (!isHost && (!data.players || data.players.length === 0)) {
      window.clearGameLog?.();
      lastSeenLogSeq = -1;
    }
    deserializeGame(data, window.getGame());
    window.refreshGameUI?.();
    if (!isHost) {
      window.renderSpectatorModal?.(data.activeModal ?? null);
    }
    suppressSync = false;
    updateStatusBar();
  }

  function applyRemoteLogEntry(entry) {
    if (!entry || entry.seq <= lastSeenLogSeq) return;
    lastSeenLogSeq = entry.seq;
    window.appendRemoteLogEntry?.(entry.message, entry.type || "");
  }

  function syncActiveModal(modal) {
    if (!isHost || suppressSync || !gameId || typeof window.writeActiveModal !== "function") return;
    window.writeActiveModal(gameId, stripUndefined(modal));
  }

  window.syncAfterAction = function syncAfterAction() {
    if (!isHost || suppressSync || !gameId || typeof window.writeGameState !== "function") return;
    const game = window.getGame?.();
    if (!game) return;

    pendingLocalWrite = true;
    window.writeGameState(gameId, serializeGame(game));
  };

  window.syncActiveModal = syncActiveModal;

  window.syncLastEvent = function syncLastEvent(message, type = "") {
    if (!isHost || !gameId || typeof window.writeLastEvent !== "function") return;

    const seq = Date.now();
    lastSeenLogSeq = seq;
    window.writeLastEvent(gameId, {
      seq,
      message,
      type: type || "",
      updatedBy: sessionId,
      updatedAt: seq,
    });
  };

  window.resetMultiplayerLog = function resetMultiplayerLog() {
    lastSeenLogSeq = -1;
  };

  function setHostState(nextIsHost) {
    if (nextIsHost === isHost) return;
    isHost = nextIsHost;
    window.setMultiplayerReadOnly?.(!isHost);
    updateStatusBar();
    if (isHost) {
      startHostHeartbeat();
      window.resyncActiveModalIfOpen?.();
      return;
    }
    stopHostHeartbeat();
  }

  function startHostHeartbeat() {
    stopHostHeartbeat();
    if (!isHost || !gameId || typeof window.touchHostPresence !== "function") return;

    const tick = () => {
      if (!isHost || !gameId) return;
      window.touchHostPresence(gameId, sessionId).catch((err) => {
        console.warn("Host heartbeat mislukt:", err);
      });
    };

    tick();
    hostHeartbeatTimer = setInterval(tick, HOST_HEARTBEAT_MS);
  }

  function stopHostHeartbeat() {
    if (hostHeartbeatTimer) {
      clearInterval(hostHeartbeatTimer);
      hostHeartbeatTimer = null;
    }
  }

  function startHostTakeoverChecks() {
    if (hostTakeoverTimer) return;

    hostTakeoverTimer = setInterval(async () => {
      if (isHost || !gameId || typeof window.claimHost !== "function") return;

      try {
        const claimed = await window.claimHost(gameId, sessionId);
        if (claimed) setHostState(true);
      } catch (err) {
        console.warn("Host takeover check mislukt:", err);
      }
    }, HOST_TAKEOVER_CHECK_MS);
  }

  function isMetaHostStale(meta) {
    if (!meta?.hostLastSeen) return false;
    return Date.now() - meta.hostLastSeen > HOST_STALE_MS;
  }

  function bindCopyButton() {
    const copyBtn = document.getElementById("mp-copy-link");
    if (!copyBtn || copyBtn.dataset.bound) return;
    copyBtn.dataset.bound = "1";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        copyBtn.textContent = "Gekopieerd!";
        setTimeout(() => {
          copyBtn.textContent = "Link kopiëren";
        }, 2000);
      } catch {
        copyBtn.textContent = "Kopiëren mislukt";
      }
    });
  }

  async function startMultiplayer() {
    sessionId = getSessionId();
    gameId = readGameIdFromUrl();
    if (!gameId) {
      gameId = generateGameId();
      setGameIdInUrl(gameId);
    }

    bindCopyButton();
    updateStatusBar();

    isHost = await window.claimHost(gameId, sessionId);
    window.setMultiplayerReadOnly?.(!isHost);
    if (isHost) startHostHeartbeat();
    startHostTakeoverChecks();

    window.onGameMeta(gameId, async (meta) => {
      if (!meta?.hostSessionId) return;

      if (meta.hostSessionId === sessionId) {
        setHostState(true);
        return;
      }

      if (isMetaHostStale(meta)) {
        try {
          const claimed = await window.claimHost(gameId, sessionId);
          setHostState(claimed);
        } catch (err) {
          console.warn("Host claim na stale meta mislukt:", err);
          setHostState(false);
        }
        return;
      }

      setHostState(false);
    });

    window.onGameState(gameId, applyRemoteState);

    window.onActiveModal(gameId, (modal) => {
      if (isHost) return;
      window.renderSpectatorModal?.(modal ?? null);
    });

    window.onLastEvent(gameId, (entry) => {
      if (isHost && entry?.updatedBy === sessionId) return;
      applyRemoteLogEntry(entry);
    });

    updateStatusBar();

    if (isHost) {
      window.resyncActiveModalIfOpen?.();
    }
  }

  function initWhenReady() {
    if (window.writeGameState) {
      startMultiplayer().catch((err) => console.error("Multiplayer init mislukt:", err));
      return;
    }
    window.addEventListener("firebase-ready", () => {
      startMultiplayer().catch((err) => console.error("Multiplayer init mislukt:", err));
    }, { once: true });
  }

  window.initMultiplayer = initWhenReady;
  window.isMultiplayerHost = () => isHost;
})();
