/**
 * Player list, combat rail, HP controls, turn UI, difficulty.
 * Vereist: dom, board (renderBoard), log, modals/core (syncModalScrollLock)
 */
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

function updateRestControls({ inputLocked = false, bonusMoveActive = false } = {}) {
  const cp = game.currentPlayer;
  const show = cp && !game.gameOver;
  const locked = inputLocked || bonusMoveActive || !show;

  if (!els.shortRestBtn || !els.longRestBtn) return;

  const shortRemaining = show ? Math.max(0, 2 - (cp.shortRestsUsed ?? 0)) : 0;
  const shortBlocked = locked || shortRemaining <= 0 || !cp || cp.hp >= cp.maxHp;
  const longBlocked = locked || !cp || cp.longRestUsed || cp.hp >= cp.maxHp;

  els.shortRestBtn.disabled = shortBlocked;
  els.longRestBtn.disabled = longBlocked;

  els.shortRestBtn.textContent = shortRemaining > 0
    ? `Short Rest (nog ${shortRemaining}×)`
    : 'Short Rest (op)';

  els.longRestBtn.textContent = cp?.longRestUsed
    ? 'Long Rest (gebruikt)'
    : 'Long Rest (vol HP)';

  if (els.shortRestD4Input) {
    els.shortRestD4Input.disabled = shortBlocked;
  }
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
    updateRestControls();
    return;
  }

  if (!cp) {
    els.currentPlayer.textContent = 'Voeg spelers toe om te beginnen';
    els.moveBtn.disabled = true;
    els.diceInput.disabled = false;
    updateHpControls();
    updateRestControls();
    return;
  }

  let turnText = `${cp.name} is aan de beurt`;
  if (game.pendingEventBonusMove) {
    turnText += game.pendingEventBonusMove.nat20
      ? ' — bonus 2× D6 (Nat 20: verdubbeld!)'
      : ' — bonus 2× D6 na event';
  } else if (game.pendingExtraTurn) turnText += ' (extra beurt!)';
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
  const bonusMoveActive = Boolean(game.pendingEventBonusMove);
  els.moveBtn.disabled = inputLocked;
  els.diceInput.disabled = inputLocked;
  if (els.moveBtn) {
    els.moveBtn.textContent = game.pendingEventBonusMove ? 'Bonus worp' : 'Verplaats';
  }
  updateHpControls();
  updateRestControls({ inputLocked, bonusMoveActive });

  if (window.isMultiplayerHost?.() && inAmbush && activeAmbush === null
      && els.eventModal.classList.contains('hidden')) {
    showAmbushModal();
  } else if (window.isMultiplayerHost?.() && onBossArena && activeBoss === null
      && activeBossMinion === null && els.eventModal.classList.contains('hidden')) {
    showBossFightModal();
  }

  updateTokenTurnStates();
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
