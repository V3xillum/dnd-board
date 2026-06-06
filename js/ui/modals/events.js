/**
 * Event, mystery, boss-reveal, path/healer, win modals + ambush/boss modal open.
 * Vereist: dom, state, modals/core, modals/combat, board, players, log, flow (advanceTurn at runtime)
 */
function updateEventModalTurnPlayer() {
  const player = game.currentPlayer;
  if (!els.eventTurnBanner) return;

  if (!player) {
    els.eventTurnBanner.classList.add('hidden');
    return;
  }

  els.eventTurnBanner.classList.remove('hidden');
  if (els.eventTurnName) els.eventTurnName.textContent = player.name;
  if (els.eventTurnDot) els.eventTurnDot.style.backgroundColor = player.color;
  els.eventCard?.style.setProperty('--turn-player-color', player.color);
}

function resetEventHeader(config) {
  els.eventTitle.textContent = config.name;
  els.eventTitle.className = 'event-card__title';
  els.eventFlavor.textContent = config.flavor;
  els.eventFlavor.className = 'event-card__flavor';
}

function showEventOutcomeInHeader(success, config) {
  els.eventTitle.textContent = success ? 'Geslaagd!' : 'Mislukt!';
  els.eventTitle.className = `event-card__title event-card__title--${success ? 'success' : 'fail'}`;
  els.eventFlavor.textContent = success ? (config.successText || '') : (config.failText || '');
  els.eventFlavor.className = `event-card__flavor event-card__flavor--outcome event-card__flavor--${success ? 'success' : 'fail'}`;
}

function populateEventModal(config, spaceNum) {
  resetEventModalHostControls();
  resetCombatModalPhases();
  const player = game.currentPlayer;
  updateEventModalTurnPlayer();

  removeCombatHpBars();
  removeAmbushModalExtras();
  els.eventCard?.classList.remove('event-card--ambush');
  els.eventIcon.textContent = config.icon || '🎲';
  els.eventSpace.textContent = `Vak ${spaceNum ?? '?'}`;
  resetEventHeader(config);
  setEventCheckForNormal(config, player);
  els.eventCheck.classList.remove('is-hidden');

  els.eventDiceInput.min = '1';
  els.eventDiceInput.removeAttribute('max');
  els.eventDiceInput.placeholder = '—';
  els.eventDiceInput.value = '';
  els.eventNat20.checked = false;
  els.eventNat20.disabled = false;
  els.eventNat1.checked = false;
  els.eventNat1.disabled = false;
  els.eventResult.className = 'event-card__result hidden';
  els.eventRollArea.classList.remove('is-hidden');
  activeCombatActionHandler = null;
  els.eventClose.classList.remove('hidden');
  els.eventClose.disabled = true;
  els.eventClose.textContent = 'Doorgaan op avontuur';
  els.eventSubmit.disabled = false;
  els.eventSubmit.classList.remove('is-hidden');
  els.eventSubmit.textContent = 'Bevestigen';
  els.eventDiceInput.disabled = false;
}

function closeEventModal() {
  els.eventModal.classList.add('hidden');
  syncModalScrollLock();
  resetCombatModalPhases();
  activeEvent = null;
  activeBoss = null;
  activeBossMinion = null;
  activeAmbush = null;
  els.eventCard?.classList.remove('event-card--ambush');
  removeAmbushModalExtras();
  if (window.isMultiplayerHost?.()) {
    const modalType = syncedActiveModal?.type;
    if (modalType === 'event' || modalType === 'boss' || modalType === 'boss-minion' || modalType === 'ambush') {
      clearSyncedActiveModal();
    }
  }
}

function populateBossModal() {
  resetEventModalHostControls();
  const config = game.bossConfig;
  const player = game.currentPlayer;
  if (!config) return;

  updateEventModalTurnPlayer();

  removeAmbushModalExtras();
  els.eventCard?.classList.remove('event-card--ambush');

  if (!player) return;

  els.eventCard?.classList.add('event-card--boss');
  els.eventCard?.style.setProperty('--boss-fighter-color', player.color);

  els.eventIcon.textContent = config.icon || '🛡️';
  els.eventSpace.textContent = 'Eindbaas';
  els.eventTitle.textContent = `⚔️ ${config.name}`;
  els.eventTitle.className = 'event-card__title';
  els.eventFlavor.textContent = config.flavor;
  els.eventFlavor.className = 'event-card__flavor';
  setEventCheckForCombat(config, player);
  els.eventCheck.classList.remove('is-hidden');
  resetCombatModalPhases();

  els.eventDiceInput.min = '1';
  els.eventDiceInput.removeAttribute('max');
  els.eventDiceInput.placeholder = '—';
  els.eventNat20.checked = false;
  els.eventNat20.disabled = false;
  els.eventNat1.checked = false;
  els.eventNat1.disabled = false;
  els.eventResult.className = 'event-card__result hidden';
  els.eventRollArea.classList.remove('is-hidden');
  setCombatFooter('none');
  els.eventClose.textContent = 'Doorgaan op avontuur';
  els.eventSubmit.disabled = false;
  els.eventSubmit.classList.remove('is-hidden');
  els.eventSubmit.textContent = 'Aanvallen';
  els.eventDiceInput.disabled = false;
  els.eventDiceInput.value = '';

  removeCombatHpBars();
  els.eventCheck.insertAdjacentHTML('afterbegin', combatFighterPanelHtml(player, bossFighterNote(player)));
  els.eventCheck.insertAdjacentHTML('beforeend', bossHpBarHtml());
}

function ambushHpBarHtml(pitOverride) {
  const pit = pitOverride
    ?? game.getPitAt(getActiveCombatFlow()?.spaceNum ?? game.currentPlayer?.position);
  const max = pit?.maxHp || 1;
  const hp = pit?.hp ?? 0;
  const pct = Math.round((hp / max) * 100);
  return `
    <div class="event-card__boss-hp">
      <p class="event-card__boss-hp-label">Vijand in de put</p>
      <div class="boss-hp ambush-hp" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="boss-hp__fill ambush-hp__fill" style="width:${pct}%"></div>
      </div>
      <p class="boss-hp__label">Ambusher: ${hp} / ${max} HP</p>
    </div>
  `;
}

function bossFighterNote(player) {
  return `Valt de eindbaas aan op vak ${player.position} · blijf vechten tot winst of uitval`;
}

function minionFighterNote(player) {
  return `Versla de beschermer op vak ${player.position} · blijf vechten tot winst of uitval`;
}

function bossMinionHpBarHtml(minion) {
  const max = minion?.maxHp || 1;
  const hp = minion?.hp ?? 0;
  const pct = Math.round((hp / max) * 100);
  return `
    <div class="event-card__boss-hp">
      <p class="event-card__boss-hp-label">Beschermer van de eindbaas</p>
      <div class="boss-hp ambush-hp" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="boss-hp__fill ambush-hp__fill" style="width:${pct}%"></div>
      </div>
      <p class="boss-hp__label">Vijand: ${hp} / ${max} HP</p>
    </div>
  `;
}

function combatFighterPanelHtml(player, note, alliesHtml = '') {
  return `
    <div class="event-card__combat-fighter-wrap">
      <div class="ambush-modal__fighter" style="--fighter-color:${player.color}">
        <div class="ambush-modal__fighter-accent" aria-hidden="true"></div>
        <div class="ambush-modal__fighter-body">
          <span class="ambush-modal__turn-badge">Aan de beurt</span>
          <div class="ambush-modal__fighter-row">
            <span class="ambush-modal__fighter-dot" aria-hidden="true"></span>
            <div class="ambush-modal__fighter-meta">
              <strong class="ambush-modal__fighter-name">${escapeAttr(player.name)}</strong>
              <span class="ambush-modal__fighter-hp" title="${player.hp} / ${player.maxHp} HP">
                <span class="ambush-modal__fighter-hearts">${formatPlayerHp(player)}</span>
                <span class="ambush-modal__fighter-hp-num">${player.hp} / ${player.maxHp} HP</span>
              </span>
            </div>
          </div>
          <p class="ambush-modal__pit-note">${note}</p>
        </div>
      </div>
      ${alliesHtml}
    </div>
  `;
}

function ambushFighterPanelHtml(player, pit) {
  const allies = pit.playerIds
    .filter((id) => id !== player.id)
    .map((id) => game.players.find((p) => p.id === id))
    .filter(Boolean);

  const alliesHtml = allies.length
    ? `
      <div class="ambush-modal__allies">
        <span class="ambush-modal__allies-label">Ook in de put</span>
        ${allies.map((a) => `
          <div class="ambush-modal__ally" style="--ally-color:${a.color}">
            <span class="ambush-modal__ally-dot" aria-hidden="true"></span>
            <span class="ambush-modal__ally-name">${escapeAttr(a.name)}</span>
            <span class="ambush-modal__ally-hp" title="${a.hp} / ${a.maxHp} HP">${formatPlayerHp(a)}</span>
            <span class="ambush-modal__ally-hp-num">${a.hp}/${a.maxHp}</span>
          </div>
        `).join('')}
      </div>`
    : '';

  return combatFighterPanelHtml(
    player,
    `Vecht uit de put op vak ${pit.spaceNum}${allies.length ? ' · samen met je bondgenoten' : ''}`,
    alliesHtml,
  );
}

function populateAmbushModal() {
  resetEventModalHostControls();
  const pit = game.getCurrentPlayerPit();
  const player = game.currentPlayer;
  if (!pit || !player) return;

  updateEventModalTurnPlayer();

  const { config } = pit;

  els.eventCard?.classList.add('event-card--ambush');
  els.eventCard?.style.setProperty('--ambush-fighter-color', player.color);
  els.eventIcon.textContent = config.icon || '🕳️';
  els.eventSpace.textContent = `Vak ${player.position}`;
  els.eventTitle.textContent = config.name;
  els.eventTitle.className = 'event-card__title';
  els.eventFlavor.textContent = config.flavor;
  els.eventFlavor.className = 'event-card__flavor';

  removeAmbushModalExtras();
  els.eventCheck.insertAdjacentHTML('afterbegin', ambushFighterPanelHtml(player, pit));

  setEventCheckForCombat(config, player);
  els.eventCheck.classList.remove('is-hidden');
  resetCombatModalPhases();

  els.eventDiceInput.min = '1';
  els.eventDiceInput.removeAttribute('max');
  els.eventDiceInput.placeholder = '—';
  els.eventNat20.checked = false;
  els.eventNat20.disabled = false;
  els.eventNat1.checked = false;
  els.eventNat1.disabled = false;
  els.eventResult.className = 'event-card__result hidden';
  els.eventRollArea.classList.remove('is-hidden');
  setCombatFooter('none');
  els.eventClose.textContent = 'Doorgaan op avontuur';
  els.eventSubmit.disabled = false;
  els.eventSubmit.classList.remove('is-hidden');
  els.eventSubmit.textContent = 'Vechten';
  els.eventDiceInput.disabled = false;
  els.eventDiceInput.value = '';

  removeCombatHpBars();
  els.eventCheck.insertAdjacentHTML('beforeend', ambushHpBarHtml());
}

function showAmbushModal(onComplete) {
  if (!game.isCurrentPlayerInAmbush() || !game.getCurrentPlayerPit()) {
    onComplete?.();
    return;
  }

  activeAmbush = createCombatFlowState(
    onComplete,
    game.getCurrentPlayerPit()?.config,
    game.currentPlayer?.position,
  );
  activeBoss = null;
  activeBossMinion = null;
  activeEvent = null;

  els.eventModal.classList.remove('hidden');
  els.eventModal.classList.remove('event-modal--spectator');
  syncModalScrollLock();
  populateAmbushModal();
  updateAmbushPanel();
  syncCombatModalPhase('ambush', game.getCurrentPlayerPit()?.config, game.currentPlayer?.position, 'player-roll', {
    submitLabel: 'Vechten',
  });
  playModalCardEnter(els.eventModal, 'combat');

  setTimeout(() => els.eventDiceInput.focus(), 100);
}

function populateBossMinionModal() {
  resetEventModalHostControls();
  const minion = game.getActiveBossMinion();
  const player = game.currentPlayer;
  if (!minion || !player) return;

  updateEventModalTurnPlayer();
  const { config } = minion;

  removeAmbushModalExtras();
  els.eventCard?.classList.remove('event-card--boss');
  els.eventCard?.classList.add('event-card--ambush');
  els.eventCard?.style.setProperty('--ambush-fighter-color', player.color);
  els.eventIcon.textContent = config.icon || '👹';
  els.eventSpace.textContent = `Vak ${player.position}`;
  els.eventTitle.textContent = config.name;
  els.eventTitle.className = 'event-card__title';
  els.eventFlavor.textContent = config.flavor;
  els.eventFlavor.className = 'event-card__flavor';

  els.eventCheck.insertAdjacentHTML('afterbegin', combatFighterPanelHtml(player, minionFighterNote(player)));
  setEventCheckForCombat(config, player);
  els.eventCheck.classList.remove('is-hidden');
  resetCombatModalPhases();

  els.eventDiceInput.min = '1';
  els.eventDiceInput.removeAttribute('max');
  els.eventDiceInput.placeholder = '—';
  els.eventNat20.checked = false;
  els.eventNat20.disabled = false;
  els.eventNat1.checked = false;
  els.eventNat1.disabled = false;
  els.eventResult.className = 'event-card__result hidden';
  els.eventRollArea.classList.remove('is-hidden');
  setCombatFooter('none');
  els.eventClose.textContent = 'Doorgaan op avontuur';
  els.eventSubmit.disabled = false;
  els.eventSubmit.classList.remove('is-hidden');
  els.eventSubmit.textContent = 'Vechten';
  els.eventDiceInput.disabled = false;
  els.eventDiceInput.value = '';

  removeCombatHpBars();
  els.eventCheck.insertAdjacentHTML('beforeend', bossMinionHpBarHtml(minion));
}

function showBossMinionModal(onComplete) {
  if (!game.bossActive || !game.getActiveBossMinion()) {
    showBossModal(onComplete);
    return;
  }

  closeBossRevealModal();
  const minion = game.getActiveBossMinion();
  const spaceNum = game.currentPlayer?.position;
  const minionIndex = game.bossMinions.indexOf(minion);
  activeBossMinion = createCombatFlowState(onComplete, minion.config, spaceNum, minionIndex);
  activeBoss = null;
  activeEvent = null;
  activeAmbush = null;

  els.eventModal.classList.remove('hidden');
  els.eventModal.classList.remove('event-modal--spectator');
  syncModalScrollLock();
  populateBossMinionModal();
  updateBossPanel();
  syncCombatModalPhase('boss-minion', minion.config, spaceNum, 'player-roll', {
    submitLabel: 'Vechten',
  });
  playModalCardEnter(els.eventModal, 'combat');

  setTimeout(() => els.eventDiceInput.focus(), 100);
}

function showBossFightModal(onComplete) {
  if (game.hasBossMinions?.()) {
    showBossMinionModal(onComplete);
  } else {
    showBossModal(onComplete);
  }
}

function showBossModal(onComplete) {
  if (!game.bossActive || !game.bossConfig) {
    onComplete?.();
    return;
  }

  closeBossRevealModal();
  activeBoss = createCombatFlowState(
    onComplete,
    game.bossConfig,
    game.currentPlayer?.position,
  );
  activeBossMinion = null;
  activeEvent = null;
  activeAmbush = null;

  els.eventModal.classList.remove('hidden');
  els.eventModal.classList.remove('event-modal--spectator');
  syncModalScrollLock();
  populateBossModal();
  updateBossPanel();
  syncCombatModalPhase('boss', game.bossConfig, game.currentPlayer?.position, 'player-roll', {
    submitLabel: 'Aanvallen',
  });
  playModalCardEnter(els.eventModal, 'combat');

  setTimeout(() => els.eventDiceInput.focus(), 100);
}

function finishBossFlow(onClose) {
  finishCombatHostControls(onClose);
  if (activeBoss) activeBoss.onClose = onClose?.handler;
}

function finishBossMinionFlow(onClose) {
  finishCombatHostControls(onClose);
  if (activeBossMinion) activeBossMinion.onClose = onClose?.handler;
}

async function handleBossMinionSubmit() {
  if (!activeBossMinion || activeBossMinion.submitted || !game.getActiveBossMinion()) return;
  await handleCombatPlayerSubmit();
}

async function handleAmbushSubmit() {
  if (!activeAmbush || activeAmbush.submitted || !game.isCurrentPlayerInAmbush()) return;
  await handleCombatPlayerSubmit();
}

/** Sluit put-modal van vorige speler; daarna advanceTurn opent zo nodig gevecht voor volgende speler in de put. */
function finishAmbushFight(onComplete) {
  closeEventModal();
  onComplete?.();
}

function finishCombatHostControls(onClose) {
  els.eventSubmit.classList.add('is-hidden');
  els.eventSubmit.disabled = true;
  els.eventDiceInput.disabled = true;
  els.eventNat20.disabled = true;
  els.eventNat1.disabled = true;
  els.eventRollArea.classList.add('is-hidden');
  els.eventCombatHit?.setAttribute('disabled', 'disabled');
  els.eventCombatMiss?.setAttribute('disabled', 'disabled');
  els.eventEnemyHit?.setAttribute('disabled', 'disabled');
  els.eventEnemyMiss?.setAttribute('disabled', 'disabled');
  if (els.eventSpecialSaveInput) els.eventSpecialSaveInput.disabled = true;
  if (els.eventSpecialSaveSubmit) els.eventSpecialSaveSubmit.disabled = true;
  els.eventCombatAction.classList.add('hidden');
  activeCombatActionHandler = null;
  els.eventClose.classList.remove('hidden');
  els.eventClose.disabled = false;
  els.eventClose.textContent = onClose?.chainLabel ?? 'Doorgaan op avontuur';
  els.eventClose.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function finishAmbushFlow(onClose) {
  finishCombatHostControls(onClose);
  if (activeAmbush) activeAmbush.onClose = onClose?.handler;
}

async function handleBossSubmit() {
  if (!activeBoss || activeBoss.submitted || !game.bossActive) return;
  await handleCombatPlayerSubmit();
}

function endBossTurn(onComplete, winner = null) {
  if (winner) {
    showWinModal(winner);
    return;
  }
  advanceTurn();
  onComplete?.();
}

function closePathModal() {
  if (els.pathModal.classList.contains('hidden')) return;
  els.pathModal.classList.add('hidden');
  els.pathModal.classList.remove('path-modal--spectator');
  syncModalScrollLock();
  clearSyncedActiveModal();

  const spaceNum = pathModalSpaceNum;
  pathModalSpaceNum = null;
  const skipMysteryReset = pathModalSkipMysteryReset;
  pathModalSkipMysteryReset = false;
  const cb = pathModalCallback;
  pathModalCallback = null;

  if (spaceNum != null && !skipMysteryReset) {
    const events = game.resetMysteryPathAfterRest(spaceNum);
    if (events.length > 0) {
      describeEvents(events);
      renderBoard();
      playMysteryResetFromEvents(events);
      window.syncAfterAction?.();
    }
  }

  cb?.();
}

function showPathModal(config, spaceNum, onComplete) {
  closeEventModal();
  els.pathIcon.textContent = config.icon || '🚶';
  els.pathSpace.textContent = `Vak ${spaceNum ?? '?'}`;
  els.pathTitle.textContent = config.name;
  els.pathFlavor.textContent = config.flavor;
  if (els.pathTag) els.pathTag.textContent = 'Rustig pad';
  if (els.pathNote) {
    els.pathNote.textContent = 'Geen ability check — even ademhalen en doorlopen.';
  }

  pathModalCallback = onComplete ?? null;
  pathModalSpaceNum = spaceNum ?? game.currentPlayer?.position ?? null;
  pathModalSkipMysteryReset = false;
  els.pathModal.classList.remove('hidden');
  els.pathModal.classList.remove('path-modal--spectator');
  els.pathClose.textContent = 'Rust even uit';
  els.pathClose.disabled = false;
  syncModalScrollLock();

  try {
    syncModalInput('path', config, spaceNum);
  } catch (err) {
    console.error('Path modal sync mislukt:', err);
  }
  playModalCardEnter(els.pathModal, 'calm');

  setTimeout(() => els.pathClose.focus(), 100);
}

function showHealerModal(config, spaceNum, healInfo, onComplete) {
  closeEventModal();
  els.pathIcon.textContent = config.icon || '✨';
  els.pathSpace.textContent = `Vak ${spaceNum ?? '?'}`;
  els.pathTitle.textContent = config.name;
  els.pathFlavor.textContent = config.flavor;
  if (els.pathTag) els.pathTag.textContent = 'Genezer';
  if (els.pathNote) {
    els.pathNote.textContent = healInfo?.healed
      ? `De cleric herstelt je volledig: ${healInfo.from} → ${healInfo.to} HP.`
      : 'Je voelt je al topfit — de cleric knikt begripvol en zegent je verder.';
  }

  pathModalCallback = onComplete ?? null;
  pathModalSpaceNum = spaceNum ?? game.currentPlayer?.position ?? null;
  pathModalSkipMysteryReset = true;
  els.pathModal.classList.remove('hidden');
  els.pathModal.classList.remove('path-modal--spectator');
  els.pathClose.textContent = 'Bedankt, zuster';
  els.pathClose.disabled = false;
  syncModalScrollLock();

  try {
    setSyncedActiveModal({
      type: 'healer',
      phase: 'outcome',
      spaceNum: spaceNum ?? null,
      config: serializeModalConfig(config),
      outcome: { healInfo },
    });
  } catch (err) {
    console.error('Healer modal sync mislukt:', err);
  }
  playModalCardEnter(els.pathModal, 'calm');

  setTimeout(() => els.pathClose.focus(), 100);
}

function formatMysteryMultiplierBadge(multiplier, jackpot) {
  if (jackpot) {
    return '<span class="mystery-badge mystery-badge--danger">Gevaarlijk</span>'
      + '<p class="mystery-jackpot">✨ Jackpot! Versla de vijand voor permanente +1 schade-bonus.</p>';
  }
  if (multiplier >= 2) {
    return '<span class="mystery-badge mystery-badge--danger">Gevaarlijk</span>';
  }
  if (multiplier >= 1.5) {
    return '<span class="mystery-badge mystery-badge--strong">Versterkte vijand</span>';
  }
  return '';
}

function buildMysteryRevealHtml(revelation) {
  if (!revelation) return '';
  const cfg = revelation.config ?? {};

  if (revelation.type === 'path') {
    return `
      <div class="mystery-reveal-card">
        <div class="mystery-reveal-card__head">
          <span class="mystery-reveal-card__icon">${cfg.icon ?? '🚶'}</span>
          <div>
            <p class="mystery-reveal-card__name">Rustig pad — ${cfg.name ?? 'Pad'}</p>
            <p class="mystery-reveal-card__flavor">${cfg.flavor ?? ''}</p>
          </div>
        </div>
      </div>`;
  }

  const hp = Math.ceil((cfg.ambushHp ?? 3) * (revelation.multiplier ?? 1));
  return `
    <div class="mystery-reveal-card">
      <div class="mystery-reveal-card__head">
        <span class="mystery-reveal-card__icon">${cfg.icon ?? '🕳️'}</span>
        <div>
          <p class="mystery-reveal-card__name">${cfg.name ?? 'Ambush'}</p>
          <p class="mystery-reveal-card__flavor">${cfg.flavor ?? ''}</p>
        </div>
      </div>
      <p class="mystery-reveal-card__flavor">Vijand-HP: ${hp}</p>
      ${formatMysteryMultiplierBadge(revelation.multiplier ?? 1, revelation.jackpot)}
    </div>`;
}

function formatBossTierBadge(tier, multiplier) {
  if (tier === 'epic' || multiplier >= 2) {
    return '<span class="mystery-badge mystery-badge--danger">Episch ×2</span>';
  }
  if (tier === 'strong' || multiplier >= 1.5) {
    return '<span class="mystery-badge mystery-badge--strong">Versterkt ×1.5</span>';
  }
  return '<span class="mystery-badge">Standaard</span>';
}

function buildBossRevealHtml(reveal) {
  if (!reveal) return '';
  const cfg = reveal.config ?? {};
  const failDmg = Math.ceil(reveal.multiplier ?? 1);
  return `
    <div class="mystery-reveal-card">
      <div class="mystery-reveal-card__head">
        <span class="mystery-reveal-card__icon">${cfg.icon ?? '⚔️'}</span>
        <div>
          <p class="mystery-reveal-card__name">${cfg.name ?? 'Eindbaas'}</p>
          <p class="mystery-reveal-card__flavor">${cfg.flavor ?? ''}</p>
        </div>
      </div>
      <p class="mystery-reveal-card__flavor">Boss-HP: ${reveal.bossHp ?? '?'} / ${reveal.bossMaxHp ?? '?'}</p>
      <p class="mystery-reveal-card__flavor">Mislukte check: ${failDmg} schade per hit</p>
      ${formatBossTierBadge(reveal.tier, reveal.multiplier ?? 1)}
      ${(reveal.minions?.length ?? 0) > 0 ? `
        <div class="boss-reveal-minions">
          <p class="mystery-reveal-card__flavor">Beschermers:</p>
          ${reveal.minions.map((m) => `
            <div class="boss-reveal-minion">
              <span class="boss-reveal-minion__icon">${m.icon ?? '👹'}</span>
              <span class="boss-reveal-minion__name">${escapeAttr(m.name ?? 'Beschermer')}</span>
              <span class="boss-reveal-minion__hp">${m.hp ?? '?'} HP</span>
            </div>
          `).join('')}
        </div>` : ''}
    </div>`;
}

function closeBossRevealModal() {
  if (els.bossRevealModal.classList.contains('hidden')) return;
  els.bossRevealModal.classList.add('hidden');
  els.bossRevealModal.classList.remove('boss-reveal-modal--spectator');
  els.bossRevealCard?.classList.remove('event-card--epic');
  syncModalScrollLock();
  activeBossReveal = null;
  if (window.isMultiplayerHost?.() && syncedActiveModal?.type === 'boss-reveal') {
    clearSyncedActiveModal();
  }
}

function closeMysteryModal() {
  if (els.mysteryModal.classList.contains('hidden')) return;
  els.mysteryModal.classList.add('hidden');
  els.mysteryModal.classList.remove('mystery-modal--spectator');
  els.mysteryCard?.classList.remove('event-card--jackpot');
  syncModalScrollLock();
  activeMystery = null;
  if (window.isMultiplayerHost?.() && syncedActiveModal?.type === 'mystery') {
    clearSyncedActiveModal();
  }
}

function showMysteryRevealPhase(revelation) {
  if (!activeMystery) return;
  activeMystery.phase = 'reveal';
  activeMystery.revelation = revelation;

  els.mysteryFlavor.textContent = 'Dit loerde achter het vraagteken:';
  els.mysteryRollArea.classList.add('hidden');
  els.mysteryRevealArea.classList.remove('hidden');
  els.mysterySubmit.classList.add('hidden');
  els.mysteryAction.classList.remove('hidden');
  els.mysteryAction.disabled = false;

  if (revelation.type === 'path') {
    els.mysteryAction.textContent = 'Verder lopen';
  } else {
    els.mysteryAction.textContent = 'Gevecht beginnen';
    els.mysteryCard?.classList.toggle('event-card--jackpot', Boolean(revelation.jackpot));
  }

  els.mysteryRevealContent.innerHTML = buildMysteryRevealHtml(revelation);

  const cfg = revelation.config ?? {};
  syncModalOutcome('mystery', activeMystery.spaceNum, {
    ...serializeModalConfig(cfg),
    revealType: revelation.type,
    multiplier: revelation.multiplier ?? null,
    jackpot: revelation.jackpot ?? false,
    ambushHp: revelation.type === 'ambush'
      ? Math.ceil((cfg.ambushHp ?? 3) * (revelation.multiplier ?? 1))
      : null,
  }, {
    revealHtml: els.mysteryRevealContent.innerHTML,
    actionLabel: els.mysteryAction.textContent,
  });
  playModalCardEnter(
    els.mysteryModal,
    revelation.type === 'ambush' ? 'combat' : 'calm',
  );
}

function showMysteryModal(spaceNum, onComplete) {
  closeEventModal();
  closePathModal();
  closeBossRevealModal();
  activeMystery = { spaceNum, onComplete, phase: 'roll', revelation: null };
  activeEvent = null;
  activeBoss = null;
  activeBossMinion = null;
  activeAmbush = null;

  els.mysteryModal.classList.remove('hidden');
  els.mysteryModal.classList.remove('mystery-modal--spectator');
  els.mysteryIcon.textContent = '❓';
  els.mysterySpace.textContent = `Vak ${spaceNum}`;
  els.mysteryTitle.textContent = '❓ Onbekend gevaar';
  els.mysteryFlavor.textContent = 'Gooi een D12 om te onthullen wat hier loert.';
  els.mysteryRollArea.classList.remove('hidden');
  els.mysteryRevealArea.classList.add('hidden');
  els.mysteryAction.classList.add('hidden');
  els.mysterySubmit.classList.remove('hidden');
  els.mysterySubmit.disabled = false;
  els.mysteryDiceInput.disabled = false;
  els.mysteryDiceInput.value = '';
  els.mysteryCard?.classList.remove('event-card--jackpot');
  syncModalScrollLock();

  syncModalInput('mystery', {
    name: 'Onbekend gevaar',
    icon: '❓',
    flavor: 'Gooi een D12 om te onthullen wat hier loert.',
  }, spaceNum, { submitLabel: 'Onthullen' });
  playModalCardEnter(els.mysteryModal, 'calm');

  setTimeout(() => els.mysteryDiceInput.focus(), 100);
}

function handleMysterySubmit() {
  if (!activeMystery || activeMystery.phase !== 'roll') return;
  const roll = parseDiceRoll(els.mysteryDiceInput.value, 1, 12);
  if (roll === null) {
    addLog('Vul een D12-worp in (1–12).', 'warn');
    return;
  }

  const result = game.resolveMysteryRoll(activeMystery.spaceNum, roll);
  describeEvents(result.events);
  renderBoard();
  renderPlayers();
  if (result.revelation) {
    playMysteryCellEffect(activeMystery.spaceNum, 'reveal');
    window.syncAfterAction?.();
  }

  if (!result.revelation) {
    const onDone = activeMystery.onComplete;
    closeMysteryModal();
    advanceTurn();
    window.syncAfterAction?.();
    onDone?.();
    return;
  }

  showMysteryRevealPhase(result.revelation);
}

function handleMysteryAction() {
  if (!activeMystery || activeMystery.phase !== 'reveal') return;
  const { revelation, spaceNum, onComplete } = activeMystery;

  if (revelation.type === 'path') {
    closeMysteryModal();
    showPathModal(revelation.config, spaceNum, () => {
      advanceTurn();
      onComplete?.();
    });
    return;
  }

  const player = game.currentPlayer;
  const ambushResult = game.startRevealedAmbush(player, spaceNum);
  if (!ambushResult) {
    closeMysteryModal();
    advanceTurn();
    onComplete?.();
    return;
  }

  describeEvents(ambushResult.events);
  closeMysteryModal();
  updateAmbushPanel();
  if (ambushResult.needsAmbush) {
    showAmbushModal(onComplete);
  } else {
    advanceTurn();
    onComplete?.();
  }
}

function showBossRevealRevealPhase(reveal) {
  if (!activeBossReveal) return;
  activeBossReveal.phase = 'reveal';
  activeBossReveal.reveal = reveal;

  els.bossRevealFlavor.textContent = 'Het lot is beslist:';
  els.bossRevealRollArea.classList.add('hidden');
  els.bossRevealResultArea.classList.remove('hidden');
  els.bossRevealSubmit.classList.add('hidden');
  els.bossRevealAction.classList.remove('hidden');
  els.bossRevealAction.disabled = false;
  els.bossRevealAction.textContent = 'Gevecht beginnen';
  els.bossRevealResultContent.innerHTML = buildBossRevealHtml(reveal);
  els.bossRevealCard?.classList.toggle('event-card--epic', reveal.tier === 'epic');

  const cfg = reveal.config ?? {};
  syncModalOutcome('boss-reveal', activeBossReveal.spaceNum, {
    ...serializeModalConfig(cfg),
    tier: reveal.tier ?? null,
    multiplier: reveal.multiplier ?? null,
    bossHp: reveal.bossHp ?? null,
    bossMaxHp: reveal.bossMaxHp ?? null,
    minions: reveal.minions?.map((m) => ({
      name: m.name ?? null,
      icon: m.icon ?? null,
      hp: m.hp ?? null,
      maxHp: m.maxHp ?? null,
    })) ?? null,
  }, {
    revealHtml: els.bossRevealResultContent.innerHTML,
    actionLabel: els.bossRevealAction.textContent,
  });
  playModalCardEnter(els.bossRevealModal, 'combat');
}

function showBossRevealModal(spaceNum, onComplete) {
  closeEventModal();
  closePathModal();
  closeMysteryModal();
  activeBossReveal = { spaceNum, onComplete, phase: 'roll', reveal: null };
  activeEvent = null;
  activeBoss = null;
  activeAmbush = null;

  els.bossRevealModal.classList.remove('hidden');
  els.bossRevealModal.classList.remove('boss-reveal-modal--spectator');
  els.bossRevealIcon.textContent = '⚔️';
  els.bossRevealSpace.textContent = `Vak ${spaceNum}`;
  els.bossRevealTitle.textContent = '⚔️ De eindbaas wacht';
  els.bossRevealFlavor.textContent = 'Gooi een D12 — het lot bepaalt hoe zwaar dit gevecht wordt.';
  els.bossRevealRollArea.classList.remove('hidden');
  els.bossRevealResultArea.classList.add('hidden');
  els.bossRevealAction.classList.add('hidden');
  els.bossRevealSubmit.classList.remove('hidden');
  els.bossRevealSubmit.disabled = false;
  els.bossRevealDiceInput.disabled = false;
  els.bossRevealDiceInput.value = '';
  els.bossRevealCard?.classList.remove('event-card--epic');
  syncModalScrollLock();

  syncModalInput('boss-reveal', {
    name: 'De eindbaas wacht',
    icon: '⚔️',
    flavor: 'Gooi een D12 — het lot bepaalt hoe zwaar dit gevecht wordt.',
  }, spaceNum, { submitLabel: 'Onthullen' });
  playModalCardEnter(els.bossRevealModal, 'combat');

  setTimeout(() => els.bossRevealDiceInput.focus(), 100);
}

function handleBossRevealSubmit() {
  if (!activeBossReveal || activeBossReveal.phase !== 'roll') return;
  const roll = parseDiceRoll(els.bossRevealDiceInput.value, 1, 12);
  if (roll === null) {
    addLog('Vul een D12-worp in (1–12).', 'warn');
    return;
  }

  const result = game.resolveBossReveal(activeBossReveal.spaceNum, roll);
  describeEvents(result.events);
  renderBoard();
  renderPlayers();
  updateBossPanel();

  if (!result.reveal) {
    const onDone = activeBossReveal.onComplete;
    closeBossRevealModal();
    advanceTurn();
    window.syncAfterAction?.();
    onDone?.();
    return;
  }

  showBossRevealRevealPhase(result.reveal);
}

function handleBossRevealAction() {
  if (!activeBossReveal || activeBossReveal.phase !== 'reveal') return;
  const { onComplete } = activeBossReveal;
  closeBossRevealModal();
  updateBossPanel();
  showBossFightModal(onComplete);
}
function showEventModal(config, spaceNum, onComplete) {
  closeBossRevealModal();
  activeEvent = { config, spaceNum, onComplete, submitted: false, phase: 'd20' };
  activeBoss = null;
  activeBossMinion = null;
  activeAmbush = null;

  els.eventModal.classList.remove('hidden');
  els.eventModal.classList.remove('event-modal--spectator');
  syncModalScrollLock();
  populateEventModal(config, spaceNum);
  syncModalInput('event', config, spaceNum, { submitLabel: 'Bevestigen' });
  playModalCardEnter(els.eventModal, getEventModalEnterTier(config));

  setTimeout(() => els.eventDiceInput.focus(), 100);
}

function finishEventFlow(onClose) {
  resetEventModalHostControls();
  activeCombatActionHandler = null;
  els.eventClose.classList.remove('hidden');
  els.eventSubmit.disabled = true;
  els.eventDiceInput.disabled = true;
  els.eventNat20.disabled = true;
  els.eventNat1.disabled = true;
  els.eventClose.disabled = false;
  els.eventClose.textContent = onClose?.chainLabel ?? 'Doorgaan op avontuur';
  if (activeEvent) activeEvent.onClose = onClose?.handler;
  els.eventClose.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function endEventTurn(onComplete) {
  advanceTurn();
  onComplete?.();
}

function formatEventMoveResult(result, events) {
  if (hasDeathInEvents(events)) return 'Uitgevallen — je begint opnieuw op het startvak.';

  if (result.nat1) return 'Kritiek mislukking! Beurt voorbij.';

  if (result.passTurn) return 'Mislukt — beurt voorbij.';

  const b = result.moveBreakdown;
  const steps = b?.total ?? result.moveSteps ?? 0;
  let text = `${steps} vakje(s) vooruit`;
  if (result.nat20) text += ' · Kritiek succes!';

  const p = game.currentPlayer;
  const streakBonus = getDcBonus(p);
  if (streakBonus) text += ` · volgende check +${streakBonus} DC`;
  const mod = getDcModifier(p);
  if (mod) text += ` · volgende check ${mod} DC`;

  if (result.needsEvent) text += ' · nog een event!';
  if (result.needsPath) text += result.pathConfig?.type === 'healer' ? ' · genezer!' : ' · rustig pad!';
  if (result.needsBoss) text += ' · eindbaas!';
  if (result.needsBossMinion) text += ' · beschermer!';
  if (result.needsBossReveal) text += ' · eindbaas D12!';
  if (result.needsMysteryRoll) text += ' · onbekend gevaar!';
  if (result.needsAmbush) text += ' · ambush-put!';

  return text;
}

function advanceTurn() {
  const { skippedPlayer } = game.nextTurn();
  if (skippedPlayer) {
    addLog(`${skippedPlayer} slaat een beurt over`, 'warn');
  }
  renderPlayers();
  updateTurnUI();

  const cp = game.currentPlayer;
  if (!game.gameOver && cp) {
    if (game.isCurrentPlayerInAmbush()) {
      showAmbushModal();
    } else if (game.bossActive && isOnBossArena(cp.position)) {
      showBossFightModal();
    }
  }

  window.syncAfterAction?.();
}

async function handleEventSubmit() {
  if (activeAmbush) {
    await handleAmbushSubmit();
    return;
  }
  if (activeBossMinion) {
    await handleBossMinionSubmit();
    return;
  }
  if (activeBoss) {
    await handleBossSubmit();
    return;
  }
  if (!activeEvent || activeEvent.submitted) return;

  const { config, onComplete } = activeEvent;
  const player = game.currentPlayer;
  const nat20 = els.eventNat20.checked;
  const nat1 = els.eventNat1.checked;
  const roll = parseCheckTotal(els.eventDiceInput.value);

  if (roll === null && !nat20 && !nat1) {
    els.eventResult.classList.remove('hidden');
    els.eventResult.className = 'event-card__result event-card__result--fail';
    els.eventResult.innerHTML =
      '<strong>Ongeldige worp</strong><p>Vul een worp in, of kies Kritiek succes / Kritiek mislukking.</p>';
    return;
  }

  activeEvent.submitted = true;

  const effectiveDc = getEffectiveDc(player, config.dc);
  const isNat1 = !nat20 && nat1;
  const success = !isNat1 && (nat20 || (roll !== null && roll >= effectiveDc));
  const rollLabel = nat20
    ? (roll != null ? `${roll} — Kritiek succes!` : 'Kritiek succes!')
    : isNat1
      ? (roll != null ? `${roll} — Kritiek mislukking!` : 'Kritiek mislukking!')
      : String(roll ?? '—');
  const dcDisplay = formatDcDisplay(config.dc, player);

  let result;
  try {
    result = game.resolveEvent(roll, config, { nat20, nat1 });
    describeEvents(result.events);
    await syncTokensAfterEvents(result.events);
    renderPlayers();
  } catch (err) {
    console.error(err);
    els.eventResult.className = 'event-card__result event-card__result--fail';
    els.eventResult.innerHTML = '<p>Kon het effect niet toepassen. Je kunt toch doorgaan.</p>';
    syncModalOutcome('event', activeEvent.spaceNum, config, {
      resultClassName: els.eventResult.className,
      resultHtml: els.eventResult.innerHTML,
    });
    finishEventFlow({ handler: () => endEventTurn(onComplete) });
    return;
  }

  els.eventRollArea.classList.add('is-hidden');
  els.eventCheck.classList.add('is-hidden');
  showEventOutcomeInHeader(success, config);
  els.eventResult.classList.remove('hidden');
  setEventResultClass(success, result.events);
  const hpHtml = buildResultHpHtml(result.events, game.currentPlayer);

  els.eventResult.innerHTML = `
    <div class="result-roll">🎲 ${rollLabel}</div>
    <div class="result-vs">vs DC ${dcDisplay}</div>
    <p class="result-effect">${formatEventMoveResult(result, result.events)}</p>
    ${hpHtml}
  `;

  syncModalOutcome('event', activeEvent.spaceNum, config, {
    headerMode: 'outcome',
    success,
    resultClassName: els.eventResult.className,
    resultHtml: els.eventResult.innerHTML,
  });

  if (result.winner) {
    finishEventFlow({ handler: () => showWinModal(result.winner) });
    return;
  }

  if (result.needsEvent && result.eventConfig) {
    const nextSpace = game.currentPlayer?.position;
    finishEventFlow({
      chainLabel: 'Volgend event →',
      handler: () => {
        closeEventModal();
        showEventModal(result.eventConfig, nextSpace, onComplete);
      },
    });
    return;
  }

  if (result.needsPath && result.pathConfig) {
    const nextSpace = game.currentPlayer?.position;
    const visitEvent = result.events.find((e) => e.type === 'healer-visit' || e.type === 'path');
    finishEventFlow({
      chainLabel: result.pathConfig.type === 'healer' ? 'Genezer →' : 'Rustig pad →',
      handler: () => {
        closeEventModal();
        if (result.pathConfig.type === 'healer') {
          showHealerModal(result.pathConfig, nextSpace, visitEvent, () => endEventTurn(onComplete));
        } else {
          showPathModal(result.pathConfig, nextSpace, () => endEventTurn(onComplete));
        }
      },
    });
    return;
  }

  if (result.needsMysteryRoll) {
    const nextSpace = result.mysterySpaceNum ?? game.currentPlayer?.position;
    finishEventFlow({
      chainLabel: 'Onbekend gevaar →',
      handler: () => {
        closeEventModal();
        showMysteryModal(nextSpace, onComplete);
      },
    });
    return;
  }

  if (result.needsAmbush) {
    finishEventFlow({
      chainLabel: 'Ambush-put →',
      handler: () => {
        closeEventModal();
        updateAmbushPanel();
        showAmbushModal(onComplete);
      },
    });
    return;
  }

  if (result.needsBossReveal) {
    const nextSpace = result.bossRevealSpaceNum ?? game.currentPlayer?.position;
    finishEventFlow({
      chainLabel: 'Eindbaas D12 →',
      handler: () => {
        closeEventModal();
        showBossRevealModal(nextSpace, onComplete);
      },
    });
    return;
  }

  if (result.needsBossMinion) {
    finishEventFlow({
      chainLabel: 'Beschermer →',
      handler: () => {
        closeEventModal();
        updateBossPanel();
        showBossMinionModal(onComplete);
      },
    });
    return;
  }

  if (result.needsBoss) {
    finishEventFlow({
      chainLabel: 'Eindbaas →',
      handler: () => {
        closeEventModal();
        updateBossPanel();
        showBossFightModal(onComplete);
      },
    });
    return;
  }

  finishEventFlow({ handler: () => endEventTurn(onComplete) });
}
function showWinModal(winner) {
  els.winModal.classList.remove('hidden');
  els.winModal.classList.remove('win-modal--spectator');
  syncModalScrollLock();
  els.winTitle.textContent = '🏆 Overwinning!';
  els.winText.textContent = `${winner.name} heeft de Draken-schat bereikt en wint het avontuur!`;
  playModalCardEnter(els.winModal, 'win');
  setSyncedActiveModal({
    type: 'win',
    phase: 'outcome',
    spaceNum: null,
    config: null,
    outcome: {
      title: '🏆 Overwinning!',
      text: `${winner.name} heeft de Draken-schat bereikt en wint het avontuur!`,
    },
  });
}
