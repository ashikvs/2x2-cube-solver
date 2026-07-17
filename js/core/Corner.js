/**
 * @file Corner.js
 * @module core/Corner
 *
 * A single corner cubie of the 2x2 cube.
 *
 * The 2x2 Rubik's Cube is made up of exactly eight corner cubies and nothing
 * else (there are no edge or centre pieces). Every solvable configuration of
 * the puzzle can therefore be described completely by describing where each of
 * those eight corners currently sits and how it is twisted.
 *
 * A `Corner` is an immutable value object. It stores:
 *
 *  - `id`          – the *identity* of the physical cubie (which piece it is).
 *  - `orientation` – how the cubie is twisted in its slot (0, 1 or 2).
 *
 * The *position* of a corner is not stored on the corner itself; instead the
 * {@link module:core/Cube~Cube} keeps corners in an array indexed by position,
 * so `cube.corners[3]` is "the cubie currently sitting in slot 3".
 *
 * Orientation semantics
 * ---------------------
 *  - `0` – the cubie's Up/Down coloured sticker (white or yellow) faces the
 *          Up or Down layer. The cubie is "not twisted".
 *  - `1` – the cubie is twisted once clockwise.
 *  - `2` – the cubie is twisted once counter-clockwise.
 *
 * @see module:core/Cube
 */

/**
 * The canonical human readable name of each corner slot / cubie identity.
 *
 * The order of this list defines the numeric id of every corner and MUST stay
 * in sync with the move tables in {@link module:core/MoveDefinitions}. It is the
 * exact ordering used by Herbert Kociemba's cube model, which lets us reuse his
 * well known and battle-tested move permutation tables.
 *
 * @readonly
 * @enum {number}
 */
export const CornerId = Object.freeze({
  URF: 0, // Up-Right-Front
  UFL: 1, // Up-Front-Left
  ULB: 2, // Up-Left-Back
  UBR: 3, // Up-Back-Right
  DFR: 4, // Down-Front-Right
  DLF: 5, // Down-Left-Front
  DBL: 6, // Down-Back-Left  (this cubie is used as the fixed reference)
  DRB: 7, // Down-Right-Back
});

/** Human readable names indexed by corner id. @readonly @type {string[]} */
export const CORNER_NAMES = Object.freeze([
  'URF', 'UFL', 'ULB', 'UBR', 'DFR', 'DLF', 'DBL', 'DRB',
]);

/**
 * An immutable corner cubie.
 */
export class Corner {
  /**
   * @param {number} id          Identity of the cubie (0-7, see {@link CornerId}).
   * @param {number} orientation Twist of the cubie in its slot (0, 1 or 2).
   */
  constructor(id, orientation = 0) {
    /** @type {number} identity of the physical cubie (0-7) */
    this.id = id;
    /** @type {number} twist of the cubie (0, 1 or 2) */
    this.orientation = orientation;
    Object.freeze(this);
  }

  /**
   * The three-letter name of this cubie identity, e.g. `"URF"`.
   * @returns {string}
   */
  get name() {
    return CORNER_NAMES[this.id];
  }

  /**
   * Return a copy of this corner with a different orientation.
   * @param {number} orientation New orientation (0, 1 or 2).
   * @returns {Corner}
   */
  withOrientation(orientation) {
    return new Corner(this.id, orientation);
  }
}
