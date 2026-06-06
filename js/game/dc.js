/**
 * DC / difficulty helpers en event-stappen berekening.
 * Laadt vóór js/game.js — leest GAME_SETTINGS.movement + difficulty.
 * IIFE: voorkomt dubbele const-declaraties in gedeelde script-scope.
 */
(function () {
  const { movement, difficulty } = window.GAME_SETTINGS;
  const BASE_SUCCESS_STEPS = movement.baseSuccessSteps;
  const OVERSHOOT_DIVISOR = movement.overshootDivisor;
  const DC_DIFFICULTY_MAX_LEVEL = difficulty.maxLevel;

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

  /** Moeilijkheidsgraad 1–5 → vaste +1 DC per stap (niveau 1 = +0, niveau 5 = +4) */
  function getDifficultyDcBonus(level = 1) {
    const clamped = Math.max(1, Math.min(DC_DIFFICULTY_MAX_LEVEL, level));
    return clamped - 1;
  }

  function getEffectiveDc(player, baseDc, difficultyLevel, dcModOverride) {
    const level = difficultyLevel ?? window.getGame?.()?.difficultyLevel ?? 1;
    const difficultyBonus = getDifficultyDcBonus(level);
    const mod = dcModOverride ?? getDcModifier(player);
    const total = baseDc + difficultyBonus + getDcBonus(player) + mod;
    return Math.max(1, total);
  }

  window.calcEventSuccessSteps = calcEventSuccessSteps;
  window.applyMovementBonus = applyMovementBonus;
  window.getDcBonus = getDcBonus;
  window.getDcModifier = getDcModifier;
  window.getDifficultyDcBonus = getDifficultyDcBonus;
  window.getEffectiveDc = getEffectiveDc;
  window.BASE_SUCCESS_STEPS = BASE_SUCCESS_STEPS;
  window.OVERSHOOT_DIVISOR = OVERSHOOT_DIVISOR;
  window.DC_DIFFICULTY_MAX_LEVEL = DC_DIFFICULTY_MAX_LEVEL;
})();
