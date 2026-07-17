/**
 * @file AlgorithmParser.js
 * @module core/AlgorithmParser
 *
 * Parses a whitespace-separated move sequence (e.g. `"R U R' U'"`) into an
 * array of validated move notations, and formats such arrays back into a
 * string.
 *
 * Supported tokens are a face letter (`U R F D L B`) optionally followed by a
 * modifier: `'` (counter-clockwise) or `2` (half turn).
 */

import { getMove } from './MoveDefinitions.js';

/** Matches a single well-formed move token. */
const MOVE_PATTERN = /^[URFDLB](['2])?$/;

/**
 * Error thrown when an algorithm string contains an invalid token.
 */
export class ParseError extends Error {}

/**
 * Parse an algorithm string into an array of move notations.
 *
 * @param {string} text e.g. `"R U R' U'"` or `"R2 U2 F'"`.
 * @returns {string[]} validated move notations, e.g. `["R","U","R'","U'"]`.
 * @throws {ParseError} on any unrecognized token.
 */
export function parseAlgorithm(text) {
  const tokens = String(text).trim().split(/\s+/).filter(Boolean);
  const moves = [];
  for (const token of tokens) {
    if (!MOVE_PATTERN.test(token)) {
      throw new ParseError(`"${token}" is not a valid move.`);
    }
    getMove(token); // throws if the (well-formed) token is somehow unknown
    moves.push(token);
  }
  return moves;
}

/**
 * Format an array of move notations back into a display string.
 * @param {string[]} moves
 * @returns {string}
 */
export function formatAlgorithm(moves) {
  return moves.join(' ');
}
