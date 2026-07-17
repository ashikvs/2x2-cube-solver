/**
 * @file Validator.js
 * @module core/Validator
 *
 * Checks that a user-entered sticker layout describes a *physically possible*
 * 2x2 cube before it is ever handed to the solver.
 *
 * The validator speaks in colors and produces human-readable error messages; it
 * delegates the sticker→cubie conversion to {@link module:core/StickerMapper}
 * and reports any structural problem that surfaces there.
 *
 * A 2x2 cube (corners only) is solvable if and only if:
 *
 *  1. every color appears exactly four times,
 *  2. the Down face is solved (all White) – required by this app,
 *  3. every corner shows a valid, unique combination of colors, and
 *  4. the total corner twist is a multiple of 3.
 *
 * There is no corner-permutation parity constraint on a 2x2 (unlike a 3x3),
 * because it has no edges to couple with.
 */

import { stickersToCube, StickerError, FACES } from './StickerMapper.js';

/** Human readable color names, indexed by color id. */
const COLOR_NAMES = Object.freeze([
  'White', 'Yellow', 'Red', 'Orange', 'Blue', 'Green',
]);

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} ok        Whether the layout is a solvable cube.
 * @property {string[]} errors   Human readable problems (empty when `ok`).
 * @property {{perm:number[], ori:number[], scheme:Object<string,number>}} [cube]
 *   The decoded cube, present only when `ok` is true.
 */

/**
 * Validate a full sticker layout.
 *
 * @param {Object<string, number[]>} facesColors face → `[TL,TR,BL,BR]` colors.
 * @returns {ValidationResult}
 */
export function validate(facesColors) {
  const errors = [];

  // 1. Structural: four stickers per face.
  for (const face of FACES) {
    const tile = facesColors[face];
    if (!Array.isArray(tile) || tile.length !== 4 || tile.some((c) => c == null)) {
      errors.push(`Face ${face} must have exactly four stickers filled in.`);
    }
  }
  if (errors.length) return { ok: false, errors };

  // 2. Color counts: each color exactly four times.
  const counts = new Array(6).fill(0);
  for (const face of FACES) {
    for (const c of facesColors[face]) {
      if (c < 0 || c > 5) {
        errors.push(`Face ${face} contains an unknown color.`);
      } else {
        counts[c]++;
      }
    }
  }
  for (let c = 0; c < 6; c++) {
    if (counts[c] !== 4) {
      errors.push(
        `${COLOR_NAMES[c]} appears ${counts[c]} time(s); it must appear exactly 4.`);
    }
  }

  // 3. Down face solved (all White).
  if (facesColors.D.some((c) => c !== 0)) {
    errors.push('The Down face must be fully solved (all White).');
  }

  if (errors.length) return { ok: false, errors };

  // 4. Structural cube validity (unique, valid corners).
  let cube;
  try {
    cube = stickersToCube(facesColors);
  } catch (err) {
    if (err instanceof StickerError) {
      return { ok: false, errors: [err.message] };
    }
    throw err;
  }

  // 5. Corner twist parity: the total orientation must be a multiple of 3.
  const twistSum = cube.ori.reduce((a, b) => a + b, 0);
  if (twistSum % 3 !== 0) {
    errors.push(
      'Impossible corner orientation: one corner appears to be twisted in place.');
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, errors: [], cube };
}
