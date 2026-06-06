/**
 * Event listeners, window exports, pagina-init.
 * Laadt als laatste UI-module.
 */
els.eventNat20.addEventListener('change', () => {
  if (els.eventNat20.checked) els.eventNat1.checked = false;
});
els.eventNat1.addEventListener('change', () => {
  if (els.eventNat1.checked) els.eventNat20.checked = false;
});

els.eventSubmit.addEventListener('click', handleEventSubmit);
els.eventCombatAction?.addEventListener('click', async () => {
  if (els.eventCombatAction.disabled) return;
  const handler = activeCombatActionHandler;
  if (!handler) return;
  els.eventCombatAction.disabled = true;
  activeCombatActionHandler = null;
  try {
    await handler();
  } catch (err) {
    console.error(err);
    els.eventCombatAction.disabled = false;
    activeCombatActionHandler = handler;
  }
});
els.eventDiceInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleEventSubmit();
});
els.eventClose.addEventListener('click', async () => {
  if (activeCombatActionHandler && (activeAmbush || activeBossMinion || activeBoss)) {
    const handler = activeCombatActionHandler;
    els.eventClose.disabled = true;
    activeCombatActionHandler = null;
    try {
      await handler();
    } catch (err) {
      console.error(err);
      activeCombatActionHandler = handler;
      els.eventClose.disabled = false;
    }
    return;
  }
  if (els.eventClose.disabled) return;
  const handler = activeAmbush?.onClose ?? activeBossMinion?.onClose ?? activeBoss?.onClose ?? activeEvent?.onClose;
  closeEventModal();
  handler?.();
});

els.pathClose.addEventListener('click', closePathModal);
els.pathClose.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !els.pathModal.classList.contains('hidden')) closePathModal();
});

els.mysterySubmit.addEventListener('click', handleMysterySubmit);
els.mysteryDiceInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleMysterySubmit();
});
els.mysteryAction.addEventListener('click', handleMysteryAction);

els.bossRevealSubmit.addEventListener('click', handleBossRevealSubmit);
els.bossRevealDiceInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleBossRevealSubmit();
});
els.bossRevealAction.addEventListener('click', handleBossRevealAction);
els.addBtn.addEventListener('click', () => {
  const name = els.playerName.value.trim();
  if (!name) return;
  if (game.players.length >= window.GAME_SETTINGS.player.maxPlayers) {
    addLog('Maximaal 8 spelers!', 'warn');
    return;
  }

  game.addPlayer(name, COLORS[game.players.length % COLORS.length]);
  els.playerName.value = '';
  renderBoard();
  renderPlayers();
  addLog(`${name} voegt zich bij het avontuur!`);
  window.syncAfterAction?.();
});

els.playerName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') els.addBtn.click();
});

els.difficultySelect?.addEventListener('change', () => {
  setDifficultyLevel(els.difficultySelect.value);
});

function clearDiceInput() {
  els.diceInput.value = '';
  els.diceInput.focus();
}

els.moveBtn.addEventListener('click', async () => {
  if (game.needsDeathReturnRoll(game.currentPlayer)) {
    addLog('Gooi eerst je D4 second chance.', 'warn');
    return;
  }

  const steps = parse2d6Total(els.diceInput.value);
  if (steps === null) {
    addLog('Vul het totaal van 2× D6 in (2–12).', 'warn');
    return;
  }

  const result = game.pendingEventBonusMove
    ? game.moveAfterEventBonus(steps)
    : game.move(steps);
  await handleMoveResult(result);
  clearDiceInput();
});

els.diceInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') els.moveBtn.click();
});

function handleShortRest() {
  const player = game.currentPlayer;
  if (!player || game.gameOver) return;
  if (game.needsDeathReturnRoll(player)) {
    addLog('Gooi eerst je D4 second chance.', 'warn');
    return;
  }

  const roll = parseDiceRoll(els.shortRestD4Input.value, 1, 4);
  if (roll === null) {
    addLog('Vul een D4-worp in (1–4).', 'warn');
    return;
  }

  const result = game.takeShortRest(player, roll);
  if (!result.valid) {
    addLog('Korte rust is nu niet mogelijk.', 'warn');
    return;
  }

  describeEvents(result.events);
  renderPlayers();
  updateTurnUI();
  els.shortRestD4Input.value = '';
  advanceTurn();
}

function handleLongRest() {
  const player = game.currentPlayer;
  if (!player || game.gameOver) return;
  if (game.needsDeathReturnRoll(player)) {
    addLog('Gooi eerst je D4 second chance.', 'warn');
    return;
  }

  const result = game.takeLongRest(player);
  if (!result.valid) {
    addLog('Lange rust is nu niet mogelijk.', 'warn');
    return;
  }

  describeEvents(result.events);
  renderPlayers();
  updateTurnUI();
  advanceTurn();
}

els.shortRestBtn?.addEventListener('click', handleShortRest);
els.longRestBtn?.addEventListener('click', handleLongRest);
els.shortRestD4Input?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleShortRest();
});

async function handleDeathReturnRoll() {
  const player = game.currentPlayer;
  if (!player || game.gameOver) return;

  const roll = parseDiceRoll(els.deathReturnD4Input?.value, 1, 4);
  if (roll === null) {
    addLog('Vul een D4-worp in (1–4).', 'warn');
    return;
  }

  const result = game.resolveDeathReturnRoll(player, roll);
  if (!result.valid) {
    addLog('Second chance is nu niet mogelijk.', 'warn');
    return;
  }

  describeEvents(result.events);
  await syncTokensAfterEvents(result.events);
  renderBoard();
  renderPlayers();
  updateTurnUI();
  if (els.deathReturnD4Input) els.deathReturnD4Input.value = '';

  showDeathReturnModal(result, () => {
    if (result.needsAmbush) {
      continueAfterLand(result);
    } else {
      window.syncAfterAction?.();
      els.diceInput?.focus();
    }
  });
}

els.deathReturnBtn?.addEventListener('click', handleDeathReturnRoll);
els.deathReturnD4Input?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleDeathReturnRoll();
});

els.hpMinusBtn.addEventListener('click', () => adjustCurrentPlayerHp(-1));
els.hpPlusBtn.addEventListener('click', () => adjustCurrentPlayerHp(1));

els.rulesOpenBtn?.addEventListener('click', showRulesModal);
els.legendRulesLink?.addEventListener('click', showRulesModal);
els.rulesCloseBtn?.addEventListener('click', closeRulesModal);
els.rulesCloseBottom?.addEventListener('click', closeRulesModal);
els.rulesModal?.addEventListener('click', (e) => {
  if (e.target === els.rulesModal) closeRulesModal();
});

els.newAdventureBtn?.addEventListener('click', showNewAdventureConfirm);
els.confirmCancel?.addEventListener('click', closeNewAdventureConfirm);
els.confirmOk?.addEventListener('click', () => {
  closeNewAdventureConfirm();
  startNewAdventure();
});
els.confirmModal?.addEventListener('click', (e) => {
  if (e.target === els.confirmModal) closeNewAdventureConfirm();
});

els.winClose.addEventListener('click', startNewAdventure);

window.getGame = () => game;
window.getActiveModal = () => syncedActiveModal;
window.renderSpectatorModal = renderSpectatorModal;
window.resyncActiveModalIfOpen = () => {
  if (syncedActiveModal) {
    window.syncActiveModal?.(syncedActiveModal);
    if (window.isMultiplayerHost?.()) window.syncAfterAction?.();
  }
};
window.refreshGameUI = () => {
  renderBoard();
  renderPlayers();
  updateCombatRail();
  updateDifficultyUI();
};

async function refreshGameUIFromRemote({ prevPositions, prevSpecialSpaces, isGuest = false } = {}) {
  renderBoard();

  if (prevSpecialSpaces) {
    playMysteryCellChanges(detectMysteryCellChanges(prevSpecialSpaces, snapshotSpecialSpaces()));
  }

  const shouldAnimate = isGuest
    && hasTokenPositionChanges(prevPositions)
    && !isLikelyGameReset(prevPositions);

  if (shouldAnimate) {
    repositionTokensToSnapshot(prevPositions);
    await animateFromPositionDiff(prevPositions);
  }

  renderTokens();
  renderPlayers();
  updateCombatRail();
  updateDifficultyUI();
  updateTurnUI();
}

window.refreshGameUIFromRemote = refreshGameUIFromRemote;
window.snapshotSpecialSpaces = snapshotSpecialSpaces;
window.setMultiplayerReadOnly = (readOnly) => {
  document.querySelector('.app')?.classList.toggle('app--spectator', readOnly);
  els.playerName.disabled = readOnly;
  els.addBtn.disabled = readOnly;
  if (els.difficultySelect) els.difficultySelect.disabled = readOnly;
  if (els.newAdventureBtn) els.newAdventureBtn.disabled = readOnly;
  updateTurnUI();
  if (readOnly) {
    els.moveBtn.disabled = true;
    els.diceInput.disabled = true;
    els.hpMinusBtn.disabled = true;
    els.hpPlusBtn.disabled = true;
    if (els.shortRestBtn) els.shortRestBtn.disabled = true;
    if (els.longRestBtn) els.longRestBtn.disabled = true;
    if (els.shortRestD4Input) els.shortRestD4Input.disabled = true;
    if (els.deathReturnBtn) els.deathReturnBtn.disabled = true;
    if (els.deathReturnD4Input) els.deathReturnD4Input.disabled = true;
  }
};

updateDifficultyUI();
renderBoard();
renderPlayers();
window.initMultiplayer?.();
