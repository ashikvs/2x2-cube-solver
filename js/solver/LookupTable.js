/**
 * @file LookupTable.js
 * @module solver/LookupTable
 *
 * Loads and holds the precomputed breadth-first-search table that powers the
 * {@link module:solver/LookupSolver~LookupSolver}.
 *
 * ## What the table stores
 *
 * The table is a flat byte array indexed by the encoded state id (see
 * {@link module:core/StateEncoder}). For every reachable state it stores a
 * single number: the index (into {@link moveNames}) of the move that, during a
 * BFS *outward from the solved cube*, first discovered that state.
 *
 * Because the discovering move goes *away* from solved, its inverse goes one
 * step *towards* solved. Walking those inverse moves from any state yields the
 * optimal solution – which is exactly what {@link module:solver/LookupSolver}
 * does.
 *
 * The table is generated offline by
 * {@link module:generator/LookupGenerator} and shipped as `assets/lookup.json`,
 * so the browser only ever loads it – it is never regenerated at runtime.
 */

/**
 * Decode a base64 string into a `Uint8Array`, working in both the browser
 * (`atob`) and Node (`Buffer`).
 * @param {string} base64
 * @returns {Uint8Array}
 */
function base64ToBytes(base64) {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  // Node fallback (used by tests).
  return Uint8Array.from(Buffer.from(base64, 'base64'));
}

export class LookupTable {
  /**
   * @param {Object} data
   * @param {Uint8Array} data.moves      The per-state discovering-move indices.
   * @param {string[]} data.moveNames    Move notations indexed by move id.
   * @param {number[]} data.inverse      Inverse move id for each move id.
   * @param {number} data.stateCount     Number of encodable states.
   */
  constructor({ moves, moveNames, inverse, stateCount }) {
    /** @type {Uint8Array} */
    this.moves = moves;
    /** @type {string[]} */
    this.moveNames = moveNames;
    /** @type {number[]} */
    this.inverse = inverse;
    /** @type {number} */
    this.stateCount = stateCount;
  }

  /** Number of states in the table. @returns {number} */
  get size() {
    return this.stateCount;
  }

  /**
   * Build a table from the parsed JSON produced by the generator.
   * @param {Object} json
   * @returns {LookupTable}
   */
  static fromJSON(json) {
    return new LookupTable({
      moves: base64ToBytes(json.data),
      moveNames: json.moveNames,
      inverse: json.inverse,
      stateCount: json.stateCount,
    });
  }

  /**
   * Fetch and parse the lookup table from a URL (browser).
   * @param {string} url Location of `lookup.json`.
   * @returns {Promise<LookupTable>}
   */
  static async load(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load lookup table: HTTP ${response.status}`);
    }
    return LookupTable.fromJSON(await response.json());
  }

  /**
   * The index of the move that discovered `stateIndex` during BFS.
   * @param {number} stateIndex Encoded state id.
   * @returns {number} A move index into {@link moveNames}.
   */
  moveIndexFor(stateIndex) {
    return this.moves[stateIndex];
  }
}
