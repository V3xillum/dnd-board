const { board, player, boss } = window.GAME_SETTINGS;
const TOTAL_SPACES = board.totalSpaces;
const FINISH_SPACE = board.finishSpace;
const BOSS_SPACE = board.bossSpace;
const BOSS_HP_PER_PLAYER = boss.hpPerPlayer;

function isOnBossArena(position) {
  return position === BOSS_SPACE || position === FINISH_SPACE;
}
const DEFAULT_HP = player.startHp;
const DEFAULT_MAX_HP = player.maxHp;

/** SPECIAL_SPACES wordt gebouwd in events-data.js */

class Game {
  constructor() {
    this.players = [];
    this.currentIndex = 0;
    this.layout = buildSpiralLayout();
    this.spacePositions = buildSpacePositions(this.layout);
    this.pendingExtraTurn = false;
    /** Na geslaagde event-check: bonus 2× D6 (Nat 20 verdubbelt die worp) */
    this.pendingEventBonusMove = null;
    this.gameOver = false;
    this.winner = null;
    this.bossActive = false;
    this.bossHp = 0;
    this.bossMaxHp = 0;
    this.bossConfig = null;
    this.bossMultiplier = 1;
    this.bossDmgPerHit = 1;
    this.bossRevealRoll = null;
    /** Beschermers vóór de eindbaas (D12); niet op het bord als putten */
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

  spawnBossMinions(events, count = 2) {
    this.bossMinions = [];
    const spawnCount = Math.max(0, Math.floor(count));
    for (let i = 0; i < spawnCount; i += 1) {
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

  /** D12 is één keer per boss-fight; bossRevealRoll blijft staan tot reset(). */
  hasBossReveal() {
    return this.bossRevealRoll != null;
  }

  /** Boss verslagen — geen nieuwe D12 of gevecht op vak 62. */
  isBossEncounterComplete() {
    return this.hasBossReveal() && !this.bossActive;
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
    let multiplier;
    let tier;
    if (clamped <= 4) {
      multiplier = 1;
      tier = 'standard';
    } else if (clamped <= 10) {
      multiplier = 1.5;
      tier = 'strong';
    } else {
      multiplier = 2;
      tier = 'epic';
    }
    const minionCount = clamped >= 12 ? 3 : clamped >= 5 ? 1 : 0;
    return { roll: clamped, multiplier, tier, minionCount };
  }

  resolveBossReveal(landedSpace, roll) {
    const player = this.currentPlayer;
    const { roll: clamped, multiplier, tier, minionCount } = this.getBossRevealFromRoll(roll);

    this.bossMultiplier = multiplier;
    this.bossDmgPerHit = multiplier;
    this.bossRevealRoll = clamped;

    const events = [{
      type: 'boss-reveal',
      roll: clamped,
      tier,
      multiplier,
      minionCount,
      player: player?.name,
      spaceNum: landedSpace,
    }];

    const config = this.activateBoss(landedSpace);
    if (!config) {
      return { events, reveal: null, needsBoss: false };
    }

    if (minionCount > 0) {
      this.spawnBossMinions(events, minionCount);
    } else {
      this.bossMinions = [];
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
        minionCount,
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

  /**
   * Zet speler-HP naar max. Geen effect als al vol.
   * @returns {{ healed: boolean, alreadyFull: boolean, from: number, to: number }}
   */
  healPlayerToFull(player, events) {
    if (!player) {
      return { healed: false, alreadyFull: true, from: 0, to: 0 };
    }

    const from = player.hp;
    const to = player.maxHp;
    if (from >= to) {
      return { healed: false, alreadyFull: true, from, to };
    }

    player.hp = to;
    events.push({
      type: 'hp-change',
      player: player.name,
      from,
      to,
      delta: to - from,
    });
    events.push({
      type: 'full-heal',
      player: player.name,
      from,
      to,
    });

    return { healed: true, alreadyFull: false, from, to };
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

  move(steps, options = {}) {
    const { leadEvents = [] } = options;
    const player = this.currentPlayer;
    if (!player || this.gameOver) {
      return { events: [], winner: null, needsEvent: false, needsPath: false, needsAmbush: false };
    }

    if (this.pendingEventBonusMove) {
      return { events: [], winner: null, needsEvent: false, needsPath: false, needsAmbush: false };
    }

    const from = player.position;
    const effectiveSteps = applyMovementBonus(player, steps);
    let pos = from + effectiveSteps;
    const events = [
      ...leadEvents,
      {
        type: 'move',
        from,
        to: pos,
        steps: effectiveSteps,
        baseSteps: steps,
        movementBonus: player.movementBonus ?? 0,
        player: player.name,
      },
    ];

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

  /** Bonus 2× D6 na geslaagde event-check (Nat 20 op check verdubbelt deze worp). */
  moveAfterEventBonus(rawSteps) {
    const bonus = this.pendingEventBonusMove;
    const player = this.currentPlayer;
    if (!bonus || !player || this.gameOver) {
      return { events: [], winner: null, needsEvent: false, needsPath: false, needsAmbush: false };
    }

    this.pendingEventBonusMove = null;
    const moveSteps = bonus.nat20 ? rawSteps * 2 : rawSteps;

    return this.move(moveSteps, {
      leadEvents: [{
        type: 'event-bonus-move',
        roll: rawSteps,
        steps: moveSteps,
        nat20Doubled: bonus.nat20,
        player: player.name,
      }],
    });
  }

  resolveSpace(player, events) {
    const onBossSpace = player.position === BOSS_SPACE || player.position === FINISH_SPACE;

    if (!this.bossActive && onBossSpace && !this.hasBossReveal()) {
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

    if (player.position === BOSS_SPACE && this.isBossEncounterComplete()) {
      events.push({
        type: 'boss-cleared',
        player: player.name,
        spaceNum: BOSS_SPACE,
      });
      return { events, winner: null, needsEvent: false, needsPath: false };
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

    if (space.type === 'healer') {
      const healInfo = this.healPlayerToFull(player, events);
      events.push({
        type: 'healer-visit',
        spaceNum: player.position,
        name: space.name,
        icon: space.icon,
        flavor: space.flavor,
        player: player.name,
        ...healInfo,
      });
      return {
        events,
        winner: null,
        needsEvent: false,
        needsPath: true,
        pathConfig: space,
      };
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
      this.pendingEventBonusMove = null;
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
      events.push({
        type: 'event-success',
        nat20,
        player: player.name,
      });

      if (nat20) {
        events.push({ type: 'nat20', player: player.name });
        events.push(...this.mutateHp(player, 1));
      }

      const prevStreak = player.dcStreak;
      player.dcStreak = prevStreak + 5;
      events.push({
        type: 'dc-streak',
        from: prevStreak,
        to: player.dcStreak,
        nextBonus: getDcBonus(player),
        player: player.name,
      });

      this.pendingEventBonusMove = { nat20 };

      return {
        events,
        winner: null,
        needsEvent: false,
        needsPath: false,
        needsBoss: false,
        needsBossMinion: false,
        needsBossReveal: false,
        bossRevealSpaceNum: null,
        needsAmbush: false,
        needsMysteryRoll: false,
        mysterySpaceNum: null,
        eventConfig: null,
        pathConfig: null,
        passTurn: false,
        needsBonusMove: true,
        nat20,
        nat1: false,
        effectiveDc,
      };
    }

    player.dcStreak = 0;
    this.pendingEventBonusMove = null;
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
    this.pendingEventBonusMove = null;
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
window.isOnBossArena = isOnBossArena;
window.DEFAULT_HP = DEFAULT_HP;
window.DEFAULT_MAX_HP = DEFAULT_MAX_HP;
