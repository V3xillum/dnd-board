/**
 * DOM refs, game instance, parse helpers, cell styling.
 * Laadt als eerste UI-module.
 */
const COLORS = window.GAME_SETTINGS.ui.playerColors;

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
  diceControls: document.querySelector('.dice-controls'),
  deathReturnControls: document.getElementById('death-return-controls'),
  deathReturnD4Input: document.getElementById('death-return-d4-input'),
  deathReturnBtn: document.getElementById('death-return-btn'),
  shortRestBtn: document.getElementById('short-rest-btn'),
  longRestBtn: document.getElementById('long-rest-btn'),
  restControls: document.querySelector('.rest-controls'),
  shortRestD4Input: document.getElementById('short-rest-d4-input'),
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
