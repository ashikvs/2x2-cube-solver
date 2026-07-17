/**
 * @file LookupGenerator.js
 * @module generator/LookupGenerator
 *
 * Builds the breadth-first-search lookup table consumed by
 * {@link module:solver/LookupSolver}. This runs *offline* (via
 * `js/generator/generate.js`); the browser never calls it.
 *
 * ## The algorithm
 *
 * Starting from the solved cube we perform a plain BFS over the state graph,
 * using the nine solver moves (`U R F` and their variants). Every reachable
 * state is visited exactly once. For each newly discovered state we record the
 * index of the move that discovered it – enough information to reconstruct an
 * optimal path back to solved from anywhere.
 *
 * Because the `DBL` corner is fixed under these moves, the reachable space is
 * exactly `7! * 3^6 = 3_674_160` states, all of which the BFS visits.
 */

import { STATE_COUNT, encodeState, decodeState } from '../core/StateEncoder.js';
import { getMove, SOLVER_MOVE_NAMES, SOLVER_MOVE_INVERSE } from '../core/MoveDefinitions.js';

/** Marker stored for the solved state and any (never occurring) unvisited one. */
const NONE = 255;

/**
 * Apply a move to raw `perm`/`ori` arrays, returning fresh arrays. Kept local
 * and allocation-light because it runs tens of millions of times.
 * @param {number[]} perm
 * @param {number[]} ori
 * @param {import('../core/Move.js').Move} move
 * @returns {{perm:number[], ori:number[]}}
 */
function applyRaw(perm, ori, move) {
  const np = new Array(8);
  const no = new Array(8);
  for (let i = 0; i < 8; i++) {
    const s = move.permutation[i];
    np[i] = perm[s];
    no[i] = (ori[s] + move.orientation[i]) % 3;
  }
  return { perm: np, ori: no };
}

export class LookupGenerator {
  /**
   * Run the BFS and return the table plus generation statistics.
   * @returns {{
   *   moves: Uint8Array,
   *   depth: Uint8Array,
   *   moveNames: string[],
   *   inverse: number[],
   *   stateCount: number,
   *   visited: number,
   *   maxDepth: number,
   *   elapsedMs: number
   * }}
   */
  generate() {
    const start = Date.now();
    const moveObjects = SOLVER_MOVE_NAMES.map((name) => getMove(name));

    const moves = new Uint8Array(STATE_COUNT).fill(NONE);
    const depth = new Uint8Array(STATE_COUNT);
    const queue = new Int32Array(STATE_COUNT);
    let head = 0;
    let tail = 0;
    let maxDepth = 0;

    // Seed with the solved state.
    queue[tail++] = 0;
    moves[0] = NONE;
    depth[0] = 0;

    while (head < tail) {
      const current = queue[head++];
      const { perm, ori } = decodeState(current);
      const nextDepth = depth[current] + 1;

      for (let mi = 0; mi < moveObjects.length; mi++) {
        const r = applyRaw(perm, ori, moveObjects[mi]);
        const neighbor = encodeState(r.perm, r.ori);
        if (moves[neighbor] === NONE && neighbor !== 0) {
          moves[neighbor] = mi;
          depth[neighbor] = nextDepth;
          if (nextDepth > maxDepth) maxDepth = nextDepth;
          queue[tail++] = neighbor;
        }
      }
    }

    return {
      moves,
      depth,
      moveNames: [...SOLVER_MOVE_NAMES],
      inverse: [...SOLVER_MOVE_INVERSE],
      stateCount: STATE_COUNT,
      visited: tail,
      maxDepth,
      elapsedMs: Date.now() - start,
    };
  }
}
