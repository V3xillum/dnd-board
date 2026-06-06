/**
 * Tune-bare spelconstanten — single source of truth.
 * Laadt vóór events-data.js, game.js en ui.js.
 */
const GAME_SETTINGS = {
  board: {
    totalSpaces: 63,
    finishSpace: 63,
    bossSpace: 62,
    pathSpaces: 62,
    boardSize: 9,
    healerSpace: 56,
  },
  player: {
    startHp: 3,
    maxHp: 6,
    maxPlayers: 8,
  },
  movement: {
    baseSuccessSteps: 1,
    overshootDivisor: 2,
  },
  boss: {
    hpPerPlayer: 3,
  },
  difficulty: {
    maxLevel: 5,
  },
  boardGen: {
    pathRatio: 0.38,
    ambushRatio: 0.08,
  },
  ui: {
    playerColors: ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'],
    mysteryAnimMs: { reveal: 720, reset: 580 },
  },
};

window.GAME_SETTINGS = GAME_SETTINGS;

// Backwards compat — bestaande window.* consumers blijven werken
window.TOTAL_SPACES = GAME_SETTINGS.board.totalSpaces;
window.FINISH_SPACE = GAME_SETTINGS.board.finishSpace;
window.BOSS_SPACE = GAME_SETTINGS.board.bossSpace;
window.DEFAULT_HP = GAME_SETTINGS.player.startHp;
window.DEFAULT_MAX_HP = GAME_SETTINGS.player.maxHp;
window.BASE_SUCCESS_STEPS = GAME_SETTINGS.movement.baseSuccessSteps;
window.OVERSHOOT_DIVISOR = GAME_SETTINGS.movement.overshootDivisor;
window.DC_DIFFICULTY_MAX_LEVEL = GAME_SETTINGS.difficulty.maxLevel;
window.HEALER_SPACE = GAME_SETTINGS.board.healerSpace;
window.PATH_RATIO = GAME_SETTINGS.boardGen.pathRatio;
window.AMBUSH_RATIO = GAME_SETTINGS.boardGen.ambushRatio;
