/**
 * Combat modal flow: fases, finishCombatRound, enemy hit/miss, special save.
 * Vereist: els, game (ui/dom.js), state (ui/state.js), tokens, log, modal sync (ui/modals/core.js)
 */

function createCombatFlowState(onComplete, combatConfig = null, spaceNum = null, minionIndex = null) {
  const wasMysteryAmbush = spaceNum != null && game.revealedSpaces[spaceNum]?.type === 'ambush';
  return {
    onComplete,
    combatConfig,
    spaceNum,
    minionIndex,
    wasMysteryAmbush,
    phase: 'player-roll',
    pendingEvents: [],
    eventsAppliedCount: 0,
    roll: null,
    nat20: false,
    nat1: false,
    playerHit: null,
    enemyRoll: null,
    enemyHit: null,
    playerNat1: false,
    submitted: false,
  };
}

/** 25% kans dat eindbaas special attack gebruikt i.p.v. normale aanval (boss only). */
const BOSS_SPECIAL_ATTACK_CHANCE = 0.25;

function bossChoosesSpecialAttack(config) {
  return Boolean(config?.specialAttack) && Math.random() < BOSS_SPECIAL_ATTACK_CHANCE;
}

async function proceedToEnemyPhase(flow) {
  const type = getCombatFlowType();
  const config = getCombatConfig();
  if (type === 'boss' && bossChoosesSpecialAttack(config)) {
    beginSpecialSavePhase(flow, config);
    return;
  }
  await startEnemyAttackPhase(flow);
}

function getCombatFlowType() {
  if (activeAmbush) return 'ambush';
  if (activeBossMinion) return 'boss-minion';
  if (activeBoss) return 'boss';
  return null;
}

function getActiveCombatFlow() {
  return activeAmbush || activeBossMinion || activeBoss;
}

function getCombatConfig() {
  const type = getCombatFlowType();
  const flow = getActiveCombatFlow();
  const ambushPit = () => game.getPitAt(flow?.spaceNum ?? game.currentPlayer?.position);

  if (type === 'ambush') {
    return game.getCurrentPlayerPit()?.config
      ?? ambushPit()?.config
      ?? flow?.combatConfig
      ?? null;
  }
  if (type === 'boss-minion') {
    return game.getActiveBossMinion()?.config ?? flow?.combatConfig ?? null;
  }
  if (type === 'boss') return game.bossConfig ?? flow?.combatConfig ?? null;
  return flow?.combatConfig ?? null;
}

function getCombatSpaceNum() {
  const flow = getActiveCombatFlow();
  if (flow?.spaceNum != null) return flow.spaceNum;
  const type = getCombatFlowType();
  if (type === 'boss') return game.currentPlayer?.position ?? null;
  return game.currentPlayer?.position ?? null;
}

function resetCombatModalPhases() {
  els.eventCombatAdjudicate?.classList.add('hidden');
  els.eventEnemyRoll?.classList.add('hidden');
  els.eventSpecialSave?.classList.add('hidden');
  els.eventCombatAction?.classList.add('hidden');
  activeCombatActionHandler = null;
  els.eventRollArea?.classList.remove('is-hidden');
  els.eventNat20?.closest('.event-card__nat-crits')?.classList.remove('is-hidden');
  els.eventCombatHit?.removeAttribute('disabled');
  els.eventCombatMiss?.removeAttribute('disabled');
  els.eventEnemyHit?.removeAttribute('disabled');
  els.eventEnemyMiss?.removeAttribute('disabled');
  if (els.eventSpecialSaveInput) els.eventSpecialSaveInput.disabled = false;
  if (els.eventSpecialSaveSubmit) {
    els.eventSpecialSaveSubmit.disabled = false;
    els.eventSpecialSaveSubmit.classList.remove('is-hidden');
  }
}

function setCombatFooter(mode, label, onClick) {
  els.eventCombatAction?.classList.add('hidden');
  if (mode === 'action') {
    els.eventClose.classList.remove('hidden');
    els.eventClose.disabled = false;
    els.eventClose.textContent = label;
    activeCombatActionHandler = onClick;
    requestAnimationFrame(() => {
      els.eventClose.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  } else if (mode === 'close') {
    activeCombatActionHandler = null;
    els.eventClose.classList.remove('hidden');
  } else {
    activeCombatActionHandler = null;
    els.eventClose.classList.add('hidden');
    els.eventClose.disabled = true;
  }
}

async function applyNewCombatEvents(flow, events) {
  if (!events?.length) return;
  await applyCombatEvents(events);
  flow.eventsAppliedCount = (flow.eventsAppliedCount ?? 0) + events.length;
}

function refreshCombatModalFighterHp() {
  const player = game.currentPlayer;
  const wrap = els.eventCheck.querySelector('.event-card__combat-fighter-wrap');
  if (!wrap || !player) return;
  const hpSpan = wrap.querySelector('.ambush-modal__fighter-hp-num');
  const hearts = wrap.querySelector('.ambush-modal__fighter-hearts');
  if (hpSpan) hpSpan.textContent = `${player.hp} / ${player.maxHp} HP`;
  if (hearts) hearts.innerHTML = formatPlayerHp(player);
}

function refreshCombatModalHpBars() {
  const type = getCombatFlowType();
  const flow = getActiveCombatFlow();
  els.eventCheck.querySelector('.event-card__boss-hp')?.remove();
  if (type === 'ambush') {
    const pit = game.getPitAt(flow?.spaceNum ?? game.currentPlayer?.position);
    if (pit) els.eventCheck.insertAdjacentHTML('beforeend', ambushHpBarHtml(pit));
  } else if (type === 'boss-minion') {
    const minion = game.getActiveBossMinion();
    if (minion) els.eventCheck.insertAdjacentHTML('beforeend', bossMinionHpBarHtml(minion));
  } else if (type === 'boss') {
    els.eventCheck.insertAdjacentHTML('beforeend', bossHpBarHtml());
  }
  refreshCombatModalFighterHp();
}

function buildEnemyRollDisplay(enemyRoll) {
  const bonus = enemyRoll.attackBonus ?? 3;
  let suffix = '';
  if (enemyRoll.nat20) suffix = ' — Kritiek treffer!';
  if (enemyRoll.nat1) suffix = ' — Kritiek mislukking!';
  return `${enemyRoll.roll} + ${bonus} = ${enemyRoll.total} To hit${suffix}`;
}

function buildPlayerOutcomeHtml(flow, playerResult, config) {
  const player = game.currentPlayer;
  const rollLabel = buildCombatRollLabel(flow.roll, flow.nat20, flow.nat1);
  const acDisplay = formatAcDisplay(config.dc, player);
  const dmgBonus = player?.dmgBonus ?? 0;
  const type = getCombatFlowType();
  let effect = '';

  if (playerResult.playerHit) {
    const playerDmg = flow.nat20 ? 2 + dmgBonus : 1 + dmgBonus;
    if (type === 'ambush') {
      effect = `Treffer! Vijand verliest ${playerDmg} HP — nog ${playerResult.enemyHp ?? 0} / ${playerResult.enemyMaxHp ?? '?'}`;
    } else if (type === 'boss-minion') {
      effect = `Treffer! Beschermer verliest ${playerDmg} HP — nog ${playerResult.enemyHp ?? 0} / ${playerResult.enemyMaxHp ?? '?'}`;
    } else {
      effect = `Treffer! Eindbaas verliest ${playerDmg} schade — nog ${playerResult.enemyHp ?? 0} / ${playerResult.enemyMaxHp ?? '?'}`;
    }
  } else {
    effect = 'Mis! Geen schade aan de vijand.';
  }

  const hpHtml = buildResultHpHtml(playerResult.events, player);
  return `
    <div class="result-roll">🎲 ${rollLabel}</div>
    <div class="result-vs">vs AC ${acDisplay}</div>
    <p class="result-effect">${effect}</p>
    ${hpHtml}
  `;
}

function buildEnemyOutcomeHtml(flow, enemyResult, config) {
  const player = game.currentPlayer;
  const enemyRoll = flow.enemyRoll;
  const bonus = enemyRoll?.attackBonus ?? config?.attackBonus ?? 3;
  const rollLine = enemyRoll
    ? `${enemyRoll.roll} + ${bonus} = ${enemyRoll.total} To hit`
    : '—';
  let effect = '';

  if (enemyResult.enemyNat1) {
    effect = `Kritiek mislukking! Vijand raakt zichzelf (−${enemyResult.selfDamage ?? 1} HP)`;
  } else if (enemyResult.effectiveHit) {
    const crit = enemyResult.enemyNat20 ? 'Kritiek treffer' : 'Hit';
    effect = `${crit}! Jij verliest ${enemyResult.damage ?? 1} HP`;
  } else {
    effect = 'Miss! Geen schade voor jou.';
  }

  const hpHtml = buildResultHpHtml(enemyResult.events, player);
  return `
    <div class="result-roll">🎲 ${rollLine}${enemyRoll?.nat20 ? ' — Kritiek treffer!' : enemyRoll?.nat1 ? ' — Kritiek mislukking!' : ''}</div>
    <p class="result-effect">${effect}</p>
    ${hpHtml}
  `;
}

function syncCombatOutcomePhase(type, config, spaceNum, combatPhase, outcome) {
  syncCombatModalPhase(type, config, spaceNum, combatPhase, {
    outcome: { ...outcome, actionLabel: outcome.actionLabel ?? null },
  });
}

function setEventCheckForNormal(config, player) {
  if (els.eventCheckLabel) els.eventCheckLabel.textContent = 'Ability Check';
  els.eventAbility?.classList.remove('hidden');
  els.eventAbility.textContent = config.ability;
  if (els.eventDcLabel) els.eventDcLabel.textContent = 'DC';
  if (els.eventDcWrap) {
    els.eventDcWrap.classList.remove('hidden');
    els.eventDc.textContent = formatDcDisplay(config.dc, player);
  }
  els.eventEnemyAtk?.classList.add('hidden');
  if (els.eventRollLabel) els.eventRollLabel.textContent = 'Totale worp';
}

function formatAcDisplay(baseAc, player) {
  return formatDcDisplay(baseAc, player);
}

function setEventCheckForCombat(config, player) {
  if (els.eventCheckLabel) els.eventCheckLabel.textContent = 'Aanvalsworp';
  els.eventAbility?.classList.add('hidden');
  if (els.eventDcLabel) els.eventDcLabel.textContent = 'AC';
  if (els.eventDcWrap) {
    els.eventDcWrap.classList.remove('hidden');
    els.eventDc.textContent = formatAcDisplay(config.dc, player);
  }
  els.eventEnemyAtk?.classList.add('hidden');
  if (els.eventRollLabel) els.eventRollLabel.textContent = 'Aanvalsworp totaal';
}

function syncCombatModalPhase(type, config, spaceNum, combatPhase, extra = {}) {
  const isOutcomePhase = combatPhase === 'outcome'
    || combatPhase === 'player-outcome'
    || combatPhase === 'enemy-outcome';
  setSyncedActiveModal({
    type,
    phase: isOutcomePhase ? 'outcome' : 'input',
    combatPhase,
    spaceNum: spaceNum ?? null,
    config: serializeModalConfig(config),
    submitLabel: extra.submitLabel || 'Bevestigen',
    enemyRoll: extra.enemyRoll ?? null,
    specialAttack: extra.specialAttack ?? null,
    outcome: extra.outcome ?? null,
  });
}

function showEnemyRollPhase(enemyRoll, config) {
  els.eventCombatAdjudicate.classList.add('hidden');
  const bonus = enemyRoll.attackBonus ?? config?.attackBonus ?? 3;
  if (els.eventEnemyRollLabel) {
    els.eventEnemyRollLabel.textContent = `Vijand-aanval (+${bonus} to hit)`;
  }
  els.eventEnemyRollDisplay.textContent = buildEnemyRollDisplay(enemyRoll);
  els.eventEnemyRoll.classList.remove('hidden');
  if (enemyRoll.nat20 || enemyRoll.nat1) {
    els.eventEnemyHit?.setAttribute('disabled', 'disabled');
    els.eventEnemyMiss?.setAttribute('disabled', 'disabled');
  } else {
    els.eventEnemyHit?.removeAttribute('disabled');
    els.eventEnemyMiss?.removeAttribute('disabled');
  }
}

function showSpecialSavePhase(config) {
  els.eventEnemyRoll.classList.add('hidden');
  const special = config.specialAttack;
  els.eventSpecialSaveTitle.textContent = `⚡ ${special?.name ?? 'Special attack'}!`;
  els.eventSpecialSaveFlavor.textContent =
    `${special?.saveAbility ?? 'Save'} save vs DC ${special?.dc ?? '?'} — slagen = ${special?.dmgSuccess ?? 1} HP, falen = ${special?.dmgFail ?? 2} HP`;
  els.eventSpecialSaveInput.value = '';
  els.eventSpecialSave.classList.remove('hidden');
  setTimeout(() => els.eventSpecialSaveInput?.focus(), 100);
}

async function applyCombatEvents(events) {
  describeEvents(events);
  await syncTokensAfterEvents(events);
  renderBoard();
  playMysteryResetFromEvents(events);
  renderPlayers();
  updateCombatRail();
}

function buildCombatRollLabel(roll, nat20, nat1) {
  if (nat20) {
    return roll != null ? `${roll} — Kritiek succes!` : 'Kritiek succes!';
  }
  if (nat1) {
    return roll != null ? `${roll} — Kritiek mislukking!` : 'Kritiek mislukking!';
  }
  return String(roll ?? '—');
}

function buildCombatOutcomeHtml(flow, config, finalResult) {
  const player = game.currentPlayer;
  const playerHit = flow.playerHit;
  const dmgBonus = player?.dmgBonus ?? 0;
  const type = getCombatFlowType();

  let effectParts = [];

  if (playerHit) {
    const playerDmg = flow.nat20 ? 2 + dmgBonus : 1 + dmgBonus;
    if (type === 'ambush') {
      effectParts.push(`Treffer! Vijand verliest ${playerDmg} HP — nog ${finalResult.ambushHp ?? 0} / ${finalResult.ambushMaxHp ?? '?'}`);
    } else if (type === 'boss-minion') {
      effectParts.push(`Treffer! Beschermer verliest ${playerDmg} HP — nog ${finalResult.minionHp ?? 0} / ${finalResult.minionMaxHp ?? '?'}`);
    } else {
      effectParts.push(`Treffer! Eindbaas verliest ${playerDmg} schade — nog ${game.bossHp} / ${game.bossMaxHp}`);
    }
  } else {
    effectParts.push('Mis! Geen schade aan de vijand.');
  }

  if (flow.enemyRoll && !finalResult.skipEnemySummary) {
    let enemyLine;
    if (flow.enemyRoll.nat1) {
      enemyLine = `Vijand-aanval (${flow.enemyRoll.roll}+${flow.enemyRoll.attackBonus}=${flow.enemyRoll.total}): Kritiek mislukking — self dmg`;
    } else if (flow.enemyHit) {
      const crit = flow.enemyRoll.nat20 ? 'Kritiek treffer' : 'Hit';
      enemyLine = `Vijand-aanval (${flow.enemyRoll.roll}+${flow.enemyRoll.attackBonus}=${flow.enemyRoll.total}): ${crit}`;
    } else {
      enemyLine = `Vijand-aanval (${flow.enemyRoll.roll}+${flow.enemyRoll.attackBonus}=${flow.enemyRoll.total}): Miss`;
    }
    effectParts.push(enemyLine);
  }

  if (flow.specialSaveResult) {
    const sr = flow.specialSaveResult;
    effectParts.push(
      sr.success
        ? `${config.specialAttack?.name ?? 'Special attack'}: geslaagd — ${sr.damage ?? config.specialAttack?.dmgSuccess ?? 1} HP`
        : `${config.specialAttack?.name ?? 'Special attack'}: mislukt — ${sr.damage ?? config.specialAttack?.dmgFail ?? 2} HP`,
    );
  }

  if (hasDeathInEvents(finalResult.events)) {
    if (type === 'ambush' && finalResult.ambushEnded) {
      effectParts.push('Uitgevallen — terug naar start · de put gaat verder voor de anderen');
    } else {
      effectParts.push('Uitgevallen — terug naar start');
    }
  } else if (type === 'ambush' && finalResult.ambushEnded && playerHit) {
    effectParts.push('De put is opgeheven — je mag weer dobbelstenen op dit vak!');
  } else if (type === 'boss-minion' && finalResult.minionEnded) {
    effectParts.push(
      game.hasBossMinions()
        ? 'Beschermer verslagen — nog een te gaan!'
        : 'Alle beschermers weg — tijd voor de eindbaas!',
    );
  } else if (type === 'boss' && finalResult.winner) {
    effectParts.push('De schat is vrij!');
  } else if (type === 'boss' && !game.bossActive) {
    effectParts.push('De eindbaas is verslagen! Wie op vak 63 staat wint — anders loop naar de schat.');
  } else if ((type === 'boss' || type === 'boss-minion') && game.bossActive) {
    effectParts.push('Je blijft op de arena — volgende beurt vecht je verder');
  }

  const hpHtml = buildResultHpHtml(finalResult.events, player);
  return `
    <p class="result-effect">${effectParts.join(' · ')}</p>
    ${hpHtml}
  `;
}

async function finishCombatRound(flow) {
  const type = getCombatFlowType();
  const config = getCombatConfig() ?? flow.combatConfig;
  const spaceNum = flow?.spaceNum ?? getCombatSpaceNum();
  const ctx = game.buildCombatContext(type, {
    allowDefeated: true,
    spaceNum,
    minionIndex: flow.minionIndex ?? null,
    combatConfig: config,
  });
  if (!ctx || !config) {
    console.error('finishCombatRound: geen combat context', { type, config, ctx });
    setCombatFooter('action', 'Samenvatting →', () => finishCombatRound(flow));
    return;
  }

  const applied = flow.eventsAppliedCount ?? 0;
  const finalResult = game.finalizeCombatRound(ctx, flow.pendingEvents, {
    wasMysteryAmbush: flow.wasMysteryAmbush,
  });
  flow.pendingEvents = finalResult.events;
  const newEvents = finalResult.events.slice(applied);
  await applyNewCombatEvents(flow, newEvents);

  els.eventCombatAdjudicate.classList.add('hidden');
  els.eventEnemyRoll.classList.add('hidden');
  els.eventSpecialSave.classList.add('hidden');
  els.eventRollArea.classList.add('is-hidden');
  els.eventCheck.classList.add('is-hidden');
  els.eventCombatAction.classList.add('hidden');
  activeCombatActionHandler = null;

  const success = flow.playerHit;
  els.eventTitle.textContent = 'Samenvatting';
  els.eventTitle.className = 'event-card__title';
  els.eventFlavor.textContent = success ? (config.successText || '') : (config.failText || '');
  els.eventFlavor.className = `event-card__flavor event-card__flavor--outcome event-card__flavor--${success ? 'success' : 'fail'}`;

  els.eventResult.classList.remove('hidden');
  setEventResultClass(success, finalResult.events);
  els.eventResult.innerHTML = buildCombatOutcomeHtml(flow, config, finalResult);

  const modalType = type;
  syncModalOutcome(modalType, spaceNum, config, {
    headerMode: 'outcome',
    success,
    title: els.eventTitle.textContent,
    titleClass: els.eventTitle.className,
    flavor: els.eventFlavor.textContent,
    flavorClass: els.eventFlavor.className,
    resultClassName: els.eventResult.className,
    resultHtml: els.eventResult.innerHTML,
  });
  window.syncAfterAction?.();

  flow.phase = 'outcome';
  flow.submitted = true;

  els.eventResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  if (type === 'ambush') {
    finishAmbushFlow({
      handler: () => {
        finishAmbushFight(flow.onComplete);
        advanceTurn();
      },
    });
  } else if (type === 'boss-minion') {
    finishBossMinionFlow({
      handler: () => {
        closeEventModal();
        flow.onComplete?.();
        advanceTurn();
      },
    });
  } else {
    updateBossPanel();
    finishBossFlow({
      handler: () => endBossTurn(flow.onComplete, finalResult.winner),
    });
  }
}

async function showPlayerAttackOutcome(flow, playerResult, config) {
  const type = getCombatFlowType();
  const spaceNum = getCombatSpaceNum();

  flow.pendingEvents.push(...playerResult.events);
  flow.playerHit = playerResult.playerHit;
  flow.playerNat1 = playerResult.playerNat1;
  flow.nat20 = playerResult.nat20;
  flow.nat1 = playerResult.nat1;

  await applyNewCombatEvents(flow, playerResult.events);
  refreshCombatModalHpBars();

  els.eventRollArea.classList.add('is-hidden');
  els.eventCheck.classList.add('is-hidden');
  els.eventCombatAdjudicate.classList.add('hidden');
  els.eventEnemyRoll.classList.add('hidden');

  const success = playerResult.playerHit;
  els.eventTitle.textContent = success ? 'Treffer!' : 'Mis!';
  els.eventTitle.className = `event-card__title event-card__title--${success ? 'success' : 'fail'}`;
  els.eventFlavor.textContent = success ? (config.successText || '') : (config.failText || '');
  els.eventFlavor.className = `event-card__flavor event-card__flavor--outcome event-card__flavor--${success ? 'success' : 'fail'}`;

  els.eventResult.classList.remove('hidden');
  setEventResultClass(success, playerResult.events);
  els.eventResult.innerHTML = buildPlayerOutcomeHtml(flow, playerResult, config);

  flow.phase = 'player-outcome';
  syncCombatOutcomePhase(type, config, spaceNum, 'player-outcome', {
    headerMode: 'outcome',
    success,
    title: els.eventTitle.textContent,
    titleClass: els.eventTitle.className,
    flavor: els.eventFlavor.textContent,
    flavorClass: els.eventFlavor.className,
    resultClassName: els.eventResult.className,
    resultHtml: els.eventResult.innerHTML,
    actionLabel: playerResult.skipEnemyPhase ? 'Samenvatting →' : 'Vijand aanvalt →',
  });

  if (playerResult.skipEnemyPhase) {
    setCombatFooter('action', 'Samenvatting →', () => finishCombatRound(flow));
  } else {
    setCombatFooter('action', 'Vijand aanvalt →', () => proceedToEnemyPhase(flow));
  }
}

async function startEnemyAttackPhase(flow) {
  const type = getCombatFlowType();
  const config = getCombatConfig();
  const spaceNum = getCombatSpaceNum();
  const ctx = game.buildCombatContext(type);
  if (!ctx || !config) return;

  els.eventCombatAction.classList.add('hidden');
  activeCombatActionHandler = null;
  els.eventResult.classList.add('hidden');
  els.eventTitle.textContent = config.name;
  els.eventTitle.className = 'event-card__title';
  els.eventFlavor.textContent = config.flavor;
  els.eventFlavor.className = 'event-card__flavor';

  flow.enemyRoll = game.rollCombatEnemyAttack(ctx);

  if (flow.enemyRoll.nat20 || flow.enemyRoll.nat1) {
    flow.enemyHit = flow.enemyRoll.nat20;
    await resolveAndShowEnemyOutcome(flow);
    return;
  }

  flow.phase = 'enemy-hit';
  showEnemyRollPhase(flow.enemyRoll, config);
  els.eventResult.classList.remove('hidden');
  els.eventResult.innerHTML = '<p class="spectator-wait">Host: hit of miss?</p>';
  setCombatFooter('none');
  syncCombatModalPhase(type, config, spaceNum, 'enemy-hit', {
    enemyRoll: flow.enemyRoll,
  });
}

async function resolveAndShowEnemyOutcome(flow) {
  const ctx = game.buildCombatContext(getCombatFlowType());
  if (!ctx) return;

  els.eventEnemyRoll.classList.add('hidden');

  let enemyResult;
  try {
    enemyResult = game.resolveCombatEnemyAttack(ctx, {
      hit: flow.enemyHit,
      enemyRoll: flow.enemyRoll,
      playerNat1: flow.playerNat1,
    });
  } catch (err) {
    console.error(err);
    return;
  }

  flow.enemyHit = enemyResult.effectiveHit;
  flow.pendingEvents.push(...enemyResult.events);
  await showEnemyAttackOutcome(flow, enemyResult);
}

async function showEnemyAttackOutcome(flow, enemyResult) {
  const type = getCombatFlowType();
  const config = getCombatConfig();
  const spaceNum = getCombatSpaceNum();

  await applyNewCombatEvents(flow, enemyResult.events);
  refreshCombatModalHpBars();

  els.eventEnemyRoll.classList.add('hidden');
  els.eventCombatAdjudicate.classList.add('hidden');

  let title;
  let titleClass;
  let success;
  if (enemyResult.enemyNat1) {
    title = 'Kritiek mislukking!';
    titleClass = 'event-card__title event-card__title--success';
    success = true;
  } else if (enemyResult.effectiveHit) {
    title = enemyResult.enemyNat20 ? 'Kritiek treffer!' : 'Vijand raakt!';
    titleClass = 'event-card__title event-card__title--fail';
    success = false;
  } else {
    title = 'Vijand mist!';
    titleClass = 'event-card__title event-card__title--success';
    success = true;
  }

  els.eventTitle.textContent = title;
  els.eventTitle.className = titleClass;
  els.eventFlavor.textContent = '';
  els.eventFlavor.className = 'event-card__flavor';

  els.eventResult.classList.remove('hidden');
  setEventResultClass(success, enemyResult.events);
  els.eventResult.innerHTML = buildEnemyOutcomeHtml(flow, enemyResult, config);

  flow.phase = 'enemy-outcome';
  syncCombatOutcomePhase(type, config, spaceNum, 'enemy-outcome', {
    headerMode: 'outcome',
    success,
    title,
    titleClass,
    flavor: '',
    flavorClass: 'event-card__flavor',
    resultClassName: els.eventResult.className,
    resultHtml: els.eventResult.innerHTML,
    actionLabel: 'Samenvatting →',
  });
  setCombatFooter('action', 'Samenvatting →', () => finishCombatRound(flow));
}

function beginSpecialSavePhase(flow, config) {
  if (flow.pendingEvents?.some((e) => e.type === 'death')) {
    finishCombatRound(flow);
    return;
  }

  const type = getCombatFlowType();
  const spaceNum = getCombatSpaceNum();

  els.eventCombatAction.classList.add('hidden');
  activeCombatActionHandler = null;
  els.eventResult.classList.add('hidden');
  els.eventTitle.textContent = config.name;
  els.eventTitle.className = 'event-card__title';
  els.eventFlavor.textContent = config.flavor;
  els.eventFlavor.className = 'event-card__flavor';

  flow.phase = 'special-save';
  showSpecialSavePhase(config);
  setCombatFooter('none');
  syncCombatModalPhase(type, config, spaceNum, 'special-save', {
    specialAttack: config.specialAttack,
    enemyRoll: flow.enemyRoll,
  });
}

async function proceedAfterPlayerAttack(flow, playerResult) {
  const config = getCombatConfig() ?? flow.combatConfig;
  if (!config) {
    console.error('proceedAfterPlayerAttack: geen combat config');
    return;
  }
  await showPlayerAttackOutcome(flow, playerResult, config);
}

async function handleCombatPlayerSubmit() {
  const flow = getActiveCombatFlow();
  const type = getCombatFlowType();
  const config = getCombatConfig();
  const spaceNum = getCombatSpaceNum();
  if (!flow || flow.phase !== 'player-roll') return;

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

  flow.roll = roll;
  flow.nat20 = nat20;
  flow.nat1 = nat1;

  els.eventDiceInput.disabled = true;
  els.eventNat20.disabled = true;
  els.eventNat1.disabled = true;
  els.eventSubmit.disabled = true;
  els.eventResult.classList.add('hidden');

  const ctx = game.buildCombatContext(type);
  if (!ctx) return;

  let playerResult;
  try {
    playerResult = game.resolveCombatPlayerAttack(ctx, roll, { nat20, nat1 });
  } catch (err) {
    console.error(err);
    return;
  }

  await proceedAfterPlayerAttack(flow, playerResult);
}

async function handleCombatEnemyHit(hit) {
  const flow = getActiveCombatFlow();
  if (!flow || flow.phase !== 'enemy-hit') return;

  if (flow.enemyRoll?.nat20 || flow.enemyRoll?.nat1) return;

  flow.enemyHit = hit;
  await resolveAndShowEnemyOutcome(flow);
}

async function handleCombatSpecialSaveSubmit() {
  const flow = getActiveCombatFlow();
  const type = getCombatFlowType();
  if (!flow || flow.phase !== 'special-save') return;

  if (flow.pendingEvents?.some((e) => e.type === 'death')) {
    els.eventSpecialSave.classList.add('hidden');
    await finishCombatRound(flow);
    return;
  }

  const saveRoll = parseCheckTotal(els.eventSpecialSaveInput.value);
  if (saveRoll === null) {
    els.eventResult.classList.remove('hidden');
    els.eventResult.className = 'event-card__result event-card__result--fail';
    els.eventResult.innerHTML = '<strong>Ongeldige worp</strong><p>Vul je saving throw totaal in.</p>';
    return;
  }

  const ctx = game.buildCombatContext(type, {
    allowDefeated: true,
    spaceNum: flow.spaceNum ?? getCombatSpaceNum(),
    minionIndex: flow.minionIndex ?? null,
    combatConfig: flow.combatConfig ?? getCombatConfig(),
  });
  if (!ctx) {
    els.eventSpecialSave.classList.add('hidden');
    await finishCombatRound(flow);
    return;
  }

  els.eventSpecialSave.classList.add('hidden');

  let saveResult;
  try {
    saveResult = game.resolveCombatSpecialSave(ctx, saveRoll, { playerNat1: flow.playerNat1 });
  } catch (err) {
    console.error(err);
    return;
  }

  flow.pendingEvents.push(...saveResult.events);
  flow.specialSaveResult = saveResult;
  await applyNewCombatEvents(flow, saveResult.events);
  await finishCombatRound(flow);
}

els.eventEnemyHit?.addEventListener('click', () => handleCombatEnemyHit(true));
els.eventEnemyMiss?.addEventListener('click', () => handleCombatEnemyHit(false));
els.eventSpecialSaveSubmit?.addEventListener('click', () => handleCombatSpecialSaveSubmit());
els.eventSpecialSaveInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleCombatSpecialSaveSubmit();
});
