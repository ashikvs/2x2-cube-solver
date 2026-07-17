/**
 * @file Solver.js
 * @module solver/Solver
 *
 * The abstract base class for every solving strategy.
 *
 * The application depends only on this interface, never on a concrete solver.
 * That makes it trivial to drop in alternative implementations later – a
 * `BFSSolver`, an `IDASolver`, etc. – without touching the UI or the engine.
 *
 * A solver takes a {@link module:core/Cube~Cube} and returns the list of move
 * notations that transform it into the solved cube.
 */

export class Solver {
  /**
   * Solve a cube.
   * @abstract
   * @param {import('../core/Cube.js').Cube} _cube The cube to solve.
   * @returns {string[]} The ordered move notations that solve it.
   */
  solve(_cube) {
    throw new Error('Solver.solve() must be implemented by a subclass.');
  }
}
