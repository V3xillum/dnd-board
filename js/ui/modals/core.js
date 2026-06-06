/**
 * Modal shell: scroll lock, enter animaties, spectator sync, serialize.
 * Vereist: dom, state, board (playMysteryResetFromEvents), players (updateTokenTurnStates)
 */
function syncModalScrollLock() {
  const open =
    !els.eventModal.classList.contains('hidden') ||
    !els.pathModal.classList.contains('hidden') ||
    !els.mysteryModal.classList.contains('hidden') ||
    !els.bossRevealModal.classList.contains('hidden') ||
    !els.winModal.classList.contains('hidden') ||
    (els.confirmModal && !els.confirmModal.classList.contains('hidden')) ||
    (els.rulesModal && !els.rulesModal.classList.contains('hidden'));
  document.body.classList.toggle('modal-open', open);
  updateTokenTurnStates();
}

const MODAL_ENTER_CLASSES = [
  'event-card--enter-calm',
  'event-card--enter-combat',
  'event-card--enter-win',
  'event-modal__stack--enter-calm',
  'event-modal__stack--enter-combat',
];

const COMBAT_EVENT_CATEGORIES = new Set(['combat', 'trap']);

function getEventModalEnterTier(config) {
  if (!config) return 'calm';
  return COMBAT_EVENT_CATEGORIES.has(config.category) ? 'combat' : 'calm';
}

function playModalCardEnter(modalEl, tier = 'calm') {
  if (!modalEl) return;

  const stack = modalEl.querySelector('.event-modal__stack');
  const card = modalEl.querySelector('.event-card');
  const target = stack || card;
  if (!target) return;

  target.classList.remove(...MODAL_ENTER_CLASSES);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const enterClass = tier === 'combat'
    ? (stack ? 'event-modal__stack--enter-combat' : 'event-card--enter-combat')
    : tier === 'win'
      ? 'event-card--enter-win'
      : (stack ? 'event-modal__stack--enter-calm' : 'event-card--enter-calm');

  void target.offsetWidth;
  target.classList.add(enterClass);

  const onEnd = (e) => {
    if (e.target !== target) return;
    target.classList.remove(enterClass);
    target.removeEventListener('animationend', onEnd);
  };
  target.addEventListener('animationend', onEnd);
}

let lastSpectatorModalAnimKey = null;

function spectatorModalAnimKey(activeModal) {
  if (!activeModal) return null;
  const { type, phase, spaceNum, outcome } = activeModal;
  const roll = outcome?.roll ?? '';
  return `${type}|${phase ?? ''}|${spaceNum ?? ''}|${roll}`;
}

function playSpectatorModalEnter(modalEl, tier, activeModal) {
  const key = spectatorModalAnimKey(activeModal);
  if (key === lastSpectatorModalAnimKey) return;
  lastSpectatorModalAnimKey = key;
  playModalCardEnter(modalEl, tier);
}

function showRulesModal() {
  if (!els.rulesModal) return;
  els.rulesModal.classList.remove('hidden');
  syncModalScrollLock();
  els.rulesCloseBtn?.focus();
}

function closeRulesModal() {
  if (!els.rulesModal) return;
  els.rulesModal.classList.add('hidden');
  syncModalScrollLock();
}

function forceCloseAllModals() {
  els.winModal.classList.add('hidden');
  els.winModal.classList.remove('win-modal--spectator');

  els.eventModal.classList.add('hidden');
  els.eventModal.classList.remove('event-modal--spectator');
  activeEvent = null;
  activeBoss = null;
  activeBossMinion = null;
  activeAmbush = null;
  els.eventCard?.classList.remove('event-card--ambush');
  removeAmbushModalExtras();

  els.pathModal.classList.add('hidden');
  els.pathModal.classList.remove('path-modal--spectator');
  pathModalCallback = null;
  pathModalSpaceNum = null;
  pathModalSkipMysteryReset = false;

  els.mysteryModal.classList.add('hidden');
  els.mysteryModal.classList.remove('mystery-modal--spectator');
  els.mysteryCard?.classList.remove('event-card--jackpot');
  activeMystery = null;

  els.bossRevealModal.classList.add('hidden');
  els.bossRevealModal.classList.remove('boss-reveal-modal--spectator');
  els.bossRevealCard?.classList.remove('event-card--epic');
  activeBossReveal = null;

  els.confirmModal?.classList.add('hidden');
  closeRulesModal();
  clearSyncedActiveModal();
  syncModalScrollLock();
}

function startNewAdventure() {
  forceCloseAllModals();
  game.reset();
  if (typeof rebuildBoard === 'function') rebuildBoard();
  els.gameLog.innerHTML = '';
  updateBossPanel();
  updateAmbushPanel();
  renderBoard();
  renderPlayers();
  updateTurnUI();
  updateDifficultyUI();
  addLog('Nieuw avontuur — het bord is opnieuw geschud!');
  window.syncAfterAction?.();
  window.resetMultiplayerLog?.();
}

function showNewAdventureConfirm() {
  if (document.querySelector('.app')?.classList.contains('app--spectator')) return;
  els.confirmModal?.classList.remove('hidden');
  syncModalScrollLock();
  playModalCardEnter(els.confirmModal, 'calm');
  els.confirmCancel?.focus();
}

function closeNewAdventureConfirm() {
  els.confirmModal?.classList.add('hidden');
  syncModalScrollLock();
  els.newAdventureBtn?.focus();
}
function serializeModalConfig(config) {
  if (!config) return null;
  const out = {
    name: config.name ?? null,
    icon: config.icon ?? null,
    flavor: config.flavor ?? null,
  };
  if (config.ability != null) out.ability = config.ability;
  if (config.dc != null) out.dc = config.dc;
  if (config.attackBonus != null) out.attackBonus = config.attackBonus;
  if (config.dmg != null) out.dmg = config.dmg;
  if (config.specialAttack) {
    out.specialAttack = { ...config.specialAttack };
  }
  if (config.successText != null) out.successText = config.successText;
  if (config.failText != null) out.failText = config.failText;
  if (config.revealType != null) out.revealType = config.revealType;
  if (config.multiplier != null) out.multiplier = config.multiplier;
  if (config.jackpot != null) out.jackpot = config.jackpot;
  if (config.ambushHp != null) out.ambushHp = config.ambushHp;
  if (config.tier != null) out.tier = config.tier;
  if (config.bossHp != null) out.bossHp = config.bossHp;
  if (config.bossMaxHp != null) out.bossMaxHp = config.bossMaxHp;
  if (config.splash != null) out.splash = config.splash;
  if (Array.isArray(config.minions) && config.minions.length > 0) {
    out.minions = config.minions.map((m) => ({
      name: m.name ?? null,
      icon: m.icon ?? null,
      hp: m.hp ?? null,
      maxHp: m.maxHp ?? null,
    }));
  }
  return out;
}

function setSyncedActiveModal(modal) {
  syncedActiveModal = modal;
  window.syncActiveModal?.(modal);
  window.syncAfterAction?.();
}

function clearSyncedActiveModal() {
  syncedActiveModal = null;
  window.syncActiveModal?.(null);
  window.syncAfterAction?.();
}

function resetEventModalHostControls() {
  els.eventModal.classList.remove('event-modal--spectator');
  els.eventClose.classList.remove('is-hidden');
  els.eventClose.classList.remove('hidden');
  els.eventSubmit.classList.remove('is-hidden');
  els.eventCombatAction?.classList.add('hidden');
  activeCombatActionHandler = null;
}


function syncModalInput(type, config, spaceNum, options = {}) {
  setSyncedActiveModal({
    type,
    phase: 'input',
    spaceNum: spaceNum ?? null,
    config: serializeModalConfig(config),
    submitLabel: options.submitLabel || 'Bevestigen',
  });
}

function syncModalOutcome(type, spaceNum, config, outcome) {
  setSyncedActiveModal({
    type,
    phase: 'outcome',
    spaceNum: spaceNum ?? null,
    config: serializeModalConfig(config),
    outcome,
  });
}

function closeSpectatorModals() {
  lastSpectatorModalAnimKey = null;
  hideSplashLayer?.();
  clearModalSplashClasses?.();
  els.eventModal.classList.add('hidden');
  els.eventModal.classList.remove('event-modal--spectator', 'event-modal--over-splash');
  els.pathModal.classList.add('hidden');
  els.pathModal.classList.remove('path-modal--spectator');
  els.mysteryModal.classList.add('hidden');
  els.mysteryModal.classList.remove('mystery-modal--spectator');
  els.mysteryCard?.classList.remove('event-card--jackpot');
  els.bossRevealModal.classList.add('hidden');
  els.bossRevealModal.classList.remove('boss-reveal-modal--spectator', 'event-modal--over-splash');
  els.bossRevealCard?.classList.remove('event-card--epic');
  els.winModal.classList.add('hidden');
  els.winModal.classList.remove('win-modal--spectator');
  syncModalScrollLock();
}

function populateSpectatorCombatModal(type, config, spaceNum) {
  const player = game.currentPlayer;
  updateEventModalTurnPlayer();
  removeCombatHpBars();
  removeAmbushModalExtras();
  els.eventCard?.classList.remove('event-card--ambush');

  if (type === 'ambush') {
    const pit = game.getCurrentPlayerPit();
    if (pit && player) {
      els.eventCard?.classList.add('event-card--ambush');
      els.eventCard?.style.setProperty('--ambush-fighter-color', player.color);
      els.eventIcon.textContent = config.icon || '🕳️';
      els.eventSpace.textContent = `Vak ${spaceNum ?? player.position}`;
      els.eventTitle.textContent = config.name;
      els.eventTitle.className = 'event-card__title';
      els.eventFlavor.textContent = config.flavor;
      els.eventFlavor.className = 'event-card__flavor';
      els.eventCheck.insertAdjacentHTML('afterbegin', ambushFighterPanelHtml(player, pit));
      setEventCheckForCombat(config, player);
      els.eventCheck.insertAdjacentHTML('beforeend', ambushHpBarHtml());
    }
  } else if (type === 'boss-minion') {
    const minion = game.getActiveBossMinion?.();
    if (player && minion) {
      els.eventCard?.classList.add('event-card--ambush');
      els.eventCard?.style.setProperty('--ambush-fighter-color', player.color);
      els.eventCheck.insertAdjacentHTML('afterbegin', combatFighterPanelHtml(player, minionFighterNote(player)));
      els.eventCheck.insertAdjacentHTML('beforeend', bossMinionHpBarHtml(minion));
    }
    els.eventIcon.textContent = config.icon || '👹';
    els.eventSpace.textContent = `Vak ${spaceNum ?? player?.position ?? '62 / 63'}`;
    els.eventTitle.textContent = config.name;
    els.eventTitle.className = 'event-card__title';
    els.eventFlavor.textContent = config.flavor;
    els.eventFlavor.className = 'event-card__flavor';
    setEventCheckForCombat(config, player);
  } else if (type === 'boss') {
    if (player) {
      els.eventCard?.classList.add('event-card--boss');
      els.eventCard?.style.setProperty('--boss-fighter-color', player.color);
      els.eventCheck.insertAdjacentHTML('afterbegin', combatFighterPanelHtml(player, bossFighterNote(player)));
    }
    els.eventIcon.textContent = config.icon || '🛡️';
    els.eventSpace.textContent = 'Eindbaas';
    els.eventTitle.textContent = `⚔️ ${config.name}`;
    els.eventTitle.className = 'event-card__title';
    els.eventFlavor.textContent = config.flavor;
    els.eventFlavor.className = 'event-card__flavor';
    setEventCheckForCombat(config, player);
    els.eventCheck.insertAdjacentHTML('beforeend', bossHpBarHtml());
  } else {
    els.eventIcon.textContent = config.icon || '🎲';
    els.eventSpace.textContent = `Vak ${spaceNum ?? '?'}`;
    resetEventHeader(config);
    els.eventAbility.textContent = config.ability;
    els.eventDc.textContent = formatDcDisplay(config.dc, player);
  }
}

function renderSpectatorModal(activeModal) {
  if (window.isMultiplayerHost?.()) return;

  closeSpectatorModals();
  if (!activeModal) return;

  const { type, phase, config, spaceNum, outcome } = activeModal;

  if (type === 'mystery') {
    els.mysteryModal.classList.add('mystery-modal--spectator');
    els.mysteryModal.classList.remove('hidden');
    els.mysteryIcon.textContent = config?.icon || '❓';
    els.mysterySpace.textContent = `Vak ${spaceNum ?? '?'}`;
    els.mysteryTitle.textContent = '❓ Onbekend gevaar';

    if (phase === 'input') {
      els.mysteryFlavor.textContent = config?.flavor || 'Gooi een D12 om te onthullen wat hier loert.';
      els.mysteryRollArea.classList.remove('hidden');
      els.mysteryRevealArea.classList.add('hidden');
      els.mysterySubmit.classList.add('hidden');
      els.mysteryAction.classList.add('hidden');
      els.mysteryDiceInput.disabled = true;
    } else if (phase === 'outcome' && outcome) {
      els.mysteryFlavor.textContent = 'Dit loerde achter het vraagteken:';
      els.mysteryRollArea.classList.add('hidden');
      els.mysteryRevealArea.classList.remove('hidden');
      els.mysterySubmit.classList.add('hidden');
      els.mysteryAction.classList.remove('hidden');
      els.mysteryAction.textContent = outcome.actionLabel || 'Verder';
      els.mysteryAction.disabled = true;
      els.mysteryRevealContent.innerHTML = outcome.revealHtml || '';
      els.mysteryCard?.classList.toggle('event-card--jackpot', Boolean(config?.jackpot));
    }

    playSpectatorModalEnter(
      els.mysteryModal,
      phase === 'outcome' && config?.revealType === 'ambush' ? 'combat' : 'calm',
      activeModal,
    );
    syncModalScrollLock();
    return;
  }

  if (type === 'boss-reveal') {
    els.bossRevealModal.classList.add('boss-reveal-modal--spectator');
    els.bossRevealIcon.textContent = config?.icon || '⚔️';
    els.bossRevealSpace.textContent = `Vak ${spaceNum ?? '?'}`;
    els.bossRevealTitle.textContent = '⚔️ De eindbaas wacht';

    if (phase === 'input') {
      syncSpectatorSplash?.(null, 'boss-reveal-input');
      els.bossRevealModal.classList.remove('event-modal--over-splash');
      els.bossRevealModal.classList.remove('hidden');
      els.bossRevealFlavor.textContent = config?.flavor
        || 'Gooi een D12 — het lot bepaalt hoe zwaar dit gevecht wordt.';
      els.bossRevealRollArea.classList.remove('hidden');
      els.bossRevealResultArea.classList.add('hidden');
      els.bossRevealSubmit.classList.add('hidden');
      els.bossRevealAction.classList.add('hidden');
      els.bossRevealDiceInput.disabled = true;
    } else if (phase === 'outcome' && outcome) {
      syncSpectatorSplash?.(null, `boss-reveal-outcome|${spaceNum}`);
      els.bossRevealModal.classList.remove('event-modal--over-splash');
      els.bossRevealModal.classList.remove('hidden');
      els.bossRevealFlavor.textContent = 'Het lot is beslist:';
      els.bossRevealRollArea.classList.add('hidden');
      els.bossRevealResultArea.classList.remove('hidden');
      els.bossRevealSubmit.classList.add('hidden');
      els.bossRevealAction.classList.remove('hidden');
      els.bossRevealAction.textContent = outcome.actionLabel || 'Gevecht beginnen';
      els.bossRevealAction.disabled = true;
      els.bossRevealResultContent.innerHTML = outcome.revealHtml || '';
      els.bossRevealCard?.classList.toggle('event-card--epic', config?.tier === 'epic');
    }

    playSpectatorModalEnter(els.bossRevealModal, 'combat', activeModal);
    syncModalScrollLock();
    return;
  }

  if (type === 'path' || type === 'healer' || type === 'death-return') {
    els.pathIcon.textContent = config?.icon || (type === 'healer' ? '✨' : type === 'death-return' ? '🎲' : '🚶');
    const badgeRoll = type === 'death-return' && activeModal?.outcome?.roll != null
      ? `D4: ${activeModal.outcome.roll} · `
      : '';
    els.pathSpace.textContent = type === 'death-return'
      ? `${badgeRoll}vak ${spaceNum ?? '?'}`
      : `Vak ${spaceNum ?? '?'}`;
    els.pathTitle.textContent = config?.name || '';
    els.pathFlavor.textContent = config?.flavor || '';
    if (els.pathTag) {
      if (type === 'death-return') {
        els.pathTag.textContent = activeModal?.outcome?.tag ?? 'Second chance';
      } else {
        els.pathTag.textContent = type === 'healer' ? 'Genezer' : 'Rustig pad';
      }
    }
    if (els.pathNote) {
      if (type === 'death-return') {
        els.pathNote.textContent = activeModal?.outcome?.note ?? '';
      } else {
        const healInfo = activeModal?.outcome?.healInfo;
        els.pathNote.textContent = type === 'healer'
          ? (healInfo?.healed
            ? `Hersteld: ${healInfo.from} → ${healInfo.to} HP`
            : 'Al vol HP')
          : 'Geen ability check — even ademhalen en doorlopen.';
      }
    }
    els.pathModal.classList.add('path-modal--spectator');
    els.pathModal.classList.remove('hidden');
    if (els.pathClose && type === 'death-return') {
      els.pathClose.textContent = activeModal?.outcome?.closeLabel ?? 'Verder';
      els.pathClose.disabled = true;
    }
    playSpectatorModalEnter(els.pathModal, 'calm', activeModal);
    syncModalScrollLock();
    return;
  }

  if (type === 'win') {
    els.winTitle.textContent = outcome?.title ?? '🏆 Overwinning!';
    els.winText.textContent = outcome?.text ?? '';
    els.winModal.classList.add('win-modal--spectator');
    els.winModal.classList.remove('hidden');
    playSpectatorModalEnter(els.winModal, 'win', activeModal);
    syncModalScrollLock();
    return;
  }

  if (!config) return;

  if (type === 'boss' && phase === 'input') {
    const bossUrl = getBossSplashUrl?.(config);
    syncSpectatorSplash?.(bossUrl, `boss-fight|${spaceNum}|${config?.name ?? ''}`);
    els.eventModal.classList.add('event-modal--over-splash');
  } else if (type === 'boss-minion' || type === 'ambush') {
    syncSpectatorSplash?.(null, `${type}|${spaceNum}`);
    els.eventModal.classList.remove('event-modal--over-splash');
  }

  populateSpectatorCombatModal(type, config, spaceNum);
  els.eventModal.classList.add('event-modal--spectator');
  resetCombatModalPhases();
  els.eventRollArea.classList.add('is-hidden');
  els.eventNat20.disabled = true;
  els.eventNat1.disabled = true;
  els.eventDiceInput.disabled = true;

  const combatPhase = activeModal.combatPhase ?? 'player-roll';
  const isCombat = type === 'ambush' || type === 'boss' || type === 'boss-minion';

  if (phase === 'input') {
    els.eventCheck.classList.remove('is-hidden');
    els.eventResult.classList.remove('hidden');
    els.eventResult.className = 'event-card__result';
    if (isCombat && combatPhase === 'enemy-hit' && activeModal.enemyRoll) {
      const bonus = activeModal.enemyRoll.attackBonus ?? config.attackBonus ?? 3;
      if (els.eventEnemyRollLabel) {
        els.eventEnemyRollLabel.textContent = `Vijand-aanval (+${bonus} to hit)`;
      }
      els.eventEnemyRollDisplay.textContent = buildEnemyRollDisplay(activeModal.enemyRoll);
      els.eventEnemyRoll.classList.remove('hidden');
      els.eventResult.innerHTML = '<p class="spectator-wait">Host beslist hit of miss (vijand)…</p>';
    } else if (isCombat && combatPhase === 'special-save') {
      els.eventSpecialSave.classList.remove('hidden');
      const special = activeModal.specialAttack ?? config.specialAttack;
      els.eventSpecialSaveTitle.textContent = `⚡ ${special?.name ?? 'Special attack'}!`;
      els.eventSpecialSaveFlavor.textContent =
        `${special?.saveAbility ?? 'Save'} save vs DC ${special?.dc ?? '?'}`;
      els.eventSpecialSaveInput.disabled = true;
      els.eventSpecialSaveSubmit.classList.add('hidden');
      els.eventResult.innerHTML = '<p class="spectator-wait">Speler rolt saving throw…</p>';
    } else if (isCombat && combatPhase === 'player-hit') {
      els.eventResult.innerHTML = '<p class="spectator-wait">Host beslist hit of miss (speler)…</p>';
    } else {
      els.eventResult.innerHTML = '<p class="spectator-wait">Host voert het gevecht uit…</p>';
    }
  } else if (phase === 'outcome' && outcome) {
    if (outcome.headerMode === 'outcome') {
      showEventOutcomeInHeader(outcome.success, config);
    } else {
      els.eventTitle.textContent = outcome.title ?? config.name;
      els.eventTitle.className = outcome.titleClass ?? 'event-card__title';
      els.eventFlavor.textContent = outcome.flavor ?? '';
      els.eventFlavor.className = outcome.flavorClass ?? 'event-card__flavor';
    }
    els.eventCheck.classList.add('is-hidden');
    els.eventResult.classList.remove('hidden');
    els.eventResult.className = outcome.resultClassName ?? 'event-card__result';
    els.eventResult.innerHTML = outcome.resultHtml ?? '';
  }

  els.eventModal.classList.remove('hidden');
  playSpectatorModalEnter(
    els.eventModal,
    type === 'ambush' || type === 'boss' || type === 'boss-minion'
      ? 'combat'
      : getEventModalEnterTier(config),
    activeModal,
  );
  syncModalScrollLock();
}

function removeCombatHpBars() {
  els.eventCheck.querySelector('.event-card__boss-hp')?.remove();
}

function removeAmbushModalExtras() {
  els.eventCheck.querySelector('.event-card__combat-fighter-wrap')?.remove();
  els.eventCard?.style.removeProperty('--ambush-fighter-color');
  els.eventCard?.style.removeProperty('--boss-fighter-color');
  els.eventCard?.classList.remove('event-card--ambush', 'event-card--boss');
}
