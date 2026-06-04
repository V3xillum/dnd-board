const TOTAL_SPACES = 63;
const FINISH_SPACE = 63;
const PATH_SPACES = 62;
const BOARD_SIZE = 9;

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

function getDcBonus(player) {
  return player?.dcStreak ?? 0;
}

/** Eenmalige modifier op de volgende check (bijv. −2 na Nat 20) */
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
    this.skipNextTurn = false;
    this.gameOver = false;
    this.winner = null;
  }

  addPlayer(name, color) {
    this.players.push({
      id: crypto.randomUUID(),
      name,
      color,
      position: 0,
      dcStreak: 0,
      nextDcMod: 0,
    });
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
    let pos = from + steps;
    const events = [{
      type: 'move',
      from,
      to: pos,
      steps,
      player: player.name,
    }];

    if (pos > TOTAL_SPACES) {
      const overshoot = pos - TOTAL_SPACES;
      pos = TOTAL_SPACES - overshoot;
      events.push({ type: 'bounce', position: pos, overshoot });
    }

    player.position = Math.max(0, pos);
    return this.resolveSpace(player, events);
  }

  resolveSpace(player, events) {
    if (player.position === FINISH_SPACE) {
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
    const amount = Math.abs(steps);
    let pos = from + steps;

    if (steps > 0 && pos > TOTAL_SPACES) {
      const overshoot = pos - TOTAL_SPACES;
      pos = TOTAL_SPACES - overshoot;
      events.push({ type: 'bounce', position: pos, overshoot });
    }

    player.position = Math.max(0, pos);
    events.push({
      type: 'event-move',
      from,
      to: player.position,
      steps: amount,
      direction,
      player: player.name,
    });

    if (player.position === FINISH_SPACE) {
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
    const { nat20 = false } = options;
    const player = this.currentPlayer;
    const dcModApplied = player.nextDcMod ?? 0;
    player.nextDcMod = 0;

    const dcBonus = getDcBonus(player);
    const effectiveDc = Math.max(1, config.dc + dcBonus + dcModApplied);
    const success = nat20 || (roll != null && roll >= effectiveDc);

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
      player: player.name,
    }];

    if (success) {
      const steps = randomSteps1to3();

      if (nat20) {
        player.dcStreak = 0;
        player.nextDcMod = -2;
        events.push({
          type: 'nat20',
          nextDcMod: -2,
          player: player.name,
        });
      } else {
        const prevStreak = player.dcStreak;
        player.dcStreak = prevStreak + 1;
        events.push({
          type: 'dc-streak',
          from: prevStreak,
          to: player.dcStreak,
          nextBonus: getDcBonus(player),
          player: player.name,
        });
      }

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
        moveDirection: 'forward',
        nat20,
      };
    }

    player.dcStreak = 0;
    const steps = randomSteps1to3();
    events.push({ type: 'dc-streak-reset', player: player.name });
    events.push({ type: 'pass-turn', player: player.name });

    const moveResult = this.moveAfterEvent(player, -steps, events, false);
    return {
      events,
      winner: moveResult.winner,
      needsEvent: false,
      needsPath: false,
      eventConfig: null,
      pathConfig: null,
      passTurn: true,
      moveSteps: steps,
      moveDirection: 'back',
    };
  }

  nextTurn() {
    if (this.gameOver) return;

    if (this.pendingExtraTurn) {
      this.pendingExtraTurn = false;
      return;
    }

    if (this.skipNextTurn) {
      this.skipNextTurn = false;
    }

    if (this.players.length === 0) return;

    this.currentIndex = (this.currentIndex + 1) % this.players.length;
  }

  reset() {
    this.players = [];
    this.currentIndex = 0;
    this.pendingExtraTurn = false;
    this.skipNextTurn = false;
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
