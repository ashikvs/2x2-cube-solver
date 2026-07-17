/**
 * @file StickerMapper.js
 * @module core/StickerMapper
 *
 * Converts the *sticker colors* a user sees on the physical cube into the
 * internal *cubie* representation ({@link module:core/Cube~Cube}), and back.
 *
 * ## Why this layer exists
 *
 * The solver must never reason about stickers – it only understands corner
 * identities and orientations. This module is the single, well tested bridge
 * between the two worlds. Everything above it (UI, validation error messages)
 * speaks "colors"; everything below it (engine, encoder, solver) speaks
 * "cubies".
 *
 * ## Colors
 *
 * ```
 *   0 White   1 Yellow   2 Red   3 Orange   4 Blue   5 Green
 * ```
 *
 * Opposite faces on a standard cube use opposite colors: White↔Yellow,
 * Red↔Orange, Blue↔Green – encoded by {@link OPPOSITE}.
 *
 * ## The net and facelet geometry
 *
 * Faces are read as a standard unfolded cross:
 *
 * ```
 *            +-------+
 *            |   U   |
 *    +-------+-------+-------+-------+
 *    |   L   |   F   |   R   |   B   |
 *    +-------+-------+-------+-------+
 *            |   D   |
 *            +-------+
 * ```
 *
 * Each face tile is a 2x2 grid read row-major: `TL, TR, BL, BR`. With this net
 * orientation the four cells line up exactly with Herbert Kociemba's corner
 * facelet positions `0, 2, 6, 8`, which is why the resulting cube is guaranteed
 * to be consistent with the move tables in
 * {@link module:core/MoveDefinitions}.
 *
 * ## Reference corner
 *
 * The Down face is solved (all White). The cubie sitting at the Down-Back-Left
 * slot is used as the immovable reference: the colors on its Back and Left
 * stickers define the whole solved color scheme, from which every other cubie's
 * home is derived. This lets the solver keep `DBL` fixed and solve using only
 * `U`, `R`, `F`.
 *
 * @see module:core/Cube
 * @see module:core/StateEncoder
 */

/** Opposite color of each color id (White↔Yellow, Red↔Orange, Blue↔Green). */
export const OPPOSITE = Object.freeze([1, 0, 3, 2, 5, 4]);

/** Face names in the order used throughout the app. */
export const FACES = Object.freeze(['U', 'R', 'F', 'D', 'L', 'B']);

/** White and Yellow are the Up/Down colors that determine orientation. */
const DOWN_COLOR = 0; // White
const UP_COLOR = 1; // Yellow

/**
 * Kociemba face position (`0,2,6,8`) → index into a `[TL,TR,BL,BR]` tile array.
 * @type {Object<number, number>}
 */
const POS_TO_CELL = Object.freeze({ 0: 0, 2: 1, 6: 2, 8: 3 });

/**
 * The three facelets of each corner slot, in orientation order (the first
 * facelet is the Up/Down facelet). Each facelet is `[face, position]`.
 *
 * Indexed by corner id (0..7 = URF,UFL,ULB,UBR,DFR,DLF,DBL,DRB).
 * @type {ReadonlyArray<ReadonlyArray<[string, number]>>}
 */
const CORNER_FACELETS = Object.freeze([
  [['U', 8], ['R', 0], ['F', 2]], // 0 URF
  [['U', 6], ['F', 0], ['L', 2]], // 1 UFL
  [['U', 0], ['L', 0], ['B', 2]], // 2 ULB
  [['U', 2], ['B', 0], ['R', 2]], // 3 UBR
  [['D', 2], ['F', 8], ['R', 6]], // 4 DFR
  [['D', 0], ['L', 8], ['F', 6]], // 5 DLF
  [['D', 6], ['B', 8], ['L', 6]], // 6 DBL (reference)
  [['D', 8], ['R', 8], ['B', 6]], // 7 DRB
]);

/**
 * Error thrown when a sticker layout cannot be interpreted as a cube.
 */
export class StickerError extends Error {}

/**
 * Read the color at a given facelet from a `facesColors` map.
 * @param {Object<string, number[]>} facesColors face → `[TL,TR,BL,BR]`.
 * @param {[string, number]} facelet `[face, kociembaPosition]`.
 * @returns {number} the color id.
 */
function colorAt(facesColors, [face, pos]) {
  return facesColors[face][POS_TO_CELL[pos]];
}

/**
 * Derive the solved color scheme from the reference (`DBL`) corner.
 *
 * @param {Object<string, number[]>} facesColors face → `[TL,TR,BL,BR]`.
 * @returns {Object<string, number>} face → solved color id.
 * @throws {StickerError} if the reference corner is not physically valid.
 */
function deriveScheme(facesColors) {
  const backColor = colorAt(facesColors, CORNER_FACELETS[6][1]); // DBL Back
  const leftColor = colorAt(facesColors, CORNER_FACELETS[6][2]); // DBL Left

  if (backColor === DOWN_COLOR || backColor === UP_COLOR ||
      leftColor === DOWN_COLOR || leftColor === UP_COLOR) {
    throw new StickerError(
      'The Back-Left-Down corner must show two side colors (not White/Yellow).');
  }
  if (backColor === leftColor || OPPOSITE[backColor] === leftColor) {
    throw new StickerError(
      'The Back and Left colors of the reference corner are inconsistent.');
  }

  return {
    U: UP_COLOR,
    D: DOWN_COLOR,
    B: backColor,
    F: OPPOSITE[backColor],
    L: leftColor,
    R: OPPOSITE[leftColor],
  };
}

/**
 * Build a lookup from a sorted color-triple key to the corner id whose solved
 * colors match it.
 * @param {Object<string, number>} scheme face → solved color id.
 * @returns {Map<string, number>} sorted-colors key → corner id.
 */
function buildHomeIndex(scheme) {
  const index = new Map();
  for (let id = 0; id < 8; id++) {
    const colors = CORNER_FACELETS[id].map(([face]) => scheme[face]);
    index.set(colorKey(colors), id);
  }
  return index;
}

/**
 * A stable string key for an unordered set of three colors.
 * @param {number[]} colors
 * @returns {string}
 */
function colorKey(colors) {
  return colors.slice().sort((a, b) => a - b).join(',');
}

/**
 * Convert a full sticker layout into a `{ perm, ori }` cube description.
 *
 * @param {Object<string, number[]>} facesColors face → `[TL,TR,BL,BR]` colors.
 * @returns {{perm: number[], ori: number[], scheme: Object<string, number>}}
 * @throws {StickerError} if the layout is not a physically valid cube.
 */
export function stickersToCube(facesColors) {
  const scheme = deriveScheme(facesColors);
  const homeIndex = buildHomeIndex(scheme);

  const perm = new Array(8);
  const ori = new Array(8);
  const seen = new Set();

  for (let slot = 0; slot < 8; slot++) {
    const facelets = CORNER_FACELETS[slot];
    const colors = facelets.map((f) => colorAt(facesColors, f));

    // Identity: which cubie has this set of colors?
    const id = homeIndex.get(colorKey(colors));
    if (id === undefined) {
      throw new StickerError(
        `The corner at slot ${slot} has an impossible color combination.`);
    }
    if (seen.has(id)) {
      throw new StickerError(
        'Two corners share the same colors – check your sticker entry.');
    }
    seen.add(id);

    // Orientation: index of the White/Yellow sticker within the ordered triple.
    const twist = colors.findIndex((c) => c === DOWN_COLOR || c === UP_COLOR);
    if (twist === -1) {
      throw new StickerError(
        `The corner at slot ${slot} is missing a White/Yellow sticker.`);
    }

    perm[slot] = id;
    ori[slot] = twist;
  }

  return { perm, ori, scheme };
}

/**
 * Convert a cube description back into a sticker layout. This is the exact
 * inverse of {@link stickersToCube} and is used by the renderer and tests.
 *
 * @param {number[]} perm Corner permutation (length 8).
 * @param {number[]} ori  Corner orientation (length 8).
 * @param {Object<string, number>} scheme face → solved color id.
 * @returns {Object<string, number[]>} face → `[TL,TR,BL,BR]` colors.
 */
export function cubeToStickers(perm, ori, scheme) {
  const faces = { U: [], R: [], F: [], D: [], L: [], B: [] };

  for (let slot = 0; slot < 8; slot++) {
    const id = perm[slot];
    const twist = ori[slot];
    // The cubie's own stickers in home order (index 0 is its White/Yellow one).
    const cubieStickers = CORNER_FACELETS[id].map(([face]) => scheme[face]);
    const slotFacelets = CORNER_FACELETS[slot];
    for (let k = 0; k < 3; k++) {
      const color = cubieStickers[(k - twist + 3) % 3];
      const [face, pos] = slotFacelets[k];
      faces[face][POS_TO_CELL[pos]] = color;
    }
  }
  return faces;
}
