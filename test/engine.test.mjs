import { Cube } from '../js/core/Cube.js';
import { encodeState, decodeState, STATE_COUNT } from '../js/core/StateEncoder.js';
import { getMove, SOLVER_MOVE_NAMES, SOLVER_MOVE_INVERSE } from '../js/core/MoveDefinitions.js';

/* ---- 1. encode/decode round trip over a sample of states ---- */
function applyRaw(perm, ori, moveName) {
  const m = getMove(moveName);
  const np = new Array(8), no = new Array(8);
  for (let i = 0; i < 8; i++) {
    const s = m.permutation[i];
    np[i] = perm[s];
    no[i] = (ori[s] + m.orientation[i]) % 3;
  }
  return { perm: np, ori: no };
}

let rtFail = 0;
for (let i = 0; i < STATE_COUNT; i += 997) {
  const { perm, ori } = decodeState(i);
  const j = encodeState(perm, ori);
  if (i !== j) { rtFail++; if (rtFail < 5) console.log('RT fail', i, j); }
}
console.log('round-trip failures:', rtFail);

/* ---- 2. BFS table build + timing ---- */
console.time('bfs');
const from = new Int8Array(STATE_COUNT).fill(-1);
const queue = new Int32Array(STATE_COUNT);
let head = 0, tail = 0;
queue[tail++] = 0;
from[0] = 100; // sentinel for solved
let maxDepthCount = 0;
while (head < tail) {
  const cur = queue[head++];
  const { perm, ori } = decodeState(cur);
  for (let mi = 0; mi < SOLVER_MOVE_NAMES.length; mi++) {
    const r = applyRaw(perm, ori, SOLVER_MOVE_NAMES[mi]);
    const nx = encodeState(r.perm, r.ori);
    if (from[nx] === -1) {
      from[nx] = mi;
      queue[tail++] = nx;
    }
  }
}
console.timeEnd('bfs');
console.log('states visited:', tail, 'of', STATE_COUNT);

/* ---- 3. solve helper ---- */
function solveIndex(start) {
  const moves = [];
  let cur = start;
  let guard = 0;
  while (cur !== 0) {
    const mi = from[cur];
    const inv = SOLVER_MOVE_INVERSE[mi];
    moves.push(SOLVER_MOVE_NAMES[inv]);
    const { perm, ori } = decodeState(cur);
    const r = applyRaw(perm, ori, SOLVER_MOVE_NAMES[inv]);
    cur = encodeState(r.perm, r.ori);
    if (++guard > 50) throw new Error('guard');
  }
  return moves;
}

/* ---- 4. random scramble/solve verification ---- */
let solveFail = 0, maxLen = 0;
for (let t = 0; t < 200; t++) {
  let cube = Cube.solved();
  const n = 1 + Math.floor(Math.random() * 20);
  for (let k = 0; k < n; k++) {
    cube = cube.applyMove(SOLVER_MOVE_NAMES[Math.floor(Math.random() * 9)]);
  }
  const sol = solveIndex(cube.hash());
  const solved = cube.applyAlgorithm(sol);
  if (!solved.isSolved()) { solveFail++; if (solveFail < 5) console.log('solve fail', cube.serialize(), sol); }
  maxLen = Math.max(maxLen, sol.length);
}
console.log('solve failures:', solveFail, 'max solution length:', maxLen);
