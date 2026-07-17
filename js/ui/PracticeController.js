/**
 * @file PracticeController.js
 * @module ui/PracticeController
 *
 * Drives the guided "Practice" walkthrough. Given the cube the user has mapped
 * into the net (and its solution), it steps through that solution one move at a
 * time. After each step the net is repainted to the state the cube should be
 * in, so the user can follow along on a physical cube.
 *
 * It never touches the DOM directly and never solves anything itself: the cube,
 * its color scheme and its solution are all supplied by the controller
 * ({@link module:app}).
 */

import { cubeToStickers } from '../core/StickerMapper.js';

/**
 * @typedef {Object} GuideStep
 * @property {boolean} done   True once every move has been performed.
 * @property {number}  step   How many moves have been completed so far (0..N).
 * @property {number}  total  Total number of moves in the solution.
 * @property {string}  [move] The move to perform next (absent when `done`).
 */

export class PracticeController {
  /**
   * @param {import('./InputController.js').InputController} input
   */
  constructor(input) {
    this.input = input;
    /** @type {import('../core/Cube.js').Cube[]} State after each move (N + 1). */
    this.states = [];
    /** @type {string[]} The solution moves. */
    this.moves = [];
    /** @type {Object<string, number>|null} Color scheme of the mapped cube. */
    this.scheme = null;
    /** @type {number} How many moves the user has stepped through (0..total). */
    this.step = 0;
  }

  /** @returns {number} Total number of moves in the current solution. */
  get total() {
    return this.moves.length;
  }

  /** @returns {boolean} True once every move has been stepped through. */
  get isSolved() {
    return this.step >= this.moves.length;
  }

  /** @returns {boolean} True while a walkthrough is loaded. */
  get isActive() {
    return this.moves.length > 0;
  }

  /**
   * Begin a guided walkthrough of a mapped cube.
   *
   * @param {import('../core/Cube.js').Cube} cube The starting (mapped) cube.
   * @param {Object<string, number>} scheme Color scheme derived from the input.
   * @param {string[]} solution The moves that solve the cube.
   * @returns {GuideStep} The first step to perform.
   */
  start(cube, scheme, solution) {
    // Precompute the cube state after each move (states[k] = after k moves).
    const states = [cube];
    let current = cube;
    for (const move of solution) {
      current = current.applyMove(move);
      states.push(current);
    }

    this.states = states;
    this.moves = solution;
    this.scheme = scheme;
    this.step = 0;
    this.paintCurrent();
    return this.current();
  }

  /** Repaint the net to the cube's current (partially solved) state. */
  paintCurrent() {
    const cube = this.states[this.step];
    if (cube && this.scheme) {
      this.input.setColors(cubeToStickers(cube.perm, cube.ori, this.scheme));
    }
  }

  /**
   * Advance to the next move (performing the current one on the model).
   * @returns {GuideStep}
   */
  next() {
    if (this.step < this.moves.length) {
      this.step++;
      this.paintCurrent();
    }
    return this.current();
  }

  /**
   * Step back to the previous move.
   * @returns {GuideStep}
   */
  prev() {
    if (this.step > 0) {
      this.step--;
      this.paintCurrent();
    }
    return this.current();
  }

  /**
   * Describe the move that should be performed right now.
   * @returns {GuideStep}
   */
  current() {
    if (this.step >= this.moves.length) {
      return { done: true, step: this.step, total: this.moves.length };
    }
    return {
      done: false,
      step: this.step,
      total: this.moves.length,
      move: this.moves[this.step],
    };
  }

  /** Forget the current walkthrough. */
  reset() {
    this.states = [];
    this.moves = [];
    this.scheme = null;
    this.step = 0;
  }
}
