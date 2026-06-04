const TOTAL_SPACES = 63;
const FINISH_SPACE = 63;
const PATH_SPACES = 62;
const BOARD_SIZE = 9;
const DEFAULT_HP = 3;

/** Geslaagde event-check: basisstappen + overshoot (alleen tunen in code) */
const BASE_SUCCESS_STEPS = 1;
const OVERSHOOT_DIVISOR = 2;

function isCenterCell(r, c) {
  const start = Math.floor(BOARD_SIZE / 2) - 1;
  return r >= start && r <= start + 2 && c >= start && c <= start + 2;
}

function getCenterAnchor() {
  const start = Math.floor(BOARD_SIZE / 2) - 1;
  return { row: start, col: start };
}

function buildSpiralLayout(size = BOARD_SIZE) {
  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  let n = 1;
  let top = 0;
  let bottom = size - 1;
  let left = 0;
  let right = size - 1;

  function assign(r, c) {
    if (n > PATH_SPACES) return;
    if (isCenterCell(r, c)) return;
    grid[r][c] = n++;
  }

  while (n <= PATH_SPACES && top <= bottom && left <= right) {
    for (let c = left; c <= right && n <= PATH_SPACES; c++) assign(top, c);
    top++;
    for (let r = top; r <= bottom && n <= PATH_SPACES; r++) assign(r, right);
    right--;
    for (let c = right; c >= left && n <= PATH_SPACES; c--) assign(bottom, c);
    bottom--;
    for (let r = bottom; r >= top && n <= PATH_SPACES; r--) assign(r, left);
    left++;
  }

  const anchor = getCenterAnchor();
  grid[anchor.row][anchor.col] = FINISH_SPACE;
  return grid;
}

function buildSpacePositions(grid) {
  const positions = {};
  grid.forEach((row, r) => {
    row.forEach((num, c) => {
      if (num !== null) positions[num] = { row: r, col: c };
    });
  });
  return positions;
}

function getPathDirection(positions, fromSpace) {
  if (fromSpace >= FINISH_SPACE) return null;

  const from = positions[fromSpace];
  const to = positions[fromSpace + 1];
  if (!from || !to) return null;

  if (to.col > from.col) return 'right';
  if (to.col < from.col) return 'left';
  if (to.row > from.row) return 'down';
  if (to.row < from.row) return 'up';
  return null;
}

function randomSteps1to3() {
  return Math.floor(Math.random() * 3) + 1;
}

/**
 * Stappen na geslaagde event-check (vóór movementBonus / finish-bounce).
 * @param {number|null} roll — totale worp; bij alleen Nat 20-checkbox → 20 voor overshoot
 */
function calcEventSuccessSteps(roll, effectiveDc, options = {}) {
  const { nat20 = false } = options;
  const overshootRoll = roll ?? (nat20 ? 20 : 0);
  const base = nat20 ? BASE_SUCCESS_STEPS * 2 : BASE_SUCCESS_STEPS;
  const overshoot = Math.max(0, overshootRoll - effectiveDc);
  const extra = Math.floor(overshoot / OVERSHOOT_DIVISOR);
  const total = base + extra;
  return {
    base,
    extra,
    overshoot,
    divisor: OVERSHOOT_DIVISOR,
    total,
    overshootRoll,
  };
}

function applyMovementBonus(player, steps) {
  if (steps <= 0) return steps;
  return steps + (player.movementBonus ?? 0);
}

function getDcBonus(player) {
  return player?.dcStreak ?? 0;
}

/** Eenmalige modifier op de volgende check */
function getDcModifier(player) {
  return player?.nextDcMod ?? 0;
}

function getEffectiveDc(player, baseDc) {
  const total = baseDc + getDcBonus(player) + getDcModifier(player);
  return Math.max(1, total);
}

function isCenterCovered(r, c, num) {
  if (!isCenterCell(r, c)) return false;
  const anchor = getCenterAnchor();
  return !(r === anchor.row && c === anchor.col && num === FINISH_SPACE);
}

/** SPECIAL_SPACES wordt gebouwd in events-data.js */

class Game {
  constructor() {
    this.players = [];
    this.currentIndex = 0;
    this.layout = buildSpiralLayout();
    this.spacePositions = buildSpacePositions(this.layout);
    this.pendingExtraTurn = false;
    this.gameOver = false;
    this.winner = null;
  }

  addPlayer(name, color) {
    this.players.push({
      id: crypto.randomUUID(),
      name,
      color,
      position: 0,
      hp: DEFAULT_HP,
      maxHp: DEFAULT_HP,
      movementBonus: 0,
      dcStreak: 0,
      nextDcMod: 0,
      skipNextTurn: false,
    });
  }

  /**
   * Centrale HP-mutatie. Bij 0 HP: death (start, HP vol, movementBonus +1).
   * @returns {object[]} events voor describeEvents()
   */
  mutateHp(player, delta) {
    if (!player || this.gameOver || delta === 0) return [];

    const events = [];
    const from = player.hp;
    const to = Math.min(player.maxHp, Math.max(0, from + delta));

    player.hp = to;
    events.push({
      type: 'hp-change',
      player: player.name,
      from,
      to,
      delta: to - from,
    });

    if (player.hp <= 0) {
      player.position = 0;
      player.hp = player.maxHp;
      player.movementBonus = (player.movementBonus ?? 0) + 1;
      events.push({
        type: 'death',
        player: player.name,
        hp: player.hp,
        movementBonus: player.movementBonus,
      });
    }

    return events;
  }

  clearMovementBonusOnFinish(player) {
    if (player?.movementBonus) {
      player.movementBonus = 0;
    }
  }

  /** Overshoot voorbij vak 63: kaats terug; catch-up bonus verbruikt (zelfde als finish bereiken). */
  applyFinishOvershootBounce(player, pos) {
    const overshoot = pos - TOTAL_SPACES;
    const hadBonus = (player.movementBonus ?? 0) > 0;
    this.clearMovementBonusOnFinish(player);
    return {
      position: Math.max(0, TOTAL_SPACES - overshoot),
      overshoot,
      movementBonusCleared: hadBonus,
    };
  }

  removePlayer(id) {
    if (this.gameOver) return;
    const idx = this.players.findIndex((p) => p.id === id);
    if (idx === -1) return;

    this.players.splice(idx, 1);
    if (this.currentIndex >= this.players.length) {
      this.currentIndex = 0;
    }
  }

  get currentPlayer() {
    return this.players[this.currentIndex] ?? null;
  }

  move(steps) {
    const player = this.currentPlayer;
    if (!player || this.gameOver) {
      return { events: [], winner: null, needsEvent: false, needsPath: false };
    }

    const from = player.position;
    const effectiveSteps = applyMovementBonus(player, steps);
    let pos = from + effectiveSteps;
    const events = [{
      type: 'move',
      from,
      to: pos,
      steps: effectiveSteps,
      baseSteps: steps,
      movementBonus: player.movementBonus ?? 0,
      player: player.name,
    }];

    if (pos > TOTAL_SPACES) {
      const bounce = this.applyFinishOvershootBounce(player, pos);
      pos = bounce.position;
      events.push({
        type: 'bounce',
        position: pos,
        overshoot: bounce.overshoot,
        player: player.name,
        movementBonusCleared: bounce.movementBonusCleared,
      });
    }

    player.position = Math.max(0, pos);
    return this.resolveSpace(player, events);
  }

  resolveSpace(player, events) {
    if (player.position === FINISH_SPACE) {
      this.clearMovementBonusOnFinish(player);
      this.gameOver = true;
      this.winner = player;
      events.push({ type: 'finish', player: player.name });
      return { events, winner: player, needsEvent: false, needsPath: false };
    }

    const space = SPECIAL_SPACES[player.position];
    if (!space || space.type === 'start') {
      return { events, winner: null, needsEvent: false, needsPath: false };
    }

    if (space.type === 'path') {
      events.push({
        type: 'path',
        spaceNum: player.position,
        name: space.name,
        icon: space.icon,
        flavor: space.flavor,
        player: player.name,
      });
      return { events, winner: null, needsEvent: false, needsPath: true, pathConfig: space };
    }

    if (space.type === 'finish') {
      this.clearMovementBonusOnFinish(player);
      this.gameOver = true;
      this.winner = player;
      events.push({ type: 'finish', player: player.name });
      return { events, winner: player, needsEvent: false, needsPath: false };
    }

    if (space.type === 'event') {
      const effectiveDc = getEffectiveDc(player, space.dc);
      events.push({
        type: 'landed',
        spaceNum: player.position,
        name: space.name,
        icon: space.icon,
        flavor: space.flavor,
        ability: space.ability,
        dc: space.dc,
        effectiveDc,
        dcBonus: getDcBonus(player),
        dcMod: getDcModifier(player),
        dcStreak: player.dcStreak,
        failText: space.failText,
        successText: space.successText,
      });
      return { events, winner: null, needsEvent: true, needsPath: false, eventConfig: space };
    }

    return { events, winner: null, needsEvent: false, needsPath: false };
  }

  /**
   * Verplaatsing na een event-check.
   * @param {boolean} chainEvents — bij succes: nieuw event op landingsvak; bij falen: altijd false
   */
  moveAfterEvent(player, steps, events, chainEvents) {
    const from = player.position;
    const direction = steps >= 0 ? 'forward' : 'back';
    const effectiveSteps = applyMovementBonus(player, steps);
    const amount = Math.abs(effectiveSteps);
    let pos = from + effectiveSteps;

    if (effectiveSteps > 0 && pos > TOTAL_SPACES) {
      const bounce = this.applyFinishOvershootBounce(player, pos);
      pos = bounce.position;
      events.push({
        type: 'bounce',
        position: pos,
        overshoot: bounce.overshoot,
        player: player.name,
        movementBonusCleared: bounce.movementBonusCleared,
      });
    }

    player.position = Math.max(0, pos);
    events.push({
      type: 'event-move',
      from,
      to: player.position,
      steps: amount,
      baseSteps: Math.abs(steps),
      movementBonus: player.movementBonus ?? 0,
      direction,
      player: player.name,
    });

    if (player.position === FINISH_SPACE) {
      this.clearMovementBonusOnFinish(player);
      this.gameOver = true;
      this.winner = player;
      events.push({ type: 'finish', player: player.name });
      return {
        winner: player,
        needsEvent: false,
        needsPath: false,
        eventConfig: null,
        pathConfig: null,
      };
    }

    if (!chainEvents) {
      return {
        winner: null,
        needsEvent: false,
        needsPath: false,
        eventConfig: null,
        pathConfig: null,
      };
    }

    const chain = this.resolveSpace(player, events);
    return {
      winner: chain.winner,
      needsEvent: chain.needsEvent ?? false,
      needsPath: chain.needsPath ?? false,
      eventConfig: chain.eventConfig ?? null,
      pathConfig: chain.pathConfig ?? null,
    };
  }

  resolveEvent(roll, config, options = {}) {
    const { nat20 = false, nat1 = false } = options;
    const player = this.currentPlayer;
    const dcModApplied = player.nextDcMod ?? 0;
    player.nextDcMod = 0;

    const dcBonus = getDcBonus(player);
    const effectiveDc = Math.max(1, config.dc + dcBonus + dcModApplied);
    const isNat1 = !nat20 && (nat1 || roll === 1);
    const success = !isNat1 && (nat20 || (roll != null && roll >= effectiveDc));

    const events = [{
      type: 'd20',
      roll: roll ?? null,
      dc: config.dc,
      effectiveDc,
      dcBonus,
      dcMod: dcModApplied,
      dcStreak: player.dcStreak,
      ability: config.ability,
      success,
      nat20,
      nat1: isNat1,
      player: player.name,
    }];

    if (isNat1) {
      player.dcStreak = 0;
      events.push({ type: 'dc-streak-reset', player: player.name });
      events.push({ type: 'nat1', player: player.name });
      events.push(...this.mutateHp(player, -1));
      player.skipNextTurn = true;
      events.push({ type: 'pass-turn', player: player.name });
      return {
        events,
        winner: null,
        needsEvent: false,
        needsPath: false,
        eventConfig: null,
        pathConfig: null,
        passTurn: true,
        moveSteps: 0,
        moveDirection: null,
        nat20: false,
        nat1: true,
        effectiveDc,
      };
    }

    if (success) {
      const overshootRoll = roll ?? (nat20 ? 20 : 0);
      const breakdown = calcEventSuccessSteps(roll, effectiveDc, { nat20 });
      const steps = breakdown.total;

      events.push({
        type: 'event-steps',
        ...breakdown,
        effectiveDc,
        overshootRoll,
        player: player.name,
      });

      if (nat20) {
        events.push({ type: 'nat20', player: player.name });
        events.push(...this.mutateHp(player, 1));
      }

      const prevStreak = player.dcStreak;
      player.dcStreak = prevStreak + 1;
      events.push({
        type: 'dc-streak',
        from: prevStreak,
        to: player.dcStreak,
        nextBonus: getDcBonus(player),
        player: player.name,
      });

      const moveResult = this.moveAfterEvent(player, steps, events, true);
      return {
        events,
        winner: moveResult.winner,
        needsEvent: moveResult.needsEvent,
        needsPath: moveResult.needsPath,
        eventConfig: moveResult.eventConfig,
        pathConfig: moveResult.pathConfig,
        passTurn: false,
        moveSteps: steps,
        moveBreakdown: breakdown,
        moveDirection: 'forward',
        nat20,
        nat1: false,
        effectiveDc,
        overshootRoll,
      };
    }

    player.dcStreak = 0;
    events.push({ type: 'dc-streak-reset', player: player.name });
    events.push({ type: 'pass-turn', player: player.name });
    return {
      events,
      winner: null,
      needsEvent: false,
      needsPath: false,
      eventConfig: null,
      pathConfig: null,
      passTurn: true,
      moveSteps: 0,
      moveDirection: null,
      nat20: false,
      nat1: false,
      effectiveDc,
    };
  }

  /**
   * @returns {{ skippedPlayer: string|null }}
   */
  nextTurn() {
    if (this.gameOver) return { skippedPlayer: null };

    if (this.pendingExtraTurn) {
      this.pendingExtraTurn = false;
      return { skippedPlayer: null };
    }

    if (this.players.length === 0) return { skippedPlayer: null };

    const n = this.players.length;
    let skippedPlayer = null;

    for (let i = 0; i < n; i++) {
      this.currentIndex = (this.currentIndex + 1) % n;
      const p = this.players[this.currentIndex];
      if (p.skipNextTurn) {
        p.skipNextTurn = false;
        skippedPlayer = p.name;
        continue;
      }
      break;
    }

    return { skippedPlayer };
  }

  reset() {
    this.players = [];
    this.currentIndex = 0;
    this.pendingExtraTurn = false;
    this.gameOver = false;
    this.winner = null;
  }
}

window.Game = Game;
window.TOTAL_SPACES = TOTAL_SPACES;
window.FINISH_SPACE = FINISH_SPACE;
window.getPathDirection = getPathDirection;
window.getDcBonus = getDcBonus;
window.getDcModifier = getDcModifier;
window.getEffectiveDc = getEffectiveDc;
window.isCenterCell = isCenterCell;
window.isCenterCovered = isCenterCovered;
window.getCenterAnchor = getCenterAnchor;
window.applyMovementBonus = applyMovementBonus;
window.calcEventSuccessSteps = calcEventSuccessSteps;
window.BASE_SUCCESS_STEPS = BASE_SUCCESS_STEPS;
window.OVERSHOOT_DIVISOR = OVERSHOOT_DIVISOR;
window.DEFAULT_HP = DEFAULT_HP;
