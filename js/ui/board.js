/**
 * Board render, mystery cell effects.
 * Vereist: dom (els, game), applyCellStyle, escapeAttr
 */
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

function snapshotSpecialSpaces() {
  const snap = {};
  const spaces = window.SPECIAL_SPACES ?? {};
  Object.entries(spaces).forEach(([num, special]) => {
    if (!special) return;
    snap[num] = `${special.type}|${special.category ?? ''}|${special.icon ?? ''}`;
  });
  return snap;
}

function isMysteryUnrevealedFingerprint(fp) {
  return fp === 'mystery|mystery|❓';
}

function isMysteryRevealedFingerprint(fp) {
  if (!fp) return false;
  if (fp.startsWith('path|')) return true;
  return fp.startsWith('event|ambush|');
}

function detectMysteryCellChanges(prevSnap, nextSnap) {
  const reveals = [];
  const resets = [];
  const keys = new Set([...Object.keys(prevSnap ?? {}), ...Object.keys(nextSnap ?? {})]);

  keys.forEach((key) => {
    const prev = prevSnap?.[key];
    const next = nextSnap?.[key];
    if (!prev || prev === next) return;
    if (isMysteryUnrevealedFingerprint(prev) && isMysteryRevealedFingerprint(next)) {
      reveals.push(Number(key));
    } else if (isMysteryRevealedFingerprint(prev) && isMysteryUnrevealedFingerprint(next)) {
      resets.push(Number(key));
    }
  });

  return { reveals, resets };
}

const MYSTERY_CELL_ANIM_MS = window.GAME_SETTINGS.ui.mysteryAnimMs;

function playMysteryCellEffect(spaceNum, kind) {
  if (prefersReducedMotion()) return;
  const cell = document.querySelector(`[data-space="${spaceNum}"]`);
  if (!cell) return;

  const cls = kind === 'reset' ? 'cell--mystery-pulse-reset' : 'cell--mystery-pulse-reveal';
  cell.classList.remove('cell--mystery-pulse-reveal', 'cell--mystery-pulse-reset');
  void cell.offsetWidth;
  cell.classList.add(cls);

  const ms = MYSTERY_CELL_ANIM_MS[kind] ?? 650;
  window.setTimeout(() => cell.classList.remove(cls), ms);
}

function playMysteryCellChanges({ reveals = [], resets = [] } = {}) {
  reveals.forEach((spaceNum) => playMysteryCellEffect(spaceNum, 'reveal'));
  resets.forEach((spaceNum) => playMysteryCellEffect(spaceNum, 'reset'));
}

function playMysteryResetFromEvents(events) {
  const resetEv = events?.find((e) => e.type === 'mystery-reset');
  if (resetEv?.spaceNum != null) playMysteryCellEffect(resetEv.spaceNum, 'reset');
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

