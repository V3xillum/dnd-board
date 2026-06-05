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
  combatRail: document.getElementById('combat-rail'),
  combatRailBoss: document.getElementById('combat-rail-boss'),
  combatRailPitsSection: document.getElementById('combat-rail-pits-section'),
  ambushPitsList: document.getElementById('ambush-pits-list'),
  eventCard: document.querySelector('#event-modal .event-card'),
  eventTurnBanner: document.getElementById('event-turn-banner'),
  eventTurnName: document.getElementById('event-turn-name'),
  eventTurnDot: document.getElementById('event-turn-dot'),
  rulesModal: document.getElementById('rules-modal'),
  rulesOpenBtn: document.getElementById('rules-open-btn'),
  rulesCloseBtn: document.getElementById('rules-close-btn'),
  rulesCloseBottom: document.getElementById('rules-close-bottom'),
  legendRulesLink: document.getElementById('legend-rules-link'),
};

function syncModalScrollLock() {
  const open =
    !els.eventModal.classList.contains('hidden') ||
    !els.pathModal.classList.contains('hidden') ||
    !els.winModal.classList.contains('hidden') ||
    (els.rulesModal && !els.rulesModal.classList.contains('hidden'));
  document.body.classList.toggle('modal-open', open);
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
  ambush: 'cell--ambush',
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

function getHpChangeFromEvents(events) {
  return events?.find((e) => e.type === 'hp-change') ?? null;
}

function hasDeathInEvents(events) {
  return events?.some((e) => e.type === 'death') ?? false;
}

function getDeathFromEvents(events) {
  return events?.find((e) => e.type === 'death') ?? null;
}

function setEventResultClass(success, events) {
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
        <p class="result-death__detail">Terug naar start · ${deathEv.hp} / ${player?.maxHp ?? deathEv.hp} HP${bonusNote}</p>
      </div>
    `;
  }

  const hpEv = getHpChangeFromEvents(events);
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

function renderBossCombatCard() {
  if (!game.bossActive || !game.bossConfig) return '';

  const { bossConfig, bossHp, bossMaxHp } = game;
  const cp = game.currentPlayer;
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
      <p class="combat-card__hp-label">Nog ${bossHp} / ${bossMaxHp} schade te lijden</p>
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
  const hasPits = pits.length > 0;

  if (!hasBoss && !hasPits) {
    els.combatRail.classList.add('hidden');
    if (els.combatRailBoss) els.combatRailBoss.innerHTML = '';
    if (els.ambushPitsList) els.ambushPitsList.innerHTML = '';
    if (els.combatRailPitsSection) els.combatRailPitsSection.classList.add('hidden');
    return;
  }

  els.combatRail.classList.remove('hidden');

  if (els.combatRailBoss) {
    els.combatRailBoss.innerHTML = hasBoss ? renderBossCombatCard() : '';
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
    && (activeAmbush !== null || activeBoss !== null || activeEvent !== null);
  els.moveBtn.disabled = inAmbush || onBossArena || modalNeedsInput;
  els.diceInput.disabled = inAmbush || onBossArena || modalNeedsInput;
  updateHpControls();

  if (window.isMultiplayerHost?.() && inAmbush && activeAmbush === null
      && els.eventModal.classList.contains('hidden')) {
    showAmbushModal();
  } else if (window.isMultiplayerHost?.() && onBossArena && activeBoss === null
      && els.eventModal.classList.contains('hidden')) {
    showBossModal();
  }
}

function prependLogEntry(message, type = '') {
  const li = document.createElement('li');
  li.className = type ? `log-entry log-entry--${type}` : 'log-entry';
  li.textContent = message;
  els.gameLog.prepend(li);

  while (els.gameLog.children.length > 30) {
    els.gameLog.removeChild(els.gameLog.lastChild);
  }
}

function addLog(message, type = '') {
  prependLogEntry(message, type);
  window.syncLastEvent?.(message, type);
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
        const dcLabel = String(ev.effectiveDc ?? ev.dc);
        const nat = ev.nat20 ? ' · Kritiek succes!' : ev.nat1 ? ' · Kritiek mislukking!' : '';
        addLog(
          `${ev.ability} check: ${ev.roll ?? '—'} vs DC ${dcLabel} — ${ev.success ? 'Geslaagd!' : 'Mislukt!'}${nat}`,
          ev.success ? 'success' : 'fail',
        );
        break;
      }
      case 'nat20':
        addLog(`${ev.player}: Nat 20!`, 'success');
        break;
      case 'nat1':
        addLog(`${ev.player}: Nat 1!`, 'fail');
        break;
      case 'event-steps':
        addLog(`${ev.player}: ${ev.total} vakje(s) vooruit`, 'success');
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
        const nat = ev.nat20 ? ' · Kritiek succes!' : ev.nat1 ? ' · Kritiek mislukking!' : '';
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
      case 'ambush-start':
        addLog(
          `🕳️ ${ev.icon} ${ev.name} — ${ev.player} valt in de put op vak ${ev.spaceNum}! (${ev.ambushHp} HP)`,
          'warn',
        );
        break;
      case 'ambush-join':
        addLog(
          `🕳️ ${ev.player} valt bij ${ev.name} in de put op vak ${ev.spaceNum} (${ev.ambushHp} HP)${ev.allies?.length ? ` — al aanwezig: ${ev.allies.join(', ')}` : ''}`,
          'warn',
        );
        break;
      case 'ambush-d20': {
        const nat = ev.nat20 ? ' · Kritiek succes!' : ev.nat1 ? ' · Kritiek mislukking!' : '';
        addLog(
          `Ambush ${ev.ambushName}: ${ev.ability} ${ev.roll ?? '—'} vs DC ${ev.effectiveDc} — ${ev.success ? 'succes' : 'faal'} — ambusher ${ev.ambushHp} HP, speler ${ev.playerHp} HP${nat}`,
          ev.success ? 'success' : 'fail',
        );
        break;
      }
      case 'ambush-hit':
        addLog(
          `Treffer op ${ev.ambushName}! Nog ${ev.ambushHp} ambusher-HP · ${ev.player} op ${ev.playerHp} HP`,
          'success',
        );
        break;
      case 'ambush-end':
        if (ev.success) {
          const freed = ev.freedPlayers?.length ? ` — vrij: ${ev.freedPlayers.join(', ')}` : '';
          addLog(
            `🕳️ ${ev.ambushName} verslagen op vak ${ev.spaceNum}!${freed}`,
            'success',
          );
        } else if (ev.pitContinues) {
          addLog(
            `🕳️ ${ev.player} valt uit in de put — ${ev.ambushName} blijft voor de anderen`,
            'warn',
          );
        } else {
          addLog(`🕳️ ${ev.player} valt uit in de put — ${ev.ambushName} wint de ronde`, 'warn');
        }
        break;
      default:
        break;
    }
  });
}

function formatDcDisplay(baseDc, player) {
  return String(getEffectiveDc(player, baseDc));
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
let activeAmbush = null;
let syncedActiveModal = null;
let pathModalCallback = null;

function serializeModalConfig(config) {
  if (!config) return null;
  return {
    name: config.name,
    icon: config.icon,
    flavor: config.flavor,
    ability: config.ability,
    dc: config.dc,
    successText: config.successText,
    failText: config.failText,
  };
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
  els.eventSubmit.classList.remove('is-hidden');
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
  els.eventModal.classList.add('hidden');
  els.eventModal.classList.remove('event-modal--spectator');
  els.pathModal.classList.add('hidden');
  els.pathModal.classList.remove('path-modal--spectator');
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
      els.eventAbility.textContent = config.ability;
      els.eventDc.textContent = formatDcDisplay(config.dc, player);
      els.eventCheck.insertAdjacentHTML('beforeend', ambushHpBarHtml());
    }
  } else if (type === 'boss') {
    els.eventIcon.textContent = config.icon || '🛡️';
    els.eventSpace.textContent = 'Eindbaas';
    els.eventTitle.textContent = `⚔️ ${config.name}`;
    els.eventTitle.className = 'event-card__title';
    els.eventFlavor.textContent = config.flavor;
    els.eventFlavor.className = 'event-card__flavor';
    els.eventAbility.textContent = config.ability;
    els.eventDc.textContent = formatDcDisplay(config.dc, player);
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

  if (type === 'path') {
    els.pathIcon.textContent = config?.icon || '🚶';
    els.pathSpace.textContent = `Vak ${spaceNum ?? '?'}`;
    els.pathTitle.textContent = config?.name || '';
    els.pathFlavor.textContent = config?.flavor || '';
    els.pathModal.classList.add('path-modal--spectator');
    els.pathModal.classList.remove('hidden');
    syncModalScrollLock();
    return;
  }

  if (type === 'win') {
    els.winTitle.textContent = outcome?.title ?? '🏆 Overwinning!';
    els.winText.textContent = outcome?.text ?? '';
    els.winModal.classList.add('win-modal--spectator');
    els.winModal.classList.remove('hidden');
    syncModalScrollLock();
    return;
  }

  if (!config) return;

  populateSpectatorCombatModal(type, config, spaceNum);
  els.eventModal.classList.add('event-modal--spectator');
  els.eventRollArea.classList.add('is-hidden');
  els.eventNat20.disabled = true;
  els.eventNat1.disabled = true;
  els.eventDiceInput.disabled = true;

  if (phase === 'input') {
    els.eventCheck.classList.remove('is-hidden');
    els.eventResult.classList.remove('hidden');
    els.eventResult.className = 'event-card__result';
    els.eventResult.innerHTML = '<p class="spectator-wait">Host voert de check uit…</p>';
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
  syncModalScrollLock();
}

function removeCombatHpBars() {
  els.eventCheck.querySelector('.event-card__boss-hp')?.remove();
}

function removeAmbushModalExtras() {
  els.eventCheck.querySelector('.event-card__ambush-fighter-wrap')?.remove();
  els.eventCard?.style.removeProperty('--ambush-fighter-color');
}

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
  const player = game.currentPlayer;
  updateEventModalTurnPlayer();

  removeCombatHpBars();
  removeAmbushModalExtras();
  els.eventCard?.classList.remove('event-card--ambush');
  els.eventIcon.textContent = config.icon || '🎲';
  els.eventSpace.textContent = `Vak ${spaceNum ?? '?'}`;
  resetEventHeader(config);
  els.eventAbility.textContent = config.ability;
  els.eventDc.textContent = formatDcDisplay(config.dc, player);
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
  els.eventClose.disabled = true;
  els.eventClose.textContent = 'Doorgaan op avontuur';
  els.eventSubmit.disabled = false;
  els.eventSubmit.textContent = 'Bevestigen';
  els.eventDiceInput.disabled = false;
}

function closeEventModal() {
  els.eventModal.classList.add('hidden');
  syncModalScrollLock();
  activeEvent = null;
  activeBoss = null;
  activeAmbush = null;
  els.eventCard?.classList.remove('event-card--ambush');
  removeAmbushModalExtras();
  if (window.isMultiplayerHost?.()) {
    const modalType = syncedActiveModal?.type;
    if (modalType === 'event' || modalType === 'boss' || modalType === 'ambush') {
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
  els.eventDiceInput.placeholder = '—';
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

  removeCombatHpBars();
  els.eventCheck.insertAdjacentHTML('beforeend', bossHpBarHtml());
}

function ambushHpBarHtml() {
  const pit = game.getCurrentPlayerPit();
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

  return `
    <div class="event-card__ambush-fighter-wrap">
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
          <p class="ambush-modal__pit-note">Vecht uit de put op vak ${pit.spaceNum}${allies.length ? ' · samen met je bondgenoten' : ''}</p>
        </div>
      </div>
      ${alliesHtml}
    </div>
  `;
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

  els.eventAbility.textContent = config.ability;
  els.eventDc.textContent = formatDcDisplay(config.dc, player);
  els.eventCheck.classList.remove('is-hidden');

  els.eventDiceInput.min = '1';
  els.eventDiceInput.removeAttribute('max');
  els.eventDiceInput.placeholder = '—';
  els.eventNat20.checked = false;
  els.eventNat20.disabled = false;
  els.eventNat1.checked = false;
  els.eventNat1.disabled = false;
  els.eventResult.className = 'event-card__result hidden';
  els.eventRollArea.classList.remove('is-hidden');
  els.eventClose.disabled = true;
  els.eventClose.textContent = 'Doorgaan op avontuur';
  els.eventSubmit.disabled = false;
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

  activeAmbush = { onComplete, submitted: false };
  activeBoss = null;
  activeEvent = null;

  els.eventModal.classList.remove('hidden');
  els.eventModal.classList.remove('event-modal--spectator');
  syncModalScrollLock();
  populateAmbushModal();
  updateAmbushPanel();
  syncModalInput('ambush', game.getCurrentPlayerPit()?.config, game.currentPlayer?.position, {
    submitLabel: 'Vechten',
  });

  setTimeout(() => els.eventDiceInput.focus(), 100);
}

function showBossModal(onComplete) {
  if (!game.bossActive || !game.bossConfig) {
    onComplete?.();
    return;
  }

  activeBoss = { onComplete, submitted: false };
  activeEvent = null;
  activeAmbush = null;

  els.eventModal.classList.remove('hidden');
  els.eventModal.classList.remove('event-modal--spectator');
  syncModalScrollLock();
  populateBossModal();
  updateBossPanel();
  syncModalInput('boss', game.bossConfig, null, { submitLabel: 'Aanvallen' });

  setTimeout(() => els.eventDiceInput.focus(), 100);
}

function finishBossFlow(onClose) {
  resetEventModalHostControls();
  els.eventSubmit.disabled = true;
  els.eventDiceInput.disabled = true;
  els.eventNat20.disabled = true;
  els.eventNat1.disabled = true;
  els.eventClose.disabled = false;
  els.eventClose.textContent = onClose?.chainLabel ?? 'Doorgaan op avontuur';
  if (activeBoss) activeBoss.onClose = onClose?.handler;
  els.eventClose.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function handleAmbushSubmit() {
  if (!activeAmbush || activeAmbush.submitted || !game.isCurrentPlayerInAmbush()) return;

  const { onComplete } = activeAmbush;
  const player = game.currentPlayer;
  const pit = game.getCurrentPlayerPit();
  const config = pit?.config;
  const spaceNum = player?.position;
  if (!config || spaceNum == null) return;

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

  activeAmbush.submitted = true;

  const effectiveDc = getEffectiveDc(player, config.dc);
  const isNat1 = !nat20 && (nat1 || roll === 1);
  const success = !isNat1 && (nat20 || (roll !== null && roll >= effectiveDc));
  const rollLabel = nat20
    ? (roll != null ? `${roll} — Kritiek succes!` : 'Kritiek succes!')
    : isNat1
      ? (roll != null ? `${roll} — Kritiek mislukking!` : 'Kritiek mislukking!')
      : String(roll ?? '—');
  const dcDisplay = formatDcDisplay(config.dc, player);

  let result;
  try {
    result = game.resolveAmbushRoll(roll, { nat20, nat1 });
    describeEvents(result.events);
    renderTokens();
    renderPlayers();
    updateAmbushPanel();
  } catch (err) {
    console.error(err);
    els.eventResult.className = 'event-card__result event-card__result--fail';
    els.eventResult.innerHTML = '<p>Kon de put niet verwerken.</p>';
    syncModalOutcome('ambush', spaceNum, config, {
      resultClassName: els.eventResult.className,
      resultHtml: els.eventResult.innerHTML,
    });
    finishAmbushFlow({
      handler: () => {
        finishAmbushFight(onComplete);
        advanceTurn();
      },
    });
    return;
  }

  els.eventRollArea.classList.add('is-hidden');
  els.eventCheck.classList.add('is-hidden');
  els.eventTitle.textContent = success ? 'Treffer!' : 'Mis!';
  els.eventTitle.className = `event-card__title event-card__title--${success ? 'success' : 'fail'}`;
  els.eventFlavor.textContent = success ? (config.successText || '') : (config.failText || '');
  els.eventFlavor.className = `event-card__flavor event-card__flavor--outcome event-card__flavor--${success ? 'success' : 'fail'}`;

  let effectText = success
    ? `Ambusher verliest 1 HP — nog ${result.ambushHp} / ${result.ambushMaxHp}`
    : result.nat1
      ? 'Mislukt + kritieke mislukking — jij verliest 2 HP'
      : 'Geen schade aan de ambusher · jij verliest 1 HP';

  if (hasDeathInEvents(result.events)) {
    effectText = result.ambushEnded
      ? 'Uitgevallen — terug naar start · de put gaat verder voor de anderen'
      : 'Uitgevallen — terug naar start';
  } else if (result.ambushEnded) {
    effectText = success
      ? 'De put is opgeheven — je mag weer dobbelstenen op dit vak!'
      : 'Je valt uit — de put is voorbij · terug naar start';
  }

  els.eventResult.classList.remove('hidden');
  setEventResultClass(success, result.events);
  const hpHtml = buildResultHpHtml(result.events, game.currentPlayer);

  els.eventResult.innerHTML = `
    <div class="result-roll">🎲 ${rollLabel}</div>
    <div class="result-vs">vs DC ${dcDisplay}</div>
    <p class="result-effect">${effectText}</p>
    ${hpHtml}
  `;

  syncModalOutcome('ambush', spaceNum, config, {
    title: els.eventTitle.textContent,
    titleClass: els.eventTitle.className,
    flavor: els.eventFlavor.textContent,
    flavorClass: els.eventFlavor.className,
    resultClassName: els.eventResult.className,
    resultHtml: els.eventResult.innerHTML,
  });
  window.syncAfterAction?.();

  finishAmbushFlow({
    handler: () => {
      finishAmbushFight(onComplete);
      advanceTurn();
    },
  });
}

/** Sluit put-modal van vorige speler; daarna advanceTurn opent zo nodig gevecht voor volgende speler in de put. */
function finishAmbushFight(onComplete) {
  closeEventModal();
  onComplete?.();
}

function finishAmbushFlow(onClose) {
  resetEventModalHostControls();
  els.eventSubmit.disabled = true;
  els.eventDiceInput.disabled = true;
  els.eventNat20.disabled = true;
  els.eventNat1.disabled = true;
  els.eventClose.disabled = false;
  els.eventClose.textContent = onClose?.chainLabel ?? 'Doorgaan op avontuur';
  if (activeAmbush) activeAmbush.onClose = onClose?.handler;
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
      '<strong>Ongeldige worp</strong><p>Vul een worp in, of kies Kritiek succes / Kritiek mislukking.</p>';
    return;
  }

  activeBoss.submitted = true;

  const effectiveDc = getEffectiveDc(player, config.dc);
  const isNat1 = !nat20 && (nat1 || roll === 1);
  const success = !isNat1 && (nat20 || (roll !== null && roll >= effectiveDc));
  const rollLabel = nat20
    ? (roll != null ? `${roll} — Kritiek succes!` : 'Kritiek succes!')
    : isNat1
      ? (roll != null ? `${roll} — Kritiek mislukking!` : 'Kritiek mislukking!')
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
    syncModalOutcome('boss', null, config, {
      title: els.eventTitle.textContent,
      titleClass: els.eventTitle.className,
      flavor: els.eventFlavor.textContent,
      flavorClass: els.eventFlavor.className,
      resultClassName: els.eventResult.className,
      resultHtml: els.eventResult.innerHTML,
    });
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
    : result.nat1
      ? 'Mislukt + kritieke mislukking — jij verliest 2 HP'
      : 'Geen schade aan de baas · jij verliest 1 HP';

  if (result.winner) {
    effectText += ' · De schat is vrij!';
  } else if (!game.bossActive) {
    effectText = 'De eindbaas is verslagen! Wie op vak 63 staat wint — anders loop naar de schat.';
  } else if (result.retreatedTo != null) {
    effectText += ` · terug naar vak ${result.retreatedTo} — loop opnieuw naar 62/63 om aan te vallen`;
  }

  if (hasDeathInEvents(result.events)) {
    effectText = 'Uitgevallen — terug naar start';
  }

  const bossHpHtml = buildResultHpHtml(result.events, game.currentPlayer);

  els.eventResult.classList.remove('hidden');
  setEventResultClass(success, result.events);
  els.eventResult.innerHTML = `
    <div class="result-roll">🎲 ${rollLabel}</div>
    <div class="result-vs">vs DC ${dcDisplay}</div>
    <p class="result-effect">${effectText}</p>
    ${bossHpHtml}
  `;

  syncModalOutcome('boss', null, config, {
    title: els.eventTitle.textContent,
    titleClass: els.eventTitle.className,
    flavor: els.eventFlavor.textContent,
    flavorClass: els.eventFlavor.className,
    resultClassName: els.eventResult.className,
    resultHtml: els.eventResult.innerHTML,
  });

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

function closePathModal() {
  if (els.pathModal.classList.contains('hidden')) return;
  els.pathModal.classList.add('hidden');
  els.pathModal.classList.remove('path-modal--spectator');
  syncModalScrollLock();
  clearSyncedActiveModal();
  const cb = pathModalCallback;
  pathModalCallback = null;
  cb?.();
}

function showPathModal(config, spaceNum, onComplete) {
  closeEventModal();
  els.pathIcon.textContent = config.icon || '🚶';
  els.pathSpace.textContent = `Vak ${spaceNum ?? '?'}`;
  els.pathTitle.textContent = config.name;
  els.pathFlavor.textContent = config.flavor;

  pathModalCallback = onComplete ?? null;
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

  setTimeout(() => els.pathClose.focus(), 100);
}

function continueAfterLand(result, onComplete) {
  if (result.winner) {
    showWinModal(result.winner);
    return;
  }

  if (result.needsAmbush) {
    updateAmbushPanel();
    showAmbushModal(onComplete);
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
  activeBoss = null;
  activeAmbush = null;

  els.eventModal.classList.remove('hidden');
  els.eventModal.classList.remove('event-modal--spectator');
  syncModalScrollLock();
  populateEventModal(config, spaceNum);
  syncModalInput('event', config, spaceNum, { submitLabel: 'Bevestigen' });

  setTimeout(() => els.eventDiceInput.focus(), 100);
}

function finishEventFlow(onClose) {
  resetEventModalHostControls();
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
  if (result.needsPath) text += ' · rustig pad!';
  if (result.needsBoss) text += ' · eindbaas!';
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
      showBossModal();
    }
  }

  window.syncAfterAction?.();
}

function handleEventSubmit() {
  if (activeAmbush) {
    handleAmbushSubmit();
    return;
  }
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
    renderTokens();
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
    finishEventFlow({
      chainLabel: 'Rustig pad →',
      handler: () => {
        closeEventModal();
        showPathModal(result.pathConfig, nextSpace, () => endEventTurn(onComplete));
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
  const handler = activeAmbush?.onClose ?? activeBoss?.onClose ?? activeEvent?.onClose;
  closeEventModal();
  handler?.();
});

els.pathClose.addEventListener('click', closePathModal);
els.pathClose.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !els.pathModal.classList.contains('hidden')) closePathModal();
});

function showWinModal(winner) {
  els.winModal.classList.remove('hidden');
  els.winModal.classList.remove('win-modal--spectator');
  syncModalScrollLock();
  els.winTitle.textContent = '🏆 Overwinning!';
  els.winText.textContent = `${winner.name} heeft de Draken-schat bereikt en wint het avontuur!`;
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

function handleMoveResult(result) {
  describeEvents(result.events);
  renderTokens();
  continueAfterLand(result);
  window.syncAfterAction?.();
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
  window.syncAfterAction?.();
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

els.rulesOpenBtn?.addEventListener('click', showRulesModal);
els.legendRulesLink?.addEventListener('click', showRulesModal);
els.rulesCloseBtn?.addEventListener('click', closeRulesModal);
els.rulesCloseBottom?.addEventListener('click', closeRulesModal);
els.rulesModal?.addEventListener('click', (e) => {
  if (e.target === els.rulesModal) closeRulesModal();
});

els.winClose.addEventListener('click', () => {
  els.winModal.classList.add('hidden');
  syncModalScrollLock();
  clearSyncedActiveModal();
  game.reset();
  if (typeof rebuildBoard === 'function') rebuildBoard();
  els.gameLog.innerHTML = '';
  updateBossPanel();
  updateAmbushPanel();
  renderBoard();
  renderPlayers();
  addLog('Nieuw avontuur — het bord is opnieuw geschud!');
  window.syncAfterAction?.();
  window.resetMultiplayerLog?.();
});

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
};
window.appendRemoteLogEntry = (message, type = '') => {
  prependLogEntry(message, type);
};
window.clearGameLog = () => {
  els.gameLog.innerHTML = '';
};
window.setMultiplayerReadOnly = (readOnly) => {
  document.querySelector('.app')?.classList.toggle('app--spectator', readOnly);
  els.playerName.disabled = readOnly;
  els.addBtn.disabled = readOnly;
  if (readOnly) {
    els.moveBtn.disabled = true;
    els.diceInput.disabled = true;
    els.hpMinusBtn.disabled = true;
    els.hpPlusBtn.disabled = true;
  } else {
    updateTurnUI();
  }
};

renderBoard();
renderPlayers();
window.initMultiplayer?.();
