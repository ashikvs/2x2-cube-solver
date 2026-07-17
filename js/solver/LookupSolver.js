/**
 * @file LookupSolver.js
 * @module solver/LookupSolver
 *
 * A {@link module:solver/Solver~Solver} that produces optimal solutions by
 * walking a precomputed BFS table ({@link module:solver/LookupTable}).
 *
 * ## How a solution is recovered
 *
 * The table tells us, for the current state, which move *discovered* it during
 * a BFS outward from the solved cube. The inverse of that move steps the cube
 * one move closer to solved. We apply that inverse, move to the parent state,
 * and repeat until we reach the solved state (id 0). The inverse moves
 * collected along the way are the solution, and because BFS finds shortest
 * paths, the solution is optimal.
 */

import { Solver } from './Solver.js';
import { Cube } from '../core/Cube.js';
import { decodeState } from '../core/StateEncoder.js';

/** Safety limit; no optimal 2x2 solution is anywhere near this long. */
const MAX_SOLUTION_LENGTH = 64;

export class LookupSolver extends Solver {
  /**
   * @param {import('./LookupTable.js').LookupTable} table Loaded lookup table.
   */
  constructor(table) {
    super();
    /** @type {import('./LookupTable.js').LookupTable} */
    this.table = table;
  }

  /**
   * @override
   * @param {Cube} cube The cube to solve.
   * @returns {string[]} Optimal move notations that solve the cube.
   */
  solve(cube) {
    const moves = [];
    let index = cube.hash();

    while (index !== 0) {
      const discoveringMove = this.table.moveIndexFor(index);
      const inverseMove = this.table.inverse[discoveringMove];
      const name = this.table.moveNames[inverseMove];
      moves.push(name);

      const { perm, ori } = decodeState(index);
      index = new Cube(perm, ori).applyMove(name).hash();

      if (moves.length > MAX_SOLUTION_LENGTH) {
        throw new Error('Solver failed to converge – table may be corrupt.');
      }
    }
    return moves;
  }
}
