/**
 * @file app.js
 * @module app
 *
 * The Application Controller – the one place that wires every layer together.
 *
 * It is the *only* module that talks to both the UI and the solver, enforcing
 * the strict one-directional flow required by the architecture:
 *
 * ```
 *   InputController → Validator → StickerMapper → Cube → StateEncoder
 *                                                    → LookupSolver → Renderer
 * ```
 *
 * The UI never touches the solver directly, and the solver never touches the
 * DOM; this controller passes plain data between them.
 */

import { Renderer, COLORS } from './ui/Renderer.js';
import { InputController } from './ui/InputController.js';
import { PracticeController } from './ui/PracticeController.js';
import { validate } from './core/Validator.js';
import { Cube } from './core/Cube.js';
import { CORNER_NAMES } from './core/Corner.js';
import { LookupTable } from './solver/LookupTable.js';
import { LookupSolver } from './solver/LookupSolver.js';

/** Location of the precomputed lookup table. */
const LOOKUP_URL = './assets/lookup.json';

class Application {
  constructor() {
    this.renderer = new Renderer({
      net: document.getElementById('net'),
      status: document.getElementById('status'),
      solution: document.getElementById('solution'),
      debug: document.getElementById('debug'),
      guideProgress: document.getElementById('guide-progress'),
      guideStep: document.getElementById('guide-step'),
    });
    this.input = new InputController(this.renderer, () => this.onInputChanged());
    this.practice = new PracticeController(this.input);

    /** @type {LookupSolver|null} */
    this.solver = null;
    /** @type {string[]} */
    this.lastSolution = [];
  }

  /** Boot the application: build UI, then load the solver table. */
  async start() {
    this.input.init();
    this.bindControls();
    this.renderer.showStatus('Loading solver table…', 'info');
    try {
      const table = await LookupTable.load(LOOKUP_URL);
      this.solver = new LookupSolver(table);
      this.renderer.showStatus(
        'Ready. Enter the colors of your cube, then press Solve.', 'info');
    } catch (err) {
      this.renderer.showStatus(
        `Could not load the solver table (${err.message}). ` +
        'Serve the folder over HTTP (e.g. "npm start") and reload.', 'error');
    }
  }

  /** Attach button handlers. */
  bindControls() {
    document.getElementById('solve').addEventListener('click', () => this.solve());
    document.getElementById('reset').addEventListener('click', () => {
      this.input.reset();
      this.renderer.solution.innerHTML = '';
      this.endGuide();
    });
    document.getElementById('copy').addEventListener('click', () => this.copySolution());
    document.getElementById('debug-toggle').addEventListener('change', (e) => {
      document.getElementById('debug-panel').hidden = !e.target.checked;
      if (e.target.checked) this.refreshDebug();
    });

    document.getElementById('start-guide').addEventListener('click', () => this.startGuide());
    document.getElementById('guide-next').addEventListener('click', () => this.guideNext());
    document.getElementById('guide-prev').addEventListener('click', () => this.guidePrev());
  }

  /** Called whenever the user changes a sticker. */
  onInputChanged() {
    if (document.getElementById('debug-toggle').checked) this.refreshDebug();
  }

  /** Validate the current input and, if solvable, display the solution. */
  solve() {
    if (!this.solver) {
      this.renderer.showStatus('Solver table is not loaded yet.', 'error');
      return;
    }
    const colors = this.input.getColors();
    const result = validate(colors);
    if (!result.ok) {
      this.lastSolution = [];
      this.renderer.showErrors(result.errors);
      this.refreshDebug();
      return;
    }
    const cube = new Cube(result.cube.perm, result.cube.ori);
    this.lastSolution = this.solver.solve(cube);
    this.renderer.showSolution(this.lastSolution);
    this.refreshDebug(cube);
  }

  /** Copy the last solution to the clipboard. */
  async copySolution() {
    if (this.lastSolution.length === 0) {
      this.renderer.showStatus('There is no solution to copy yet.', 'info');
      return;
    }
    const text = this.lastSolution.join(' ');
    try {
      await navigator.clipboard.writeText(text);
      this.renderer.showStatus('Solution copied to clipboard.', 'success');
    } catch {
      this.renderer.showStatus(`Copy failed. Solution: ${text}`, 'info');
    }
  }

  /**
   * Refresh the debug panel if it is visible.
   * @param {Cube} [cube] Optional already-validated cube to describe.
   */
  refreshDebug(cube) {
    if (!document.getElementById('debug-toggle').checked) return;

    const lines = [];
    lines.push(`Lookup table size : ${this.solver ? this.solver.table.size : 'n/a'} states`);

    const result = cube ? { ok: true, cube } : validate(this.input.getColors());
    if (result.ok) {
      const c = cube || new Cube(result.cube.perm, result.cube.ori);
      lines.push('');
      lines.push('Slot : Cubie (identity) : Orientation');
      for (let slot = 0; slot < 8; slot++) {
        lines.push(
          `  ${slot} (${CORNER_NAMES[slot]}) : ` +
          `${c.perm[slot]} (${CORNER_NAMES[c.perm[slot]]}) : ${c.ori[slot]}`);
      }
      lines.push('');
      lines.push(`Encoded state : ${c.hash()}`);
      lines.push(`Solved        : ${c.isSolved()}`);
      if (this.lastSolution.length) {
        lines.push(`Solution      : ${this.lastSolution.join(' ')}`);
      }
    } else {
      lines.push('');
      lines.push('Current input is not a valid cube:');
      for (const e of result.errors) lines.push(`  - ${e}`);
    }
    this.renderer.showDebug(lines.join('\n'));
  }

  /** Start a guided, one-move-at-a-time walkthrough of the mapped cube. */
  startGuide() {
    if (!this.solver) {
      this.renderer.showStatus('Solver table is not loaded yet.', 'error');
      return;
    }
    const result = validate(this.input.getColors());
    if (!result.ok) {
      this.renderer.showErrors(result.errors);
      this.endGuide();
      this.refreshDebug();
      return;
    }
    const cube = new Cube(result.cube.perm, result.cube.ori);
    const solution = this.solver.solve(cube);
    if (solution.length === 0) {
      this.endGuide();
      this.renderer.showStatus('This cube is already solved — nothing to practise.', 'success');
      return;
    }
    const first = this.practice.start(cube, result.cube.scheme, solution);
    document.getElementById('guide').hidden = false;
    this.renderer.showGuideStep(first);
    this.updateGuideButtons();
    this.renderer.showStatus(
      `${solution.length} move(s) to solve. Do each move on your cube, then ` +
      'press “Next Move”.', 'info');
    this.refreshDebug(cube);
  }

  /** Perform the current move and reveal the next one. */
  guideNext() {
    if (!this.practice.isActive) return;
    const info = this.practice.next();
    this.renderer.showGuideStep(info);
    this.updateGuideButtons();
    this.refreshDebug();
    if (info.done) {
      this.renderer.showStatus(
        'Solved! Map another cube and press “Guide Me Step-by-Step” to practise again.',
        'success');
    }
  }

  /** Step back to the previous move. */
  guidePrev() {
    if (!this.practice.isActive) return;
    const info = this.practice.prev();
    this.renderer.showGuideStep(info);
    this.updateGuideButtons();
    this.refreshDebug();
  }

  /** Enable/disable the guide navigation buttons for the current step. */
  updateGuideButtons() {
    document.getElementById('guide-prev').disabled = this.practice.step === 0;
    document.getElementById('guide-next').disabled = this.practice.isSolved;
  }

  /** Hide and reset the guided walkthrough. */
  endGuide() {
    const guide = document.getElementById('guide');
    if (guide) guide.hidden = true;
    this.practice.reset();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new Application().start();
});
