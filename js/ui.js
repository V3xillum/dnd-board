const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

const game = new Game();

const els = {
  board: document.getElementById('board'),
  playerList: document.getElementById('player-list'),
  playerName: document.getElementById('player-name'),
  difficultySelect: document.getElementById('difficulty-select'),
  addBtn: document.getElementById('add-player-btn'),
  currentPlayer: document.getElementById('current-player'),
  diceInput: document.getElementById('dice-input'),
  moveBtn: document.getElementById('move-btn'),
  hpControls: document.getElementById('hp-controls'),
  hpDisplay: document.getElementById('hp-display'),
  hpMinusBtn: document.getElementById('hp-minus-btn'),
  hpPlusBtn: document.getElementById('hp-plus-btn'),
  pathModal: document.getElementById('path-modal'),
  pathIcon: document.getElementById('path-icon'),
  pathSpace: document.getElementById('path-space'),
  pathTitle: document.getElementById('path-title'),
  pathFlavor: document.getElementById('path-flavor'),
  pathClose: document.getElementById('path-close'),
  pathTag: document.querySelector('#path-modal .path-card__tag'),
  pathNote: document.querySelector('#path-modal .path-card__note'),
  mysteryModal: document.getElementById('mystery-modal'),
  mysteryCard: document.querySelector('#mystery-modal .event-card'),
  mysteryIcon: document.getElementById('mystery-icon'),
  mysterySpace: document.getElementById('mystery-space'),
  mysteryTitle: document.getElementById('mystery-title'),
  mysteryFlavor: document.getElementById('mystery-flavor'),
  mysteryRollArea: document.getElementById('mystery-roll-area'),
  mysteryRevealArea: document.getElementById('mystery-reveal-area'),
  mysteryRevealContent: document.getElementById('mystery-reveal-content'),
  mysteryDiceInput: document.getElementById('mystery-dice-input'),
  mysterySubmit: document.getElementById('mystery-submit'),
  mysteryAction: document.getElementById('mystery-action'),
  bossRevealModal: document.getElementById('boss-reveal-modal'),
  bossRevealCard: document.querySelector('#boss-reveal-modal .event-card'),
  bossRevealIcon: document.getElementById('boss-reveal-icon'),
  bossRevealSpace: document.getElementById('boss-reveal-space'),
  bossRevealTitle: document.getElementById('boss-reveal-title'),
  bossRevealFlavor: document.getElementById('boss-reveal-flavor'),
  bossRevealRollArea: document.getElementById('boss-reveal-roll-area'),
  bossRevealResultArea: document.getElementById('boss-reveal-result-area'),
  bossRevealResultContent: document.getElementById('boss-reveal-result-content'),
  bossRevealDiceInput: document.getElementById('boss-reveal-dice-input'),
  bossRevealSubmit: document.getElementById('boss-reveal-submit'),
  bossRevealAction: document.getElementById('boss-reveal-action'),
  gameLog: document.getElementById('game-log'),
  eventModal: document.getElementById('event-modal'),
  eventIcon: document.getElementById('event-icon'),
  eventSpace: document.getElementById('event-space'),
  eventTitle: document.getElementById('event-title'),
  eventFlavor: document.getElementById('event-flavor'),
  eventCheck: document.getElementById('event-check'),
  eventAbility: document.getElementById('event-ability'),
  eventDc: document.getElementById('event-dc'),
  eventRollArea: document.getElementById('event-roll-area'),
  eventDiceInput: document.getElementById('event-dice-input'),
  eventNat20: document.getElementById('event-nat20'),
  eventNat1: document.getElementById('event-nat1'),
  eventSubmit: document.getElementById('event-submit'),
  eventResult: document.getElementById('event-result'),
  eventCombatAction: document.getElementById('event-combat-action'),
  eventClose: document.getElementById('event-close'),
  eventCheckLabel: document.getElementById('event-check-label'),
  eventDcWrap: document.getElementById('event-dc-wrap'),
  eventDcLabel: document.getElementById('event-dc-label'),
  eventEnemyAtk: document.getElementById('event-enemy-atk'),
  eventRollLabel: document.getElementById('event-roll-label'),
  eventCombatAdjudicate: document.getElementById('event-combat-adjudicate'),
  eventCombatAdjudicateLabel: document.getElementById('event-combat-adjudicate-label'),
  eventCombatHit: document.getElementById('event-combat-hit'),
  eventCombatMiss: document.getElementById('event-combat-miss'),
  eventEnemyRoll: document.getElementById('event-enemy-roll'),
  eventEnemyRollLabel: document.getElementById('event-enemy-roll-label'),
  eventEnemyRollDisplay: document.getElementById('event-enemy-roll-display'),
  eventEnemyHit: document.getElementById('event-enemy-hit'),
  eventEnemyMiss: document.getElementById('event-enemy-miss'),
  eventSpecialSave: document.getElementById('event-special-save'),
  eventSpecialSaveTitle: document.getElementById('event-special-save-title'),
  eventSpecialSaveFlavor: document.getElementById('event-special-save-flavor'),
  eventSpecialSaveInput: document.getElementById('event-special-save-input'),
  eventSpecialSaveSubmit: document.getElementById('event-special-save-submit'),
  winModal: document.getElementById('win-modal'),
  winTitle: document.getElementById('win-title'),
  winText: document.getElementById('win-text'),
  winClose: document.getElementById('win-close'),
  combatRail: document.getElementById('combat-rail'),
  combatRailBoss: document.getElementById('combat-rail-boss'),
  combatRailMinionsSection: document.getElementById('combat-rail-minions-section'),
  bossMinionsList: document.getElementById('boss-minions-list'),
  combatRailPitsSection: document.getElementById('combat-rail-pits-section'),
  ambushPitsList: document.getElementById('ambush-pits-list'),
  eventCard: document.querySelector('#event-modal .event-card'),
  eventTurnBanner: document.getElementById('event-turn-banner'),
  eventTurnName: document.getElementById('event-turn-name'),
  eventTurnDot: document.getElementById('event-turn-dot'),
  rulesModal: document.getElementById('rules-modal'),
  rulesOpenBtn: document.getElementById('rules-open-btn'),
  rulesCloseBtn: document.getElementById('rules-close-btn'),
  rulesCloseBottom: document.getElementById('rules-close-bottom'),
  legendRulesLink: document.getElementById('legend-rules-link'),
  newAdventureBtn: document.getElementById('new-adventure-btn'),
  confirmModal: document.getElementById('confirm-modal'),
  confirmCancel: document.getElementById('confirm-cancel'),
  confirmOk: document.getElementById('confirm-ok'),
};

function syncModalScrollLock() {
  const open =
    !els.eventModal.classList.contains('hidden') ||
    !els.pathModal.classList.contains('hidden') ||
    !els.mysteryModal.classList.contains('hidden') ||
    !els.bossRevealModal.classList.contains('hidden') ||
    !els.winModal.classList.contains('hidden') ||
    (els.confirmModal && !els.confirmModal.classList.contains('hidden')) ||
    (els.rulesModal && !els.rulesModal.classList.contains('hidden'));
  document.body.classList.toggle('modal-open', open);
  updateTokenTurnStates();
}

const MODAL_ENTER_CLASSES = [
  'event-card--enter-calm',
  'event-card--enter-combat',
  'event-card--enter-win',
  'event-modal__stack--enter-calm',
  'event-modal__stack--enter-combat',
];

const COMBAT_EVENT_CATEGORIES = new Set(['combat', 'trap']);

function getEventModalEnterTier(config) {
  if (!config) return 'calm';
  return COMBAT_EVENT_CATEGORIES.has(config.category) ? 'combat' : 'calm';
}

function playModalCardEnter(modalEl, tier = 'calm') {
  if (!modalEl) return;

  const stack = modalEl.querySelector('.event-modal__stack');
  const card = modalEl.querySelector('.event-card');
  const target = stack || card;
  if (!target) return;

  target.classList.remove(...MODAL_ENTER_CLASSES);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const enterClass = tier === 'combat'
    ? (stack ? 'event-modal__stack--enter-combat' : 'event-card--enter-combat')
    : tier === 'win'
      ? 'event-card--enter-win'
      : (stack ? 'event-modal__stack--enter-calm' : 'event-card--enter-calm');

  void target.offsetWidth;
  target.classList.add(enterClass);

  const onEnd = (e) => {
    if (e.target !== target) return;
    target.classList.remove(enterClass);
    target.removeEventListener('animationend', onEnd);
  };
  target.addEventListener('animationend', onEnd);
}

let lastSpectatorModalAnimKey = null;

function spectatorModalAnimKey(activeModal) {
  if (!activeModal) return null;
  const { type, phase, spaceNum } = activeModal;
  return `${type}|${phase ?? ''}|${spaceNum ?? ''}`;
}

function playSpectatorModalEnter(modalEl, tier, activeModal) {
  const key = spectatorModalAnimKey(activeModal);
  if (key === lastSpectatorModalAnimKey) return;
  lastSpectatorModalAnimKey = key;
  playModalCardEnter(modalEl, tier);
}

function showRulesModal() {
  if (!els.rulesModal) return;
  els.rulesModal.classList.remove('hidden');
  syncModalScrollLock();
  els.rulesCloseBtn?.focus();
}

function closeRulesModal() {
  if (!els.rulesModal) return;
  els.rulesModal.classList.add('hidden');
  syncModalScrollLock();
}

function forceCloseAllModals() {
  els.winModal.classList.add('hidden');
  els.winModal.classList.remove('win-modal--spectator');

  els.eventModal.classList.add('hidden');
  els.eventModal.classList.remove('event-modal--spectator');
  activeEvent = null;
  activeBoss = null;
  activeBossMinion = null;
  activeAmbush = null;
  els.eventCard?.classList.remove('event-card--ambush');
  removeAmbushModalExtras();

  els.pathModal.classList.add('hidden');
  els.pathModal.classList.remove('path-modal--spectator');
  pathModalCallback = null;
  pathModalSpaceNum = null;
  pathModalSkipMysteryReset = false;

  els.mysteryModal.classList.add('hidden');
  els.mysteryModal.classList.remove('mystery-modal--spectator');
  els.mysteryCard?.classList.remove('event-card--jackpot');
  activeMystery = null;

  els.bossRevealModal.classList.add('hidden');
  els.bossRevealModal.classList.remove('boss-reveal-modal--spectator');
  els.bossRevealCard?.classList.remove('event-card--epic');
  activeBossReveal = null;

  els.confirmModal?.classList.add('hidden');
  closeRulesModal();
  clearSyncedActiveModal();
  syncModalScrollLock();
}

function startNewAdventure() {
  forceCloseAllModals();
  game.reset();
  if (typeof rebuildBoard === 'function') rebuildBoard();
  els.gameLog.innerHTML = '';
  updateBossPanel();
  updateAmbushPanel();
  renderBoard();
  renderPlayers();
  updateTurnUI();
  updateDifficultyUI();
  addLog('Nieuw avontuur — het bord is opnieuw geschud!');
  window.syncAfterAction?.();
  window.resetMultiplayerLog?.();
}

function showNewAdventureConfirm() {
  if (document.querySelector('.app')?.classList.contains('app--spectator')) return;
  els.confirmModal?.classList.remove('hidden');
  syncModalScrollLock();
  playModalCardEnter(els.confirmModal, 'calm');
  els.confirmCancel?.focus();
}

function closeNewAdventureConfirm() {
  els.confirmModal?.classList.add('hidden');
  syncModalScrollLock();
  els.newAdventureBtn?.focus();
}

function parseDiceRoll(value, min, max = null) {
  const roll = parseInt(value, 10);
  if (Number.isNaN(roll) || roll < min) return null;
  if (max !== null && roll > max) return null;
  return roll;
}

/** Totaal van 2× D6 (2–12) */
function parse2d6Total(value) {
  return parseDiceRoll(value, 2, 12);
}

function parseCheckTotal(value) {
  if (value === '' || value == null) return null;
  const roll = Number(value);
  if (!Number.isFinite(roll) || !Number.isInteger(roll) || roll < 1) return null;
  return roll;
}

const EVENT_CATEGORY_CLASS = {
  trap: 'cell--trap',
  combat: 'cell--combat',
  magic: 'cell--magic',
  social: 'cell--social',
  loot: 'cell--loot',
  mystery: 'cell--mystery',
  wild: 'cell--wild',
  fey: 'cell--fey',
  boss: 'cell--boss',
  ambush: 'cell--ambush',
};

function applyCellStyle(cell, special, num) {
  if (!special) return;

  if (special.type === 'event') {
    cell.classList.add(EVENT_CATEGORY_CLASS[special.category] || 'cell--event');
  } else if (special.type === 'mystery') {
    cell.classList.add('cell--mystery-unrevealed');
  } else if (special.type === 'healer') {
    cell.classList.add('cell--healer');
  } else if (special.type === 'path') {
    cell.classList.add('cell--quiet');
  } else {
    cell.classList.add(`cell--${special.type}`);
  }

  if (num === 1) cell.classList.add('cell--start');
}

function escapeAttr(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function renderBoard() {
  els.board.innerHTML = '';
  const size = game.layout.length;
  els.board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

  game.layout.forEach((row, r) => {
    row.forEach((num, c) => {
      if (isCenterCovered(r, c, num)) return;

      const cell = document.createElement('div');
      cell.style.gridRow = `${r + 1}`;
      cell.style.gridColumn = `${c + 1}`;

      if (num === null) {
        cell.className = 'cell cell--empty';
        els.board.appendChild(cell);
        return;
      }

      const special = SPECIAL_SPACES[num];
      cell.className = 'cell cell--path';
      cell.dataset.space = num;

      if (special) applyCellStyle(cell, special, num);

      const isFinish = num === FINISH_SPACE;
      if (isFinish) {
        cell.classList.add('cell--finish-space', 'cell--finish-center');
        cell.style.gridRow = `${r + 1} / ${r + 4}`;
        cell.style.gridColumn = `${c + 1} / ${c + 4}`;
        cell.innerHTML = `
          <span class="cell-icon cell-icon--large">${special?.icon ?? '💰'}</span>
          <span class="cell-num cell-num--large">${num}</span>
          <span class="cell-label">${special?.name ?? 'Schat'}</span>
          <div class="tokens"></div>
        `;
        els.board.appendChild(cell);
        return;
      }

      const direction = getPathDirection(game.spacePositions, num);
      const arrowMap = { right: '→', down: '↓', left: '←', up: '↑' };

      cell.innerHTML = `
        <span class="cell-num">${num}</span>
        ${special?.icon ? `<span class="cell-icon" title="${escapeAttr(special.name)}">${special.icon}</span>` : ''}
        ${direction ? `<span class="path-arrow path-arrow--${direction}">${arrowMap[direction]}</span>` : ''}
        <div class="tokens"></div>
      `;

      els.board.appendChild(cell);
    });
  });

  renderTokens();
}

function snapshotSpecialSpaces() {
  const snap = {};
  const spaces = window.SPECIAL_SPACES ?? {};
  Object.entries(spaces).forEach(([num, special]) => {
    if (!special) return;
    snap[num] = `${special.type}|${special.category ?? ''}|${special.icon ?? ''}`;
  });
  return snap;
}

function isMysteryUnrevealedFingerprint(fp) {
  return fp === 'mystery|mystery|❓';
}

function isMysteryRevealedFingerprint(fp) {
  if (!fp) return false;
  if (fp.startsWith('path|')) return true;
  return fp.startsWith('event|ambush|');
}

function detectMysteryCellChanges(prevSnap, nextSnap) {
  const reveals = [];
  const resets = [];
  const keys = new Set([...Object.keys(prevSnap ?? {}), ...Object.keys(nextSnap ?? {})]);

  keys.forEach((key) => {
    const prev = prevSnap?.[key];
    const next = nextSnap?.[key];
    if (!prev || prev === next) return;
    if (isMysteryUnrevealedFingerprint(prev) && isMysteryRevealedFingerprint(next)) {
      reveals.push(Number(key));
    } else if (isMysteryRevealedFingerprint(prev) && isMysteryUnrevealedFingerprint(next)) {
      resets.push(Number(key));
    }
  });

  return { reveals, resets };
}

const MYSTERY_CELL_ANIM_MS = { reveal: 720, reset: 580 };

function playMysteryCellEffect(spaceNum, kind) {
  if (prefersReducedMotion()) return;
  const cell = document.querySelector(`[data-space="${spaceNum}"]`);
  if (!cell) return;

  const cls = kind === 'reset' ? 'cell--mystery-pulse-reset' : 'cell--mystery-pulse-reveal';
  cell.classList.remove('cell--mystery-pulse-reveal', 'cell--mystery-pulse-reset');
  void cell.offsetWidth;
  cell.classList.add(cls);

  const ms = MYSTERY_CELL_ANIM_MS[kind] ?? 650;
  window.setTimeout(() => cell.classList.remove(cls), ms);
}

function playMysteryCellChanges({ reveals = [], resets = [] } = {}) {
  reveals.forEach((spaceNum) => playMysteryCellEffect(spaceNum, 'reveal'));
  resets.forEach((spaceNum) => playMysteryCellEffect(spaceNum, 'reset'));
}

function playMysteryResetFromEvents(events) {
  const resetEv = events?.find((e) => e.type === 'mystery-reset');
  if (resetEv?.spaceNum != null) playMysteryCellEffect(resetEv.spaceNum, 'reset');
}

let tokensAnimating = false;

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

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

function renderPlayers() {
  els.playerList.innerHTML = '';

  game.players.forEach((p, i) => {
    const li = document.createElement('li');
    li.className = 'player-item';
    if (i === game.currentIndex && !game.gameOver) li.classList.add('player-item--active');

    li.innerHTML = `
      <span class="player-dot" style="background:${p.color}"></span>
      <span class="player-info">
        <strong>${p.name}</strong>
        <small>Vak ${p.position} · ${formatPlayerHp(p)}${formatPlayerDcHint(p)}${formatPlayerMovementHint(p)}${formatPlayerDmgHint(p)}</small>
      </span>
      <button class="btn-remove" title="Verwijder speler" data-id="${p.id}">×</button>
    `;

    els.playerList.appendChild(li);
  });

  els.playerList.querySelectorAll('.btn-remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      game.removePlayer(btn.dataset.id);
      renderBoard();
      renderPlayers();
      updateTurnUI();
      window.syncAfterAction?.();
    });
  });

  updateTurnUI();
}

function formatPlayerHp(player) {
  const filled = '❤️'.repeat(player.hp);
  const empty = '🖤'.repeat(Math.max(0, player.maxHp - player.hp));
  return filled + empty;
}

function getHpChangeFromEvents(events, playerName) {
  if (!events?.length) return null;
  const changes = events.filter(
    (e) => e.type === 'hp-change' && (!playerName || e.player === playerName),
  );
  if (changes.length === 0) return null;
  const totalDelta = changes.reduce((sum, e) => sum + e.delta, 0);
  const last = changes[changes.length - 1];
  return { ...last, delta: totalDelta };
}

function hasDeathInEvents(events) {
  return events?.some((e) => e.type === 'death') ?? false;
}

function getDeathFromEvents(events) {
  return events?.find((e) => e.type === 'death') ?? null;
}

function setEventResultClass(success, events) {
  els.eventResult.classList.remove('hidden');
  if (hasDeathInEvents(events)) {
    els.eventResult.className = 'event-card__result event-card__result--death';
    return;
  }
  els.eventResult.className = `event-card__result event-card__result--${success ? 'success' : 'fail'}`;
}

function buildResultHpHtml(events, player) {
  const deathEv = getDeathFromEvents(events);
  if (deathEv) {
    const bonusNote =
      deathEv.movementBonus > 0 ? ` · +${deathEv.movementBonus} beweging (catch-up)` : '';
    return `
      <div class="result-death">
        <span class="result-death__icon" aria-hidden="true">💀</span>
        <p class="result-death__title">Je bent uitgevallen!</p>
        <p class="result-death__detail">Terug naar start · ${window.DEFAULT_HP} HP${bonusNote}</p>
      </div>
    `;
  }

  const hpEv = getHpChangeFromEvents(events, player.name);
  if (!hpEv || !player) return '';

  const delta = hpEv.delta;
  const atMaxHp = player.hp >= player.maxHp;
  const healBlocked = delta === 0 && atMaxHp;

  let deltaHtml = '';
  if (healBlocked) {
    deltaHtml = '<span class="result-hp__max-note">Jij mazzelaar — je zit al op max HP!</span>';
  } else if (delta !== 0) {
    const sign = delta > 0 ? '+' : '−';
    const deltaClass = delta < 0 ? 'result-hp__delta--loss' : 'result-hp__delta--gain';
    deltaHtml = `<span class="result-hp__delta ${deltaClass}">${sign}${Math.abs(delta)} HP</span>`;
  }

  return `
    <p class="result-hp${healBlocked ? ' result-hp--maxed' : ''}">
      ${deltaHtml}
      <span class="result-hp__now">Nu <strong>${player.hp}</strong> / ${player.maxHp}</span>
      <span class="result-hp__hearts" aria-hidden="true">${formatPlayerHp(player)}</span>
    </p>
  `;
}

function formatPlayerMovementHint(player) {
  const bonus = player.movementBonus ?? 0;
  return bonus > 0 ? ` · +${bonus} beweging` : '';
}

function formatPlayerDmgHint(player) {
  const bonus = player.dmgBonus ?? 0;
  return bonus > 0 ? ` · +${bonus} schade` : '';
}

function updateHpControls() {
  const cp = game.currentPlayer;
  const show = cp && !game.gameOver;

  els.hpControls.classList.toggle('hp-controls--hidden', !show);
  els.hpMinusBtn.disabled = !show;
  els.hpPlusBtn.disabled = !show || !cp || cp.hp >= cp.maxHp;

  if (!show || !cp) {
    els.hpDisplay.textContent = '';
    return;
  }

  els.hpDisplay.textContent = formatPlayerHp(cp);
  els.hpDisplay.title = `${cp.hp} / ${cp.maxHp} HP`;
}

function adjustCurrentPlayerHp(delta) {
  const player = game.currentPlayer;
  if (!player || game.gameOver) return;

  const events = game.mutateHp(player, delta);
  if (events.length === 0) return;

  describeEvents(events);
  renderBoard();
  renderPlayers();
  updateTurnUI();
  window.syncAfterAction?.();
}

function renderCombatPlayerChips(playerIds, options = {}) {
  const { arenaFilter = null } = options;
  const cp = game.currentPlayer;

  return playerIds
    .map((id) => {
      const p = game.players.find((pl) => pl.id === id);
      if (!p) return '';
      const active = cp && id === cp.id;
      const onArena = arenaFilter ? arenaFilter(p) : false;
      const classes = ['combat-card__player'];
      if (active) classes.push('combat-card__player--active');
      if (onArena) classes.push('combat-card__player--arena');
      const marker = onArena ? ' <span aria-hidden="true">🎯</span>' : '';
      return `<span class="${classes.join(' ')}" style="border-color:${p.color}99;color:${p.color}">${escapeAttr(p.name)}${marker}</span>`;
    })
    .join('');
}

function renderBossMinionCombatCards() {
  const minions = game.bossMinions ?? [];
  if (!minions.length) return '';

  const cp = game.currentPlayer;
  const active = game.getActiveBossMinion();

  return minions
    .map((minion, index) => {
      const { config, hp, maxHp } = minion;
      const defeated = hp <= 0;
      const isActive = active === minion;
      const yourTurn = isActive && cp && isOnBossArena(cp.position);
      const pct = maxHp > 0 ? Math.round((hp / maxHp) * 100) : 0;

      return `
        <article class="combat-card combat-card--minion${defeated ? ' combat-card--defeated' : ''}${yourTurn ? ' combat-card--your-turn' : ''}${isActive && !defeated ? ' combat-card--minion-active' : ''}">
          <span class="combat-card__badge combat-card__badge--minion">${defeated ? '✓ Verslagen' : `👹 Beschermer ${index + 1}`}</span>
          <div class="combat-card__header">
            <span class="combat-card__icon">${config.icon || '👹'}</span>
            <div class="combat-card__meta">
              <span class="combat-card__name">${escapeAttr(config.name)}</span>
              <span class="combat-card__space">Vak 62 / 63 · vóór de eindbaas</span>
            </div>
          </div>
          <div class="boss-hp ambush-hp" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
            <div class="boss-hp__fill ambush-hp__fill" style="width:${pct}%"></div>
          </div>
          <p class="combat-card__hp-label">${defeated ? 'Verslagen' : `Vijand: ${hp} / ${maxHp} HP`}</p>
          ${yourTurn ? '<p class="combat-card__turn">⚔️ Jij bent aan de beurt — vecht!</p>' : ''}
        </article>
      `;
    })
    .join('');
}

function renderBossCombatCard() {
  if (!game.bossActive || !game.bossConfig) return '';

  const { bossConfig, bossHp, bossMaxHp } = game;
  const cp = game.currentPlayer;
  const mult = game.bossMultiplier ?? 1;
  const multNote = mult > 1 ? ` · ×${mult}` : '';
  const pct = bossMaxHp > 0 ? Math.round((bossHp / bossMaxHp) * 100) : 0;
  const yourTurn = cp && isOnBossArena(cp.position);
  const allIds = game.players.map((p) => p.id);
  const playersHtml = renderCombatPlayerChips(allIds, {
    arenaFilter: (p) => isOnBossArena(p.position),
  });

  return `
    <article class="combat-card combat-card--boss${yourTurn ? ' combat-card--your-turn' : ''}">
      <span class="combat-card__badge combat-card__badge--boss">⚔️ Eindbaas</span>
      <div class="combat-card__header">
        <span class="combat-card__icon combat-card__icon--boss">${bossConfig.icon || '🛡️'}</span>
        <div class="combat-card__meta">
          <span class="combat-card__name">${escapeAttr(bossConfig.name)}</span>
          <span class="combat-card__space">Vak 62 / 63 · gedeelde schade</span>
        </div>
      </div>
      <div class="boss-hp" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="boss-hp__fill" style="width:${pct}%"></div>
      </div>
      <p class="combat-card__hp-label">Nog ${bossHp} / ${bossMaxHp} schade te lijden${multNote}</p>
      <span class="combat-card__fighters-label">Gezelschap</span>
      <div class="combat-card__players">${playersHtml}</div>
      ${yourTurn ? '<p class="combat-card__turn">⚔️ Jij bent aan de beurt — aanvallen!</p>' : ''}
    </article>
  `;
}

function getActiveAmbushPits() {
  return Object.entries(game.ambushPits)
    .filter(([, pit]) => pit.hp > 0 && pit.playerIds.length > 0)
    .map(([spaceNum, pit]) => ({
      spaceNum: Number(spaceNum),
      config: pit.config,
      hp: pit.hp,
      maxHp: pit.maxHp,
      playerIds: pit.playerIds,
    }))
    .sort((a, b) => a.spaceNum - b.spaceNum);
}

function updateCombatRail() {
  if (!els.combatRail) return;

  const pits = getActiveAmbushPits();
  const hasBoss = game.bossActive && game.bossConfig;
  const hasMinions = hasBoss && (game.bossMinions?.length ?? 0) > 0;
  const hasPits = pits.length > 0;

  if (!hasBoss && !hasPits) {
    els.combatRail.classList.add('hidden');
    if (els.combatRailBoss) els.combatRailBoss.innerHTML = '';
    if (els.bossMinionsList) els.bossMinionsList.innerHTML = '';
    if (els.combatRailMinionsSection) els.combatRailMinionsSection.classList.add('hidden');
    if (els.ambushPitsList) els.ambushPitsList.innerHTML = '';
    if (els.combatRailPitsSection) els.combatRailPitsSection.classList.add('hidden');
    return;
  }

  els.combatRail.classList.remove('hidden');

  if (els.combatRailBoss) {
    els.combatRailBoss.innerHTML = hasBoss ? renderBossCombatCard() : '';
  }

  if (els.combatRailMinionsSection && els.bossMinionsList) {
    if (hasMinions) {
      els.combatRailMinionsSection.classList.remove('hidden');
      els.bossMinionsList.innerHTML = renderBossMinionCombatCards();
    } else {
      els.combatRailMinionsSection.classList.add('hidden');
      els.bossMinionsList.innerHTML = '';
    }
  }

  if (els.combatRailPitsSection && els.ambushPitsList) {
    if (hasPits) {
      els.combatRailPitsSection.classList.remove('hidden');
      const cp = game.currentPlayer;
      els.ambushPitsList.innerHTML = pits
        .map((pit) => {
          const { config, hp, maxHp, playerIds, spaceNum } = pit;
          const pct = maxHp > 0 ? Math.round((hp / maxHp) * 100) : 0;
          const yourTurn =
            cp != null && game.getPlayerPit(cp)?.spaceNum === spaceNum;
          const playersHtml = renderCombatPlayerChips(playerIds);

          return `
            <article class="combat-card combat-card--pit${yourTurn ? ' combat-card--your-turn' : ''}">
              <span class="combat-card__badge combat-card__badge--pit">🕳️ Put · vak ${spaceNum}</span>
              <div class="combat-card__header">
                <span class="combat-card__icon">${config.icon || '🕳️'}</span>
                <div class="combat-card__meta">
                  <span class="combat-card__name">${escapeAttr(config.name)}</span>
                  <span class="combat-card__space">Samen vechten · gedeelde vijand-HP</span>
                </div>
              </div>
              <div class="boss-hp ambush-hp" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
                <div class="boss-hp__fill ambush-hp__fill" style="width:${pct}%"></div>
              </div>
              <p class="combat-card__hp-label">Vijand: ${hp} / ${maxHp} HP</p>
              <span class="combat-card__fighters-label">In dit gevecht</span>
              <div class="combat-card__players">${playersHtml}</div>
              ${yourTurn ? '<p class="combat-card__turn">⚔️ Jij bent aan de beurt — vecht!</p>' : ''}
            </article>
          `;
        })
        .join('');
    } else {
      els.combatRailPitsSection.classList.add('hidden');
      els.ambushPitsList.innerHTML = '';
    }
  }
}

function updateBossPanel() {
  updateCombatRail();
}

function updateAmbushPanel() {
  updateCombatRail();
}

function bossHpBarHtml() {
  const max = game.bossMaxHp || 1;
  const hp = game.bossHp;
  const pct = Math.round((hp / max) * 100);
  return `
    <div class="event-card__boss-hp">
      <div class="boss-hp" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="boss-hp__fill" style="width:${pct}%"></div>
      </div>
      <p class="boss-hp__label">Gedeelde schade: ${hp} / ${max}</p>
    </div>
  `;
}

function updateTurnUI() {
  const cp = game.currentPlayer;
  updateBossPanel();
  updateAmbushPanel();

  if (game.gameOver) {
    els.currentPlayer.textContent = 'Spel afgelopen!';
    els.moveBtn.disabled = true;
    els.diceInput.disabled = true;
    updateHpControls();
    return;
  }

  if (!cp) {
    els.currentPlayer.textContent = 'Voeg spelers toe om te beginnen';
    els.moveBtn.disabled = true;
    els.diceInput.disabled = false;
    updateHpControls();
    return;
  }

  let turnText = `${cp.name} is aan de beurt`;
  if (game.pendingExtraTurn) turnText += ' (extra beurt!)';
  const activeMinion = game.getActiveBossMinion?.();
  if (activeMinion) {
    turnText += ` — 👹 ${activeMinion.config.name}`;
  } else if (game.bossActive && game.bossConfig) {
    turnText += ` — ⚔️ ${game.bossConfig.name}`;
  }
  const ambushPit = game.getCurrentPlayerPit();
  if (ambushPit) {
    turnText += ` — 🕳️ ${ambushPit.config.name}`;
  }
  els.currentPlayer.textContent = turnText;
  els.currentPlayer.style.color = cp.color;

  const inAmbush = game.isCurrentPlayerInAmbush();
  const onBossArena = !inAmbush && game.bossActive && cp && isOnBossArena(cp.position);
  const modalNeedsInput =
    document.body.classList.contains('modal-open')
    && (activeAmbush !== null || activeBossMinion !== null || activeBoss !== null || activeEvent !== null);
  const inputLocked = tokensAnimating || inAmbush || onBossArena || modalNeedsInput;
  els.moveBtn.disabled = inputLocked;
  els.diceInput.disabled = inputLocked;
  updateHpControls();

  if (window.isMultiplayerHost?.() && inAmbush && activeAmbush === null
      && els.eventModal.classList.contains('hidden')) {
    showAmbushModal();
  } else if (window.isMultiplayerHost?.() && onBossArena && activeBoss === null
      && activeBossMinion === null && els.eventModal.classList.contains('hidden')) {
    showBossFightModal();
  }

  updateTokenTurnStates();
}

function prependLogEntry(message, type = '') {
  const li = document.createElement('li');
  li.className = type ? `log-entry log-entry--${type}` : 'log-entry';
  li.textContent = message;
  els.gameLog.prepend(li);

  while (els.gameLog.children.length > 30) {
    els.gameLog.removeChild(els.gameLog.lastChild);
  }
}

function addLog(message, type = '') {
  prependLogEntry(message, type);
  window.syncLastEvent?.(message, type);
}

function describeEvents(events) {
  events.forEach((ev) => {
    switch (ev.type) {
      case 'move': {
        const bonusNote =
          ev.movementBonus > 0 && ev.baseSteps != null && ev.steps !== ev.baseSteps
            ? ` (${ev.baseSteps}+${ev.movementBonus} catch-up)`
            : '';
        addLog(`${ev.player} verplaatst ${ev.steps} vakje(s)${bonusNote} → vak ${ev.to}`);
        break;
      }
      case 'hp-change': {
        const verb = ev.delta < 0 ? 'verliest' : 'herstelt';
        const amount = Math.abs(ev.delta);
        addLog(
          `${ev.player} ${verb} ${amount} HP (${ev.from} → ${ev.to})`,
          ev.delta < 0 ? 'fail' : 'success',
        );
        break;
      }
      case 'death':
        addLog(
          `${ev.player} valt uit! Terug naar start · ${window.DEFAULT_HP} HP · +${ev.movementBonus} beweging (catch-up)`,
          'warn',
        );
        break;
      case 'bounce': {
        let msg = `Te ver! Terugkaatsen naar vak ${ev.position}`;
        if (ev.movementBonusCleared && ev.player) {
          msg += ` — ${ev.player}: catch-up bonus verbruikt`;
        }
        addLog(msg, 'warn');
        break;
      }
      case 'landed':
        if (ev.name) addLog(`Landt op: ${ev.icon} ${ev.name}`, 'special');
        break;
      case 'd20': {
        const dcLabel = String(ev.effectiveDc ?? ev.dc);
        const nat = ev.nat20 ? ' · Kritiek succes!' : ev.nat1 ? ' · Kritiek mislukking!' : '';
        addLog(
          `${ev.ability} check: ${ev.roll ?? '—'} vs DC ${dcLabel} — ${ev.success ? 'Geslaagd!' : 'Mislukt!'}${nat}`,
          ev.success ? 'success' : 'fail',
        );
        break;
      }
      case 'nat20':
        addLog(`${ev.player}: Nat 20!`, 'success');
        break;
      case 'nat1':
        addLog(`${ev.player}: Nat 1!`, 'fail');
        break;
      case 'event-steps':
        addLog(`${ev.player}: ${ev.total} vakje(s) vooruit`, 'success');
        break;
      case 'path':
        addLog(`${ev.player}: ${ev.icon} ${ev.name} — rustig pad`, 'special');
        break;
      case 'healer-visit': {
        if (ev.healed) {
          addLog(`${ev.player}: ${ev.icon} ${ev.name} — volledig hersteld (${ev.from} → ${ev.to} HP)`, 'success');
        } else {
          addLog(`${ev.player}: ${ev.icon} ${ev.name} — al vol HP`, 'special');
        }
        break;
      }
      case 'full-heal':
        break;
      case 'event-move': {
        const dir = ev.direction === 'back' ? 'terug' : 'vooruit';
        const bonusNote =
          ev.movementBonus > 0 &&
          ev.direction === 'forward' &&
          ev.baseSteps != null &&
          ev.steps !== ev.baseSteps
            ? ` (${ev.baseSteps}+${ev.movementBonus} catch-up)`
            : '';
        addLog(
          `${ev.player} ${ev.steps} vakje(s) ${dir}${bonusNote} → vak ${ev.to}`,
          ev.direction === 'back' ? 'fail' : 'success',
        );
        break;
      }
      case 'dc-streak':
        addLog(
          `${ev.player}: volgende check +${ev.nextBonus} DC (streak ${ev.to})`,
          'success',
        );
        break;
      case 'dc-streak-reset':
        addLog(`${ev.player}: DC-streak gereset na mislukte check`, 'warn');
        break;
      case 'pass-turn':
        addLog(`${ev.player} mislukt de check — beurt voorbij`, 'fail');
        break;
      case 'finish':
        addLog(`🏆 ${ev.player} bereikt de Draken-schat!`, 'win');
        break;
      case 'boss-reveal-pending':
        addLog(`⚔️ ${ev.player} bereikt de eindbaas-arena (vak ${ev.spaceNum}) — D12 volgt`, 'special');
        break;
      case 'boss-reveal': {
        const tierLabel = ev.tier === 'epic' ? 'Episch' : ev.tier === 'strong' ? 'Versterkt' : 'Standaard';
        const minionNote = ev.minionCount > 0 ? ` · ${ev.minionCount} beschermer(s)` : '';
        addLog(`⚔️ D12 eindbaas: ${ev.roll} → ${tierLabel} (×${ev.multiplier})${minionNote}`, 'special');
        break;
      }
      case 'boss-start': {
        const multNote = ev.multiplier > 1 ? ` · ×${ev.multiplier}` : '';
        const minionNote = ev.minionCount > 0 ? ` · ${ev.minionCount} beschermers` : '';
        addLog(
          `⚔️ ${ev.icon} ${ev.name} verschijnt! (${ev.bossHp} schade${multNote}${minionNote}) — ${ev.player} triggert de eindbaas`,
          'warn',
        );
        break;
      }
      case 'boss-minion-start':
        addLog(
          `👹 Beschermers verschijnen: ${ev.minions.map((m) => `${m.icon} ${m.name}`).join(' · ')}`,
          'warn',
        );
        break;
      case 'boss-minion-engage':
        addLog(
          `${ev.player} bereikt vak ${ev.spaceNum} — tijd om ${ev.name ?? 'de beschermer'} te verslaan!`,
          'special',
        );
        break;
      case 'boss-minion-player-attack': {
        const nat = ev.nat20 ? ' · Kritiek succes!' : ev.nat1 ? ' · Kritiek mislukking!' : '';
        addLog(
          `👹 ${ev.player} vs ${ev.minionName}: aanval ${ev.roll ?? '—'} vs AC ${ev.effectiveAc ?? ev.ac} — ${ev.hit ? 'Hit!' : 'Miss!'}${nat}`,
          ev.hit ? 'success' : 'fail',
        );
        break;
      }
      case 'boss-minion-enemy-attack':
        addLog(
          `👹 ${ev.minionName} aanvalt ${ev.player}: ${ev.roll ?? '—'}+${ev.attackBonus ?? '?'}=${ev.total ?? '—'} To hit — ${formatEnemyAttackLogEffect(ev)}`,
          ev.hit ? 'fail' : (ev.nat1 ? 'success' : 'special'),
        );
        break;
      case 'boss-minion-d20': {
        const nat = ev.nat20 ? ' · Kritiek succes!' : ev.nat1 ? ' · Kritiek mislukking!' : '';
        addLog(
          `👹 vs ${ev.minionName}: ${ev.ability} ${ev.roll ?? '—'} vs DC ${ev.effectiveDc} — ${ev.success ? 'Raak!' : 'Mis!'}${nat}`,
          ev.success ? 'success' : 'fail',
        );
        break;
      }
      case 'boss-minion-hit':
        addLog(
          `${ev.nat20 ? 'Kritiek treffer' : 'Raak'} op ${ev.minionName}! (−${ev.damage ?? 1} HP · nog ${ev.minionHp})`,
          'success',
        );
        break;
      case 'boss-minion-end':
        addLog(
          `👹 ${ev.minionName} is verslagen!${ev.minionsRemaining > 0 ? ` Nog ${ev.minionsRemaining} beschermer(s).` : ' Tijd voor de eindbaas!'}`,
          'success',
        );
        break;
      case 'boss-guard':
        addLog(
          `De schat is bereikbaar, maar ${ev.name ?? 'de eindbaas'} blokkeert de overwinning!`,
          'warn',
        );
        break;
      case 'boss-player-attack': {
        const nat = ev.nat20 ? ' · Kritiek succes!' : ev.nat1 ? ' · Kritiek mislukking!' : '';
        addLog(
          `⚔️ ${ev.player} vs ${ev.bossName}: aanval ${ev.roll ?? '—'} vs AC ${ev.effectiveAc ?? ev.ac} — ${ev.hit ? 'Hit!' : 'Miss!'}${nat}`,
          ev.hit ? 'success' : 'fail',
        );
        break;
      }
      case 'boss-enemy-attack':
        addLog(
          `⚔️ ${ev.bossName} aanvalt ${ev.player}: ${ev.roll ?? '—'}+${ev.attackBonus ?? '?'}=${ev.total ?? '—'} To hit — ${formatEnemyAttackLogEffect(ev)}`,
          ev.hit ? 'fail' : (ev.nat1 ? 'success' : 'special'),
        );
        break;
      case 'boss-special-save':
        addLog(
          `⚡ ${ev.name} op ${ev.player}: ${ev.saveAbility} ${ev.roll ?? '—'} vs DC ${ev.dc} — ${ev.success ? `geslaagd (−${ev.damage} HP)` : `mislukt (−${ev.damage} HP)`}`,
          ev.success ? 'warn' : 'fail',
        );
        break;
      case 'boss-d20': {
        const nat = ev.nat20 ? ' · Kritiek succes!' : ev.nat1 ? ' · Kritiek mislukking!' : '';
        addLog(
          `⚔️ vs ${ev.bossName}: ${ev.ability} ${ev.roll ?? '—'} vs DC ${ev.effectiveDc} — ${ev.success ? 'Raak!' : 'Mis!'}${nat}`,
          ev.success ? 'success' : 'fail',
        );
        break;
      }
      case 'boss-hit':
        addLog(
          `${ev.nat20 ? 'Kritiek treffer' : 'Raak'} op ${ev.bossName}! (−${ev.damage ?? 1} HP · nog ${ev.bossHp} nodig)`,
          'success',
        );
        break;
      case 'boss-defeated':
        addLog(`🏆 ${ev.bossName} is verslagen!`, 'success');
        break;
      case 'boss-cleared':
        addLog(`⚔️ ${ev.player} passeert vak ${ev.spaceNum} — de eindbaas is al verslagen`, 'special');
        break;
      case 'boss-engage':
        addLog(
          `${ev.player} bereikt vak ${ev.spaceNum} — tijd om ${ev.name ?? 'de eindbaas'} aan te vallen!`,
          'special',
        );
        break;
      case 'boss-retreat':
        addLog(
          `${ev.player} trekt terug naar het kamp op vak ${ev.to} (was vak ${ev.from})`,
          'special',
        );
        break;
      case 'ambush-start':
        addLog(
          `🕳️ ${ev.icon} ${ev.name} — ${ev.player} valt in de put op vak ${ev.spaceNum}! (${ev.ambushHp} HP)`,
          'warn',
        );
        break;
      case 'ambush-join':
        addLog(
          `🕳️ ${ev.player} valt bij ${ev.name} in de put op vak ${ev.spaceNum} (${ev.ambushHp} HP)${ev.allies?.length ? ` — al aanwezig: ${ev.allies.join(', ')}` : ''}`,
          'warn',
        );
        break;
      case 'ambush-player-attack': {
        const nat = ev.nat20 ? ' · Kritiek succes!' : ev.nat1 ? ' · Kritiek mislukking!' : '';
        addLog(
          `Ambush ${ev.ambushName}: ${ev.player} aanval ${ev.roll ?? '—'} vs AC ${ev.effectiveAc ?? ev.ac} — ${ev.hit ? 'Hit!' : 'Miss!'}${nat}`,
          ev.hit ? 'success' : 'fail',
        );
        break;
      }
      case 'ambush-enemy-attack':
        addLog(
          `Ambush ${ev.ambushName} aanvalt ${ev.player}: ${ev.roll ?? '—'}+${ev.attackBonus ?? '?'}=${ev.total ?? '—'} To hit — ${formatEnemyAttackLogEffect(ev)}`,
          ev.hit ? 'fail' : (ev.nat1 ? 'success' : 'special'),
        );
        break;
      case 'ambush-d20': {
        const nat = ev.nat20 ? ' · Kritiek succes!' : ev.nat1 ? ' · Kritiek mislukking!' : '';
        addLog(
          `Ambush ${ev.ambushName}: ${ev.ability} ${ev.roll ?? '—'} vs DC ${ev.effectiveDc} — ${ev.success ? 'succes' : 'faal'} — ambusher ${ev.ambushHp} HP, speler ${ev.playerHp} HP${nat}`,
          ev.success ? 'success' : 'fail',
        );
        break;
      }
      case 'ambush-hit':
        addLog(
          `${ev.nat20 ? 'Kritiek treffer' : 'Treffer'} op ${ev.ambushName}! (−${ev.damage ?? 1} HP · nog ${ev.ambushHp} ambusher-HP)`,
          'success',
        );
        break;
      case 'ambush-end':
        if (ev.success) {
          const freed = ev.freedPlayers?.length ? ` — vrij: ${ev.freedPlayers.join(', ')}` : '';
          addLog(
            `🕳️ ${ev.ambushName} verslagen op vak ${ev.spaceNum}!${freed}`,
            'success',
          );
        } else if (ev.pitContinues) {
          addLog(
            `🕳️ ${ev.player} valt uit in de put — ${ev.ambushName} blijft voor de anderen`,
            'warn',
          );
        } else {
          addLog(`🕳️ ${ev.player} valt uit in de put — ${ev.ambushName} wint de ronde`, 'warn');
        }
        break;
      case 'mystery-pending':
        addLog(`❓ ${ev.player} landt op onbekend gevaar (vak ${ev.spaceNum})`, 'special');
        break;
      case 'mystery-roll':
        addLog(`❓ ${ev.player} gooit D12 op vak ${ev.spaceNum}: ${ev.roll}`, 'special');
        break;
      case 'mystery-reveal': {
        const label = ev.revealType === 'path'
          ? `rustig pad — ${ev.name}`
          : `ambush — ${ev.icon} ${ev.name} (${ev.ambushHp} HP)`;
        const extra = ev.jackpot ? ' · JACKPOT!' : ev.multiplier > 1 ? ` · ×${ev.multiplier}` : '';
        addLog(`❓ Onthuld op vak ${ev.spaceNum}: ${label}${extra}`, 'special');
        break;
      }
      case 'dmg-bonus':
        addLog(`⚔️ ${ev.player} krijgt permanente +1 schade-bonus (totaal +${ev.dmgBonus})`, 'success');
        break;
      case 'mystery-reset':
        addLog(`❓ Vak ${ev.spaceNum} is weer onbekend — wie weet wat er nu loert?`, 'special');
        break;
      default:
        break;
    }
  });
}

function formatDcDisplay(baseDc, player) {
  return String(getEffectiveDc(player, baseDc, game.difficultyLevel));
}

function updateDifficultyUI() {
  if (!els.difficultySelect) return;
  const level = String(game.difficultyLevel ?? 1);
  if (els.difficultySelect.value !== level) {
    els.difficultySelect.value = level;
  }
}

function setDifficultyLevel(level) {
  const parsed = Number.parseInt(String(level), 10);
  const clamped = Number.isFinite(parsed)
    ? Math.max(1, Math.min(window.DC_DIFFICULTY_MAX_LEVEL ?? 5, parsed))
    : 1;
  if (game.difficultyLevel === clamped) return;

  game.difficultyLevel = clamped;
  updateDifficultyUI();

  const dcBonus = getDifficultyDcBonus(clamped);
  const bonusLabel = dcBonus === 0 ? 'geen DC-bonus' : `DC +${dcBonus}`;
  addLog(`Moeilijkheidsgraad ${clamped} (${bonusLabel})`);
  window.syncAfterAction?.();
}

function formatPlayerDcHint(player) {
  const bonus = getDcBonus(player);
  const mod = getDcModifier(player);
  const bits = [];
  if (bonus) bits.push(`DC +${bonus}`);
  if (mod) bits.push(`DC ${mod}`);
  return bits.length ? ` · ${bits.join(' · ')}` : '';
}

let activeEvent = null;
let activeBoss = null;
let activeBossMinion = null;
let activeAmbush = null;
let activeCombatActionHandler = null;
let activeMystery = null;
let activeBossReveal = null;
let syncedActiveModal = null;
let pathModalCallback = null;
let pathModalSpaceNum = null;
let pathModalSkipMysteryReset = false;

function formatEnemyAttackLogEffect(ev) {
  if (ev.nat1 && ev.selfDamage) {
    return `Kritiek mislukking — vijand raakt zichzelf (−${ev.selfDamage} HP)`;
  }
  if (ev.hit) {
    const crit = ev.nat20 ? 'Kritiek treffer' : 'Hit';
    return `${crit} (−${ev.damage ?? 1} HP)`;
  }
  return 'Miss';
}

function serializeModalConfig(config) {
  if (!config) return null;
  const out = {
    name: config.name ?? null,
    icon: config.icon ?? null,
    flavor: config.flavor ?? null,
  };
  if (config.ability != null) out.ability = config.ability;
  if (config.dc != null) out.dc = config.dc;
  if (config.attackBonus != null) out.attackBonus = config.attackBonus;
  if (config.dmg != null) out.dmg = config.dmg;
  if (config.specialAttack) {
    out.specialAttack = { ...config.specialAttack };
  }
  if (config.successText != null) out.successText = config.successText;
  if (config.failText != null) out.failText = config.failText;
  if (config.revealType != null) out.revealType = config.revealType;
  if (config.multiplier != null) out.multiplier = config.multiplier;
  if (config.jackpot != null) out.jackpot = config.jackpot;
  if (config.ambushHp != null) out.ambushHp = config.ambushHp;
  if (config.tier != null) out.tier = config.tier;
  if (config.bossHp != null) out.bossHp = config.bossHp;
  if (config.bossMaxHp != null) out.bossMaxHp = config.bossMaxHp;
  if (Array.isArray(config.minions) && config.minions.length > 0) {
    out.minions = config.minions.map((m) => ({
      name: m.name ?? null,
      icon: m.icon ?? null,
      hp: m.hp ?? null,
      maxHp: m.maxHp ?? null,
    }));
  }
  return out;
}

function setSyncedActiveModal(modal) {
  syncedActiveModal = modal;
  window.syncActiveModal?.(modal);
  window.syncAfterAction?.();
}

function clearSyncedActiveModal() {
  syncedActiveModal = null;
  window.syncActiveModal?.(null);
  window.syncAfterAction?.();
}

function resetEventModalHostControls() {
  els.eventModal.classList.remove('event-modal--spectator');
  els.eventClose.classList.remove('is-hidden');
  els.eventClose.classList.remove('hidden');
  els.eventSubmit.classList.remove('is-hidden');
  els.eventCombatAction?.classList.add('hidden');
  activeCombatActionHandler = null;
}

function createCombatFlowState(onComplete, combatConfig = null, spaceNum = null, minionIndex = null) {
  const wasMysteryAmbush = spaceNum != null && game.revealedSpaces[spaceNum]?.type === 'ambush';
  return {
    onComplete,
    combatConfig,
    spaceNum,
    minionIndex,
    wasMysteryAmbush,
    phase: 'player-roll',
    pendingEvents: [],
    eventsAppliedCount: 0,
    roll: null,
    nat20: false,
    nat1: false,
    playerHit: null,
    enemyRoll: null,
    enemyHit: null,
    playerNat1: false,
    triggerSpecial: false,
    submitted: false,
  };
}

function getCombatFlowType() {
  if (activeAmbush) return 'ambush';
  if (activeBossMinion) return 'boss-minion';
  if (activeBoss) return 'boss';
  return null;
}

function getActiveCombatFlow() {
  return activeAmbush || activeBossMinion || activeBoss;
}

function getCombatConfig() {
  const type = getCombatFlowType();
  const flow = getActiveCombatFlow();
  const ambushPit = () => game.getPitAt(flow?.spaceNum ?? game.currentPlayer?.position);

  if (type === 'ambush') {
    return game.getCurrentPlayerPit()?.config
      ?? ambushPit()?.config
      ?? flow?.combatConfig
      ?? null;
  }
  if (type === 'boss-minion') {
    return game.getActiveBossMinion()?.config ?? flow?.combatConfig ?? null;
  }
  if (type === 'boss') return game.bossConfig ?? flow?.combatConfig ?? null;
  return flow?.combatConfig ?? null;
}

function getCombatSpaceNum() {
  const flow = getActiveCombatFlow();
  if (flow?.spaceNum != null) return flow.spaceNum;
  const type = getCombatFlowType();
  if (type === 'boss') return game.currentPlayer?.position ?? null;
  return game.currentPlayer?.position ?? null;
}

function resetCombatModalPhases() {
  els.eventCombatAdjudicate?.classList.add('hidden');
  els.eventEnemyRoll?.classList.add('hidden');
  els.eventSpecialSave?.classList.add('hidden');
  els.eventCombatAction?.classList.add('hidden');
  activeCombatActionHandler = null;
  els.eventRollArea?.classList.remove('is-hidden');
  els.eventNat20?.closest('.event-card__nat-crits')?.classList.remove('is-hidden');
  els.eventCombatHit?.removeAttribute('disabled');
  els.eventCombatMiss?.removeAttribute('disabled');
  els.eventEnemyHit?.removeAttribute('disabled');
  els.eventEnemyMiss?.removeAttribute('disabled');
  if (els.eventSpecialSaveInput) els.eventSpecialSaveInput.disabled = false;
  if (els.eventSpecialSaveSubmit) {
    els.eventSpecialSaveSubmit.disabled = false;
    els.eventSpecialSaveSubmit.classList.remove('is-hidden');
  }
}

function setCombatFooter(mode, label, onClick) {
  els.eventCombatAction?.classList.add('hidden');
  if (mode === 'action') {
    els.eventClose.classList.remove('hidden');
    els.eventClose.disabled = false;
    els.eventClose.textContent = label;
    activeCombatActionHandler = onClick;
    requestAnimationFrame(() => {
      els.eventClose.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  } else if (mode === 'close') {
    activeCombatActionHandler = null;
    els.eventClose.classList.remove('hidden');
  } else {
    activeCombatActionHandler = null;
    els.eventClose.classList.add('hidden');
    els.eventClose.disabled = true;
  }
}

async function applyNewCombatEvents(flow, events) {
  if (!events?.length) return;
  await applyCombatEvents(events);
  flow.eventsAppliedCount = (flow.eventsAppliedCount ?? 0) + events.length;
}

function refreshCombatModalFighterHp() {
  const player = game.currentPlayer;
  const wrap = els.eventCheck.querySelector('.event-card__combat-fighter-wrap');
  if (!wrap || !player) return;
  const hpSpan = wrap.querySelector('.ambush-modal__fighter-hp-num');
  const hearts = wrap.querySelector('.ambush-modal__fighter-hearts');
  if (hpSpan) hpSpan.textContent = `${player.hp} / ${player.maxHp} HP`;
  if (hearts) hearts.innerHTML = formatPlayerHp(player);
}

function refreshCombatModalHpBars() {
  const type = getCombatFlowType();
  const flow = getActiveCombatFlow();
  els.eventCheck.querySelector('.event-card__boss-hp')?.remove();
  if (type === 'ambush') {
    const pit = game.getPitAt(flow?.spaceNum ?? game.currentPlayer?.position);
    if (pit) els.eventCheck.insertAdjacentHTML('beforeend', ambushHpBarHtml(pit));
  } else if (type === 'boss-minion') {
    const minion = game.getActiveBossMinion();
    if (minion) els.eventCheck.insertAdjacentHTML('beforeend', bossMinionHpBarHtml(minion));
  } else if (type === 'boss') {
    els.eventCheck.insertAdjacentHTML('beforeend', bossHpBarHtml());
  }
  refreshCombatModalFighterHp();
}

function buildEnemyRollDisplay(enemyRoll) {
  const bonus = enemyRoll.attackBonus ?? 3;
  let suffix = '';
  if (enemyRoll.nat20) suffix = ' — Kritiek treffer!';
  if (enemyRoll.nat1) suffix = ' — Kritiek mislukking!';
  return `${enemyRoll.roll} + ${bonus} = ${enemyRoll.total} To hit${suffix}`;
}

function buildPlayerOutcomeHtml(flow, playerResult, config) {
  const player = game.currentPlayer;
  const rollLabel = buildCombatRollLabel(flow.roll, flow.nat20, flow.nat1);
  const acDisplay = formatAcDisplay(config.dc, player);
  const dmgBonus = player?.dmgBonus ?? 0;
  const type = getCombatFlowType();
  let effect = '';

  if (playerResult.playerHit) {
    const playerDmg = flow.nat20 ? 2 + dmgBonus : 1 + dmgBonus;
    if (type === 'ambush') {
      effect = `Treffer! Vijand verliest ${playerDmg} HP — nog ${playerResult.enemyHp ?? 0} / ${playerResult.enemyMaxHp ?? '?'}`;
    } else if (type === 'boss-minion') {
      effect = `Treffer! Beschermer verliest ${playerDmg} HP — nog ${playerResult.enemyHp ?? 0} / ${playerResult.enemyMaxHp ?? '?'}`;
    } else {
      effect = `Treffer! Eindbaas verliest ${playerDmg} schade — nog ${playerResult.enemyHp ?? 0} / ${playerResult.enemyMaxHp ?? '?'}`;
    }
  } else {
    effect = 'Mis! Geen schade aan de vijand.';
  }

  const hpHtml = buildResultHpHtml(playerResult.events, player);
  return `
    <div class="result-roll">🎲 ${rollLabel}</div>
    <div class="result-vs">vs AC ${acDisplay}</div>
    <p class="result-effect">${effect}</p>
    ${hpHtml}
  `;
}

function buildEnemyOutcomeHtml(flow, enemyResult, config) {
  const player = game.currentPlayer;
  const enemyRoll = flow.enemyRoll;
  const bonus = enemyRoll?.attackBonus ?? config?.attackBonus ?? 3;
  const rollLine = enemyRoll
    ? `${enemyRoll.roll} + ${bonus} = ${enemyRoll.total} To hit`
    : '—';
  let effect = '';

  if (enemyResult.enemyNat1) {
    effect = `Kritiek mislukking! Vijand raakt zichzelf (−${enemyResult.selfDamage ?? 1} HP)`;
  } else if (enemyResult.effectiveHit) {
    const crit = enemyResult.enemyNat20 ? 'Kritiek treffer' : 'Hit';
    effect = `${crit}! Jij verliest ${enemyResult.damage ?? 1} HP`;
  } else {
    effect = 'Miss! Geen schade voor jou.';
  }

  const hpHtml = buildResultHpHtml(enemyResult.events, player);
  return `
    <div class="result-roll">🎲 ${rollLine}${enemyRoll?.nat20 ? ' — Kritiek treffer!' : enemyRoll?.nat1 ? ' — Kritiek mislukking!' : ''}</div>
    <p class="result-effect">${effect}</p>
    ${hpHtml}
  `;
}

function syncCombatOutcomePhase(type, config, spaceNum, combatPhase, outcome) {
  syncCombatModalPhase(type, config, spaceNum, combatPhase, {
    outcome: { ...outcome, actionLabel: outcome.actionLabel ?? null },
  });
}

function setEventCheckForNormal(config, player) {
  if (els.eventCheckLabel) els.eventCheckLabel.textContent = 'Ability Check';
  els.eventAbility?.classList.remove('hidden');
  els.eventAbility.textContent = config.ability;
  if (els.eventDcLabel) els.eventDcLabel.textContent = 'DC';
  if (els.eventDcWrap) {
    els.eventDcWrap.classList.remove('hidden');
    els.eventDc.textContent = formatDcDisplay(config.dc, player);
  }
  els.eventEnemyAtk?.classList.add('hidden');
  if (els.eventRollLabel) els.eventRollLabel.textContent = 'Totale worp';
}

function formatAcDisplay(baseAc, player) {
  return formatDcDisplay(baseAc, player);
}

function setEventCheckForCombat(config, player) {
  if (els.eventCheckLabel) els.eventCheckLabel.textContent = 'Aanvalsworp';
  els.eventAbility?.classList.add('hidden');
  if (els.eventDcLabel) els.eventDcLabel.textContent = 'AC';
  if (els.eventDcWrap) {
    els.eventDcWrap.classList.remove('hidden');
    els.eventDc.textContent = formatAcDisplay(config.dc, player);
  }
  els.eventEnemyAtk?.classList.add('hidden');
  if (els.eventRollLabel) els.eventRollLabel.textContent = 'Aanvalsworp totaal';
}

function syncCombatModalPhase(type, config, spaceNum, combatPhase, extra = {}) {
  const isOutcomePhase = combatPhase === 'outcome'
    || combatPhase === 'player-outcome'
    || combatPhase === 'enemy-outcome';
  setSyncedActiveModal({
    type,
    phase: isOutcomePhase ? 'outcome' : 'input',
    combatPhase,
    spaceNum: spaceNum ?? null,
    config: serializeModalConfig(config),
    submitLabel: extra.submitLabel || 'Bevestigen',
    enemyRoll: extra.enemyRoll ?? null,
    specialAttack: extra.specialAttack ?? null,
    outcome: extra.outcome ?? null,
  });
}

function showEnemyRollPhase(enemyRoll, config) {
  els.eventCombatAdjudicate.classList.add('hidden');
  const bonus = enemyRoll.attackBonus ?? config?.attackBonus ?? 3;
  if (els.eventEnemyRollLabel) {
    els.eventEnemyRollLabel.textContent = `Vijand-aanval (+${bonus} to hit)`;
  }
  els.eventEnemyRollDisplay.textContent = buildEnemyRollDisplay(enemyRoll);
  els.eventEnemyRoll.classList.remove('hidden');
  if (enemyRoll.nat20 || enemyRoll.nat1) {
    els.eventEnemyHit?.setAttribute('disabled', 'disabled');
    els.eventEnemyMiss?.setAttribute('disabled', 'disabled');
  } else {
    els.eventEnemyHit?.removeAttribute('disabled');
    els.eventEnemyMiss?.removeAttribute('disabled');
  }
}

function showSpecialSavePhase(config) {
  els.eventEnemyRoll.classList.add('hidden');
  const special = config.specialAttack;
  els.eventSpecialSaveTitle.textContent = `⚡ ${special?.name ?? 'Special attack'}!`;
  els.eventSpecialSaveFlavor.textContent =
    `${special?.saveAbility ?? 'Save'} save vs DC ${special?.dc ?? '?'} — slagen = ${special?.dmgSuccess ?? 1} HP, falen = ${special?.dmgFail ?? 2} HP`;
  els.eventSpecialSaveInput.value = '';
  els.eventSpecialSave.classList.remove('hidden');
  setTimeout(() => els.eventSpecialSaveInput?.focus(), 100);
}

async function applyCombatEvents(events) {
  describeEvents(events);
  await syncTokensAfterEvents(events);
  renderBoard();
  playMysteryResetFromEvents(events);
  renderPlayers();
  updateCombatRail();
}

function buildCombatRollLabel(roll, nat20, nat1) {
  if (nat20) {
    return roll != null ? `${roll} — Kritiek succes!` : 'Kritiek succes!';
  }
  if (nat1) {
    return roll != null ? `${roll} — Kritiek mislukking!` : 'Kritiek mislukking!';
  }
  return String(roll ?? '—');
}

function buildCombatOutcomeHtml(flow, config, finalResult) {
  const player = game.currentPlayer;
  const playerHit = flow.playerHit;
  const dmgBonus = player?.dmgBonus ?? 0;
  const type = getCombatFlowType();

  let effectParts = [];

  if (playerHit) {
    const playerDmg = flow.nat20 ? 2 + dmgBonus : 1 + dmgBonus;
    if (type === 'ambush') {
      effectParts.push(`Treffer! Vijand verliest ${playerDmg} HP — nog ${finalResult.ambushHp ?? 0} / ${finalResult.ambushMaxHp ?? '?'}`);
    } else if (type === 'boss-minion') {
      effectParts.push(`Treffer! Beschermer verliest ${playerDmg} HP — nog ${finalResult.minionHp ?? 0} / ${finalResult.minionMaxHp ?? '?'}`);
    } else {
      effectParts.push(`Treffer! Eindbaas verliest ${playerDmg} schade — nog ${game.bossHp} / ${game.bossMaxHp}`);
    }
  } else {
    effectParts.push('Mis! Geen schade aan de vijand.');
  }

  if (flow.enemyRoll && !finalResult.skipEnemySummary) {
    let enemyLine;
    if (flow.enemyRoll.nat1) {
      enemyLine = `Vijand-aanval (${flow.enemyRoll.roll}+${flow.enemyRoll.attackBonus}=${flow.enemyRoll.total}): Kritiek mislukking — self dmg`;
    } else if (flow.enemyHit) {
      const crit = flow.enemyRoll.nat20 ? 'Kritiek treffer' : 'Hit';
      enemyLine = `Vijand-aanval (${flow.enemyRoll.roll}+${flow.enemyRoll.attackBonus}=${flow.enemyRoll.total}): ${crit}`;
    } else {
      enemyLine = `Vijand-aanval (${flow.enemyRoll.roll}+${flow.enemyRoll.attackBonus}=${flow.enemyRoll.total}): Miss`;
    }
    effectParts.push(enemyLine);
  }

  if (flow.specialSaveResult) {
    const sr = flow.specialSaveResult;
    effectParts.push(
      sr.success
        ? `${config.specialAttack?.name ?? 'Special attack'}: geslaagd — ${sr.damage ?? config.specialAttack?.dmgSuccess ?? 1} HP`
        : `${config.specialAttack?.name ?? 'Special attack'}: mislukt — ${sr.damage ?? config.specialAttack?.dmgFail ?? 2} HP`,
    );
  }

  if (hasDeathInEvents(finalResult.events)) {
    if (type === 'ambush' && finalResult.ambushEnded) {
      effectParts.push('Uitgevallen — terug naar start · de put gaat verder voor de anderen');
    } else {
      effectParts.push('Uitgevallen — terug naar start');
    }
  } else if (type === 'ambush' && finalResult.ambushEnded && playerHit) {
    effectParts.push('De put is opgeheven — je mag weer dobbelstenen op dit vak!');
  } else if (type === 'boss-minion' && finalResult.minionEnded) {
    effectParts.push(
      game.hasBossMinions()
        ? 'Beschermer verslagen — nog een te gaan!'
        : 'Alle beschermers weg — tijd voor de eindbaas!',
    );
  } else if (type === 'boss' && finalResult.winner) {
    effectParts.push('De schat is vrij!');
  } else if (type === 'boss' && !game.bossActive) {
    effectParts.push('De eindbaas is verslagen! Wie op vak 63 staat wint — anders loop naar de schat.');
  } else if ((type === 'boss' || type === 'boss-minion') && game.bossActive) {
    effectParts.push('Je blijft op de arena — volgende beurt vecht je verder');
  }

  const hpHtml = buildResultHpHtml(finalResult.events, player);
  return `
    <p class="result-effect">${effectParts.join(' · ')}</p>
    ${hpHtml}
  `;
}

async function finishCombatRound(flow) {
  const type = getCombatFlowType();
  const config = getCombatConfig() ?? flow.combatConfig;
  const spaceNum = flow?.spaceNum ?? getCombatSpaceNum();
  const ctx = game.buildCombatContext(type, {
    allowDefeated: true,
    spaceNum,
    minionIndex: flow.minionIndex ?? null,
    combatConfig: config,
  });
  if (!ctx || !config) {
    console.error('finishCombatRound: geen combat context', { type, config, ctx });
    setCombatFooter('action', 'Samenvatting →', () => finishCombatRound(flow));
    return;
  }

  const applied = flow.eventsAppliedCount ?? 0;
  const finalResult = game.finalizeCombatRound(ctx, flow.pendingEvents, {
    wasMysteryAmbush: flow.wasMysteryAmbush,
  });
  flow.pendingEvents = finalResult.events;
  const newEvents = finalResult.events.slice(applied);
  await applyNewCombatEvents(flow, newEvents);

  els.eventCombatAdjudicate.classList.add('hidden');
  els.eventEnemyRoll.classList.add('hidden');
  els.eventSpecialSave.classList.add('hidden');
  els.eventRollArea.classList.add('is-hidden');
  els.eventCheck.classList.add('is-hidden');
  els.eventCombatAction.classList.add('hidden');
  activeCombatActionHandler = null;

  const success = flow.playerHit;
  els.eventTitle.textContent = 'Samenvatting';
  els.eventTitle.className = 'event-card__title';
  els.eventFlavor.textContent = success ? (config.successText || '') : (config.failText || '');
  els.eventFlavor.className = `event-card__flavor event-card__flavor--outcome event-card__flavor--${success ? 'success' : 'fail'}`;

  els.eventResult.classList.remove('hidden');
  setEventResultClass(success, finalResult.events);
  els.eventResult.innerHTML = buildCombatOutcomeHtml(flow, config, finalResult);

  const modalType = type;
  syncModalOutcome(modalType, spaceNum, config, {
    headerMode: 'outcome',
    success,
    title: els.eventTitle.textContent,
    titleClass: els.eventTitle.className,
    flavor: els.eventFlavor.textContent,
    flavorClass: els.eventFlavor.className,
    resultClassName: els.eventResult.className,
    resultHtml: els.eventResult.innerHTML,
  });
  window.syncAfterAction?.();

  flow.phase = 'outcome';
  flow.submitted = true;

  els.eventResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  if (type === 'ambush') {
    finishAmbushFlow({
      handler: () => {
        finishAmbushFight(flow.onComplete);
        advanceTurn();
      },
    });
  } else if (type === 'boss-minion') {
    finishBossMinionFlow({
      handler: () => {
        closeEventModal();
        flow.onComplete?.();
        advanceTurn();
      },
    });
  } else {
    updateBossPanel();
    finishBossFlow({
      handler: () => endBossTurn(flow.onComplete, finalResult.winner),
    });
  }
}

async function showPlayerAttackOutcome(flow, playerResult, config) {
  const type = getCombatFlowType();
  const spaceNum = getCombatSpaceNum();

  flow.pendingEvents.push(...playerResult.events);
  flow.playerHit = playerResult.playerHit;
  flow.playerNat1 = playerResult.playerNat1;
  flow.nat20 = playerResult.nat20;
  flow.nat1 = playerResult.nat1;

  await applyNewCombatEvents(flow, playerResult.events);
  refreshCombatModalHpBars();

  els.eventRollArea.classList.add('is-hidden');
  els.eventCheck.classList.add('is-hidden');
  els.eventCombatAdjudicate.classList.add('hidden');
  els.eventEnemyRoll.classList.add('hidden');

  const success = playerResult.playerHit;
  els.eventTitle.textContent = success ? 'Treffer!' : 'Mis!';
  els.eventTitle.className = `event-card__title event-card__title--${success ? 'success' : 'fail'}`;
  els.eventFlavor.textContent = success ? (config.successText || '') : (config.failText || '');
  els.eventFlavor.className = `event-card__flavor event-card__flavor--outcome event-card__flavor--${success ? 'success' : 'fail'}`;

  els.eventResult.classList.remove('hidden');
  setEventResultClass(success, playerResult.events);
  els.eventResult.innerHTML = buildPlayerOutcomeHtml(flow, playerResult, config);

  flow.phase = 'player-outcome';
  syncCombatOutcomePhase(type, config, spaceNum, 'player-outcome', {
    headerMode: 'outcome',
    success,
    title: els.eventTitle.textContent,
    titleClass: els.eventTitle.className,
    flavor: els.eventFlavor.textContent,
    flavorClass: els.eventFlavor.className,
    resultClassName: els.eventResult.className,
    resultHtml: els.eventResult.innerHTML,
    actionLabel: playerResult.skipEnemyPhase ? 'Samenvatting →' : 'Vijand aanvalt →',
  });

  if (playerResult.skipEnemyPhase) {
    setCombatFooter('action', 'Samenvatting →', () => finishCombatRound(flow));
  } else {
    setCombatFooter('action', 'Vijand aanvalt →', () => startEnemyAttackPhase(flow));
  }
}

async function startEnemyAttackPhase(flow) {
  const type = getCombatFlowType();
  const config = getCombatConfig();
  const spaceNum = getCombatSpaceNum();
  const ctx = game.buildCombatContext(type);
  if (!ctx || !config) return;

  els.eventCombatAction.classList.add('hidden');
  activeCombatActionHandler = null;
  els.eventResult.classList.add('hidden');
  els.eventTitle.textContent = config.name;
  els.eventTitle.className = 'event-card__title';
  els.eventFlavor.textContent = config.flavor;
  els.eventFlavor.className = 'event-card__flavor';

  flow.enemyRoll = game.rollCombatEnemyAttack(ctx);

  if (flow.enemyRoll.nat20 || flow.enemyRoll.nat1) {
    flow.enemyHit = flow.enemyRoll.nat20;
    await resolveAndShowEnemyOutcome(flow);
    return;
  }

  flow.phase = 'enemy-hit';
  showEnemyRollPhase(flow.enemyRoll, config);
  els.eventResult.classList.remove('hidden');
  els.eventResult.innerHTML = '<p class="spectator-wait">Host: hit of miss?</p>';
  setCombatFooter('none');
  syncCombatModalPhase(type, config, spaceNum, 'enemy-hit', {
    enemyRoll: flow.enemyRoll,
  });
}

async function resolveAndShowEnemyOutcome(flow) {
  const ctx = game.buildCombatContext(getCombatFlowType());
  if (!ctx) return;

  els.eventEnemyRoll.classList.add('hidden');

  let enemyResult;
  try {
    enemyResult = game.resolveCombatEnemyAttack(ctx, {
      hit: flow.enemyHit,
      enemyRoll: flow.enemyRoll,
      playerNat1: flow.playerNat1,
    });
  } catch (err) {
    console.error(err);
    return;
  }

  flow.enemyHit = enemyResult.effectiveHit;
  flow.pendingEvents.push(...enemyResult.events);
  await showEnemyAttackOutcome(flow, enemyResult);
}

async function showEnemyAttackOutcome(flow, enemyResult) {
  const type = getCombatFlowType();
  const config = getCombatConfig();
  const spaceNum = getCombatSpaceNum();

  await applyNewCombatEvents(flow, enemyResult.events);
  refreshCombatModalHpBars();

  els.eventEnemyRoll.classList.add('hidden');
  els.eventCombatAdjudicate.classList.add('hidden');

  let title;
  let titleClass;
  let success;
  if (enemyResult.enemyNat1) {
    title = 'Kritiek mislukking!';
    titleClass = 'event-card__title event-card__title--success';
    success = true;
  } else if (enemyResult.effectiveHit) {
    title = enemyResult.enemyNat20 ? 'Kritiek treffer!' : 'Vijand raakt!';
    titleClass = 'event-card__title event-card__title--fail';
    success = false;
  } else {
    title = 'Vijand mist!';
    titleClass = 'event-card__title event-card__title--success';
    success = true;
  }

  els.eventTitle.textContent = title;
  els.eventTitle.className = titleClass;
  els.eventFlavor.textContent = '';
  els.eventFlavor.className = 'event-card__flavor';

  els.eventResult.classList.remove('hidden');
  setEventResultClass(success, enemyResult.events);
  els.eventResult.innerHTML = buildEnemyOutcomeHtml(flow, enemyResult, config);

  flow.phase = 'enemy-outcome';
  const actionLabel = enemyResult.triggerSpecial && config?.specialAttack
    ? `${config.specialAttack.name} →`
    : 'Samenvatting →';
  if (enemyResult.triggerSpecial && config?.specialAttack) {
    flow.triggerSpecial = true;
  }
  syncCombatOutcomePhase(type, config, spaceNum, 'enemy-outcome', {
    headerMode: 'outcome',
    success,
    title,
    titleClass,
    flavor: '',
    flavorClass: 'event-card__flavor',
    resultClassName: els.eventResult.className,
    resultHtml: els.eventResult.innerHTML,
    actionLabel,
  });
  setCombatFooter('action', actionLabel, () => {
    if (enemyResult.triggerSpecial && config?.specialAttack) {
      beginSpecialSavePhase(flow, config);
    } else {
      finishCombatRound(flow);
    }
  });
}

function beginSpecialSavePhase(flow, config) {
  const type = getCombatFlowType();
  const spaceNum = getCombatSpaceNum();

  els.eventCombatAction.classList.add('hidden');
  activeCombatActionHandler = null;
  els.eventResult.classList.add('hidden');
  els.eventTitle.textContent = config.name;
  els.eventTitle.className = 'event-card__title';
  els.eventFlavor.textContent = config.flavor;
  els.eventFlavor.className = 'event-card__flavor';

  flow.phase = 'special-save';
  showSpecialSavePhase(config);
  setCombatFooter('none');
  syncCombatModalPhase(type, config, spaceNum, 'special-save', {
    specialAttack: config.specialAttack,
    enemyRoll: flow.enemyRoll,
  });
}

async function proceedAfterPlayerAttack(flow, playerResult) {
  const config = getCombatConfig() ?? flow.combatConfig;
  if (!config) {
    console.error('proceedAfterPlayerAttack: geen combat config');
    return;
  }
  await showPlayerAttackOutcome(flow, playerResult, config);
}

async function handleCombatPlayerSubmit() {
  const flow = getActiveCombatFlow();
  const type = getCombatFlowType();
  const config = getCombatConfig();
  const spaceNum = getCombatSpaceNum();
  if (!flow || flow.phase !== 'player-roll') return;

  const nat20 = els.eventNat20.checked;
  const nat1 = els.eventNat1.checked;
  const roll = parseCheckTotal(els.eventDiceInput.value);

  if (roll === null && !nat20 && !nat1) {
    els.eventResult.classList.remove('hidden');
    els.eventResult.className = 'event-card__result event-card__result--fail';
    els.eventResult.innerHTML =
      '<strong>Ongeldige worp</strong><p>Vul een worp in, of kies Kritiek succes / Kritiek mislukking.</p>';
    return;
  }

  flow.roll = roll;
  flow.nat20 = nat20;
  flow.nat1 = nat1;

  els.eventDiceInput.disabled = true;
  els.eventNat20.disabled = true;
  els.eventNat1.disabled = true;
  els.eventSubmit.disabled = true;
  els.eventResult.classList.add('hidden');

  const ctx = game.buildCombatContext(type);
  if (!ctx) return;

  let playerResult;
  try {
    playerResult = game.resolveCombatPlayerAttack(ctx, roll, { nat20, nat1 });
  } catch (err) {
    console.error(err);
    return;
  }

  await proceedAfterPlayerAttack(flow, playerResult);
}

async function handleCombatEnemyHit(hit) {
  const flow = getActiveCombatFlow();
  if (!flow || flow.phase !== 'enemy-hit') return;

  if (flow.enemyRoll?.nat20 || flow.enemyRoll?.nat1) return;

  flow.enemyHit = hit;
  await resolveAndShowEnemyOutcome(flow);
}

async function handleCombatSpecialSaveSubmit() {
  const flow = getActiveCombatFlow();
  const type = getCombatFlowType();
  if (!flow || flow.phase !== 'special-save') return;

  const saveRoll = parseCheckTotal(els.eventSpecialSaveInput.value);
  if (saveRoll === null) {
    els.eventResult.classList.remove('hidden');
    els.eventResult.className = 'event-card__result event-card__result--fail';
    els.eventResult.innerHTML = '<strong>Ongeldige worp</strong><p>Vul je saving throw totaal in.</p>';
    return;
  }

  const ctx = game.buildCombatContext(type);
  if (!ctx) return;

  els.eventSpecialSave.classList.add('hidden');

  let saveResult;
  try {
    saveResult = game.resolveCombatSpecialSave(ctx, saveRoll);
  } catch (err) {
    console.error(err);
    return;
  }

  flow.pendingEvents.push(...saveResult.events);
  flow.specialSaveResult = saveResult;
  await applyNewCombatEvents(flow, saveResult.events);
  await finishCombatRound(flow);
}

function syncModalInput(type, config, spaceNum, options = {}) {
  setSyncedActiveModal({
    type,
    phase: 'input',
    spaceNum: spaceNum ?? null,
    config: serializeModalConfig(config),
    submitLabel: options.submitLabel || 'Bevestigen',
  });
}

function syncModalOutcome(type, spaceNum, config, outcome) {
  setSyncedActiveModal({
    type,
    phase: 'outcome',
    spaceNum: spaceNum ?? null,
    config: serializeModalConfig(config),
    outcome,
  });
}

function closeSpectatorModals() {
  lastSpectatorModalAnimKey = null;
  els.eventModal.classList.add('hidden');
  els.eventModal.classList.remove('event-modal--spectator');
  els.pathModal.classList.add('hidden');
  els.pathModal.classList.remove('path-modal--spectator');
  els.mysteryModal.classList.add('hidden');
  els.mysteryModal.classList.remove('mystery-modal--spectator');
  els.mysteryCard?.classList.remove('event-card--jackpot');
  els.bossRevealModal.classList.add('hidden');
  els.bossRevealModal.classList.remove('boss-reveal-modal--spectator');
  els.bossRevealCard?.classList.remove('event-card--epic');
  els.winModal.classList.add('hidden');
  els.winModal.classList.remove('win-modal--spectator');
  syncModalScrollLock();
}

function populateSpectatorCombatModal(type, config, spaceNum) {
  const player = game.currentPlayer;
  updateEventModalTurnPlayer();
  removeCombatHpBars();
  removeAmbushModalExtras();
  els.eventCard?.classList.remove('event-card--ambush');

  if (type === 'ambush') {
    const pit = game.getCurrentPlayerPit();
    if (pit && player) {
      els.eventCard?.classList.add('event-card--ambush');
      els.eventCard?.style.setProperty('--ambush-fighter-color', player.color);
      els.eventIcon.textContent = config.icon || '🕳️';
      els.eventSpace.textContent = `Vak ${spaceNum ?? player.position}`;
      els.eventTitle.textContent = config.name;
      els.eventTitle.className = 'event-card__title';
      els.eventFlavor.textContent = config.flavor;
      els.eventFlavor.className = 'event-card__flavor';
      els.eventCheck.insertAdjacentHTML('afterbegin', ambushFighterPanelHtml(player, pit));
      setEventCheckForCombat(config, player);
      els.eventCheck.insertAdjacentHTML('beforeend', ambushHpBarHtml());
    }
  } else if (type === 'boss-minion') {
    const minion = game.getActiveBossMinion?.();
    if (player && minion) {
      els.eventCard?.classList.add('event-card--ambush');
      els.eventCard?.style.setProperty('--ambush-fighter-color', player.color);
      els.eventCheck.insertAdjacentHTML('afterbegin', combatFighterPanelHtml(player, minionFighterNote(player)));
      els.eventCheck.insertAdjacentHTML('beforeend', bossMinionHpBarHtml(minion));
    }
    els.eventIcon.textContent = config.icon || '👹';
    els.eventSpace.textContent = `Vak ${spaceNum ?? player?.position ?? '62 / 63'}`;
    els.eventTitle.textContent = config.name;
    els.eventTitle.className = 'event-card__title';
    els.eventFlavor.textContent = config.flavor;
    els.eventFlavor.className = 'event-card__flavor';
    setEventCheckForCombat(config, player);
  } else if (type === 'boss') {
    if (player) {
      els.eventCard?.classList.add('event-card--boss');
      els.eventCard?.style.setProperty('--boss-fighter-color', player.color);
      els.eventCheck.insertAdjacentHTML('afterbegin', combatFighterPanelHtml(player, bossFighterNote(player)));
    }
    els.eventIcon.textContent = config.icon || '🛡️';
    els.eventSpace.textContent = 'Eindbaas';
    els.eventTitle.textContent = `⚔️ ${config.name}`;
    els.eventTitle.className = 'event-card__title';
    els.eventFlavor.textContent = config.flavor;
    els.eventFlavor.className = 'event-card__flavor';
    setEventCheckForCombat(config, player);
    els.eventCheck.insertAdjacentHTML('beforeend', bossHpBarHtml());
  } else {
    els.eventIcon.textContent = config.icon || '🎲';
    els.eventSpace.textContent = `Vak ${spaceNum ?? '?'}`;
    resetEventHeader(config);
    els.eventAbility.textContent = config.ability;
    els.eventDc.textContent = formatDcDisplay(config.dc, player);
  }
}

function renderSpectatorModal(activeModal) {
  if (window.isMultiplayerHost?.()) return;

  closeSpectatorModals();
  if (!activeModal) return;

  const { type, phase, config, spaceNum, outcome } = activeModal;

  if (type === 'mystery') {
    els.mysteryModal.classList.add('mystery-modal--spectator');
    els.mysteryModal.classList.remove('hidden');
    els.mysteryIcon.textContent = config?.icon || '❓';
    els.mysterySpace.textContent = `Vak ${spaceNum ?? '?'}`;
    els.mysteryTitle.textContent = '❓ Onbekend gevaar';

    if (phase === 'input') {
      els.mysteryFlavor.textContent = config?.flavor || 'Gooi een D12 om te onthullen wat hier loert.';
      els.mysteryRollArea.classList.remove('hidden');
      els.mysteryRevealArea.classList.add('hidden');
      els.mysterySubmit.classList.add('hidden');
      els.mysteryAction.classList.add('hidden');
      els.mysteryDiceInput.disabled = true;
    } else if (phase === 'outcome' && outcome) {
      els.mysteryFlavor.textContent = 'Dit loerde achter het vraagteken:';
      els.mysteryRollArea.classList.add('hidden');
      els.mysteryRevealArea.classList.remove('hidden');
      els.mysterySubmit.classList.add('hidden');
      els.mysteryAction.classList.remove('hidden');
      els.mysteryAction.textContent = outcome.actionLabel || 'Verder';
      els.mysteryAction.disabled = true;
      els.mysteryRevealContent.innerHTML = outcome.revealHtml || '';
      els.mysteryCard?.classList.toggle('event-card--jackpot', Boolean(config?.jackpot));
    }

    playSpectatorModalEnter(
      els.mysteryModal,
      phase === 'outcome' && config?.revealType === 'ambush' ? 'combat' : 'calm',
      activeModal,
    );
    syncModalScrollLock();
    return;
  }

  if (type === 'boss-reveal') {
    els.bossRevealModal.classList.add('boss-reveal-modal--spectator');
    els.bossRevealModal.classList.remove('hidden');
    els.bossRevealIcon.textContent = config?.icon || '⚔️';
    els.bossRevealSpace.textContent = `Vak ${spaceNum ?? '?'}`;
    els.bossRevealTitle.textContent = '⚔️ De eindbaas wacht';

    if (phase === 'input') {
      els.bossRevealFlavor.textContent = config?.flavor
        || 'Gooi een D12 — het lot bepaalt hoe zwaar dit gevecht wordt.';
      els.bossRevealRollArea.classList.remove('hidden');
      els.bossRevealResultArea.classList.add('hidden');
      els.bossRevealSubmit.classList.add('hidden');
      els.bossRevealAction.classList.add('hidden');
      els.bossRevealDiceInput.disabled = true;
    } else if (phase === 'outcome' && outcome) {
      els.bossRevealFlavor.textContent = 'Het lot is beslist:';
      els.bossRevealRollArea.classList.add('hidden');
      els.bossRevealResultArea.classList.remove('hidden');
      els.bossRevealSubmit.classList.add('hidden');
      els.bossRevealAction.classList.remove('hidden');
      els.bossRevealAction.textContent = outcome.actionLabel || 'Gevecht beginnen';
      els.bossRevealAction.disabled = true;
      els.bossRevealResultContent.innerHTML = outcome.revealHtml || '';
      els.bossRevealCard?.classList.toggle('event-card--epic', config?.tier === 'epic');
    }

    playSpectatorModalEnter(els.bossRevealModal, 'combat', activeModal);
    syncModalScrollLock();
    return;
  }

  if (type === 'path' || type === 'healer') {
    els.pathIcon.textContent = config?.icon || (type === 'healer' ? '✨' : '🚶');
    els.pathSpace.textContent = `Vak ${spaceNum ?? '?'}`;
    els.pathTitle.textContent = config?.name || '';
    els.pathFlavor.textContent = config?.flavor || '';
    if (els.pathTag) {
      els.pathTag.textContent = type === 'healer' ? 'Genezer' : 'Rustig pad';
    }
    if (els.pathNote) {
      const healInfo = activeModal?.outcome?.healInfo;
      els.pathNote.textContent = type === 'healer'
        ? (healInfo?.healed
          ? `Hersteld: ${healInfo.from} → ${healInfo.to} HP`
          : 'Al vol HP')
        : 'Geen ability check — even ademhalen en doorlopen.';
    }
    els.pathModal.classList.add('path-modal--spectator');
    els.pathModal.classList.remove('hidden');
    playSpectatorModalEnter(els.pathModal, 'calm', activeModal);
    syncModalScrollLock();
    return;
  }

  if (type === 'win') {
    els.winTitle.textContent = outcome?.title ?? '🏆 Overwinning!';
    els.winText.textContent = outcome?.text ?? '';
    els.winModal.classList.add('win-modal--spectator');
    els.winModal.classList.remove('hidden');
    playSpectatorModalEnter(els.winModal, 'win', activeModal);
    syncModalScrollLock();
    return;
  }

  if (!config) return;

  populateSpectatorCombatModal(type, config, spaceNum);
  els.eventModal.classList.add('event-modal--spectator');
  resetCombatModalPhases();
  els.eventRollArea.classList.add('is-hidden');
  els.eventNat20.disabled = true;
  els.eventNat1.disabled = true;
  els.eventDiceInput.disabled = true;

  const combatPhase = activeModal.combatPhase ?? 'player-roll';
  const isCombat = type === 'ambush' || type === 'boss' || type === 'boss-minion';

  if (phase === 'input') {
    els.eventCheck.classList.remove('is-hidden');
    els.eventResult.classList.remove('hidden');
    els.eventResult.className = 'event-card__result';
    if (isCombat && combatPhase === 'enemy-hit' && activeModal.enemyRoll) {
      const bonus = activeModal.enemyRoll.attackBonus ?? config.attackBonus ?? 3;
      if (els.eventEnemyRollLabel) {
        els.eventEnemyRollLabel.textContent = `Vijand-aanval (+${bonus} to hit)`;
      }
      els.eventEnemyRollDisplay.textContent = buildEnemyRollDisplay(activeModal.enemyRoll);
      els.eventEnemyRoll.classList.remove('hidden');
      els.eventResult.innerHTML = '<p class="spectator-wait">Host beslist hit of miss (vijand)…</p>';
    } else if (isCombat && combatPhase === 'special-save') {
      els.eventSpecialSave.classList.remove('hidden');
      const special = activeModal.specialAttack ?? config.specialAttack;
      els.eventSpecialSaveTitle.textContent = `⚡ ${special?.name ?? 'Special attack'}!`;
      els.eventSpecialSaveFlavor.textContent =
        `${special?.saveAbility ?? 'Save'} save vs DC ${special?.dc ?? '?'}`;
      els.eventSpecialSaveInput.disabled = true;
      els.eventSpecialSaveSubmit.classList.add('hidden');
      els.eventResult.innerHTML = '<p class="spectator-wait">Speler rolt saving throw…</p>';
    } else if (isCombat && combatPhase === 'player-hit') {
      els.eventResult.innerHTML = '<p class="spectator-wait">Host beslist hit of miss (speler)…</p>';
    } else {
      els.eventResult.innerHTML = '<p class="spectator-wait">Host voert het gevecht uit…</p>';
    }
  } else if (phase === 'outcome' && outcome) {
    if (outcome.headerMode === 'outcome') {
      showEventOutcomeInHeader(outcome.success, config);
    } else {
      els.eventTitle.textContent = outcome.title ?? config.name;
      els.eventTitle.className = outcome.titleClass ?? 'event-card__title';
      els.eventFlavor.textContent = outcome.flavor ?? '';
      els.eventFlavor.className = outcome.flavorClass ?? 'event-card__flavor';
    }
    els.eventCheck.classList.add('is-hidden');
    els.eventResult.classList.remove('hidden');
    els.eventResult.className = outcome.resultClassName ?? 'event-card__result';
    els.eventResult.innerHTML = outcome.resultHtml ?? '';
  }

  els.eventModal.classList.remove('hidden');
  playSpectatorModalEnter(
    els.eventModal,
    type === 'ambush' || type === 'boss' || type === 'boss-minion'
      ? 'combat'
      : getEventModalEnterTier(config),
    activeModal,
  );
  syncModalScrollLock();
}

function removeCombatHpBars() {
  els.eventCheck.querySelector('.event-card__boss-hp')?.remove();
}

function removeAmbushModalExtras() {
  els.eventCheck.querySelector('.event-card__combat-fighter-wrap')?.remove();
  els.eventCard?.style.removeProperty('--ambush-fighter-color');
  els.eventCard?.style.removeProperty('--boss-fighter-color');
  els.eventCard?.classList.remove('event-card--ambush', 'event-card--boss');
}

function updateEventModalTurnPlayer() {
  const player = game.currentPlayer;
  if (!els.eventTurnBanner) return;

  if (!player) {
    els.eventTurnBanner.classList.add('hidden');
    return;
  }

  els.eventTurnBanner.classList.remove('hidden');
  if (els.eventTurnName) els.eventTurnName.textContent = player.name;
  if (els.eventTurnDot) els.eventTurnDot.style.backgroundColor = player.color;
  els.eventCard?.style.setProperty('--turn-player-color', player.color);
}

function resetEventHeader(config) {
  els.eventTitle.textContent = config.name;
  els.eventTitle.className = 'event-card__title';
  els.eventFlavor.textContent = config.flavor;
  els.eventFlavor.className = 'event-card__flavor';
}

function showEventOutcomeInHeader(success, config) {
  els.eventTitle.textContent = success ? 'Geslaagd!' : 'Mislukt!';
  els.eventTitle.className = `event-card__title event-card__title--${success ? 'success' : 'fail'}`;
  els.eventFlavor.textContent = success ? (config.successText || '') : (config.failText || '');
  els.eventFlavor.className = `event-card__flavor event-card__flavor--outcome event-card__flavor--${success ? 'success' : 'fail'}`;
}

function populateEventModal(config, spaceNum) {
  resetEventModalHostControls();
  resetCombatModalPhases();
  const player = game.currentPlayer;
  updateEventModalTurnPlayer();

  removeCombatHpBars();
  removeAmbushModalExtras();
  els.eventCard?.classList.remove('event-card--ambush');
  els.eventIcon.textContent = config.icon || '🎲';
  els.eventSpace.textContent = `Vak ${spaceNum ?? '?'}`;
  resetEventHeader(config);
  setEventCheckForNormal(config, player);
  els.eventCheck.classList.remove('is-hidden');

  els.eventDiceInput.min = '1';
  els.eventDiceInput.removeAttribute('max');
  els.eventDiceInput.placeholder = '—';
  els.eventDiceInput.value = '';
  els.eventNat20.checked = false;
  els.eventNat20.disabled = false;
  els.eventNat1.checked = false;
  els.eventNat1.disabled = false;
  els.eventResult.className = 'event-card__result hidden';
  els.eventRollArea.classList.remove('is-hidden');
  activeCombatActionHandler = null;
  els.eventClose.classList.remove('hidden');
  els.eventClose.disabled = true;
  els.eventClose.textContent = 'Doorgaan op avontuur';
  els.eventSubmit.disabled = false;
  els.eventSubmit.classList.remove('is-hidden');
  els.eventSubmit.textContent = 'Bevestigen';
  els.eventDiceInput.disabled = false;
}

function closeEventModal() {
  els.eventModal.classList.add('hidden');
  syncModalScrollLock();
  resetCombatModalPhases();
  activeEvent = null;
  activeBoss = null;
  activeBossMinion = null;
  activeAmbush = null;
  els.eventCard?.classList.remove('event-card--ambush');
  removeAmbushModalExtras();
  if (window.isMultiplayerHost?.()) {
    const modalType = syncedActiveModal?.type;
    if (modalType === 'event' || modalType === 'boss' || modalType === 'boss-minion' || modalType === 'ambush') {
      clearSyncedActiveModal();
    }
  }
}

function populateBossModal() {
  resetEventModalHostControls();
  const config = game.bossConfig;
  const player = game.currentPlayer;
  if (!config) return;

  updateEventModalTurnPlayer();

  removeAmbushModalExtras();
  els.eventCard?.classList.remove('event-card--ambush');

  if (!player) return;

  els.eventCard?.classList.add('event-card--boss');
  els.eventCard?.style.setProperty('--boss-fighter-color', player.color);

  els.eventIcon.textContent = config.icon || '🛡️';
  els.eventSpace.textContent = 'Eindbaas';
  els.eventTitle.textContent = `⚔️ ${config.name}`;
  els.eventTitle.className = 'event-card__title';
  els.eventFlavor.textContent = config.flavor;
  els.eventFlavor.className = 'event-card__flavor';
  setEventCheckForCombat(config, player);
  els.eventCheck.classList.remove('is-hidden');
  resetCombatModalPhases();

  els.eventDiceInput.min = '1';
  els.eventDiceInput.removeAttribute('max');
  els.eventDiceInput.placeholder = '—';
  els.eventNat20.checked = false;
  els.eventNat20.disabled = false;
  els.eventNat1.checked = false;
  els.eventNat1.disabled = false;
  els.eventResult.className = 'event-card__result hidden';
  els.eventRollArea.classList.remove('is-hidden');
  setCombatFooter('none');
  els.eventClose.textContent = 'Doorgaan op avontuur';
  els.eventSubmit.disabled = false;
  els.eventSubmit.classList.remove('is-hidden');
  els.eventSubmit.textContent = 'Aanvallen';
  els.eventDiceInput.disabled = false;
  els.eventDiceInput.value = '';

  removeCombatHpBars();
  els.eventCheck.insertAdjacentHTML('afterbegin', combatFighterPanelHtml(player, bossFighterNote(player)));
  els.eventCheck.insertAdjacentHTML('beforeend', bossHpBarHtml());
}

function ambushHpBarHtml(pitOverride) {
  const pit = pitOverride
    ?? game.getPitAt(getActiveCombatFlow()?.spaceNum ?? game.currentPlayer?.position);
  const max = pit?.maxHp || 1;
  const hp = pit?.hp ?? 0;
  const pct = Math.round((hp / max) * 100);
  return `
    <div class="event-card__boss-hp">
      <p class="event-card__boss-hp-label">Vijand in de put</p>
      <div class="boss-hp ambush-hp" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="boss-hp__fill ambush-hp__fill" style="width:${pct}%"></div>
      </div>
      <p class="boss-hp__label">Ambusher: ${hp} / ${max} HP</p>
    </div>
  `;
}

function bossFighterNote(player) {
  return `Valt de eindbaas aan op vak ${player.position} · blijf vechten tot winst of uitval`;
}

function minionFighterNote(player) {
  return `Versla de beschermer op vak ${player.position} · blijf vechten tot winst of uitval`;
}

function bossMinionHpBarHtml(minion) {
  const max = minion?.maxHp || 1;
  const hp = minion?.hp ?? 0;
  const pct = Math.round((hp / max) * 100);
  return `
    <div class="event-card__boss-hp">
      <p class="event-card__boss-hp-label">Beschermer van de eindbaas</p>
      <div class="boss-hp ambush-hp" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="boss-hp__fill ambush-hp__fill" style="width:${pct}%"></div>
      </div>
      <p class="boss-hp__label">Vijand: ${hp} / ${max} HP</p>
    </div>
  `;
}

function combatFighterPanelHtml(player, note, alliesHtml = '') {
  return `
    <div class="event-card__combat-fighter-wrap">
      <div class="ambush-modal__fighter" style="--fighter-color:${player.color}">
        <div class="ambush-modal__fighter-accent" aria-hidden="true"></div>
        <div class="ambush-modal__fighter-body">
          <span class="ambush-modal__turn-badge">Aan de beurt</span>
          <div class="ambush-modal__fighter-row">
            <span class="ambush-modal__fighter-dot" aria-hidden="true"></span>
            <div class="ambush-modal__fighter-meta">
              <strong class="ambush-modal__fighter-name">${escapeAttr(player.name)}</strong>
              <span class="ambush-modal__fighter-hp" title="${player.hp} / ${player.maxHp} HP">
                <span class="ambush-modal__fighter-hearts">${formatPlayerHp(player)}</span>
                <span class="ambush-modal__fighter-hp-num">${player.hp} / ${player.maxHp} HP</span>
              </span>
            </div>
          </div>
          <p class="ambush-modal__pit-note">${note}</p>
        </div>
      </div>
      ${alliesHtml}
    </div>
  `;
}

function ambushFighterPanelHtml(player, pit) {
  const allies = pit.playerIds
    .filter((id) => id !== player.id)
    .map((id) => game.players.find((p) => p.id === id))
    .filter(Boolean);

  const alliesHtml = allies.length
    ? `
      <div class="ambush-modal__allies">
        <span class="ambush-modal__allies-label">Ook in de put</span>
        ${allies.map((a) => `
          <div class="ambush-modal__ally" style="--ally-color:${a.color}">
            <span class="ambush-modal__ally-dot" aria-hidden="true"></span>
            <span class="ambush-modal__ally-name">${escapeAttr(a.name)}</span>
            <span class="ambush-modal__ally-hp" title="${a.hp} / ${a.maxHp} HP">${formatPlayerHp(a)}</span>
            <span class="ambush-modal__ally-hp-num">${a.hp}/${a.maxHp}</span>
          </div>
        `).join('')}
      </div>`
    : '';

  return combatFighterPanelHtml(
    player,
    `Vecht uit de put op vak ${pit.spaceNum}${allies.length ? ' · samen met je bondgenoten' : ''}`,
    alliesHtml,
  );
}

function populateAmbushModal() {
  resetEventModalHostControls();
  const pit = game.getCurrentPlayerPit();
  const player = game.currentPlayer;
  if (!pit || !player) return;

  updateEventModalTurnPlayer();

  const { config } = pit;

  els.eventCard?.classList.add('event-card--ambush');
  els.eventCard?.style.setProperty('--ambush-fighter-color', player.color);
  els.eventIcon.textContent = config.icon || '🕳️';
  els.eventSpace.textContent = `Vak ${player.position}`;
  els.eventTitle.textContent = config.name;
  els.eventTitle.className = 'event-card__title';
  els.eventFlavor.textContent = config.flavor;
  els.eventFlavor.className = 'event-card__flavor';

  removeAmbushModalExtras();
  els.eventCheck.insertAdjacentHTML('afterbegin', ambushFighterPanelHtml(player, pit));

  setEventCheckForCombat(config, player);
  els.eventCheck.classList.remove('is-hidden');
  resetCombatModalPhases();

  els.eventDiceInput.min = '1';
  els.eventDiceInput.removeAttribute('max');
  els.eventDiceInput.placeholder = '—';
  els.eventNat20.checked = false;
  els.eventNat20.disabled = false;
  els.eventNat1.checked = false;
  els.eventNat1.disabled = false;
  els.eventResult.className = 'event-card__result hidden';
  els.eventRollArea.classList.remove('is-hidden');
  setCombatFooter('none');
  els.eventClose.textContent = 'Doorgaan op avontuur';
  els.eventSubmit.disabled = false;
  els.eventSubmit.classList.remove('is-hidden');
  els.eventSubmit.textContent = 'Vechten';
  els.eventDiceInput.disabled = false;
  els.eventDiceInput.value = '';

  removeCombatHpBars();
  els.eventCheck.insertAdjacentHTML('beforeend', ambushHpBarHtml());
}

function showAmbushModal(onComplete) {
  if (!game.isCurrentPlayerInAmbush() || !game.getCurrentPlayerPit()) {
    onComplete?.();
    return;
  }

  activeAmbush = createCombatFlowState(
    onComplete,
    game.getCurrentPlayerPit()?.config,
    game.currentPlayer?.position,
  );
  activeBoss = null;
  activeBossMinion = null;
  activeEvent = null;

  els.eventModal.classList.remove('hidden');
  els.eventModal.classList.remove('event-modal--spectator');
  syncModalScrollLock();
  populateAmbushModal();
  updateAmbushPanel();
  syncCombatModalPhase('ambush', game.getCurrentPlayerPit()?.config, game.currentPlayer?.position, 'player-roll', {
    submitLabel: 'Vechten',
  });
  playModalCardEnter(els.eventModal, 'combat');

  setTimeout(() => els.eventDiceInput.focus(), 100);
}

function populateBossMinionModal() {
  resetEventModalHostControls();
  const minion = game.getActiveBossMinion();
  const player = game.currentPlayer;
  if (!minion || !player) return;

  updateEventModalTurnPlayer();
  const { config } = minion;

  removeAmbushModalExtras();
  els.eventCard?.classList.remove('event-card--boss');
  els.eventCard?.classList.add('event-card--ambush');
  els.eventCard?.style.setProperty('--ambush-fighter-color', player.color);
  els.eventIcon.textContent = config.icon || '👹';
  els.eventSpace.textContent = `Vak ${player.position}`;
  els.eventTitle.textContent = config.name;
  els.eventTitle.className = 'event-card__title';
  els.eventFlavor.textContent = config.flavor;
  els.eventFlavor.className = 'event-card__flavor';

  els.eventCheck.insertAdjacentHTML('afterbegin', combatFighterPanelHtml(player, minionFighterNote(player)));
  setEventCheckForCombat(config, player);
  els.eventCheck.classList.remove('is-hidden');
  resetCombatModalPhases();

  els.eventDiceInput.min = '1';
  els.eventDiceInput.removeAttribute('max');
  els.eventDiceInput.placeholder = '—';
  els.eventNat20.checked = false;
  els.eventNat20.disabled = false;
  els.eventNat1.checked = false;
  els.eventNat1.disabled = false;
  els.eventResult.className = 'event-card__result hidden';
  els.eventRollArea.classList.remove('is-hidden');
  setCombatFooter('none');
  els.eventClose.textContent = 'Doorgaan op avontuur';
  els.eventSubmit.disabled = false;
  els.eventSubmit.classList.remove('is-hidden');
  els.eventSubmit.textContent = 'Vechten';
  els.eventDiceInput.disabled = false;
  els.eventDiceInput.value = '';

  removeCombatHpBars();
  els.eventCheck.insertAdjacentHTML('beforeend', bossMinionHpBarHtml(minion));
}

function showBossMinionModal(onComplete) {
  if (!game.bossActive || !game.getActiveBossMinion()) {
    showBossModal(onComplete);
    return;
  }

  closeBossRevealModal();
  const minion = game.getActiveBossMinion();
  const spaceNum = game.currentPlayer?.position;
  const minionIndex = game.bossMinions.indexOf(minion);
  activeBossMinion = createCombatFlowState(onComplete, minion.config, spaceNum, minionIndex);
  activeBoss = null;
  activeEvent = null;
  activeAmbush = null;

  els.eventModal.classList.remove('hidden');
  els.eventModal.classList.remove('event-modal--spectator');
  syncModalScrollLock();
  populateBossMinionModal();
  updateBossPanel();
  syncCombatModalPhase('boss-minion', minion.config, spaceNum, 'player-roll', {
    submitLabel: 'Vechten',
  });
  playModalCardEnter(els.eventModal, 'combat');

  setTimeout(() => els.eventDiceInput.focus(), 100);
}

function showBossFightModal(onComplete) {
  if (game.hasBossMinions?.()) {
    showBossMinionModal(onComplete);
  } else {
    showBossModal(onComplete);
  }
}

function showBossModal(onComplete) {
  if (!game.bossActive || !game.bossConfig) {
    onComplete?.();
    return;
  }

  closeBossRevealModal();
  activeBoss = createCombatFlowState(
    onComplete,
    game.bossConfig,
    game.currentPlayer?.position,
  );
  activeBossMinion = null;
  activeEvent = null;
  activeAmbush = null;

  els.eventModal.classList.remove('hidden');
  els.eventModal.classList.remove('event-modal--spectator');
  syncModalScrollLock();
  populateBossModal();
  updateBossPanel();
  syncCombatModalPhase('boss', game.bossConfig, game.currentPlayer?.position, 'player-roll', {
    submitLabel: 'Aanvallen',
  });
  playModalCardEnter(els.eventModal, 'combat');

  setTimeout(() => els.eventDiceInput.focus(), 100);
}

function finishBossFlow(onClose) {
  finishCombatHostControls(onClose);
  if (activeBoss) activeBoss.onClose = onClose?.handler;
}

function finishBossMinionFlow(onClose) {
  finishCombatHostControls(onClose);
  if (activeBossMinion) activeBossMinion.onClose = onClose?.handler;
}

async function handleBossMinionSubmit() {
  if (!activeBossMinion || activeBossMinion.submitted || !game.getActiveBossMinion()) return;
  await handleCombatPlayerSubmit();
}

async function handleAmbushSubmit() {
  if (!activeAmbush || activeAmbush.submitted || !game.isCurrentPlayerInAmbush()) return;
  await handleCombatPlayerSubmit();
}

/** Sluit put-modal van vorige speler; daarna advanceTurn opent zo nodig gevecht voor volgende speler in de put. */
function finishAmbushFight(onComplete) {
  closeEventModal();
  onComplete?.();
}

function finishCombatHostControls(onClose) {
  els.eventSubmit.classList.add('is-hidden');
  els.eventSubmit.disabled = true;
  els.eventDiceInput.disabled = true;
  els.eventNat20.disabled = true;
  els.eventNat1.disabled = true;
  els.eventRollArea.classList.add('is-hidden');
  els.eventCombatHit?.setAttribute('disabled', 'disabled');
  els.eventCombatMiss?.setAttribute('disabled', 'disabled');
  els.eventEnemyHit?.setAttribute('disabled', 'disabled');
  els.eventEnemyMiss?.setAttribute('disabled', 'disabled');
  if (els.eventSpecialSaveInput) els.eventSpecialSaveInput.disabled = true;
  if (els.eventSpecialSaveSubmit) els.eventSpecialSaveSubmit.disabled = true;
  els.eventCombatAction.classList.add('hidden');
  activeCombatActionHandler = null;
  els.eventClose.classList.remove('hidden');
  els.eventClose.disabled = false;
  els.eventClose.textContent = onClose?.chainLabel ?? 'Doorgaan op avontuur';
  els.eventClose.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function finishAmbushFlow(onClose) {
  finishCombatHostControls(onClose);
  if (activeAmbush) activeAmbush.onClose = onClose?.handler;
}

async function handleBossSubmit() {
  if (!activeBoss || activeBoss.submitted || !game.bossActive) return;
  await handleCombatPlayerSubmit();
}

function endBossTurn(onComplete, winner = null) {
  if (winner) {
    showWinModal(winner);
    return;
  }
  advanceTurn();
  onComplete?.();
}

function closePathModal() {
  if (els.pathModal.classList.contains('hidden')) return;
  els.pathModal.classList.add('hidden');
  els.pathModal.classList.remove('path-modal--spectator');
  syncModalScrollLock();
  clearSyncedActiveModal();

  const spaceNum = pathModalSpaceNum;
  pathModalSpaceNum = null;
  const skipMysteryReset = pathModalSkipMysteryReset;
  pathModalSkipMysteryReset = false;
  const cb = pathModalCallback;
  pathModalCallback = null;

  if (spaceNum != null && !skipMysteryReset) {
    const events = game.resetMysteryPathAfterRest(spaceNum);
    if (events.length > 0) {
      describeEvents(events);
      renderBoard();
      playMysteryResetFromEvents(events);
      window.syncAfterAction?.();
    }
  }

  cb?.();
}

function showPathModal(config, spaceNum, onComplete) {
  closeEventModal();
  els.pathIcon.textContent = config.icon || '🚶';
  els.pathSpace.textContent = `Vak ${spaceNum ?? '?'}`;
  els.pathTitle.textContent = config.name;
  els.pathFlavor.textContent = config.flavor;
  if (els.pathTag) els.pathTag.textContent = 'Rustig pad';
  if (els.pathNote) {
    els.pathNote.textContent = 'Geen ability check — even ademhalen en doorlopen.';
  }

  pathModalCallback = onComplete ?? null;
  pathModalSpaceNum = spaceNum ?? game.currentPlayer?.position ?? null;
  pathModalSkipMysteryReset = false;
  els.pathModal.classList.remove('hidden');
  els.pathModal.classList.remove('path-modal--spectator');
  els.pathClose.textContent = 'Rust even uit';
  els.pathClose.disabled = false;
  syncModalScrollLock();

  try {
    syncModalInput('path', config, spaceNum);
  } catch (err) {
    console.error('Path modal sync mislukt:', err);
  }
  playModalCardEnter(els.pathModal, 'calm');

  setTimeout(() => els.pathClose.focus(), 100);
}

function showHealerModal(config, spaceNum, healInfo, onComplete) {
  closeEventModal();
  els.pathIcon.textContent = config.icon || '✨';
  els.pathSpace.textContent = `Vak ${spaceNum ?? '?'}`;
  els.pathTitle.textContent = config.name;
  els.pathFlavor.textContent = config.flavor;
  if (els.pathTag) els.pathTag.textContent = 'Genezer';
  if (els.pathNote) {
    els.pathNote.textContent = healInfo?.healed
      ? `De cleric herstelt je volledig: ${healInfo.from} → ${healInfo.to} HP.`
      : 'Je voelt je al topfit — de cleric knikt begripvol en zegent je verder.';
  }

  pathModalCallback = onComplete ?? null;
  pathModalSpaceNum = spaceNum ?? game.currentPlayer?.position ?? null;
  pathModalSkipMysteryReset = true;
  els.pathModal.classList.remove('hidden');
  els.pathModal.classList.remove('path-modal--spectator');
  els.pathClose.textContent = 'Bedankt, zuster';
  els.pathClose.disabled = false;
  syncModalScrollLock();

  try {
    setSyncedActiveModal({
      type: 'healer',
      phase: 'outcome',
      spaceNum: spaceNum ?? null,
      config: serializeModalConfig(config),
      outcome: { healInfo },
    });
  } catch (err) {
    console.error('Healer modal sync mislukt:', err);
  }
  playModalCardEnter(els.pathModal, 'calm');

  setTimeout(() => els.pathClose.focus(), 100);
}

function formatMysteryMultiplierBadge(multiplier, jackpot) {
  if (jackpot) {
    return '<span class="mystery-badge mystery-badge--danger">Gevaarlijk</span>'
      + '<p class="mystery-jackpot">✨ Jackpot! Versla de vijand voor permanente +1 schade-bonus.</p>';
  }
  if (multiplier >= 2) {
    return '<span class="mystery-badge mystery-badge--danger">Gevaarlijk</span>';
  }
  if (multiplier >= 1.5) {
    return '<span class="mystery-badge mystery-badge--strong">Versterkte vijand</span>';
  }
  return '';
}

function buildMysteryRevealHtml(revelation) {
  if (!revelation) return '';
  const cfg = revelation.config ?? {};

  if (revelation.type === 'path') {
    return `
      <div class="mystery-reveal-card">
        <div class="mystery-reveal-card__head">
          <span class="mystery-reveal-card__icon">${cfg.icon ?? '🚶'}</span>
          <div>
            <p class="mystery-reveal-card__name">Rustig pad — ${cfg.name ?? 'Pad'}</p>
            <p class="mystery-reveal-card__flavor">${cfg.flavor ?? ''}</p>
          </div>
        </div>
      </div>`;
  }

  const hp = Math.ceil((cfg.ambushHp ?? 3) * (revelation.multiplier ?? 1));
  return `
    <div class="mystery-reveal-card">
      <div class="mystery-reveal-card__head">
        <span class="mystery-reveal-card__icon">${cfg.icon ?? '🕳️'}</span>
        <div>
          <p class="mystery-reveal-card__name">${cfg.name ?? 'Ambush'}</p>
          <p class="mystery-reveal-card__flavor">${cfg.flavor ?? ''}</p>
        </div>
      </div>
      <p class="mystery-reveal-card__flavor">Vijand-HP: ${hp}</p>
      ${formatMysteryMultiplierBadge(revelation.multiplier ?? 1, revelation.jackpot)}
    </div>`;
}

function formatBossTierBadge(tier, multiplier) {
  if (tier === 'epic' || multiplier >= 2) {
    return '<span class="mystery-badge mystery-badge--danger">Episch ×2</span>';
  }
  if (tier === 'strong' || multiplier >= 1.5) {
    return '<span class="mystery-badge mystery-badge--strong">Versterkt ×1.5</span>';
  }
  return '<span class="mystery-badge">Standaard</span>';
}

function buildBossRevealHtml(reveal) {
  if (!reveal) return '';
  const cfg = reveal.config ?? {};
  const failDmg = Math.ceil(reveal.multiplier ?? 1);
  return `
    <div class="mystery-reveal-card">
      <div class="mystery-reveal-card__head">
        <span class="mystery-reveal-card__icon">${cfg.icon ?? '⚔️'}</span>
        <div>
          <p class="mystery-reveal-card__name">${cfg.name ?? 'Eindbaas'}</p>
          <p class="mystery-reveal-card__flavor">${cfg.flavor ?? ''}</p>
        </div>
      </div>
      <p class="mystery-reveal-card__flavor">Boss-HP: ${reveal.bossHp ?? '?'} / ${reveal.bossMaxHp ?? '?'}</p>
      <p class="mystery-reveal-card__flavor">Mislukte check: ${failDmg} schade per hit</p>
      ${formatBossTierBadge(reveal.tier, reveal.multiplier ?? 1)}
      ${(reveal.minions?.length ?? 0) > 0 ? `
        <div class="boss-reveal-minions">
          <p class="mystery-reveal-card__flavor">Beschermers:</p>
          ${reveal.minions.map((m) => `
            <div class="boss-reveal-minion">
              <span class="boss-reveal-minion__icon">${m.icon ?? '👹'}</span>
              <span class="boss-reveal-minion__name">${escapeAttr(m.name ?? 'Beschermer')}</span>
              <span class="boss-reveal-minion__hp">${m.hp ?? '?'} HP</span>
            </div>
          `).join('')}
        </div>` : ''}
    </div>`;
}

function closeBossRevealModal() {
  if (els.bossRevealModal.classList.contains('hidden')) return;
  els.bossRevealModal.classList.add('hidden');
  els.bossRevealModal.classList.remove('boss-reveal-modal--spectator');
  els.bossRevealCard?.classList.remove('event-card--epic');
  syncModalScrollLock();
  activeBossReveal = null;
  if (window.isMultiplayerHost?.() && syncedActiveModal?.type === 'boss-reveal') {
    clearSyncedActiveModal();
  }
}

function closeMysteryModal() {
  if (els.mysteryModal.classList.contains('hidden')) return;
  els.mysteryModal.classList.add('hidden');
  els.mysteryModal.classList.remove('mystery-modal--spectator');
  els.mysteryCard?.classList.remove('event-card--jackpot');
  syncModalScrollLock();
  activeMystery = null;
  if (window.isMultiplayerHost?.() && syncedActiveModal?.type === 'mystery') {
    clearSyncedActiveModal();
  }
}

function showMysteryRevealPhase(revelation) {
  if (!activeMystery) return;
  activeMystery.phase = 'reveal';
  activeMystery.revelation = revelation;

  els.mysteryFlavor.textContent = 'Dit loerde achter het vraagteken:';
  els.mysteryRollArea.classList.add('hidden');
  els.mysteryRevealArea.classList.remove('hidden');
  els.mysterySubmit.classList.add('hidden');
  els.mysteryAction.classList.remove('hidden');
  els.mysteryAction.disabled = false;

  if (revelation.type === 'path') {
    els.mysteryAction.textContent = 'Verder lopen';
  } else {
    els.mysteryAction.textContent = 'Gevecht beginnen';
    els.mysteryCard?.classList.toggle('event-card--jackpot', Boolean(revelation.jackpot));
  }

  els.mysteryRevealContent.innerHTML = buildMysteryRevealHtml(revelation);

  const cfg = revelation.config ?? {};
  syncModalOutcome('mystery', activeMystery.spaceNum, {
    ...serializeModalConfig(cfg),
    revealType: revelation.type,
    multiplier: revelation.multiplier ?? null,
    jackpot: revelation.jackpot ?? false,
    ambushHp: revelation.type === 'ambush'
      ? Math.ceil((cfg.ambushHp ?? 3) * (revelation.multiplier ?? 1))
      : null,
  }, {
    revealHtml: els.mysteryRevealContent.innerHTML,
    actionLabel: els.mysteryAction.textContent,
  });
  playModalCardEnter(
    els.mysteryModal,
    revelation.type === 'ambush' ? 'combat' : 'calm',
  );
}

function showMysteryModal(spaceNum, onComplete) {
  closeEventModal();
  closePathModal();
  closeBossRevealModal();
  activeMystery = { spaceNum, onComplete, phase: 'roll', revelation: null };
  activeEvent = null;
  activeBoss = null;
  activeBossMinion = null;
  activeAmbush = null;

  els.mysteryModal.classList.remove('hidden');
  els.mysteryModal.classList.remove('mystery-modal--spectator');
  els.mysteryIcon.textContent = '❓';
  els.mysterySpace.textContent = `Vak ${spaceNum}`;
  els.mysteryTitle.textContent = '❓ Onbekend gevaar';
  els.mysteryFlavor.textContent = 'Gooi een D12 om te onthullen wat hier loert.';
  els.mysteryRollArea.classList.remove('hidden');
  els.mysteryRevealArea.classList.add('hidden');
  els.mysteryAction.classList.add('hidden');
  els.mysterySubmit.classList.remove('hidden');
  els.mysterySubmit.disabled = false;
  els.mysteryDiceInput.disabled = false;
  els.mysteryDiceInput.value = '';
  els.mysteryCard?.classList.remove('event-card--jackpot');
  syncModalScrollLock();

  syncModalInput('mystery', {
    name: 'Onbekend gevaar',
    icon: '❓',
    flavor: 'Gooi een D12 om te onthullen wat hier loert.',
  }, spaceNum, { submitLabel: 'Onthullen' });
  playModalCardEnter(els.mysteryModal, 'calm');

  setTimeout(() => els.mysteryDiceInput.focus(), 100);
}

function handleMysterySubmit() {
  if (!activeMystery || activeMystery.phase !== 'roll') return;
  const roll = parseDiceRoll(els.mysteryDiceInput.value, 1, 12);
  if (roll === null) {
    addLog('Vul een D12-worp in (1–12).', 'warn');
    return;
  }

  const result = game.resolveMysteryRoll(activeMystery.spaceNum, roll);
  describeEvents(result.events);
  renderBoard();
  renderPlayers();
  if (result.revelation) {
    playMysteryCellEffect(activeMystery.spaceNum, 'reveal');
    window.syncAfterAction?.();
  }

  if (!result.revelation) {
    const onDone = activeMystery.onComplete;
    closeMysteryModal();
    advanceTurn();
    window.syncAfterAction?.();
    onDone?.();
    return;
  }

  showMysteryRevealPhase(result.revelation);
}

function handleMysteryAction() {
  if (!activeMystery || activeMystery.phase !== 'reveal') return;
  const { revelation, spaceNum, onComplete } = activeMystery;

  if (revelation.type === 'path') {
    closeMysteryModal();
    showPathModal(revelation.config, spaceNum, () => {
      advanceTurn();
      onComplete?.();
    });
    return;
  }

  const player = game.currentPlayer;
  const ambushResult = game.startRevealedAmbush(player, spaceNum);
  if (!ambushResult) {
    closeMysteryModal();
    advanceTurn();
    onComplete?.();
    return;
  }

  describeEvents(ambushResult.events);
  closeMysteryModal();
  updateAmbushPanel();
  if (ambushResult.needsAmbush) {
    showAmbushModal(onComplete);
  } else {
    advanceTurn();
    onComplete?.();
  }
}

function showBossRevealRevealPhase(reveal) {
  if (!activeBossReveal) return;
  activeBossReveal.phase = 'reveal';
  activeBossReveal.reveal = reveal;

  els.bossRevealFlavor.textContent = 'Het lot is beslist:';
  els.bossRevealRollArea.classList.add('hidden');
  els.bossRevealResultArea.classList.remove('hidden');
  els.bossRevealSubmit.classList.add('hidden');
  els.bossRevealAction.classList.remove('hidden');
  els.bossRevealAction.disabled = false;
  els.bossRevealAction.textContent = 'Gevecht beginnen';
  els.bossRevealResultContent.innerHTML = buildBossRevealHtml(reveal);
  els.bossRevealCard?.classList.toggle('event-card--epic', reveal.tier === 'epic');

  const cfg = reveal.config ?? {};
  syncModalOutcome('boss-reveal', activeBossReveal.spaceNum, {
    ...serializeModalConfig(cfg),
    tier: reveal.tier ?? null,
    multiplier: reveal.multiplier ?? null,
    bossHp: reveal.bossHp ?? null,
    bossMaxHp: reveal.bossMaxHp ?? null,
    minions: reveal.minions?.map((m) => ({
      name: m.name ?? null,
      icon: m.icon ?? null,
      hp: m.hp ?? null,
      maxHp: m.maxHp ?? null,
    })) ?? null,
  }, {
    revealHtml: els.bossRevealResultContent.innerHTML,
    actionLabel: els.bossRevealAction.textContent,
  });
  playModalCardEnter(els.bossRevealModal, 'combat');
}

function showBossRevealModal(spaceNum, onComplete) {
  closeEventModal();
  closePathModal();
  closeMysteryModal();
  activeBossReveal = { spaceNum, onComplete, phase: 'roll', reveal: null };
  activeEvent = null;
  activeBoss = null;
  activeAmbush = null;

  els.bossRevealModal.classList.remove('hidden');
  els.bossRevealModal.classList.remove('boss-reveal-modal--spectator');
  els.bossRevealIcon.textContent = '⚔️';
  els.bossRevealSpace.textContent = `Vak ${spaceNum}`;
  els.bossRevealTitle.textContent = '⚔️ De eindbaas wacht';
  els.bossRevealFlavor.textContent = 'Gooi een D12 — het lot bepaalt hoe zwaar dit gevecht wordt.';
  els.bossRevealRollArea.classList.remove('hidden');
  els.bossRevealResultArea.classList.add('hidden');
  els.bossRevealAction.classList.add('hidden');
  els.bossRevealSubmit.classList.remove('hidden');
  els.bossRevealSubmit.disabled = false;
  els.bossRevealDiceInput.disabled = false;
  els.bossRevealDiceInput.value = '';
  els.bossRevealCard?.classList.remove('event-card--epic');
  syncModalScrollLock();

  syncModalInput('boss-reveal', {
    name: 'De eindbaas wacht',
    icon: '⚔️',
    flavor: 'Gooi een D12 — het lot bepaalt hoe zwaar dit gevecht wordt.',
  }, spaceNum, { submitLabel: 'Onthullen' });
  playModalCardEnter(els.bossRevealModal, 'combat');

  setTimeout(() => els.bossRevealDiceInput.focus(), 100);
}

function handleBossRevealSubmit() {
  if (!activeBossReveal || activeBossReveal.phase !== 'roll') return;
  const roll = parseDiceRoll(els.bossRevealDiceInput.value, 1, 12);
  if (roll === null) {
    addLog('Vul een D12-worp in (1–12).', 'warn');
    return;
  }

  const result = game.resolveBossReveal(activeBossReveal.spaceNum, roll);
  describeEvents(result.events);
  renderBoard();
  renderPlayers();
  updateBossPanel();

  if (!result.reveal) {
    const onDone = activeBossReveal.onComplete;
    closeBossRevealModal();
    advanceTurn();
    window.syncAfterAction?.();
    onDone?.();
    return;
  }

  showBossRevealRevealPhase(result.reveal);
}

function handleBossRevealAction() {
  if (!activeBossReveal || activeBossReveal.phase !== 'reveal') return;
  const { onComplete } = activeBossReveal;
  closeBossRevealModal();
  updateBossPanel();
  showBossFightModal(onComplete);
}

function continueAfterLand(result, onComplete) {
  if (result.winner) {
    showWinModal(result.winner);
    return;
  }

  if (result.needsMysteryRoll) {
    const spaceNum = result.mysterySpaceNum ?? game.currentPlayer?.position;
    showMysteryModal(spaceNum, onComplete);
    return;
  }

  if (result.needsAmbush) {
    updateAmbushPanel();
    showAmbushModal(onComplete);
    return;
  }

  if (result.needsBossReveal) {
    const spaceNum = result.bossRevealSpaceNum ?? game.currentPlayer?.position;
    showBossRevealModal(spaceNum, onComplete);
    return;
  }

  if (result.needsBossMinion) {
    updateBossPanel();
    showBossMinionModal(onComplete);
    return;
  }

  if (result.needsBoss) {
    updateBossPanel();
    showBossFightModal(onComplete);
    return;
  }

  if (result.needsEvent && result.eventConfig) {
    const spaceNum = result.events.find((e) => e.type === 'landed')?.spaceNum
      ?? game.currentPlayer?.position;
    showEventModal(result.eventConfig, spaceNum, onComplete);
    return;
  }

  if (result.needsPath && result.pathConfig) {
    const visitEvent = result.events.find((e) => e.type === 'healer-visit' || e.type === 'path');
    const spaceNum = visitEvent?.spaceNum ?? game.currentPlayer?.position;
    const onDone = onComplete ?? (() => {
      advanceTurn();
    });
    if (result.pathConfig.type === 'healer') {
      showHealerModal(result.pathConfig, spaceNum, visitEvent, onDone);
    } else {
      showPathModal(result.pathConfig, spaceNum, onDone);
    }
    return;
  }

  if (onComplete) {
    onComplete();
    return;
  }

  advanceTurn();
}

function showEventModal(config, spaceNum, onComplete) {
  closeBossRevealModal();
  activeEvent = { config, spaceNum, onComplete, submitted: false, phase: 'd20' };
  activeBoss = null;
  activeBossMinion = null;
  activeAmbush = null;

  els.eventModal.classList.remove('hidden');
  els.eventModal.classList.remove('event-modal--spectator');
  syncModalScrollLock();
  populateEventModal(config, spaceNum);
  syncModalInput('event', config, spaceNum, { submitLabel: 'Bevestigen' });
  playModalCardEnter(els.eventModal, getEventModalEnterTier(config));

  setTimeout(() => els.eventDiceInput.focus(), 100);
}

function finishEventFlow(onClose) {
  resetEventModalHostControls();
  activeCombatActionHandler = null;
  els.eventClose.classList.remove('hidden');
  els.eventSubmit.disabled = true;
  els.eventDiceInput.disabled = true;
  els.eventNat20.disabled = true;
  els.eventNat1.disabled = true;
  els.eventClose.disabled = false;
  els.eventClose.textContent = onClose?.chainLabel ?? 'Doorgaan op avontuur';
  if (activeEvent) activeEvent.onClose = onClose?.handler;
  els.eventClose.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function endEventTurn(onComplete) {
  advanceTurn();
  onComplete?.();
}

function formatEventMoveResult(result, events) {
  if (hasDeathInEvents(events)) return 'Uitgevallen — je begint opnieuw op het startvak.';

  if (result.nat1) return 'Kritiek mislukking! Beurt voorbij.';

  if (result.passTurn) return 'Mislukt — beurt voorbij.';

  const b = result.moveBreakdown;
  const steps = b?.total ?? result.moveSteps ?? 0;
  let text = `${steps} vakje(s) vooruit`;
  if (result.nat20) text += ' · Kritiek succes!';

  const p = game.currentPlayer;
  const streakBonus = getDcBonus(p);
  if (streakBonus) text += ` · volgende check +${streakBonus} DC`;
  const mod = getDcModifier(p);
  if (mod) text += ` · volgende check ${mod} DC`;

  if (result.needsEvent) text += ' · nog een event!';
  if (result.needsPath) text += result.pathConfig?.type === 'healer' ? ' · genezer!' : ' · rustig pad!';
  if (result.needsBoss) text += ' · eindbaas!';
  if (result.needsBossMinion) text += ' · beschermer!';
  if (result.needsBossReveal) text += ' · eindbaas D12!';
  if (result.needsMysteryRoll) text += ' · onbekend gevaar!';
  if (result.needsAmbush) text += ' · ambush-put!';

  return text;
}

function advanceTurn() {
  const { skippedPlayer } = game.nextTurn();
  if (skippedPlayer) {
    addLog(`${skippedPlayer} slaat een beurt over`, 'warn');
  }
  renderPlayers();
  updateTurnUI();

  const cp = game.currentPlayer;
  if (!game.gameOver && cp) {
    if (game.isCurrentPlayerInAmbush()) {
      showAmbushModal();
    } else if (game.bossActive && isOnBossArena(cp.position)) {
      showBossFightModal();
    }
  }

  window.syncAfterAction?.();
}

async function handleEventSubmit() {
  if (activeAmbush) {
    await handleAmbushSubmit();
    return;
  }
  if (activeBossMinion) {
    await handleBossMinionSubmit();
    return;
  }
  if (activeBoss) {
    await handleBossSubmit();
    return;
  }
  if (!activeEvent || activeEvent.submitted) return;

  const { config, onComplete } = activeEvent;
  const player = game.currentPlayer;
  const nat20 = els.eventNat20.checked;
  const nat1 = els.eventNat1.checked;
  const roll = parseCheckTotal(els.eventDiceInput.value);

  if (roll === null && !nat20 && !nat1) {
    els.eventResult.classList.remove('hidden');
    els.eventResult.className = 'event-card__result event-card__result--fail';
    els.eventResult.innerHTML =
      '<strong>Ongeldige worp</strong><p>Vul een worp in, of kies Kritiek succes / Kritiek mislukking.</p>';
    return;
  }

  activeEvent.submitted = true;

  const effectiveDc = getEffectiveDc(player, config.dc);
  const isNat1 = !nat20 && nat1;
  const success = !isNat1 && (nat20 || (roll !== null && roll >= effectiveDc));
  const rollLabel = nat20
    ? (roll != null ? `${roll} — Kritiek succes!` : 'Kritiek succes!')
    : isNat1
      ? (roll != null ? `${roll} — Kritiek mislukking!` : 'Kritiek mislukking!')
      : String(roll ?? '—');
  const dcDisplay = formatDcDisplay(config.dc, player);

  let result;
  try {
    result = game.resolveEvent(roll, config, { nat20, nat1 });
    describeEvents(result.events);
    await syncTokensAfterEvents(result.events);
    renderPlayers();
  } catch (err) {
    console.error(err);
    els.eventResult.className = 'event-card__result event-card__result--fail';
    els.eventResult.innerHTML = '<p>Kon het effect niet toepassen. Je kunt toch doorgaan.</p>';
    syncModalOutcome('event', activeEvent.spaceNum, config, {
      resultClassName: els.eventResult.className,
      resultHtml: els.eventResult.innerHTML,
    });
    finishEventFlow({ handler: () => endEventTurn(onComplete) });
    return;
  }

  els.eventRollArea.classList.add('is-hidden');
  els.eventCheck.classList.add('is-hidden');
  showEventOutcomeInHeader(success, config);
  els.eventResult.classList.remove('hidden');
  setEventResultClass(success, result.events);
  const hpHtml = buildResultHpHtml(result.events, game.currentPlayer);

  els.eventResult.innerHTML = `
    <div class="result-roll">🎲 ${rollLabel}</div>
    <div class="result-vs">vs DC ${dcDisplay}</div>
    <p class="result-effect">${formatEventMoveResult(result, result.events)}</p>
    ${hpHtml}
  `;

  syncModalOutcome('event', activeEvent.spaceNum, config, {
    headerMode: 'outcome',
    success,
    resultClassName: els.eventResult.className,
    resultHtml: els.eventResult.innerHTML,
  });

  if (result.winner) {
    finishEventFlow({ handler: () => showWinModal(result.winner) });
    return;
  }

  if (result.needsEvent && result.eventConfig) {
    const nextSpace = game.currentPlayer?.position;
    finishEventFlow({
      chainLabel: 'Volgend event →',
      handler: () => {
        closeEventModal();
        showEventModal(result.eventConfig, nextSpace, onComplete);
      },
    });
    return;
  }

  if (result.needsPath && result.pathConfig) {
    const nextSpace = game.currentPlayer?.position;
    const visitEvent = result.events.find((e) => e.type === 'healer-visit' || e.type === 'path');
    finishEventFlow({
      chainLabel: result.pathConfig.type === 'healer' ? 'Genezer →' : 'Rustig pad →',
      handler: () => {
        closeEventModal();
        if (result.pathConfig.type === 'healer') {
          showHealerModal(result.pathConfig, nextSpace, visitEvent, () => endEventTurn(onComplete));
        } else {
          showPathModal(result.pathConfig, nextSpace, () => endEventTurn(onComplete));
        }
      },
    });
    return;
  }

  if (result.needsMysteryRoll) {
    const nextSpace = result.mysterySpaceNum ?? game.currentPlayer?.position;
    finishEventFlow({
      chainLabel: 'Onbekend gevaar →',
      handler: () => {
        closeEventModal();
        showMysteryModal(nextSpace, onComplete);
      },
    });
    return;
  }

  if (result.needsAmbush) {
    finishEventFlow({
      chainLabel: 'Ambush-put →',
      handler: () => {
        closeEventModal();
        updateAmbushPanel();
        showAmbushModal(onComplete);
      },
    });
    return;
  }

  if (result.needsBossReveal) {
    const nextSpace = result.bossRevealSpaceNum ?? game.currentPlayer?.position;
    finishEventFlow({
      chainLabel: 'Eindbaas D12 →',
      handler: () => {
        closeEventModal();
        showBossRevealModal(nextSpace, onComplete);
      },
    });
    return;
  }

  if (result.needsBossMinion) {
    finishEventFlow({
      chainLabel: 'Beschermer →',
      handler: () => {
        closeEventModal();
        updateBossPanel();
        showBossMinionModal(onComplete);
      },
    });
    return;
  }

  if (result.needsBoss) {
    finishEventFlow({
      chainLabel: 'Eindbaas →',
      handler: () => {
        closeEventModal();
        updateBossPanel();
        showBossFightModal(onComplete);
      },
    });
    return;
  }

  finishEventFlow({ handler: () => endEventTurn(onComplete) });
}

els.eventNat20.addEventListener('change', () => {
  if (els.eventNat20.checked) els.eventNat1.checked = false;
});
els.eventNat1.addEventListener('change', () => {
  if (els.eventNat1.checked) els.eventNat20.checked = false;
});

els.eventSubmit.addEventListener('click', handleEventSubmit);
els.eventCombatAction?.addEventListener('click', async () => {
  if (els.eventCombatAction.disabled) return;
  const handler = activeCombatActionHandler;
  if (!handler) return;
  els.eventCombatAction.disabled = true;
  activeCombatActionHandler = null;
  try {
    await handler();
  } catch (err) {
    console.error(err);
    els.eventCombatAction.disabled = false;
    activeCombatActionHandler = handler;
  }
});
els.eventEnemyHit?.addEventListener('click', () => handleCombatEnemyHit(true));
els.eventEnemyMiss?.addEventListener('click', () => handleCombatEnemyHit(false));
els.eventSpecialSaveSubmit?.addEventListener('click', handleCombatSpecialSaveSubmit);
els.eventSpecialSaveInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleCombatSpecialSaveSubmit();
});
els.eventDiceInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleEventSubmit();
});
els.eventClose.addEventListener('click', async () => {
  if (activeCombatActionHandler && (activeAmbush || activeBossMinion || activeBoss)) {
    const handler = activeCombatActionHandler;
    els.eventClose.disabled = true;
    activeCombatActionHandler = null;
    try {
      await handler();
    } catch (err) {
      console.error(err);
      activeCombatActionHandler = handler;
      els.eventClose.disabled = false;
    }
    return;
  }
  if (els.eventClose.disabled) return;
  const handler = activeAmbush?.onClose ?? activeBossMinion?.onClose ?? activeBoss?.onClose ?? activeEvent?.onClose;
  closeEventModal();
  handler?.();
});

els.pathClose.addEventListener('click', closePathModal);
els.pathClose.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !els.pathModal.classList.contains('hidden')) closePathModal();
});

els.mysterySubmit.addEventListener('click', handleMysterySubmit);
els.mysteryDiceInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleMysterySubmit();
});
els.mysteryAction.addEventListener('click', handleMysteryAction);

els.bossRevealSubmit.addEventListener('click', handleBossRevealSubmit);
els.bossRevealDiceInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleBossRevealSubmit();
});
els.bossRevealAction.addEventListener('click', handleBossRevealAction);

function showWinModal(winner) {
  els.winModal.classList.remove('hidden');
  els.winModal.classList.remove('win-modal--spectator');
  syncModalScrollLock();
  els.winTitle.textContent = '🏆 Overwinning!';
  els.winText.textContent = `${winner.name} heeft de Draken-schat bereikt en wint het avontuur!`;
  playModalCardEnter(els.winModal, 'win');
  setSyncedActiveModal({
    type: 'win',
    phase: 'outcome',
    spaceNum: null,
    config: null,
    outcome: {
      title: '🏆 Overwinning!',
      text: `${winner.name} heeft de Draken-schat bereikt en wint het avontuur!`,
    },
  });
}

async function handleMoveResult(result) {
  describeEvents(result.events);
  await syncTokensAfterEvents(result.events);
  renderPlayers();
  continueAfterLand(result);
}

els.addBtn.addEventListener('click', () => {
  const name = els.playerName.value.trim();
  if (!name) return;
  if (game.players.length >= 8) {
    addLog('Maximaal 8 spelers!', 'warn');
    return;
  }

  game.addPlayer(name, COLORS[game.players.length % COLORS.length]);
  els.playerName.value = '';
  renderBoard();
  renderPlayers();
  addLog(`${name} voegt zich bij het avontuur!`);
  window.syncAfterAction?.();
});

els.playerName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') els.addBtn.click();
});

els.difficultySelect?.addEventListener('change', () => {
  setDifficultyLevel(els.difficultySelect.value);
});

function clearDiceInput() {
  els.diceInput.value = '';
  els.diceInput.focus();
}

els.moveBtn.addEventListener('click', async () => {
  const steps = parse2d6Total(els.diceInput.value);
  if (steps === null) {
    addLog('Vul het totaal van 2× D6 in (2–12).', 'warn');
    return;
  }

  const result = game.move(steps);
  await handleMoveResult(result);
  clearDiceInput();
});

els.diceInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') els.moveBtn.click();
});

els.hpMinusBtn.addEventListener('click', () => adjustCurrentPlayerHp(-1));
els.hpPlusBtn.addEventListener('click', () => adjustCurrentPlayerHp(1));

els.rulesOpenBtn?.addEventListener('click', showRulesModal);
els.legendRulesLink?.addEventListener('click', showRulesModal);
els.rulesCloseBtn?.addEventListener('click', closeRulesModal);
els.rulesCloseBottom?.addEventListener('click', closeRulesModal);
els.rulesModal?.addEventListener('click', (e) => {
  if (e.target === els.rulesModal) closeRulesModal();
});

els.newAdventureBtn?.addEventListener('click', showNewAdventureConfirm);
els.confirmCancel?.addEventListener('click', closeNewAdventureConfirm);
els.confirmOk?.addEventListener('click', () => {
  closeNewAdventureConfirm();
  startNewAdventure();
});
els.confirmModal?.addEventListener('click', (e) => {
  if (e.target === els.confirmModal) closeNewAdventureConfirm();
});

els.winClose.addEventListener('click', startNewAdventure);

window.getGame = () => game;
window.getActiveModal = () => syncedActiveModal;
window.renderSpectatorModal = renderSpectatorModal;
window.resyncActiveModalIfOpen = () => {
  if (syncedActiveModal) {
    window.syncActiveModal?.(syncedActiveModal);
    if (window.isMultiplayerHost?.()) window.syncAfterAction?.();
  }
};
window.refreshGameUI = () => {
  renderBoard();
  renderPlayers();
  updateCombatRail();
  updateDifficultyUI();
};

async function refreshGameUIFromRemote({ prevPositions, prevSpecialSpaces, isGuest = false } = {}) {
  renderBoard();

  if (prevSpecialSpaces) {
    playMysteryCellChanges(detectMysteryCellChanges(prevSpecialSpaces, snapshotSpecialSpaces()));
  }

  const shouldAnimate = isGuest
    && hasTokenPositionChanges(prevPositions)
    && !isLikelyGameReset(prevPositions);

  if (shouldAnimate) {
    repositionTokensToSnapshot(prevPositions);
    await animateFromPositionDiff(prevPositions);
  }

  renderTokens();
  renderPlayers();
  updateCombatRail();
  updateDifficultyUI();
}

window.refreshGameUIFromRemote = refreshGameUIFromRemote;
window.snapshotTokenPositions = snapshotTokenPositions;
window.snapshotSpecialSpaces = snapshotSpecialSpaces;
window.appendRemoteLogEntry = (message, type = '') => {
  prependLogEntry(message, type);
};
window.clearGameLog = () => {
  els.gameLog.innerHTML = '';
};
window.setMultiplayerReadOnly = (readOnly) => {
  document.querySelector('.app')?.classList.toggle('app--spectator', readOnly);
  els.playerName.disabled = readOnly;
  els.addBtn.disabled = readOnly;
  if (els.difficultySelect) els.difficultySelect.disabled = readOnly;
  if (els.newAdventureBtn) els.newAdventureBtn.disabled = readOnly;
  if (readOnly) {
    els.moveBtn.disabled = true;
    els.diceInput.disabled = true;
    els.hpMinusBtn.disabled = true;
    els.hpPlusBtn.disabled = true;
  } else {
    updateTurnUI();
  }
};

updateDifficultyUI();
renderBoard();
renderPlayers();
window.initMultiplayer?.();
