const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

const game = new Game();

const els = {
  board: document.getElementById('board'),
  playerList: document.getElementById('player-list'),
  playerName: document.getElementById('player-name'),
  addBtn: document.getElementById('add-player-btn'),
  currentPlayer: document.getElementById('current-player'),
  diceInput: document.getElementById('dice-input'),
  moveBtn: document.getElementById('move-btn'),
  hpControls: document.getElementById('hp-controls'),
  hpDisplay: document.getElementById('hp-display'),
  hpMinusBtn: document.getElementById('hp-minus-btn'),
  hpPlusBtn: document.getElementById('hp-plus-btn'),
  pathModal: document.getElementById('path-modal'),
  pathIcon: document.getElementById('path-icon'),
  pathSpace: document.getElementById('path-space'),
  pathTitle: document.getElementById('path-title'),
  pathFlavor: document.getElementById('path-flavor'),
  pathClose: document.getElementById('path-close'),
  gameLog: document.getElementById('game-log'),
  eventModal: document.getElementById('event-modal'),
  eventIcon: document.getElementById('event-icon'),
  eventSpace: document.getElementById('event-space'),
  eventTitle: document.getElementById('event-title'),
  eventFlavor: document.getElementById('event-flavor'),
  eventCheck: document.getElementById('event-check'),
  eventAbility: document.getElementById('event-ability'),
  eventDc: document.getElementById('event-dc'),
  eventRollArea: document.getElementById('event-roll-area'),
  eventDiceInput: document.getElementById('event-dice-input'),
  eventNat20: document.getElementById('event-nat20'),
  eventNat1: document.getElementById('event-nat1'),
  eventSubmit: document.getElementById('event-submit'),
  eventResult: document.getElementById('event-result'),
  eventClose: document.getElementById('event-close'),
  winModal: document.getElementById('win-modal'),
  winTitle: document.getElementById('win-title'),
  winText: document.getElementById('win-text'),
  winClose: document.getElementById('win-close'),
  bossPanel: document.getElementById('boss-panel'),
  bossPanelIcon: document.getElementById('boss-panel-icon'),
  bossPanelName: document.getElementById('boss-panel-name'),
  bossHpFill: document.getElementById('boss-hp-fill'),
  bossHpLabel: document.getElementById('boss-hp-label'),
};

function parseDiceRoll(value, min, max = null) {
  const roll = parseInt(value, 10);
  if (Number.isNaN(roll) || roll < min) return null;
  if (max !== null && roll > max) return null;
  return roll;
}

/** Totaal van 2× D6 (2–12) */
function parse2d6Total(value) {
  return parseDiceRoll(value, 2, 12);
}

function parseCheckTotal(value) {
  if (value === '' || value == null) return null;
  const roll = Number(value);
  if (!Number.isFinite(roll) || !Number.isInteger(roll) || roll < 1) return null;
  return roll;
}

const EVENT_CATEGORY_CLASS = {
  trap: 'cell--trap',
  combat: 'cell--combat',
  magic: 'cell--magic',
  social: 'cell--social',
  loot: 'cell--loot',
  mystery: 'cell--mystery',
  wild: 'cell--wild',
  fey: 'cell--fey',
  boss: 'cell--boss',
};

function applyCellStyle(cell, special, num) {
  if (!special) return;

  if (special.type === 'event') {
    cell.classList.add(EVENT_CATEGORY_CLASS[special.category] || 'cell--event');
  } else if (special.type === 'path') {
    cell.classList.add('cell--quiet');
  } else {
    cell.classList.add(`cell--${special.type}`);
  }

  if (num === 1) cell.classList.add('cell--start');
  if (special.encampment || num === ENCAMPMENT_SPACE) cell.classList.add('cell--encampment');
}

function escapeAttr(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function renderBoard() {
  els.board.innerHTML = '';
  const size = game.layout.length;
  els.board.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

  game.layout.forEach((row, r) => {
    row.forEach((num, c) => {
      if (isCenterCovered(r, c, num)) return;

      const cell = document.createElement('div');
      cell.style.gridRow = `${r + 1}`;
      cell.style.gridColumn = `${c + 1}`;

      if (num === null) {
        cell.className = 'cell cell--empty';
        els.board.appendChild(cell);
        return;
      }

      const special = SPECIAL_SPACES[num];
      cell.className = 'cell cell--path';
      cell.dataset.space = num;

      if (special) applyCellStyle(cell, special, num);

      const isFinish = num === FINISH_SPACE;
      if (isFinish) {
        cell.classList.add('cell--finish-space', 'cell--finish-center');
        cell.style.gridRow = `${r + 1} / ${r + 4}`;
        cell.style.gridColumn = `${c + 1} / ${c + 4}`;
        cell.innerHTML = `
          <span class="cell-icon cell-icon--large">${special?.icon ?? '💰'}</span>
          <span class="cell-num cell-num--large">${num}</span>
          <span class="cell-label">${special?.name ?? 'Schat'}</span>
          <div class="tokens"></div>
        `;
        els.board.appendChild(cell);
        return;
      }

      const direction = getPathDirection(game.spacePositions, num);
      const arrowMap = { right: '→', down: '↓', left: '←', up: '↑' };

      cell.innerHTML = `
        <span class="cell-num">${num}</span>
        ${special?.icon ? `<span class="cell-icon" title="${escapeAttr(special.name)}">${special.icon}</span>` : ''}
        ${direction ? `<span class="path-arrow path-arrow--${direction}">${arrowMap[direction]}</span>` : ''}
        <div class="tokens"></div>
      `;

      els.board.appendChild(cell);
    });
  });

  renderTokens();
}

function renderTokens() {
  document.querySelectorAll('.tokens').forEach((t) => { t.innerHTML = ''; });

  game.players.forEach((p) => {
    const cell = document.querySelector(`[data-space="${p.position}"] .tokens`);
    if (!cell) return;

    const token = document.createElement('span');
    token.className = 'token';
    token.style.background = p.color;
    token.title = `${p.name} — vak ${p.position}`;
    token.textContent = p.name.charAt(0).toUpperCase();
    cell.appendChild(token);
  });
}

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
        <small>Vak ${p.position} · ${formatPlayerHp(p)}${formatPlayerDcHint(p)}${formatPlayerMovementHint(p)}</small>
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
    });
  });

  updateTurnUI();
}

function formatPlayerHp(player) {
  const filled = '❤️'.repeat(player.hp);
  const empty = '🖤'.repeat(Math.max(0, player.maxHp - player.hp));
  return filled + empty;
}

function formatPlayerMovementHint(player) {
  const bonus = player.movementBonus ?? 0;
  return bonus > 0 ? ` · +${bonus} beweging` : '';
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

function adjustCurrentPlayerHp(delta) {
  const player = game.currentPlayer;
  if (!player || game.gameOver) return;

  const events = game.mutateHp(player, delta);
  if (events.length === 0) return;

  describeEvents(events);
  renderBoard();
  renderPlayers();
  updateTurnUI();
}

function updateBossPanel() {
  if (!game.bossActive || !game.bossConfig) {
    els.bossPanel.classList.add('hidden');
    return;
  }

  const { bossConfig, bossHp, bossMaxHp } = game;
  const pct = bossMaxHp > 0 ? Math.round((bossHp / bossMaxHp) * 100) : 0;

  els.bossPanel.classList.remove('hidden');
  els.bossPanelIcon.textContent = bossConfig.icon || '🛡️';
  els.bossPanelName.textContent = bossConfig.name;
  els.bossHpFill.style.width = `${pct}%`;
  els.bossHpLabel.textContent = `Eindbaas: ${bossHp} / ${bossMaxHp} schade`;
  els.bossPanel.querySelector('.boss-hp')?.setAttribute('aria-valuenow', String(pct));
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

  if (game.gameOver) {
    els.currentPlayer.textContent = 'Spel afgelopen!';
    els.moveBtn.disabled = true;
    els.diceInput.disabled = true;
    updateHpControls();
    return;
  }

  if (!cp) {
    els.currentPlayer.textContent = 'Voeg spelers toe om te beginnen';
    els.moveBtn.disabled = true;
    els.diceInput.disabled = false;
    updateHpControls();
    return;
  }

  let turnText = `${cp.name} is aan de beurt`;
  if (game.pendingExtraTurn) turnText += ' (extra beurt!)';
  if (game.bossActive && game.bossConfig) {
    turnText += ` — ⚔️ ${game.bossConfig.name}`;
  }
  els.currentPlayer.textContent = turnText;
  els.currentPlayer.style.color = cp.color;

  const onBossArena = game.bossActive && cp && isOnBossArena(cp.position);
  els.moveBtn.disabled = onBossArena;
  els.diceInput.disabled = onBossArena;
  updateHpControls();
}

function addLog(message, type = '') {
  const li = document.createElement('li');
  li.className = type ? `log-entry log-entry--${type}` : 'log-entry';
  li.textContent = message;
  els.gameLog.prepend(li);

  while (els.gameLog.children.length > 30) {
    els.gameLog.removeChild(els.gameLog.lastChild);
  }
}

function describeEvents(events) {
  events.forEach((ev) => {
    switch (ev.type) {
      case 'move': {
        const bonusNote =
          ev.movementBonus > 0 && ev.baseSteps != null && ev.steps !== ev.baseSteps
            ? ` (${ev.baseSteps}+${ev.movementBonus} catch-up)`
            : '';
        addLog(`${ev.player} verplaatst ${ev.steps} vakje(s)${bonusNote} → vak ${ev.to}`);
        break;
      }
      case 'hp-change': {
        const verb = ev.delta < 0 ? 'verliest' : 'herstelt';
        const amount = Math.abs(ev.delta);
        addLog(
          `${ev.player} ${verb} ${amount} HP (${ev.from} → ${ev.to})`,
          ev.delta < 0 ? 'fail' : 'success',
        );
        break;
      }
      case 'death':
        addLog(
          `${ev.player} valt uit! Terug naar start · ${ev.hp} HP · +${ev.movementBonus} beweging (catch-up)`,
          'warn',
        );
        break;
      case 'bounce': {
        let msg = `Te ver! Terugkaatsen naar vak ${ev.position}`;
        if (ev.movementBonusCleared && ev.player) {
          msg += ` — ${ev.player}: catch-up bonus verbruikt`;
        }
        addLog(msg, 'warn');
        break;
      }
      case 'landed':
        if (ev.name) addLog(`Landt op: ${ev.icon} ${ev.name}`, 'special');
        break;
      case 'd20': {
        let dcLabel = String(ev.effectiveDc ?? ev.dc);
        if (ev.dcBonus || ev.dcMod) {
          const bits = [`basis ${ev.dc}`];
          if (ev.dcBonus) bits.push(`+${ev.dcBonus}`);
          if (ev.dcMod) bits.push(`${ev.dcMod > 0 ? '+' : ''}${ev.dcMod}`);
          dcLabel = `${ev.effectiveDc} (${bits.join(', ')})`;
        }
        const nat = ev.nat20 ? ' · Nat 20!' : ev.nat1 ? ' · Nat 1!' : '';
        addLog(
          `${ev.ability} check: ${ev.roll ?? '—'} vs DC ${dcLabel} — ${ev.success ? 'Geslaagd!' : 'Mislukt!'}${nat}`,
          ev.success ? 'success' : 'fail',
        );
        break;
      }
      case 'nat20':
        addLog(`${ev.player}: Nat 20! +1 HP · dubbele basisstap bij beweging`, 'success');
        break;
      case 'nat1':
        addLog(`${ev.player}: Nat 1! −1 HP · beurt voorbij · volgende beurt overslaan`, 'fail');
        break;
      case 'event-steps':
        addLog(
          `${ev.player}: ${ev.total} vakje(s) (${ev.base} basis + ${ev.extra} overshoot, roll ${ev.overshootRoll} vs DC ${ev.effectiveDc})`,
          'success',
        );
        break;
      case 'path':
        addLog(`${ev.player}: ${ev.icon} ${ev.name} — rustig pad`, 'special');
        break;
      case 'event-move': {
        const dir = ev.direction === 'back' ? 'terug' : 'vooruit';
        const bonusNote =
          ev.movementBonus > 0 &&
          ev.direction === 'forward' &&
          ev.baseSteps != null &&
          ev.steps !== ev.baseSteps
            ? ` (${ev.baseSteps}+${ev.movementBonus} catch-up)`
            : '';
        addLog(
          `${ev.player} ${ev.steps} vakje(s) ${dir}${bonusNote} → vak ${ev.to}`,
          ev.direction === 'back' ? 'fail' : 'success',
        );
        break;
      }
      case 'dc-streak':
        addLog(
          `${ev.player}: volgende check +${ev.nextBonus} DC (streak ${ev.to})`,
          'success',
        );
        break;
      case 'dc-streak-reset':
        addLog(`${ev.player}: DC-streak gereset na mislukte check`, 'warn');
        break;
      case 'pass-turn':
        addLog(`${ev.player} mislukt de check — beurt voorbij`, 'fail');
        break;
      case 'finish':
        addLog(`🏆 ${ev.player} bereikt de Draken-schat!`, 'win');
        break;
      case 'boss-start':
        addLog(
          `⚔️ ${ev.icon} ${ev.name} verschijnt! (${ev.bossHp} schade) — ${ev.player} triggert de eindbaas`,
          'warn',
        );
        break;
      case 'boss-guard':
        addLog(
          `De schat is bereikbaar, maar ${ev.name ?? 'de eindbaas'} blokkeert de overwinning!`,
          'warn',
        );
        break;
      case 'boss-d20': {
        const nat = ev.nat20 ? ' · Nat 20!' : ev.nat1 ? ' · Nat 1!' : '';
        addLog(
          `⚔️ vs ${ev.bossName}: ${ev.ability} ${ev.roll ?? '—'} vs DC ${ev.effectiveDc} — ${ev.success ? 'Raak!' : 'Mis!'}${nat}`,
          ev.success ? 'success' : 'fail',
        );
        break;
      }
      case 'boss-hit':
        addLog(
          `Raak op ${ev.bossName}! Nog ${ev.bossHp} schade nodig`,
          'success',
        );
        break;
      case 'boss-defeated':
        addLog(`🏆 ${ev.bossName} is verslagen!`, 'success');
        break;
      case 'boss-engage':
        addLog(
          `${ev.player} bereikt vak ${ev.spaceNum} — tijd om ${ev.name ?? 'de eindbaas'} aan te vallen!`,
          'special',
        );
        break;
      case 'boss-retreat':
        addLog(
          `${ev.player} trekt terug naar het kamp op vak ${ev.to} (was vak ${ev.from})`,
          'special',
        );
        break;
      default:
        break;
    }
  });
}

function formatDcDisplay(baseDc, player) {
  const bonus = getDcBonus(player);
  const mod = getDcModifier(player);
  const effective = getEffectiveDc(player, baseDc);
  const parts = [`basis ${baseDc}`];
  if (bonus) parts.push(`+${bonus} streak`);
  if (mod) parts.push(`${mod > 0 ? '+' : ''}${mod}`);
  return parts.length > 1 ? `${effective} (${parts.join(', ')})` : String(effective);
}

function formatPlayerDcHint(player) {
  const bonus = getDcBonus(player);
  const mod = getDcModifier(player);
  const bits = [];
  if (bonus) bits.push(`DC +${bonus}`);
  if (mod) bits.push(`DC ${mod}`);
  return bits.length ? ` · ${bits.join(' · ')}` : '';
}

let activeEvent = null;
let activeBoss = null;

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
  const player = game.currentPlayer;

  const existingBar = els.eventCheck.querySelector('.event-card__boss-hp');
  if (existingBar) existingBar.remove();

  els.eventIcon.textContent = config.icon || '🎲';
  els.eventSpace.textContent = `Vak ${spaceNum ?? '?'}`;
  resetEventHeader(config);
  els.eventAbility.textContent = config.ability;
  els.eventDc.textContent = formatDcDisplay(config.dc, player);
  els.eventCheck.classList.remove('is-hidden');

  els.eventDiceInput.min = '1';
  els.eventDiceInput.removeAttribute('max');
  els.eventDiceInput.placeholder = 'totaal';
  els.eventRollArea.querySelector('.event-card__roll-hint').textContent =
    'Vul je totale worp in (D20 + modifiers, geen maximum)';

  els.eventDiceInput.value = '';
  els.eventNat20.checked = false;
  els.eventNat20.disabled = false;
  els.eventNat1.checked = false;
  els.eventNat1.disabled = false;
  els.eventResult.className = 'event-card__result hidden';
  els.eventRollArea.classList.remove('is-hidden');
  els.eventClose.disabled = true;
  els.eventClose.textContent = 'Doorgaan op avontuur';
  els.eventSubmit.disabled = false;
  els.eventSubmit.textContent = 'Bevestig worp';
  els.eventDiceInput.disabled = false;
}

function closeEventModal() {
  els.eventModal.classList.add('hidden');
  if (els.pathModal.classList.contains('hidden') && els.winModal.classList.contains('hidden')) {
    document.body.classList.remove('modal-open');
  }
  activeEvent = null;
  activeBoss = null;
}

function populateBossModal() {
  const config = game.bossConfig;
  const player = game.currentPlayer;
  if (!config) return;

  els.eventIcon.textContent = config.icon || '🛡️';
  els.eventSpace.textContent = 'Eindbaas';
  els.eventTitle.textContent = `⚔️ ${config.name}`;
  els.eventTitle.className = 'event-card__title';
  els.eventFlavor.textContent = config.flavor;
  els.eventFlavor.className = 'event-card__flavor';
  els.eventAbility.textContent = config.ability;
  els.eventDc.textContent = formatDcDisplay(config.dc, player);
  els.eventCheck.classList.remove('is-hidden');

  els.eventDiceInput.min = '1';
  els.eventDiceInput.removeAttribute('max');
  els.eventDiceInput.placeholder = 'totaal';
  els.eventRollArea.querySelector('.event-card__roll-hint').textContent =
    'Val de eindbaas aan — vul je totale worp in (D20 + modifiers)';

  els.eventNat20.checked = false;
  els.eventNat20.disabled = false;
  els.eventNat1.checked = false;
  els.eventNat1.disabled = false;
  els.eventResult.className = 'event-card__result hidden';
  els.eventRollArea.classList.remove('is-hidden');
  els.eventClose.disabled = true;
  els.eventClose.textContent = 'Doorgaan op avontuur';
  els.eventSubmit.disabled = false;
  els.eventSubmit.textContent = 'Aanvallen';
  els.eventDiceInput.disabled = false;
  els.eventDiceInput.value = '';

  const existingBar = els.eventCheck.querySelector('.event-card__boss-hp');
  if (existingBar) existingBar.remove();
  els.eventCheck.insertAdjacentHTML('beforeend', bossHpBarHtml());
}

function showBossModal(onComplete) {
  if (!game.bossActive || !game.bossConfig) {
    onComplete?.();
    return;
  }

  activeBoss = { onComplete, submitted: false };
  activeEvent = null;

  els.eventModal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  populateBossModal();
  updateBossPanel();

  setTimeout(() => els.eventDiceInput.focus(), 100);
}

function finishBossFlow(onClose) {
  els.eventSubmit.disabled = true;
  els.eventDiceInput.disabled = true;
  els.eventNat20.disabled = true;
  els.eventNat1.disabled = true;
  els.eventClose.disabled = false;
  els.eventClose.textContent = onClose?.chainLabel ?? 'Doorgaan op avontuur';
  activeBoss.onClose = onClose?.handler;
  els.eventClose.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function handleBossSubmit() {
  if (!activeBoss || activeBoss.submitted || !game.bossActive) return;

  const { onComplete } = activeBoss;
  const player = game.currentPlayer;
  const config = game.bossConfig;
  const nat20 = els.eventNat20.checked;
  const nat1 = els.eventNat1.checked;
  const roll = parseCheckTotal(els.eventDiceInput.value);

  if (roll === null && !nat20 && !nat1) {
    els.eventResult.classList.remove('hidden');
    els.eventResult.className = 'event-card__result event-card__result--fail';
    els.eventResult.innerHTML =
      '<strong>Ongeldige worp</strong><p>Vul een geheel getal ≥ 1 in, of vink Nat 1 / Nat 20 aan.</p>';
    return;
  }

  activeBoss.submitted = true;

  const effectiveDc = getEffectiveDc(player, config.dc);
  const isNat1 = !nat20 && (nat1 || roll === 1);
  const success = !isNat1 && (nat20 || (roll !== null && roll >= effectiveDc));
  const rollLabel = nat20
    ? (roll != null ? `${roll} — Nat 20!` : 'Nat 20!')
    : isNat1
      ? (roll != null ? `${roll} — Nat 1!` : 'Nat 1!')
      : String(roll ?? '—');
  const dcDisplay = formatDcDisplay(config.dc, player);

  let result;
  try {
    result = game.resolveBoss(roll, { nat20, nat1 });
    describeEvents(result.events);
    renderTokens();
    renderPlayers();
    updateBossPanel();
    populateBossModal();
  } catch (err) {
    console.error(err);
    els.eventResult.className = 'event-card__result event-card__result--fail';
    els.eventResult.innerHTML = '<p>Kon de aanval niet verwerken.</p>';
    finishBossFlow({ handler: () => endBossTurn(onComplete) });
    return;
  }

  els.eventRollArea.classList.add('is-hidden');
  els.eventCheck.classList.add('is-hidden');
  els.eventTitle.textContent = success ? 'Raak!' : 'Mis!';
  els.eventTitle.className = `event-card__title event-card__title--${success ? 'success' : 'fail'}`;
  els.eventFlavor.textContent = success ? (config.successText || '') : (config.failText || '');
  els.eventFlavor.className = `event-card__flavor event-card__flavor--outcome event-card__flavor--${success ? 'success' : 'fail'}`;

  let effectText = success
    ? `De eindbaas verliest 1 schade — nog ${game.bossHp} / ${game.bossMaxHp}`
    : 'Geen schade aan de baas · jij verliest 1 HP';

  if (result.winner) {
    effectText += ' · De schat is vrij!';
  } else if (!game.bossActive) {
    effectText = 'De eindbaas is verslagen! Wie op vak 63 staat wint — anders loop naar de schat.';
  } else if (result.retreatedTo != null) {
    effectText += ` · terug naar vak ${result.retreatedTo} — loop opnieuw naar 62/63 om aan te vallen`;
  }

  els.eventResult.classList.remove('hidden');
  els.eventResult.className = `event-card__result event-card__result--${success ? 'success' : 'fail'}`;
  els.eventResult.innerHTML = `
    <div class="result-roll">🎲 ${rollLabel}</div>
    <div class="result-vs">vs DC ${dcDisplay}</div>
    <p class="result-effect">${effectText}</p>
  `;

  if (result.winner) {
    finishBossFlow({ handler: () => showWinModal(result.winner) });
    return;
  }

  finishBossFlow({ handler: () => endBossTurn(onComplete) });
}

function endBossTurn(onComplete) {
  advanceTurn();
  onComplete?.();
}

function showPathModal(config, spaceNum, onComplete) {
  els.pathIcon.textContent = config.icon || '🚶';
  els.pathSpace.textContent = `Vak ${spaceNum ?? '?'}`;
  els.pathTitle.textContent = config.name;
  els.pathFlavor.textContent = config.flavor;

  els.pathModal.classList.remove('hidden');
  document.body.classList.add('modal-open');

  const onClose = () => {
    els.pathModal.classList.add('hidden');
    if (els.eventModal.classList.contains('hidden') && els.winModal.classList.contains('hidden')) {
      document.body.classList.remove('modal-open');
    }
    onComplete?.();
  };

  els.pathClose.onclick = onClose;
  setTimeout(() => els.pathClose.focus(), 100);
}

function continueAfterLand(result, onComplete) {
  if (result.winner) {
    showWinModal(result.winner);
    return;
  }

  if (result.needsBoss) {
    updateBossPanel();
    showBossModal(onComplete);
    return;
  }

  if (result.needsEvent && result.eventConfig) {
    const spaceNum = result.events.find((e) => e.type === 'landed')?.spaceNum
      ?? game.currentPlayer?.position;
    showEventModal(result.eventConfig, spaceNum, onComplete);
    return;
  }

  if (result.needsPath && result.pathConfig) {
    const spaceNum = result.events.find((e) => e.type === 'path')?.spaceNum
      ?? game.currentPlayer?.position;
    showPathModal(result.pathConfig, spaceNum, onComplete ?? (() => {
      advanceTurn();
    }));
    return;
  }

  if (onComplete) {
    onComplete();
    return;
  }

  advanceTurn();
}

function showEventModal(config, spaceNum, onComplete) {
  activeEvent = { config, spaceNum, onComplete, submitted: false, phase: 'd20' };

  els.eventModal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  populateEventModal(config, spaceNum);

  setTimeout(() => els.eventDiceInput.focus(), 100);
}

function finishEventFlow(onClose) {
  els.eventSubmit.disabled = true;
  els.eventDiceInput.disabled = true;
  els.eventNat20.disabled = true;
  els.eventNat1.disabled = true;
  els.eventClose.disabled = false;
  els.eventClose.textContent = onClose?.chainLabel ?? 'Doorgaan op avontuur';
  activeEvent.onClose = onClose?.handler;
  els.eventClose.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function endEventTurn(onComplete) {
  advanceTurn();
  onComplete?.();
}

function formatEventMoveResult(result) {
  if (result.nat1) {
    return 'Nat 1 — geen beweging · −1 HP · beurt voorbij · volgende beurt overslaan';
  }

  if (result.passTurn) {
    return 'Geen beweging · beurt voorbij · DC-streak reset';
  }

  const b = result.moveBreakdown;
  const roll = result.overshootRoll ?? '—';
  const dc = result.effectiveDc ?? '—';
  let text = b
    ? `${b.total} vakje(s) (${b.base} basis + ${b.extra} overshoot, roll ${roll} vs DC ${dc})`
    : `${result.moveSteps} vakje(s) vooruit`;

  if (result.nat20) text += ' · Nat 20: dubbele basisstap · +1 HP';

  const p = game.currentPlayer;
  const streakBonus = getDcBonus(p);
  if (streakBonus) text += ` · volgende check +${streakBonus} DC`;
  const mod = getDcModifier(p);
  if (mod) text += ` · volgende check ${mod} DC`;

  if (result.needsEvent) text += ' · nog een event!';
  if (result.needsPath) text += ' · rustig pad!';
  if (result.needsBoss) text += ' · eindbaas!';

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
  if (game.bossActive && !game.gameOver && cp && isOnBossArena(cp.position)) {
    showBossModal();
  }
}

function handleEventSubmit() {
  if (activeBoss) {
    handleBossSubmit();
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
      '<strong>Ongeldige worp</strong><p>Vul een geheel getal ≥ 1 in (totaal met modifiers), of vink Nat 1 / Nat 20 aan.</p>';
    return;
  }

  activeEvent.submitted = true;

  const effectiveDc = getEffectiveDc(player, config.dc);
  const isNat1 = !nat20 && (nat1 || roll === 1);
  const success = !isNat1 && (nat20 || (roll !== null && roll >= effectiveDc));
  const rollLabel = nat20
    ? (roll != null ? `${roll} — Nat 20!` : 'Nat 20!')
    : isNat1
      ? (roll != null ? `${roll} — Nat 1!` : 'Nat 1!')
      : String(roll ?? '—');
  const dcDisplay = formatDcDisplay(config.dc, player);

  let result;
  try {
    result = game.resolveEvent(roll, config, { nat20, nat1 });
    describeEvents(result.events);
    renderTokens();
    renderPlayers();
  } catch (err) {
    console.error(err);
    els.eventResult.className = 'event-card__result event-card__result--fail';
    els.eventResult.innerHTML = '<p>Kon het effect niet toepassen. Je kunt toch doorgaan.</p>';
    finishEventFlow({ handler: () => endEventTurn(onComplete) });
    return;
  }

  els.eventRollArea.classList.add('is-hidden');
  els.eventCheck.classList.add('is-hidden');
  showEventOutcomeInHeader(success, config);
  els.eventResult.classList.remove('hidden');
  els.eventResult.className = `event-card__result event-card__result--${success ? 'success' : 'fail'}`;
  els.eventResult.innerHTML = `
    <div class="result-roll">🎲 ${rollLabel}</div>
    <div class="result-vs">vs DC ${dcDisplay}</div>
    <p class="result-effect">${formatEventMoveResult(result)}</p>
  `;

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
    finishEventFlow({
      chainLabel: 'Rustig pad →',
      handler: () => {
        closeEventModal();
        showPathModal(result.pathConfig, nextSpace, () => endEventTurn(onComplete));
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
        showBossModal(onComplete);
      },
    });
    return;
  }

  finishEventFlow({ handler: () => endEventTurn(onComplete) });
}

els.eventNat20.addEventListener('change', () => {
  if (els.eventNat20.checked) els.eventNat1.checked = false;
});
els.eventNat1.addEventListener('change', () => {
  if (els.eventNat1.checked) els.eventNat20.checked = false;
});

els.eventSubmit.addEventListener('click', handleEventSubmit);
els.eventDiceInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleEventSubmit();
});
els.eventClose.addEventListener('click', () => {
  if (els.eventClose.disabled) return;
  const handler = activeBoss?.onClose ?? activeEvent?.onClose;
  closeEventModal();
  handler?.();
});

function showWinModal(winner) {
  els.winModal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  els.winTitle.textContent = '🏆 Overwinning!';
  els.winText.textContent = `${winner.name} heeft de Draken-schat bereikt en wint het avontuur!`;
}

function handleMoveResult(result) {
  describeEvents(result.events);
  renderTokens();
  continueAfterLand(result);
}

els.addBtn.addEventListener('click', () => {
  const name = els.playerName.value.trim();
  if (!name) return;
  if (game.players.length >= 8) {
    addLog('Maximaal 8 spelers!', 'warn');
    return;
  }

  game.addPlayer(name, COLORS[game.players.length % COLORS.length]);
  els.playerName.value = '';
  renderBoard();
  renderPlayers();
  addLog(`${name} voegt zich bij het avontuur!`);
});

els.playerName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') els.addBtn.click();
});

function clearDiceInput() {
  els.diceInput.value = '';
  els.diceInput.focus();
}

els.moveBtn.addEventListener('click', () => {
  const steps = parse2d6Total(els.diceInput.value);
  if (steps === null) {
    addLog('Vul het totaal van 2× D6 in (2–12).', 'warn');
    return;
  }

  const result = game.move(steps);
  handleMoveResult(result);
  clearDiceInput();
});

els.diceInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') els.moveBtn.click();
});

els.hpMinusBtn.addEventListener('click', () => adjustCurrentPlayerHp(-1));
els.hpPlusBtn.addEventListener('click', () => adjustCurrentPlayerHp(1));

els.winClose.addEventListener('click', () => {
  els.winModal.classList.add('hidden');
  document.body.classList.remove('modal-open');
  game.reset();
  if (typeof rebuildBoard === 'function') rebuildBoard();
  els.gameLog.innerHTML = '';
  updateBossPanel();
  renderBoard();
  renderPlayers();
  addLog('Nieuw avontuur — het bord is opnieuw geschud!');
});

renderBoard();
renderPlayers();
