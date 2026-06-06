/**
 * DC / difficulty helpers.
 * Laadt vóór js/game.js — leest GAME_SETTINGS.difficulty.
 * IIFE: voorkomt dubbele const-declaraties in gedeelde script-scope.
 */
(function () {
  const { difficulty } = window.GAME_SETTINGS;
  const DC_DIFFICULTY_MAX_LEVEL = difficulty.maxLevel;

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

  window.getDcBonus = getDcBonus;
  window.getDcModifier = getDcModifier;
  window.getDifficultyDcBonus = getDifficultyDcBonus;
  window.getEffectiveDc = getEffectiveDc;
  window.DC_DIFFICULTY_MAX_LEVEL = DC_DIFFICULTY_MAX_LEVEL;
})();
