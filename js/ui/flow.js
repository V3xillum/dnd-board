/**
 * Turn flow: advanceTurn, continueAfterLand, handleMoveResult, remote refresh.
 * Vereist: modals/events, board, players, tokens, log
 */
function continueAfterLand(result, onComplete) {
  if (result.winner) {
    showWinModal(result.winner);
    return;
  }

  if (result.needsMysteryRoll) {
    const spaceNum = result.mysterySpaceNum ?? game.currentPlayer?.position;
    showMysteryModal(spaceNum, onComplete);
    return;
  }

  if (result.needsAmbush) {
    updateAmbushPanel();
    showAmbushModal(onComplete);
    return;
  }

  if (result.needsBossReveal) {
    const spaceNum = result.bossRevealSpaceNum ?? game.currentPlayer?.position;
    showBossRevealModal(spaceNum, onComplete);
    return;
  }

  if (result.needsBossMinion) {
    updateBossPanel();
    showBossMinionModal(onComplete);
    return;
  }

  if (result.needsBoss) {
    updateBossPanel();
    showBossFightModal(onComplete);
    return;
  }

  if (result.needsEvent && result.eventConfig) {
    const spaceNum = result.events.find((e) => e.type === 'landed')?.spaceNum
      ?? game.currentPlayer?.position;
    showEventModal(result.eventConfig, spaceNum, onComplete);
    return;
  }

  if (result.needsPath && result.pathConfig) {
    const visitEvent = result.events.find((e) => e.type === 'healer-visit' || e.type === 'path');
    const spaceNum = visitEvent?.spaceNum ?? game.currentPlayer?.position;
    const onDone = onComplete ?? (() => {
      advanceTurn();
    });
    if (result.pathConfig.type === 'healer') {
      showHealerModal(result.pathConfig, spaceNum, visitEvent, onDone);
    } else {
      showPathModal(result.pathConfig, spaceNum, onDone);
    }
    return;
  }

  if (onComplete) {
    onComplete();
    return;
  }

  advanceTurn();
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
async function handleMoveResult(result) {
  describeEvents(result.events);
  await syncTokensAfterEvents(result.events);
  renderPlayers();
  continueAfterLand(result);
}
function clearDiceInput() {
  els.diceInput.value = '';
  els.diceInput.focus();
}
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
}
