/**
 * @file StateEncoder.js
 * @module core/StateEncoder
 *
 * A perfect, collision-free encoder that maps a cube state to a single integer
 * in the range `[0, STATE_COUNT)` and back again (`decode`).
 *
 * ## Why a perfect encoder?
 *
 * The solver indexes every reachable state into a flat table. That only works
 * if *state → integer* is a bijection: no gaps, no collisions. A mixed-radix
 * ranking of the permutation and orientation gives exactly that, whereas string
 * hashing cannot.
 *
 * ## Fixing a reference corner
 *
 * The `DBL` corner (id 6) is used as the immovable reference of the cube. The
 * solver only ever uses the moves `U`, `R`, `F`, none of which touch the
 * back-left-down slot, so `DBL` is guaranteed to stay in slot 6 with
 * orientation 0. Everything else is measured relative to it.
 *
 * With `DBL` pinned, a state is fully described by:
 *
 *  - **Permutation** – the arrangement of the other seven cubies across the
 *    seven non-`DBL` slots: `7! = 5040` possibilities, ranked with a Lehmer
 *    code (factorial number system).
 *  - **Orientation** – the twist (0,1,2) of six cubies; the seventh varying
 *    corner is forced by the rule "all twists sum to a multiple of 3", and
 *    `DBL` is always 0: `3^6 = 729` possibilities, a plain base-3 number.
 *
 * Final index = `permutationRank * 729 + orientationRank`, giving exactly
 * `5040 * 729 = 3_674_160` distinct states.
 */

/** The reference slot / cubie id that never moves under U, R, F. */
const FIXED_SLOT = 6;

/** Slots that vary, in the canonical order used for permutation ranking. */
const VAR_SLOTS = [0, 1, 2, 3, 4, 5, 7];

/** Slots whose orientation is stored directly (slot 7 is derived, 6 is 0). */
const ORI_SLOTS = [0, 1, 2, 3, 4, 5];

/** Number of orientation codes (`3^6`). */
const ORIENTATION_STATES = 729;

/** Total number of encodable states (`7! * 3^6`). */
export const STATE_COUNT = 5040 * ORIENTATION_STATES; // 3_674_160

/** Precomputed factorials `0!..7!`. */
const FACT = [1, 1, 2, 6, 24, 120, 720, 5040];

/**
 * Map a cubie id in `{0,1,2,3,4,5,7}` to a dense index `0..6`.
 * @param {number} id
 * @returns {number}
 */
function idToVarIndex(id) {
  return id === 7 ? 6 : id;
}

/**
 * Inverse of {@link idToVarIndex}: dense index `0..6` back to a cubie id.
 * @param {number} varIndex
 * @returns {number}
 */
function varIndexToId(varIndex) {
  return varIndex === 6 ? 7 : varIndex;
}

/**
 * Encode a cube state (permutation + orientation) into one integer.
 * @param {number[]} perm Corner permutation (length 8); `perm[6]` must be 6.
 * @param {number[]} ori  Corner orientation (length 8); `ori[6]` must be 0.
 * @returns {number} a unique id in `[0, STATE_COUNT)`.
 */
export function encodeState(perm, ori) {
  return encodePermutation(perm) * ORIENTATION_STATES + encodeOrientation(ori);
}

/**
 * Decode an integer id back into a `{ perm, ori }` pair.
 * @param {number} index An id in `[0, STATE_COUNT)`.
 * @returns {{perm: number[], ori: number[]}}
 */
export function decodeState(index) {
  const permRank = Math.floor(index / ORIENTATION_STATES);
  const oriRank = index % ORIENTATION_STATES;
  return {
    perm: decodePermutation(permRank),
    ori: decodeOrientation(oriRank),
  };
}

/* -------------------------------------------------------------------------- */
/* Permutation ranking (Lehmer code)                                          */
/* -------------------------------------------------------------------------- */

/**
 * Rank the arrangement of the seven non-fixed cubies into `[0, 5040)`.
 * @param {number[]} perm Corner permutation (length 8).
 * @returns {number}
 */
function encodePermutation(perm) {
  const seq = VAR_SLOTS.map((slot) => idToVarIndex(perm[slot]));
  const n = seq.length;
  let rank = 0;
  for (let i = 0; i < n; i++) {
    let smaller = 0;
    for (let j = i + 1; j < n; j++) {
      if (seq[j] < seq[i]) smaller++;
    }
    rank += smaller * FACT[n - 1 - i];
  }
  return rank;
}

/**
 * Inverse of {@link encodePermutation}: build a full `perm` array from a rank.
 * @param {number} rank rank in `[0, 5040)`.
 * @returns {number[]} permutation of length 8 (with `perm[6] = 6`).
 */
function decodePermutation(rank) {
  const available = [0, 1, 2, 3, 4, 5, 6];
  const n = VAR_SLOTS.length;
  const perm = new Array(8);
  let remaining = rank;
  for (let i = 0; i < n; i++) {
    const f = FACT[n - 1 - i];
    const choice = Math.floor(remaining / f);
    remaining -= choice * f;
    perm[VAR_SLOTS[i]] = varIndexToId(available[choice]);
    available.splice(choice, 1);
  }
  perm[FIXED_SLOT] = FIXED_SLOT;
  return perm;
}

/* -------------------------------------------------------------------------- */
/* Orientation ranking (base-3 with a derived final digit)                    */
/* -------------------------------------------------------------------------- */

/**
 * Rank the six freely-varying twists as a base-3 number in `[0, 729)`.
 * @param {number[]} ori Corner orientation (length 8).
 * @returns {number}
 */
function encodeOrientation(ori) {
  let rank = 0;
  for (const slot of ORI_SLOTS) {
    rank = rank * 3 + ori[slot];
  }
  return rank;
}

/**
 * Inverse of {@link encodeOrientation}: rebuild the full `ori` array, deriving
 * slot 7 so the total twist is a multiple of 3 and pinning slot 6 to 0.
 * @param {number} rank rank in `[0, 729)`.
 * @returns {number[]} orientation of length 8.
 */
function decodeOrientation(rank) {
  const ori = new Array(8).fill(0);
  let sum = 0;
  for (let i = ORI_SLOTS.length - 1; i >= 0; i--) {
    const o = rank % 3;
    rank = Math.floor(rank / 3);
    ori[ORI_SLOTS[i]] = o;
    sum += o;
  }
  ori[FIXED_SLOT] = 0;
  ori[7] = (3 - (sum % 3)) % 3;
  return ori;
}
