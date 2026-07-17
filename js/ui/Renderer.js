/**
 * @file Renderer.js
 * @module ui/Renderer
 *
 * The view layer. It knows how to draw the cube net, the solution and status
 * messages into the DOM – and nothing else. It contains no cube logic, no
 * validation and no solving; it only turns data into pixels.
 *
 * The controller ({@link module:app}) owns all state and calls these methods to
 * reflect it on screen.
 */

/** Display metadata for each color id. */
export const COLORS = Object.freeze([
  { name: 'White', hex: '#f5f5f5' },
  { name: 'Yellow', hex: '#ffd500' },
  { name: 'Red', hex: '#c41e3a' },
  { name: 'Orange', hex: '#ff8c1a' },
  { name: 'Blue', hex: '#0051ba' },
  { name: 'Green', hex: '#009b48' },
]);

/** Face layout on the net grid: [row, column] in a 3x4 grid of face tiles. */
const FACE_GRID_POSITION = Object.freeze({
  U: [0, 1],
  L: [1, 0],
  F: [1, 1],
  R: [1, 2],
  B: [1, 3],
  D: [2, 1],
});

/** Sticker cell order within a face tile: TL, TR, BL, BR. */
const CELL_LABELS = ['TL', 'TR', 'BL', 'BR'];

/** Plain-English name of each face letter. */
const FACE_WORDS = Object.freeze({
  U: 'top',
  D: 'bottom',
  F: 'front',
  B: 'back',
  L: 'left',
  R: 'right',
});

/**
 * Turn a move notation (e.g. `"U2"`, `"R'"`, `"F"`) into a short English
 * instruction.
 * @param {string} move
 * @returns {string}
 */
function moveToEnglish(move) {
  const face = FACE_WORDS[move[0]];
  if (move.endsWith('2')) {
    return `Turn the ${face} face twice (half turn).`;
  }
  if (move.endsWith("'")) {
    return `Turn the ${face} face counter-clockwise.`;
  }
  return `Turn the ${face} face clockwise.`;
}

export class Renderer {
  /**
   * @param {Object} elements
   * @param {HTMLElement} elements.net       Container for the cube net.
   * @param {HTMLElement} elements.status    Status / error message area.
   * @param {HTMLElement} elements.solution  Solution output area.
   * @param {HTMLElement} elements.debug     Debug output area.
   * @param {HTMLElement} [elements.guideProgress] Guided-step progress label.
   * @param {HTMLElement} [elements.guideStep]     Guided-step instruction area.
   */
  constructor({ net, status, solution, debug, guideProgress, guideStep }) {
    this.net = net;
    this.status = status;
    this.solution = solution;
    this.debug = debug;
    this.guideProgress = guideProgress || null;
    this.guideStep = guideStep || null;
    /** @type {Object<string, HTMLElement[]>} face → 4 sticker elements */
    this.cells = {};
  }

  /**
   * Build the static cube-net DOM. Each editable sticker carries `data-face`
   * and `data-index` attributes so the controller can use event delegation.
   * @param {string[]} faces Face names to render (e.g. `['U','R','F','D','L','B']`).
   * @param {Set<string>} [locked] Faces that are not editable (e.g. `D`).
   */
  buildNet(faces, locked = new Set()) {
    this.net.innerHTML = '';
    for (const face of faces) {
      const [row, col] = FACE_GRID_POSITION[face];
      const tile = document.createElement('div');
      tile.className = 'face';
      tile.style.gridRow = String(row + 1);
      tile.style.gridColumn = String(col + 1);
      tile.dataset.face = face;

      const label = document.createElement('span');
      label.className = 'face-label';
      label.textContent = face;
      tile.appendChild(label);

      const grid = document.createElement('div');
      grid.className = 'face-grid';
      this.cells[face] = [];
      for (let i = 0; i < 4; i++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'sticker';
        cell.dataset.face = face;
        cell.dataset.index = String(i);
        cell.title = `${face} ${CELL_LABELS[i]}`;
        if (locked.has(face)) {
          cell.classList.add('locked');
          cell.disabled = true;
        }
        grid.appendChild(cell);
        this.cells[face].push(cell);
      }
      tile.appendChild(grid);
      this.net.appendChild(tile);
    }
  }

  /**
   * Paint the colors of a single face.
   * @param {string} face
   * @param {number[]} colors Four color ids in TL,TR,BL,BR order.
   */
  paintFace(face, colors) {
    const cells = this.cells[face];
    for (let i = 0; i < 4; i++) {
      const color = COLORS[colors[i]];
      cells[i].style.backgroundColor = color.hex;
      cells[i].dataset.color = String(colors[i]);
    }
  }

  /**
   * Paint every face at once.
   * @param {Object<string, number[]>} facesColors
   */
  paintAll(facesColors) {
    for (const face of Object.keys(facesColors)) {
      this.paintFace(face, facesColors[face]);
    }
  }

  /**
   * Show a status line (neutral, success or error).
   * @param {string} message
   * @param {'info'|'success'|'error'} [kind]
   */
  showStatus(message, kind = 'info') {
    this.status.className = `status status-${kind}`;
    this.status.textContent = message;
  }

  /**
   * Render a list of validation errors.
   * @param {string[]} errors
   */
  showErrors(errors) {
    this.solution.innerHTML = '';
    this.showStatus('This cube cannot be solved:', 'error');
    const list = document.createElement('ul');
    list.className = 'error-list';
    for (const error of errors) {
      const item = document.createElement('li');
      item.textContent = error;
      list.appendChild(item);
    }
    this.solution.appendChild(list);
  }

  /**
   * Render a found solution.
   * @param {string[]} moves
   */
  showSolution(moves) {
    this.solution.innerHTML = '';
    if (moves.length === 0) {
      this.showStatus('This cube is already solved.', 'success');
      return;
    }
    this.showStatus(`Solved in ${moves.length} move(s).`, 'success');

    const list = document.createElement('ol');
    list.className = 'move-steps';
    for (const move of moves) {
      const item = document.createElement('li');

      const chip = document.createElement('span');
      chip.className = 'move';
      chip.textContent = move;

      const text = document.createElement('span');
      text.className = 'move-text';
      text.textContent = moveToEnglish(move);

      item.appendChild(chip);
      item.appendChild(text);
      list.appendChild(item);
    }
    this.solution.appendChild(list);
  }

  /**
   * Render the debug panel content.
   * @param {string} text
   */
  showDebug(text) {
    this.debug.textContent = text;
  }

  /**
   * Render one guided practice step: the move to perform now (with its
   * plain-English instruction) plus a progress label. When `info.done` is true
   * it shows a completion message instead.
   * @param {{done: boolean, step: number, total: number, move?: string}} info
   */
  showGuideStep(info) {
    if (!this.guideStep) return;
    this.guideStep.innerHTML = '';

    if (info.done) {
      if (this.guideProgress) {
        this.guideProgress.textContent = `Done · ${info.total} of ${info.total}`;
      }
      const msg = document.createElement('p');
      msg.className = 'guide-done';
      msg.textContent = 'Cube solved — nicely done!';
      this.guideStep.appendChild(msg);
      return;
    }

    if (this.guideProgress) {
      this.guideProgress.textContent = `Move ${info.step + 1} of ${info.total}`;
    }
    const chip = document.createElement('span');
    chip.className = 'move';
    chip.textContent = info.move;

    const text = document.createElement('span');
    text.className = 'move-text';
    text.textContent = moveToEnglish(info.move);

    this.guideStep.appendChild(chip);
    this.guideStep.appendChild(text);
  }
}
