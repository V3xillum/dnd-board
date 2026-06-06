/**
 * Bord-geometrie: spiral layout, vak-posities, pad-richting.
 * Laadt vóór js/game.js — leest GAME_SETTINGS.board.
 * IIFE: voorkomt dubbele const-declaraties in gedeelde script-scope (geen bundler).
 */
(function () {
  const { board: boardSettings } = window.GAME_SETTINGS;
  const BOARD_SIZE = boardSettings.boardSize;
  const PATH_SPACES = boardSettings.pathSpaces;
  const FINISH_SPACE = boardSettings.finishSpace;

  function isCenterCell(r, c) {
    const start = Math.floor(BOARD_SIZE / 2) - 1;
    return r >= start && r <= start + 2 && c >= start && c <= start + 2;
  }

  function getCenterAnchor() {
    const start = Math.floor(BOARD_SIZE / 2) - 1;
    return { row: start, col: start };
  }

  function buildSpiralLayout(size = BOARD_SIZE) {
    const grid = Array.from({ length: size }, () => Array(size).fill(null));
    let n = 1;
    let top = 0;
    let bottom = size - 1;
    let left = 0;
    let right = size - 1;

    function assign(r, c) {
      if (n > PATH_SPACES) return;
      if (isCenterCell(r, c)) return;
      grid[r][c] = n++;
    }

    while (n <= PATH_SPACES && top <= bottom && left <= right) {
      for (let c = left; c <= right && n <= PATH_SPACES; c++) assign(top, c);
      top++;
      for (let r = top; r <= bottom && n <= PATH_SPACES; r++) assign(r, right);
      right--;
      for (let c = right; c >= left && n <= PATH_SPACES; c--) assign(bottom, c);
      bottom--;
      for (let r = bottom; r >= top && n <= PATH_SPACES; r--) assign(r, left);
      left++;
    }

    const anchor = getCenterAnchor();
    grid[anchor.row][anchor.col] = FINISH_SPACE;
    return grid;
  }

  function buildSpacePositions(grid) {
    const positions = {};
    grid.forEach((row, r) => {
      row.forEach((num, c) => {
        if (num !== null) positions[num] = { row: r, col: c };
      });
    });
    return positions;
  }

  function getPathDirection(positions, fromSpace) {
    if (fromSpace >= FINISH_SPACE) return null;

    const from = positions[fromSpace];
    const to = positions[fromSpace + 1];
    if (!from || !to) return null;

    if (to.col > from.col) return 'right';
    if (to.col < from.col) return 'left';
    if (to.row > from.row) return 'down';
    if (to.row < from.row) return 'up';
    return null;
  }

  function isCenterCovered(r, c, num) {
    if (!isCenterCell(r, c)) return false;
    const anchor = getCenterAnchor();
    return !(r === anchor.row && c === anchor.col && num === FINISH_SPACE);
  }

  window.buildSpiralLayout = buildSpiralLayout;
  window.buildSpacePositions = buildSpacePositions;
  window.getPathDirection = getPathDirection;
  window.isCenterCell = isCenterCell;
  window.isCenterCovered = isCenterCovered;
  window.getCenterAnchor = getCenterAnchor;
})();
