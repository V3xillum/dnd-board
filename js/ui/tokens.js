/**
 * Token layer, animatie, position-diff (multiplayer gast).
 * Vereist: els, game (ui/dom.js), tokensAnimating + modal state (ui/state.js),
 * prefersReducedMotion (ui/board.js), updateTurnUI (ui/players.js), isOnBossArena (game.js)
 */

function getOrCreateTokenLayer() {
  let layer = document.getElementById('token-layer');
  if (!layer && els.board) {
    layer = document.createElement('div');
    layer.id = 'token-layer';
    layer.className = 'token-layer';
    layer.setAttribute('aria-hidden', 'true');
    els.board.appendChild(layer);
  }
  return layer;
}

function getSpaceCenter(spaceNum) {
  const cell = document.querySelector(`[data-space="${spaceNum}"]`);
  const board = els.board;
  if (!cell || !board) return null;
  const cellRect = cell.getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();
  return {
    x: cellRect.left + cellRect.width / 2 - boardRect.left,
    y: cellRect.top + cellRect.height / 2 - boardRect.top,
  };
}

function getTokenStackOffset(index, total) {
  if (total <= 1) return { x: 0, y: 0 };
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const radius = total > 3 ? 9 : 7;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function getTokenStepDuration(stepCount) {
  if (prefersReducedMotion()) return 0;
  return Math.min(220, Math.max(100, Math.floor(1600 / Math.max(stepCount, 1))));
}

function waitMs(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

function waitForTokenTransition(token, fallbackMs) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      token.removeEventListener('transitionend', onEnd);
      resolve();
    };
    const onEnd = (e) => {
      if (e.target === token && (e.propertyName === 'left' || e.propertyName === 'top')) finish();
    };
    token.addEventListener('transitionend', onEnd);
    setTimeout(finish, fallbackMs + 40);
  });
}

function positionTokenElement(token, spaceNum, stackIndex, stackTotal, animate = true) {
  const center = getSpaceCenter(spaceNum);
  if (!center) {
    token.style.display = 'none';
    return;
  }
  const offset = getTokenStackOffset(stackIndex, stackTotal);
  if (!animate) {
    token.style.transition = 'none';
  }
  token.style.display = '';
  token.style.left = `${center.x + offset.x}px`;
  token.style.top = `${center.y + offset.y}px`;
  if (!animate) {
    void token.offsetWidth;
    token.style.transition = '';
  }
}

function ensureTokenElement(player) {
  const layer = getOrCreateTokenLayer();
  if (!layer) return null;

  let token = layer.querySelector(`[data-player-id="${player.id}"]`);
  if (!token) {
    token = document.createElement('span');
    token.className = 'token';
    token.dataset.playerId = player.id;
    layer.appendChild(token);
  }

  token.style.background = player.color;
  token.title = `${player.name} — vak ${player.position}`;
  token.textContent = player.name.charAt(0).toUpperCase();
  return token;
}

function buildMovePath(from, to, forward = true) {
  const path = [];
  if (from === to) return path;

  if (forward) {
    const start = Math.max(1, from <= 0 ? 1 : from + 1);
    for (let s = start; s <= to; s++) path.push(s);
  } else {
    for (let s = from - 1; s >= Math.max(1, to); s--) path.push(s);
  }
  return path;
}

function findDeathFromSpace(events, deathIndex, playerName) {
  for (let j = deathIndex - 1; j >= 0; j--) {
    const prev = events[j];
    if (prev.player !== playerName) continue;
    if (prev.type === 'move' || prev.type === 'event-move') {
      return prev.to > 0 ? prev.to : prev.from;
    }
    if (prev.type === 'boss-retreat') return prev.from;
    if (prev.type === 'landed') return prev.spaceNum;
  }
  return 1;
}

function buildMovementsFromEvents(events) {
  const movements = [];
  const finish = window.FINISH_SPACE ?? 63;

  events.forEach((ev, i) => {
    const name = ev.player;
    if (!name) return;

    if (ev.type === 'move') {
      const bounce = events.find((e, j) => j > i && e.type === 'bounce' && e.player === name);
      if (bounce) {
        const peak = Math.min(ev.to, finish);
        if (ev.from !== peak) {
          movements.push({ playerName: name, from: ev.from, to: peak, forward: true });
        }
        if (peak !== bounce.position) {
          movements.push({ playerName: name, from: peak, to: bounce.position, forward: false });
        }
      } else if (ev.from !== ev.to) {
        movements.push({ playerName: name, from: ev.from, to: ev.to, forward: true });
      }
      return;
    }

    if (ev.type === 'event-move' && ev.from !== ev.to) {
      movements.push({
        playerName: name,
        from: ev.from,
        to: ev.to,
        forward: ev.direction !== 'back',
      });
      return;
    }

    if (ev.type === 'boss-retreat' && ev.from !== ev.to) {
      movements.push({ playerName: name, from: ev.from, to: ev.to, forward: false });
      return;
    }

    if (ev.type === 'death') {
      movements.push({
        playerName: name,
        death: true,
        fromSpace: findDeathFromSpace(events, i, name),
      });
    }
  });

  return movements;
}

async function animateToSpace(token, spaceNum, stepMs) {
  token.style.transition = `left ${stepMs}ms ease-in-out, top ${stepMs}ms ease-in-out`;
  positionTokenElement(token, spaceNum, 0, 1, true);
  if (stepMs <= 0) return;
  await waitForTokenTransition(token, stepMs);
}

async function animateTokenAlongPath(playerId, from, to, forward = true) {
  const player = game.players.find((p) => p.id === playerId);
  if (!player) return;

  const path = buildMovePath(from, to, forward);
  if (path.length === 0) return;

  const token = ensureTokenElement(player);
  if (!token) return;

  const stepMs = getTokenStepDuration(path.length);
  token.classList.add('token--moving');
  token.classList.remove('token--waiting');
  token.style.setProperty('--token-step-ms', `${stepMs}ms`);
  token.style.display = '';

  if (from > 0) {
    positionTokenElement(token, from, 0, 1, false);
    await waitMs(16);
  } else {
    positionTokenElement(token, path[0], 0, 1, false);
    await waitMs(16);
    for (let i = 1; i < path.length; i++) {
      await animateToSpace(token, path[i], stepMs);
    }
    token.classList.remove('token--moving');
    return;
  }

  for (const space of path) {
    await animateToSpace(token, space, stepMs);
  }

  token.classList.remove('token--moving');
}

async function animateTokenDeath(playerId, fromSpace) {
  const player = game.players.find((p) => p.id === playerId);
  if (!player || fromSpace <= 0) return;

  const token = ensureTokenElement(player);
  if (!token) return;

  token.classList.add('token--moving');
  token.classList.remove('token--waiting');
  positionTokenElement(token, fromSpace, 0, 1, false);
  token.style.display = '';
  await waitMs(30);
  token.classList.add('token--dying');
  await waitMs(380);
  token.classList.remove('token--dying', 'token--moving');
  token.style.display = 'none';
}

async function animateMovements(movements, idKey = 'playerName') {
  if (prefersReducedMotion() || !movements?.length) return;

  tokensAnimating = true;
  document.body.classList.add('tokens-animating');
  updateTurnUI();

  try {
    for (const move of movements) {
      const player = idKey === 'playerId'
        ? game.players.find((p) => p.id === move.playerId)
        : game.players.find((p) => p.name === move.playerName);
      if (!player) continue;

      if (move.death) {
        await animateTokenDeath(player.id, move.fromSpace);
      } else {
        await animateTokenAlongPath(player.id, move.from, move.to, move.forward);
      }
    }
  } finally {
    tokensAnimating = false;
    document.body.classList.remove('tokens-animating');
    updateTurnUI();
  }
}

async function animateFromEvents(events) {
  const movements = buildMovementsFromEvents(events);
  await animateMovements(movements, 'playerName');
}

function snapshotTokenPositions() {
  const snap = {};
  game.players.forEach((p) => {
    snap[p.id] = p.position;
  });
  return snap;
}

function hasTokenPositionChanges(prevPositions) {
  if (!prevPositions || Object.keys(prevPositions).length === 0) return false;
  return game.players.some((p) => {
    if (!(p.id in prevPositions)) return false;
    return prevPositions[p.id] !== p.position;
  });
}

function isLikelyGameReset(prevPositions) {
  if (!prevPositions || game.players.length === 0) return false;
  const hadBoardPositions = Object.values(prevPositions).some((pos) => pos > 0);
  return hadBoardPositions && game.players.every((p) => p.position <= 0);
}

function buildMovementsFromPositionDiff(prevPositions) {
  const movements = [];
  game.players.forEach((p) => {
    if (!(p.id in prevPositions)) return;
    const from = prevPositions[p.id];
    const to = p.position;
    if (from === to) return;

    if (to <= 0 && from > 0) {
      movements.push({ playerId: p.id, death: true, fromSpace: from });
      return;
    }

    movements.push({
      playerId: p.id,
      from,
      to,
      forward: to > from,
    });
  });
  return movements;
}

function repositionTokensToSnapshot(prevPositions) {
  game.players.forEach((p) => {
    if (!(p.id in prevPositions)) return;
    const oldPos = prevPositions[p.id];
    const token = ensureTokenElement(p);
    if (!token) return;

    token.classList.remove('token--moving', 'token--dying', 'token--waiting');

    if (oldPos <= 0) {
      token.style.display = 'none';
      return;
    }

    positionTokenElement(token, oldPos, 0, 1, false);
    token.style.display = '';
  });
}

async function animateFromPositionDiff(prevPositions) {
  if (isLikelyGameReset(prevPositions)) return;
  const movements = buildMovementsFromPositionDiff(prevPositions);
  await animateMovements(movements, 'playerId');
}

async function syncTokensAfterEvents(events) {
  window.syncAfterAction?.();
  await animateFromEvents(events);
  renderTokens();
}

function renderTokens() {
  const layer = getOrCreateTokenLayer();
  if (!layer) return;

  layer.querySelectorAll('.token').forEach((token) => {
    if (!game.players.some((p) => p.id === token.dataset.playerId)) token.remove();
  });

  if (tokensAnimating) return;

  const byPosition = {};
  game.players.forEach((p) => {
    if (p.position <= 0) return;
    if (!byPosition[p.position]) byPosition[p.position] = [];
    byPosition[p.position].push(p);
  });

  game.players.forEach((p) => {
    const token = ensureTokenElement(p);
    if (!token) return;

    token.classList.remove('token--moving', 'token--dying');

    if (p.position <= 0) {
      token.style.display = 'none';
      return;
    }

    const group = byPosition[p.position] ?? [p];
    const stackIndex = group.findIndex((x) => x.id === p.id);
    positionTokenElement(token, p.position, stackIndex, group.length, false);
  });

  updateTokenTurnStates();
}

function isPlayerWaitingToRoll(player) {
  if (!player || game.gameOver || tokensAnimating) return false;
  if (game.currentPlayer?.id !== player.id) return false;

  const inAmbush = game.isCurrentPlayerInAmbush();
  const onBossArena = !inAmbush && game.bossActive && isOnBossArena(player.position);
  const modalNeedsInput =
    document.body.classList.contains('modal-open')
    && (activeAmbush !== null || activeBossMinion !== null || activeBoss !== null
      || activeEvent !== null || activeMystery !== null || activeBossReveal !== null);

  return !inAmbush && !onBossArena && !modalNeedsInput;
}

function updateTokenTurnStates() {
  const layer = getOrCreateTokenLayer();
  if (!layer || tokensAnimating) return;

  const activeId = !game.gameOver ? game.currentPlayer?.id : null;

  game.players.forEach((p) => {
    const token = layer.querySelector(`[data-player-id="${p.id}"]`);
    if (!token || p.position <= 0) return;

    const isActive = p.id === activeId;
    token.classList.toggle('token--active', isActive);
    token.classList.toggle('token--waiting', isActive && isPlayerWaitingToRoll(p));
  });
}

window.snapshotTokenPositions = snapshotTokenPositions;
