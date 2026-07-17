/**
 * @file Move.js
 * @module core/Move
 *
 * Describes a single cube move as a pure mathematical transformation.
 *
 * A move never touches the UI and never knows about the solver. It is simply a
 * pair of lookup tables:
 *
 *  - `permutation[i]` – the slot that the cubie now in slot `i` came *from*.
 *  - `orientation[i]` – how much to add (mod 3) to the orientation of the cubie
 *                       that lands in slot `i`.
 *
 * Applying a move to a cube is therefore extremely cheap and, crucially, is the
 * *same* operation for every one of the eighteen moves. There is no per-move
 * special casing anywhere in the engine – each move is just data.
 *
 * @see module:core/MoveDefinitions for how the concrete tables are built.
 */

/**
 * An immutable description of one cube move.
 */
export class Move {
  /**
   * @param {string} name          Standard cube notation, e.g. `"R"`, `"U'"`, `"F2"`.
   * @param {number[]} permutation Corner permutation table (length 8).
   * @param {number[]} orientation Corner orientation delta table (length 8).
   */
  constructor(name, permutation, orientation) {
    /** @type {string} the notation of the move, e.g. "R'" */
    this.name = name;
    /** @type {ReadonlyArray<number>} where each slot sources its cubie from */
    this.permutation = Object.freeze(permutation.slice());
    /** @type {ReadonlyArray<number>} orientation delta applied per slot */
    this.orientation = Object.freeze(orientation.slice());
    Object.freeze(this);
  }

  /**
   * The base face letter of the move, ignoring modifiers.
   * `"R'"` and `"R2"` both return `"R"`.
   * @returns {string}
   */
  get face() {
    return this.name.charAt(0);
  }
}
