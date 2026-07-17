/**
 * @file MoveDefinitions.js
 * @module core/MoveDefinitions
 *
 * The single source of truth for every legal move on the cube.
 *
 * ## Why data instead of code?
 *
 * A naive cube engine implements each move as its own hand written function.
 * That duplicates logic eighteen times and is a rich source of bugs. Instead we
 * describe the six *quarter turn base moves* (`U R F D L B`) as small permutation
 * and orientation tables and then **derive** every other move (`'`, `2`) by
 * composing those tables. Applying a move is then one generic operation.
 *
 * ## The corner model
 *
 * Corners are numbered exactly as in {@link module:core/Corner~CornerId}:
 *
 * ```
 *   0 URF   1 UFL   2 ULB   3 UBR
 *   4 DFR   5 DLF   6 DBL   7 DRB
 * ```
 *
 * Each base move table below is taken from Herbert Kociemba's reference cube
 * model. `cp` is the corner permutation and `co` is the corner orientation
 * change. Because these tables are famous and independently verified, we get a
 * provably correct move engine "for free".
 *
 * ## Composition rule
 *
 * If applying move `A` then move `B` should equal a single combined move `C`,
 * then (deriving directly from the apply rule in {@link module:core/Cube}):
 *
 * ```
 *   C.cp[i] = A.cp[B.cp[i]]
 *   C.co[i] = (A.co[B.cp[i]] + B.co[i]) % 3
 * ```
 *
 * From that we build `X2 = X·X` and `X' = X·X·X` for each base face `X`.
 */

import { Move } from './Move.js';

/**
 * The six quarter-turn base moves as `{ cp, co }` tables.
 * @type {Object<string, {cp: number[], co: number[]}>}
 */
const BASE_MOVES = {
  U: { cp: [3, 0, 1, 2, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] },
  R: { cp: [4, 1, 2, 0, 7, 5, 6, 3], co: [2, 0, 0, 1, 1, 0, 0, 2] },
  F: { cp: [1, 5, 2, 3, 0, 4, 6, 7], co: [1, 2, 0, 0, 2, 1, 0, 0] },
  D: { cp: [0, 1, 2, 3, 5, 6, 7, 4], co: [0, 0, 0, 0, 0, 0, 0, 0] },
  L: { cp: [0, 2, 6, 3, 4, 1, 5, 7], co: [0, 1, 2, 0, 0, 2, 1, 0] },
  B: { cp: [0, 1, 3, 7, 4, 5, 2, 6], co: [0, 0, 1, 2, 0, 0, 2, 1] },
};

/** The identity transform (used as the neutral element when composing). */
const IDENTITY = { cp: [0, 1, 2, 3, 4, 5, 6, 7], co: [0, 0, 0, 0, 0, 0, 0, 0] };

/**
 * Compose two raw move tables into one: "apply `a`, then apply `b`".
 * @param {{cp:number[],co:number[]}} a
 * @param {{cp:number[],co:number[]}} b
 * @returns {{cp:number[],co:number[]}}
 */
function compose(a, b) {
  const cp = new Array(8);
  const co = new Array(8);
  for (let i = 0; i < 8; i++) {
    cp[i] = a.cp[b.cp[i]];
    co[i] = (a.co[b.cp[i]] + b.co[i]) % 3;
  }
  return { cp, co };
}

/**
 * Raise a base move table to the given power by repeated composition.
 * @param {{cp:number[],co:number[]}} base
 * @param {number} power  1, 2 or 3.
 * @returns {{cp:number[],co:number[]}}
 */
function power(base, power) {
  let result = IDENTITY;
  for (let i = 0; i < power; i++) {
    result = compose(result, base);
  }
  return result;
}

/**
 * The full registry of all eighteen moves, keyed by notation.
 * @type {Map<string, Move>}
 */
const MOVES = new Map();

for (const face of Object.keys(BASE_MOVES)) {
  const base = BASE_MOVES[face];
  const quarter = power(base, 1); // X
  const half = power(base, 2);    // X2
  const prime = power(base, 3);   // X' (three quarter turns == one anti turn)

  MOVES.set(face, new Move(face, quarter.cp, quarter.co));
  MOVES.set(`${face}2`, new Move(`${face}2`, half.cp, half.co));
  MOVES.set(`${face}'`, new Move(`${face}'`, prime.cp, prime.co));
}

/**
 * Every move notation the engine understands.
 * @type {ReadonlyArray<string>}
 */
export const ALL_MOVE_NAMES = Object.freeze([...MOVES.keys()]);

/**
 * Look up a move by its notation.
 * @param {string} name e.g. `"R"`, `"U'"`, `"F2"`.
 * @returns {Move}
 * @throws {Error} if the notation is not a known move.
 */
export function getMove(name) {
  const move = MOVES.get(name);
  if (!move) {
    throw new Error(`Unknown move: "${name}"`);
  }
  return move;
}

/**
 * The move set used by the solver / lookup generator.
 *
 * Because the `DBL` corner is treated as an immovable reference (see
 * {@link module:core/StateEncoder}), the three faces `U`, `R` and `F` are enough
 * to reach every reachable state of the 2x2 cube. Restricting the search to
 * these nine moves keeps the state space at exactly its true size and avoids the
 * redundant whole-cube rotations that `D`, `L` and `B` would introduce.
 *
 * @type {ReadonlyArray<string>}
 */
export const SOLVER_MOVE_NAMES = Object.freeze([
  'U', "U'", 'U2',
  'R', "R'", 'R2',
  'F', "F'", 'F2',
]);

/**
 * Index of the move that undoes each solver move, aligned with
 * {@link SOLVER_MOVE_NAMES}. `U`(0) is undone by `U'`(1), `U2`(2) by itself, etc.
 * @type {ReadonlyArray<number>}
 */
export const SOLVER_MOVE_INVERSE = Object.freeze([1, 0, 2, 4, 3, 5, 7, 6, 8]);
