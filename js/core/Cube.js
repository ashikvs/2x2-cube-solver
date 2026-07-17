/**
 * @file Cube.js
 * @module core/Cube
 *
 * The in-memory model of a 2x2 Rubik's Cube.
 *
 * The cube is described entirely by its eight corner cubies, stored as two flat
 * arrays indexed by *slot* (physical position):
 *
 *  - `perm[i]` – the identity of the cubie currently sitting in slot `i`.
 *  - `ori[i]`  – how that cubie is twisted in its slot (0, 1 or 2).
 *
 * Slots and identities use the ordering from
 * {@link module:core/Corner~CornerId}:
 *
 * ```
 *   0 URF   1 UFL   2 ULB   3 UBR
 *   4 DFR   5 DLF   6 DBL   7 DRB
 * ```
 *
 * The `DBL` corner (slot 6) is the immovable reference, so the solved cube is
 * simply `perm = [0..7]`, `ori = [0,0,0,0,0,0,0,0]`.
 *
 * A `Cube` never touches the UI and never talks to the solver – it is a pure
 * data structure with a handful of small, well defined operations.
 *
 * @see module:core/Move
 * @see module:core/MoveDefinitions
 * @see module:core/StateEncoder
 */

import { getMove } from './MoveDefinitions.js';
import { encodeState } from './StateEncoder.js';

/** The permutation of a freshly solved cube. */
const SOLVED_PERM = [0, 1, 2, 3, 4, 5, 6, 7];
/** The orientation of a freshly solved cube. */
const SOLVED_ORI = [0, 0, 0, 0, 0, 0, 0, 0];

export class Cube {
  /**
   * @param {number[]} [perm] Corner permutation (length 8). Defaults to solved.
   * @param {number[]} [ori]  Corner orientation (length 8). Defaults to solved.
   */
  constructor(perm = SOLVED_PERM, ori = SOLVED_ORI) {
    /** @type {number[]} identity of the cubie in each slot */
    this.perm = perm.slice();
    /** @type {number[]} twist of the cubie in each slot */
    this.ori = ori.slice();
  }

  /**
   * Build a brand new solved cube.
   * @returns {Cube}
   */
  static solved() {
    return new Cube();
  }

  /**
   * A deep, independent copy of this cube.
   * @returns {Cube}
   */
  clone() {
    return new Cube(this.perm, this.ori);
  }

  /**
   * Is the cube in its solved configuration?
   * @returns {boolean}
   */
  isSolved() {
    for (let i = 0; i < 8; i++) {
      if (this.perm[i] !== i || this.ori[i] !== 0) return false;
    }
    return true;
  }

  /**
   * Apply a single move (by object or notation) and return a NEW cube.
   *
   * Every move is the same generic transformation:
   *
   * ```
   *   next.perm[i] = this.perm[move.permutation[i]]
   *   next.ori[i]  = (this.ori[move.permutation[i]] + move.orientation[i]) % 3
   * ```
   *
   * @param {import('./Move.js').Move|string} move A Move or its notation.
   * @returns {Cube} a new cube; this one is left untouched.
   */
  applyMove(move) {
    const m = typeof move === 'string' ? getMove(move) : move;
    const perm = new Array(8);
    const ori = new Array(8);
    for (let i = 0; i < 8; i++) {
      const src = m.permutation[i];
      perm[i] = this.perm[src];
      ori[i] = (this.ori[src] + m.orientation[i]) % 3;
    }
    return new Cube(perm, ori);
  }

  /**
   * Apply a whole sequence of moves in order, returning the final cube.
   * @param {Array<import('./Move.js').Move|string>} moves Moves or notations.
   * @returns {Cube}
   */
  applyAlgorithm(moves) {
    let cube = this;
    for (const move of moves) cube = cube.applyMove(move);
    return cube;
  }

  /**
   * A compact, human readable serialization, handy for debugging and tests.
   * Each token is `id.orientation`, e.g. `"0.0 1.0 2.0 3.0 ..."` when solved.
   * @returns {string}
   */
  serialize() {
    const tokens = [];
    for (let i = 0; i < 8; i++) tokens.push(`${this.perm[i]}.${this.ori[i]}`);
    return tokens.join(' ');
  }

  /**
   * The unique integer identity of this cube state. Identical states always
   * produce the same number; different states never collide.
   * @returns {number}
   * @see module:core/StateEncoder
   */
  hash() {
    return encodeState(this.perm, this.ori);
  }
}
