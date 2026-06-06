/**
 * Combat resolve — Game.prototype mixin.
 * Laadt ná js/game.js. Gebruikt window.getEffectiveDc (dc.js) en isOnBossArena (game.js).
 */
(function () {
  const getEffectiveDc = window.getEffectiveDc;

  Object.assign(Game.prototype, {
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
    },

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
    },

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
    },

    resolveCombatEnemyAttack(ctx, options = {}) {
      const player = this.currentPlayer;
      if (!player || !ctx?.config) {
        return {
          events: [],
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
        const { applied } = this.applyRepeatedHpDamage(player, events, damage);
        attackEvent.damage = applied;
        attackEvent.playerHp = player.hp;
      }

      const died = events.some((e) => e.type === 'death');
      return {
        events,
        died,
        effectiveHit,
        enemyNat20,
        enemyNat1,
        selfDamage: attackEvent.selfDamage ?? 0,
        damage: attackEvent.damage ?? 0,
      };
    },

    resolveCombatSpecialSave(ctx, saveRoll, options = {}) {
      const player = this.currentPlayer;
      const special = ctx?.config?.specialAttack;
      if (!player || !special) {
        return { events: [], success: false, died: false, damage: 0 };
      }

      const { playerNat1 = false } = options;
      const success = saveRoll != null && saveRoll >= special.dc;
      let damage = success ? special.dmgSuccess : special.dmgFail;
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

      if (playerNat1) {
        damage += 1;
        events.push({ type: 'nat1', player: player.name });
      }

      const { applied } = this.applyRepeatedHpDamage(player, events, damage);
      events[0].damage = applied;

      return {
        events,
        success,
        died: events.some((e) => e.type === 'death'),
        damage: applied,
      };
    },

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
          retreatedTo: null,
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

      if (!winner) {
        events.push({ type: 'pass-turn', player: player.name });
      }

      return {
        events,
        passTurn: !winner,
        winner,
        bossHp: this.bossHp,
        bossMaxHp: this.bossMaxHp,
        retreatedTo: null,
      };
    },

    applyCombatCheckFail(player, events, isNat1) {
      const first = this.mutateHp(player, -1);
      events.push(...first);
      if (isNat1 && !first.some((e) => e.type === 'death')) {
        events.push({ type: 'nat1', player: player.name });
        events.push(...this.mutateHp(player, -1));
      }
    },

    /** Meerdere −1 hits; stopt zodra de speler sterft (overflow na respawn voorkomen). */
    applyRepeatedHpDamage(player, events, hits) {
      const count = Math.max(0, Math.floor(hits));
      if (!player || count === 0) return { died: false, applied: 0 };

      let applied = 0;
      for (let i = 0; i < count; i += 1) {
        const batch = this.mutateHp(player, -1);
        if (batch.length === 0) break;
        events.push(...batch);
        applied += 1;
        if (batch.some((e) => e.type === 'death')) {
          return { died: true, applied };
        }
      }
      return { died: false, applied };
    }

  });
})();
