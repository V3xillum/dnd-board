const TOTAL_SPACES = 63;
const FINISH_SPACE = 63;
const BOSS_SPACE = 62;
const BOSS_RETREAT_SPACE = 56;
const PATH_SPACES = 62;
const BOSS_HP_PER_PLAYER = 3;

function isOnBossArena(position) {
  return position === BOSS_SPACE || position === FINISH_SPACE;
}
const BOARD_SIZE = 9;
const DEFAULT_HP = 3;
const DEFAULT_MAX_HP = 5;

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

/** Moeilijkheidsgraad 1–5 → vaste +1 DC per stap (niveau 1 = +0, niveau 5 = +4) */
const DC_DIFFICULTY_MAX_LEVEL = 5;

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
    this.bossActive = false;
    this.bossHp = 0;
    this.bossMaxHp = 0;
    this.bossConfig = null;
    this.bossMultiplier = 1;
    this.bossDmgPerHit = 1;
    this.bossRevealRoll = null;
    /** Beschermers vóór de eindbaas (roll 12); niet op het bord als putten */
    this.bossMinions = [];
    /** Per vak: actieve put met gedeelde vijand en lijst vastzittende spelers */
    this.ambushPits = {};
    /** Per vak: onthulde mystery-inhoud (path of ambush + multiplier) */
    this.revealedSpaces = {};
    /** 1–5: +0 … +4 op event-DC */
    this.difficultyLevel = 1;
  }

  copyAmbushConfig(source) {
    if (!source) return null;
    const hp = source.ambushHp ?? 3;
    return {
      name: source.name,
      icon: source.icon,
      ability: source.ability,
      dc: source.dc,
      ambushHp: hp,
      attackBonus: source.attackBonus ?? 3,
      dmg: source.dmg ?? 1,
      flavor: source.flavor,
      successText: source.successText,
      failText: source.failText,
    };
  }

  getPitAt(spaceNum) {
    return this.ambushPits[spaceNum] ?? null;
  }

  getPlayerPit(player) {
    if (!player) return null;
    const pit = this.getPitAt(player.position);
    if (!pit || pit.hp <= 0 || !pit.playerIds.includes(player.id)) return null;
    return {
      spaceNum: player.position,
      config: pit.config,
      hp: pit.hp,
      maxHp: pit.maxHp,
      playerIds: pit.playerIds,
    };
  }

  isPlayerInPit(player) {
    return this.getPlayerPit(player) != null;
  }

  isCurrentPlayerInAmbush() {
    return this.currentPlayer != null && this.isPlayerInPit(this.currentPlayer);
  }

  getCurrentPlayerPit() {
    return this.getPlayerPit(this.currentPlayer);
  }

  /** @param {number} [spaceNum] Vak van de put (nodig na death: speler staat dan al op start). */
  removePlayerFromPit(player, spaceNum) {
    const pitSpace = spaceNum ?? player.position;
    const pit = this.getPitAt(pitSpace);
    if (!pit) return;
    pit.playerIds = pit.playerIds.filter((id) => id !== player.id);
    if (pit.playerIds.length === 0) {
      this.clearPitAt(pitSpace);
    }
  }

  clearPitAt(spaceNum) {
    delete this.ambushPits[spaceNum];
  }

  /** Iedereen die op dit vak staat hoort in dezelfde actieve put. */
  syncColocatedPlayersInPit(spaceNum) {
    const pit = this.getPitAt(spaceNum);
    if (!pit || pit.hp <= 0) return;
    this.players.forEach((p) => {
      if (p.position === spaceNum && !pit.playerIds.includes(p.id)) {
        pit.playerIds.push(p.id);
      }
    });
  }

  /**
   * Landen op ambush-vak: nieuwe put (random vijand) of meedoen aan bestaande put op dit vak.
   * @returns {{ config, kind: 'start'|'join'|'already', pit }|null}
   */
  joinOrStartPit(player, spaceNum) {
    let pit = this.getPitAt(spaceNum);

    if (pit && pit.hp > 0 && pit.playerIds.length > 0) {
      const wasNew = !pit.playerIds.includes(player.id);
      if (wasNew) pit.playerIds.push(player.id);
      this.syncColocatedPlayersInPit(spaceNum);
      return {
        config: pit.config,
        kind: wasNew ? 'join' : 'already',
        pit,
      };
    }

    const revealed = this.revealedSpaces[spaceNum];
    let raw;
    let multiplier = 1;

    if (revealed?.type === 'ambush') {
      raw = revealed.config;
      multiplier = revealed.multiplier ?? 1;
    } else {
      raw = typeof pickRandomAmbush === 'function' ? pickRandomAmbush() : null;
    }

    const config = this.copyAmbushConfig(raw);
    if (!config) return null;

    const hp = Math.ceil(config.ambushHp * multiplier);
    pit = {
      config,
      hp,
      maxHp: hp,
      dmgPerHit: multiplier,
      playerIds: [player.id],
    };
    this.ambushPits[spaceNum] = pit;
    this.syncColocatedPlayersInPit(spaceNum);
    return { config, kind: 'start', pit };
  }

  copyBossConfig(source) {
    if (!source) return null;
    const out = {
      name: source.name,
      icon: source.icon,
      ability: source.ability,
      dc: source.dc,
      attackBonus: source.attackBonus ?? 5,
      dmg: source.dmg ?? 1,
      flavor: source.flavor,
      successText: source.successText,
      failText: source.failText,
    };
    if (source.specialAttack) {
      out.specialAttack = { ...source.specialAttack };
    }
    return out;
  }

  buildCombatContext(type, options = {}) {
    const { allowDefeated = false, spaceNum: spaceNumOverride = null } = options;

    if (type === 'boss-minion') {
      const minion = allowDefeated
        ? this.resolveBossMinionForContext(options)
        : this.getActiveBossMinion();
      if (!minion) return null;
      const player = this.currentPlayer;
      if (!player) return null;
      if (!allowDefeated && minion.hp <= 0) return null;
      if (!allowDefeated && !isOnBossArena(player.position)) return null;
      const spaceNum = spaceNumOverride ?? player.position;
      return { type: 'boss-minion', spaceNum, config: minion.config, minion };
    }

    const player = this.currentPlayer;
    if (!player) return null;

    if (type === 'ambush') {
      const spaceNum = spaceNumOverride ?? player.position;
      const pit = spaceNum != null ? this.getPitAt(spaceNum) : null;
      if (!pit) return null;
      if (!allowDefeated && (pit.hp <= 0 || !pit.playerIds.includes(player.id))) return null;
      return { type: 'ambush', spaceNum, config: pit.config, pit };
    }

    if (type === 'boss') {
      const config = this.bossConfig;
      if (!this.bossActive || !config) return null;
      if (!allowDefeated) {
        if (this.hasBossMinions() || !isOnBossArena(player.position)) return null;
      } else if (this.hasBossMinions()) {
        return null;
      }
      const spaceNum = spaceNumOverride ?? player.position;
      return { type: 'boss', spaceNum, config };
    }

    return null;
  }

  resolveCombatPlayerAttack(ctx, roll, options = {}) {
    const player = this.currentPlayer;
    if (!player || !ctx?.config) {
      return { events: [], playerHit: false, enemyDefeated: false, skipEnemyPhase: true };
    }

    const { nat20 = false, nat1 = false } = options;
    const config = ctx.config;
    const dcModApplied = player.nextDcMod ?? 0;
    player.nextDcMod = 0;

    const effectiveAc = getEffectiveDc(player, config.dc, this.difficultyLevel, dcModApplied);
    const isNat1 = !nat20 && nat1;
    const playerHit = !isNat1 && (nat20 || (roll != null && roll >= effectiveAc));
    const prefix = ctx.type === 'ambush' ? 'ambush' : ctx.type === 'boss-minion' ? 'boss-minion' : 'boss';
    const events = [];

    const attackEvent = {
      type: `${prefix}-player-attack`,
      roll: roll ?? null,
      ac: config.dc,
      effectiveAc,
      hit: playerHit,
      nat20,
      nat1: isNat1,
      player: player.name,
    };

    if (ctx.type === 'ambush') {
      attackEvent.ambushName = config.name;
      attackEvent.ambushHp = ctx.pit.hp;
      attackEvent.spaceNum = ctx.spaceNum;
    } else if (ctx.type === 'boss-minion') {
      attackEvent.minionName = config.name;
      attackEvent.minionHp = ctx.minion.hp;
      attackEvent.spaceNum = ctx.spaceNum;
    } else {
      attackEvent.bossName = config.name;
    }

    events.push(attackEvent);

    if (playerHit) {
      const dmgBonus = player.dmgBonus ?? 0;
      const hitDamage = nat20 ? 2 + dmgBonus : 1 + dmgBonus;
      if (nat20) {
        events.push({ type: 'nat20', player: player.name });
      }

      if (ctx.type === 'ambush') {
        ctx.pit.hp = Math.max(0, ctx.pit.hp - hitDamage);
        events.push({
          type: 'ambush-hit',
          ambushHp: ctx.pit.hp,
          ambushMaxHp: ctx.pit.maxHp,
          player: player.name,
          ambushName: config.name,
          playerHp: player.hp,
          spaceNum: ctx.spaceNum,
          damage: hitDamage,
          nat20,
        });
        attackEvent.ambushHp = ctx.pit.hp;
      } else if (ctx.type === 'boss-minion') {
        ctx.minion.hp = Math.max(0, ctx.minion.hp - hitDamage);
        events.push({
          type: 'boss-minion-hit',
          minionHp: ctx.minion.hp,
          minionMaxHp: ctx.minion.maxHp,
          player: player.name,
          minionName: config.name,
          damage: hitDamage,
          nat20,
          spaceNum: ctx.spaceNum,
        });
        attackEvent.minionHp = ctx.minion.hp;
      } else {
        this.bossHp = Math.max(0, this.bossHp - hitDamage);
        events.push({
          type: 'boss-hit',
          bossHp: this.bossHp,
          bossMaxHp: this.bossMaxHp,
          player: player.name,
          bossName: config.name,
          damage: hitDamage,
          nat20,
        });
        attackEvent.bossHp = this.bossHp;
      }
    }

    const enemyDefeated = ctx.type === 'ambush'
      ? ctx.pit.hp <= 0
      : ctx.type === 'boss-minion'
        ? ctx.minion.hp <= 0
        : this.bossHp <= 0;

    return {
      events,
      playerHit,
      playerNat1: isNat1,
      nat20,
      nat1: isNat1,
      enemyDefeated,
      skipEnemyPhase: enemyDefeated,
      enemyHp: ctx.type === 'ambush'
        ? ctx.pit.hp
        : ctx.type === 'boss-minion'
          ? ctx.minion.hp
          : this.bossHp,
      enemyMaxHp: ctx.type === 'ambush'
        ? ctx.pit.maxHp
        : ctx.type === 'boss-minion'
          ? ctx.minion.maxHp
          : this.bossMaxHp,
    };
  }

  rollCombatEnemyAttack(ctx) {
    const config = ctx?.config;
    const attackBonus = config?.attackBonus ?? 3;
    const roll = Math.floor(Math.random() * 20) + 1;
    return {
      roll,
      total: roll + attackBonus,
      attackBonus,
      nat20: roll === 20,
      nat1: roll === 1,
    };
  }

  resolveCombatEnemyAttack(ctx, options = {}) {
    const player = this.currentPlayer;
    if (!player || !ctx?.config) {
      return {
        events: [],
        triggerSpecial: false,
        died: false,
        effectiveHit: false,
        enemyNat20: false,
        enemyNat1: false,
      };
    }

    const { hit = false, enemyRoll = {}, playerNat1 = false } = options;
    const config = ctx.config;
    const prefix = ctx.type === 'ambush' ? 'ambush' : ctx.type === 'boss-minion' ? 'boss-minion' : 'boss';
    const events = [];
    const enemyNat20 = enemyRoll.nat20 ?? enemyRoll.roll === 20;
    const enemyNat1 = enemyRoll.nat1 ?? enemyRoll.roll === 1;
    const effectiveHit = enemyNat1 ? false : (enemyNat20 ? true : hit);

    const attackEvent = {
      type: `${prefix}-enemy-attack`,
      roll: enemyRoll.roll ?? null,
      total: enemyRoll.total ?? null,
      attackBonus: enemyRoll.attackBonus ?? config.attackBonus ?? 3,
      hit: effectiveHit,
      nat20: enemyNat20,
      nat1: enemyNat1,
      player: player.name,
    };

    if (ctx.type === 'ambush') {
      attackEvent.ambushName = config.name;
      attackEvent.spaceNum = ctx.spaceNum;
    } else if (ctx.type === 'boss-minion') {
      attackEvent.minionName = config.name;
      attackEvent.spaceNum = ctx.spaceNum;
    } else {
      attackEvent.bossName = config.name;
    }

    events.push(attackEvent);

    let triggerSpecial = false;
    const multiplier = ctx.type === 'ambush'
      ? (ctx.pit.dmgPerHit ?? 1)
      : (this.bossDmgPerHit ?? 1);

    if (enemyNat1) {
      const selfDamage = 1;
      attackEvent.selfDamage = selfDamage;

      if (ctx.type === 'ambush') {
        ctx.pit.hp = Math.max(0, ctx.pit.hp - selfDamage);
        attackEvent.ambushHp = ctx.pit.hp;
      } else if (ctx.type === 'boss-minion') {
        ctx.minion.hp = Math.max(0, ctx.minion.hp - selfDamage);
        attackEvent.minionHp = ctx.minion.hp;
      } else {
        this.bossHp = Math.max(0, this.bossHp - selfDamage);
        attackEvent.bossHp = this.bossHp;
      }
    } else if (effectiveHit) {
      let damage = Math.ceil((config.dmg ?? 1) * multiplier);
      if (enemyNat20) {
        damage *= 2;
      }
      if (playerNat1) {
        damage += 1;
        events.push({ type: 'nat1', player: player.name });
      }
      for (let i = 0; i < damage; i += 1) {
        events.push(...this.mutateHp(player, -1));
      }
      attackEvent.damage = damage;
      attackEvent.playerHp = player.hp;

      if (ctx.type === 'boss' && config.specialAttack && Math.random() < 0.25) {
        triggerSpecial = true;
      }
    }

    return {
      events,
      triggerSpecial,
      died: events.some((e) => e.type === 'death'),
      effectiveHit,
      enemyNat20,
      enemyNat1,
      selfDamage: attackEvent.selfDamage ?? 0,
      damage: attackEvent.damage ?? 0,
    };
  }

  resolveCombatSpecialSave(ctx, saveRoll) {
    const player = this.currentPlayer;
    const special = ctx?.config?.specialAttack;
    if (!player || !special) {
      return { events: [], success: false, died: false };
    }

    const success = saveRoll != null && saveRoll >= special.dc;
    const damage = success ? special.dmgSuccess : special.dmgFail;
    const events = [{
      type: 'boss-special-save',
      roll: saveRoll ?? null,
      dc: special.dc,
      saveAbility: special.saveAbility,
      name: special.name,
      success,
      damage,
      player: player.name,
      bossName: ctx.config.name,
    }];

    for (let i = 0; i < damage; i += 1) {
      events.push(...this.mutateHp(player, -1));
    }

    return {
      events,
      success,
      died: events.some((e) => e.type === 'death'),
    };
  }

  finalizeCombatRound(ctx, pendingEvents = [], options = {}) {
    const player = this.currentPlayer;
    const events = [...pendingEvents];
    if (!player || !ctx) {
      return { events, passTurn: !this.gameOver, winner: null };
    }

    const config = ctx.config;
    let winner = null;

    if (ctx.type === 'ambush') {
      const { pit, spaceNum } = ctx;
      const ambushDefeated = pit.hp <= 0;
      const died = events.some((e) => e.type === 'death');

      if (ambushDefeated) {
        const freedNames = pit.playerIds
          .map((id) => this.players.find((p) => p.id === id)?.name)
          .filter(Boolean);
        const wasMysteryAmbush = options.wasMysteryAmbush
          ?? this.revealedSpaces[spaceNum]?.type === 'ambush';
        if (this.revealedSpaces[spaceNum]?.jackpot) {
          this.grantDmgBonus(player, events);
        }
        events.push({
          type: 'ambush-end',
          success: true,
          ambushName: config.name,
          player: player.name,
          freedPlayers: freedNames,
          spaceNum,
        });
        this.clearPitAt(spaceNum);
        if (wasMysteryAmbush) {
          this.resetMysterySpace(spaceNum, events);
        }
      } else if (died) {
        this.removePlayerFromPit(player, spaceNum);
        const pitContinues = (this.getPitAt(spaceNum)?.playerIds.length ?? 0) > 0;
        events.push({
          type: 'ambush-end',
          success: false,
          ambushName: config.name,
          player: player.name,
          spaceNum,
          pitContinues,
        });
      }

      if (!this.gameOver) {
        events.push({ type: 'pass-turn', player: player.name });
      }

      return {
        events,
        passTurn: !this.gameOver,
        winner: null,
        ambushHp: ambushDefeated ? 0 : pit.hp,
        ambushMaxHp: pit.maxHp,
        ambushEnded: ambushDefeated || died,
        retreatedTo: null,
      };
    }

    if (ctx.type === 'boss-minion') {
      const { minion } = ctx;
      const minionDefeated = minion.hp <= 0;
      const died = events.some((e) => e.type === 'death');

      if (minionDefeated) {
        events.push({
          type: 'boss-minion-end',
          success: true,
          minionName: config.name,
          player: player.name,
          spaceNum: ctx.spaceNum,
          minionsRemaining: this.bossMinions.filter((m) => m.hp > 0).length,
        });
      }

      const skipRetreat = died;
      if (!skipRetreat) {
        const from = player.position;
        player.position = BOSS_RETREAT_SPACE;
        events.push({
          type: 'boss-retreat',
          player: player.name,
          from,
          to: BOSS_RETREAT_SPACE,
        });
      }

      if (!this.gameOver) {
        events.push({ type: 'pass-turn', player: player.name });
      }

      return {
        events,
        passTurn: !this.gameOver,
        winner: null,
        minionHp: minionDefeated ? 0 : minion.hp,
        minionMaxHp: minion.maxHp,
        minionEnded: minionDefeated,
        retreatedTo: skipRetreat ? null : BOSS_RETREAT_SPACE,
      };
    }

    if (this.bossHp <= 0) {
      this.bossActive = false;
      this.bossHp = 0;
      this.bossMinions = [];
      events.push({ type: 'boss-defeated', bossName: config.name });
      winner = this.checkWinAfterBoss();
      if (winner) {
        events.push({ type: 'finish', player: winner.name });
      }
    }

    const died = events.some((e) => e.type === 'death');
    const skipRetreat = died || (winner && winner.id === player.id);

    if (!skipRetreat) {
      const from = player.position;
      player.position = BOSS_RETREAT_SPACE;
      events.push({
        type: 'boss-retreat',
        player: player.name,
        from,
        to: BOSS_RETREAT_SPACE,
      });
    }

    if (!winner) {
      events.push({ type: 'pass-turn', player: player.name });
    }

    return {
      events,
      passTurn: !winner,
      winner,
      bossHp: this.bossHp,
      bossMaxHp: this.bossMaxHp,
      retreatedTo: skipRetreat ? null : BOSS_RETREAT_SPACE,
    };
  }

  activateBoss(landedSpace) {
    if (this.bossActive) return null;

    let raw;
    if (landedSpace === BOSS_SPACE) {
      raw = SPECIAL_SPACES[BOSS_SPACE];
    } else {
      const pool = typeof BOSS_POOL !== 'undefined' ? BOSS_POOL : [];
      raw = pool.length > 0
        ? pool[Math.floor(Math.random() * pool.length)]
        : (typeof getDefaultBoss === 'function' ? getDefaultBoss() : null);
    }

    const config = this.copyBossConfig(raw);
    if (!config) return null;

    const playerCount = Math.max(1, this.players.length);
    const mult = this.bossMultiplier ?? 1;
    this.bossConfig = config;
    this.bossMaxHp = Math.ceil(BOSS_HP_PER_PLAYER * playerCount * mult);
    this.bossHp = this.bossMaxHp;
    this.bossActive = true;
    return config;
  }

  spawnBossMinions(events) {
    this.bossMinions = [];
    for (let i = 0; i < 2; i += 1) {
      const raw = typeof pickRandomAmbush === 'function' ? pickRandomAmbush() : null;
      const config = this.copyAmbushConfig(raw);
      if (!config) continue;
      const hp = config.ambushHp ?? 3;
      this.bossMinions.push({ config, hp, maxHp: hp });
    }

    if (this.bossMinions.length > 0) {
      events.push({
        type: 'boss-minion-start',
        minions: this.bossMinions.map((m, index) => ({
          index,
          name: m.config.name,
          icon: m.config.icon,
          hp: m.hp,
          maxHp: m.maxHp,
        })),
      });
    }
  }

  getActiveBossMinion() {
    return this.bossMinions.find((m) => m.hp > 0) ?? null;
  }

  /** Minion voor finalize wanneer gevecht-net verslagen (hp 0, niet meer "actief"). */
  resolveBossMinionForContext(options = {}) {
    const { minionIndex = null, combatConfig = null } = options;

    if (minionIndex != null && this.bossMinions[minionIndex]) {
      return this.bossMinions[minionIndex];
    }
    if (combatConfig?.name) {
      const byName = this.bossMinions.find((m) => m.config?.name === combatConfig.name);
      if (byName) return byName;
    }
    return this.bossMinions.find((m) => m.hp <= 0) ?? this.getActiveBossMinion();
  }

  hasBossMinions() {
    return this.getActiveBossMinion() !== null;
  }

  getBossRevealFromRoll(roll) {
    const clamped = Math.max(1, Math.min(12, roll));
    if (clamped <= 8) {
      return { roll: clamped, multiplier: 1, tier: 'standard' };
    }
    if (clamped <= 11) {
      return { roll: clamped, multiplier: 1.5, tier: 'strong' };
    }
    return { roll: clamped, multiplier: 2, tier: 'epic' };
  }

  resolveBossReveal(landedSpace, roll) {
    const player = this.currentPlayer;
    const { roll: clamped, multiplier, tier } = this.getBossRevealFromRoll(roll);

    this.bossMultiplier = multiplier;
    this.bossDmgPerHit = multiplier;
    this.bossRevealRoll = clamped;

    const events = [{
      type: 'boss-reveal',
      roll: clamped,
      tier,
      multiplier,
      player: player?.name,
      spaceNum: landedSpace,
    }];

    const config = this.activateBoss(landedSpace);
    if (!config) {
      return { events, reveal: null, needsBoss: false };
    }

    if (tier === 'epic') {
      this.spawnBossMinions(events);
    }

    events.push({
      type: 'boss-start',
      name: config.name,
      icon: config.icon,
      flavor: config.flavor,
      bossHp: this.bossHp,
      bossMaxHp: this.bossMaxHp,
      multiplier,
      tier,
      minionCount: this.bossMinions.length,
      player: player?.name,
      spaceNum: landedSpace,
    });

    const minionPreview = this.bossMinions.map((m) => ({
      name: m.config.name,
      icon: m.config.icon,
      hp: m.hp,
      maxHp: m.maxHp,
    }));

    return {
      events,
      reveal: {
        roll: clamped,
        tier,
        multiplier,
        config,
        bossHp: this.bossHp,
        bossMaxHp: this.bossMaxHp,
        minions: minionPreview,
      },
      needsBoss: true,
      needsBossMinion: this.hasBossMinions(),
    };
  }

  /** Eerste speler op vak 63 na boss-kill wint. */
  checkWinAfterBoss() {
    const onFinish = this.players.find((p) => p.position === FINISH_SPACE);
    if (!onFinish) return null;

    this.clearMovementBonusOnFinish(onFinish);
    this.gameOver = true;
    this.winner = onFinish;
    return onFinish;
  }

  addPlayer(name, color) {
    this.players.push({
      id: crypto.randomUUID(),
      name,
      color,
      position: 0,
      hp: DEFAULT_HP,
      maxHp: DEFAULT_MAX_HP,
      movementBonus: 0,
      dmgBonus: 0,
      dcStreak: 0,
      nextDcMod: 0,
      skipNextTurn: false,
    });
  }

  grantDmgBonus(player, events) {
    if (!player) return;
    player.dmgBonus = (player.dmgBonus ?? 0) + 1;
    events.push({
      type: 'dmg-bonus',
      player: player.name,
      dmgBonus: player.dmgBonus,
    });
  }

  copyPathConfig(source) {
    if (!source) return null;
    return {
      name: source.name,
      icon: source.icon,
      flavor: source.flavor,
    };
  }

  buildAmbushRevelation(multiplier, jackpot) {
    const raw = typeof pickRandomAmbush === 'function' ? pickRandomAmbush() : null;
    const config = this.copyAmbushConfig(raw);
    if (!config) return null;
    return {
      type: 'ambush',
      config,
      multiplier,
      jackpot: Boolean(jackpot),
    };
  }

  getMysteryTile() {
    return {
      type: 'mystery',
      category: 'mystery',
      icon: '❓',
      name: 'Onbekend gevaar',
      flavor: 'Iets loert hier. Je weet nog niet wat.',
    };
  }

  applyRevealToBoard(spaceNum, revelation) {
    if (!revelation) return;

    if (revelation.type === 'path') {
      SPECIAL_SPACES[spaceNum] = { type: 'path', ...revelation.config };
    } else if (revelation.type === 'ambush') {
      SPECIAL_SPACES[spaceNum] = {
        type: 'event',
        category: 'ambush',
        ...revelation.config,
      };
    }

    window.SPECIAL_SPACES = SPECIAL_SPACES;
  }

  /** Terug naar ❓ na mystery-bezoek (pad uitgerust of ambush verslagen). */
  resetMysterySpace(spaceNum, events) {
    if (!this.revealedSpaces[spaceNum]) return false;

    delete this.revealedSpaces[spaceNum];
    SPECIAL_SPACES[spaceNum] = this.getMysteryTile();
    window.SPECIAL_SPACES = SPECIAL_SPACES;
    events.push({ type: 'mystery-reset', spaceNum });
    return true;
  }

  /** Na rustig pad van mystery-D12: vak weer onbekend maken. */
  resetMysteryPathAfterRest(spaceNum) {
    if (this.revealedSpaces[spaceNum]?.type !== 'path') return [];
    const events = [];
    this.resetMysterySpace(spaceNum, events);
    return events;
  }

  resolveMysteryRoll(spaceNum, roll) {
    const player = this.currentPlayer;
    const clamped = Math.max(1, Math.min(12, roll));
    const events = [{
      type: 'mystery-roll',
      roll: clamped,
      spaceNum,
      player: player?.name,
    }];

    let revelation;
    if (clamped <= 2) {
      const tile = typeof pickRandomPath === 'function'
        ? pickRandomPath()
        : { name: 'Rustig pad', icon: '🚶', flavor: 'Even ademhalen onderweg.' };
      revelation = {
        type: 'path',
        config: this.copyPathConfig(tile),
      };
    } else if (clamped <= 8) {
      revelation = this.buildAmbushRevelation(1, false);
    } else if (clamped <= 11) {
      revelation = this.buildAmbushRevelation(1.5, false);
    } else {
      revelation = this.buildAmbushRevelation(2, true);
    }

    if (!revelation) {
      return { events, revelation: null, spaceNum };
    }

    this.revealedSpaces[spaceNum] = revelation;
    this.applyRevealToBoard(spaceNum, revelation);

    events.push({
      type: 'mystery-reveal',
      spaceNum,
      revealType: revelation.type,
      multiplier: revelation.multiplier ?? null,
      jackpot: revelation.jackpot ?? false,
      name: revelation.config?.name,
      icon: revelation.config?.icon,
      ambushHp: revelation.type === 'ambush'
        ? Math.ceil((revelation.config?.ambushHp ?? 3) * (revelation.multiplier ?? 1))
        : null,
      player: player?.name,
    });

    return { events, revelation, spaceNum };
  }

  startRevealedAmbush(player, spaceNum) {
    const joined = this.joinOrStartPit(player, spaceNum);
    if (!joined) return null;

    const { config, kind, pit } = joined;
    const allies = pit.playerIds
      .filter((id) => id !== player.id)
      .map((id) => this.players.find((p) => p.id === id)?.name)
      .filter(Boolean);

    const events = [];
    if (kind === 'join') {
      events.push({
        type: 'ambush-join',
        name: config.name,
        icon: config.icon,
        ambushHp: pit.hp,
        ambushMaxHp: pit.maxHp,
        player: player.name,
        allies,
        spaceNum,
      });
    } else {
      events.push({
        type: 'ambush-start',
        name: config.name,
        icon: config.icon,
        flavor: config.flavor,
        ambushHp: pit.hp,
        ambushMaxHp: pit.maxHp,
        player: player.name,
        spaceNum,
      });
    }

    return {
      events,
      needsAmbush: this.isPlayerInPit(player),
    };
  }

  /** Mislukte gevechts-check: −1 HP; bij Nat 1 nog eens −1 HP + `nat1`-event. */
  applyCombatCheckFail(player, events, isNat1) {
    events.push(...this.mutateHp(player, -1));
    if (isNat1) {
      events.push({ type: 'nat1', player: player.name });
      events.push(...this.mutateHp(player, -1));
    }
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
      player.hp = DEFAULT_HP;
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
      return { events: [], winner: null, needsEvent: false, needsPath: false, needsAmbush: false };
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
    const onBossSpace = player.position === BOSS_SPACE || player.position === FINISH_SPACE;

    if (!this.bossActive && onBossSpace) {
      events.push({
        type: 'boss-reveal-pending',
        player: player.name,
        spaceNum: player.position,
      });
      return {
        events,
        winner: null,
        needsEvent: false,
        needsPath: false,
        needsBossReveal: true,
        bossRevealSpaceNum: player.position,
      };
    }

    if (player.position === FINISH_SPACE) {
      if (this.bossActive) {
        const hasMinions = this.hasBossMinions();
        events.push({
          type: 'boss-guard',
          player: player.name,
          name: this.bossConfig?.name,
        });
        return {
          events,
          winner: null,
          needsEvent: false,
          needsPath: false,
          needsBossMinion: hasMinions,
          needsBoss: !hasMinions,
        };
      }

      this.clearMovementBonusOnFinish(player);
      this.gameOver = true;
      this.winner = player;
      events.push({ type: 'finish', player: player.name });
      return { events, winner: player, needsEvent: false, needsPath: false };
    }

    if (this.bossActive && isOnBossArena(player.position)) {
      const hasMinions = this.hasBossMinions();
      events.push({
        type: hasMinions ? 'boss-minion-engage' : 'boss-engage',
        player: player.name,
        spaceNum: player.position,
        name: hasMinions
          ? this.getActiveBossMinion()?.config?.name
          : this.bossConfig?.name,
      });
      return {
        events,
        winner: null,
        needsEvent: false,
        needsPath: false,
        needsBossMinion: hasMinions,
        needsBoss: !hasMinions,
      };
    }

    const space = SPECIAL_SPACES[player.position];
    if (!space || space.type === 'start') {
      return { events, winner: null, needsEvent: false, needsPath: false };
    }

    if (space.type === 'mystery') {
      const spaceNum = player.position;
      const revealed = this.revealedSpaces[spaceNum];

      if (!revealed) {
        events.push({
          type: 'mystery-pending',
          spaceNum,
          player: player.name,
        });
        return {
          events,
          winner: null,
          needsEvent: false,
          needsPath: false,
          needsMysteryRoll: true,
          mysterySpaceNum: spaceNum,
        };
      }

      if (revealed.type === 'path') {
        events.push({
          type: 'path',
          spaceNum,
          name: revealed.config.name,
          icon: revealed.config.icon,
          flavor: revealed.config.flavor,
          player: player.name,
        });
        return {
          events,
          winner: null,
          needsEvent: false,
          needsPath: true,
          pathConfig: revealed.config,
        };
      }

      if (revealed.type === 'ambush') {
        const joined = this.joinOrStartPit(player, spaceNum);
        if (joined) {
          const { config, kind, pit } = joined;
          const allies = pit.playerIds
            .filter((id) => id !== player.id)
            .map((id) => this.players.find((p) => p.id === id)?.name)
            .filter(Boolean);

          if (kind === 'join') {
            events.push({
              type: 'ambush-join',
              name: config.name,
              icon: config.icon,
              ambushHp: pit.hp,
              ambushMaxHp: pit.maxHp,
              player: player.name,
              allies,
              spaceNum,
            });
          } else {
            events.push({
              type: 'ambush-start',
              name: config.name,
              icon: config.icon,
              flavor: config.flavor,
              ambushHp: pit.hp,
              ambushMaxHp: pit.maxHp,
              player: player.name,
              spaceNum,
            });
          }

          return {
            events,
            winner: null,
            needsEvent: false,
            needsPath: false,
            needsAmbush: this.isPlayerInPit(player),
          };
        }
      }

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

    if (space.type === 'event' && space.category === 'ambush') {
      const joined = this.joinOrStartPit(player, player.position);
      if (joined) {
        const { config, kind, pit } = joined;
        const allies = pit.playerIds
          .filter((id) => id !== player.id)
          .map((id) => this.players.find((p) => p.id === id)?.name)
          .filter(Boolean);

        if (kind === 'join') {
          events.push({
            type: 'ambush-join',
            name: config.name,
            icon: config.icon,
            ambushHp: pit.hp,
            ambushMaxHp: pit.maxHp,
            player: player.name,
            allies,
            spaceNum: player.position,
          });
        } else {
          events.push({
            type: 'ambush-start',
            name: config.name,
            icon: config.icon,
            flavor: config.flavor,
            ambushHp: pit.hp,
            ambushMaxHp: pit.maxHp,
            player: player.name,
            spaceNum: player.position,
          });
        }

        return {
          events,
          winner: null,
          needsEvent: false,
          needsPath: false,
          needsAmbush: this.isPlayerInPit(player),
        };
      }
      return { events, winner: null, needsEvent: false, needsPath: false };
    }

    if (space.type === 'event') {
      const effectiveDc = getEffectiveDc(player, space.dc, this.difficultyLevel);
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
      if (this.bossActive) {
        events.push({
          type: 'boss-guard',
          player: player.name,
          name: this.bossConfig?.name,
        });
        return {
          winner: null,
          needsEvent: false,
          needsPath: false,
          needsBoss: true,
          eventConfig: null,
          pathConfig: null,
        };
      }

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
      needsBoss: chain.needsBoss ?? false,
      needsBossMinion: chain.needsBossMinion ?? false,
      needsBossReveal: chain.needsBossReveal ?? false,
      bossRevealSpaceNum: chain.bossRevealSpaceNum ?? null,
      needsAmbush: chain.needsAmbush ?? false,
      needsMysteryRoll: chain.needsMysteryRoll ?? false,
      mysterySpaceNum: chain.mysterySpaceNum ?? null,
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
    const effectiveDc = getEffectiveDc(player, config.dc, this.difficultyLevel, dcModApplied);
    const isNat1 = !nat20 && nat1;
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
        needsBoss: moveResult.needsBoss ?? false,
        needsBossMinion: moveResult.needsBossMinion ?? false,
        needsBossReveal: moveResult.needsBossReveal ?? false,
        bossRevealSpaceNum: moveResult.bossRevealSpaceNum ?? null,
        needsAmbush: moveResult.needsAmbush ?? false,
        needsMysteryRoll: moveResult.needsMysteryRoll ?? false,
        mysterySpaceNum: moveResult.mysterySpaceNum ?? null,
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
    this.bossActive = false;
    this.bossHp = 0;
    this.bossMaxHp = 0;
    this.bossConfig = null;
    this.bossMultiplier = 1;
    this.bossDmgPerHit = 1;
    this.bossRevealRoll = null;
    this.bossMinions = [];
    this.ambushPits = {};
    this.revealedSpaces = {};
  }
}

window.Game = Game;
window.TOTAL_SPACES = TOTAL_SPACES;
window.FINISH_SPACE = FINISH_SPACE;
window.BOSS_SPACE = BOSS_SPACE;
window.BOSS_RETREAT_SPACE = BOSS_RETREAT_SPACE;
window.isOnBossArena = isOnBossArena;
window.getPathDirection = getPathDirection;
window.getDcBonus = getDcBonus;
window.getDcModifier = getDcModifier;
window.getDifficultyDcBonus = getDifficultyDcBonus;
window.DC_DIFFICULTY_MAX_LEVEL = DC_DIFFICULTY_MAX_LEVEL;
window.getEffectiveDc = getEffectiveDc;
window.isCenterCell = isCenterCell;
window.isCenterCovered = isCenterCovered;
window.getCenterAnchor = getCenterAnchor;
window.applyMovementBonus = applyMovementBonus;
window.calcEventSuccessSteps = calcEventSuccessSteps;
window.BASE_SUCCESS_STEPS = BASE_SUCCESS_STEPS;
window.OVERSHOOT_DIVISOR = OVERSHOOT_DIVISOR;
window.DEFAULT_HP = DEFAULT_HP;
window.DEFAULT_MAX_HP = DEFAULT_MAX_HP;
