import { readFileSync } from 'node:fs';
import { Cube } from '../js/core/Cube.js';
import { validate } from '../js/core/Validator.js';
import { cubeToStickers, stickersToCube } from '../js/core/StickerMapper.js';
import { LookupTable } from '../js/solver/LookupTable.js';
import { LookupSolver } from '../js/solver/LookupSolver.js';

const json = JSON.parse(readFileSync(new URL('../assets/lookup.json', import.meta.url)));
const solver = new LookupSolver(LookupTable.fromJSON(json));
const scheme = { U: 1, D: 0, F: 2, B: 3, L: 4, R: 5 };

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let fail = 0, vfail = 0, maxLen = 0, total = 0;
const N = 20000;
for (let t = 0; t < N; t++) {
  const perm = new Array(8);
  // Top slots 0..3 get a random permutation of top cubies 0..3.
  const top = shuffle([0, 1, 2, 3]);
  for (let i = 0; i < 4; i++) perm[i] = top[i];
  // Bottom slots: slot 6 fixed to reference cubie 6; slots 4,5,7 permute 4,5,7.
  const bottom = shuffle([4, 5, 7]);
  perm[4] = bottom[0]; perm[5] = bottom[1]; perm[7] = bottom[2]; perm[6] = 6;

  // Bottom corners white-down (ori 0); top corners random twist, sum divisible by 3.
  const ori = [0, 0, 0, 0, 0, 0, 0, 0];
  ori[0] = Math.floor(Math.random() * 3);
  ori[1] = Math.floor(Math.random() * 3);
  ori[2] = Math.floor(Math.random() * 3);
  ori[3] = (3 - ((ori[0] + ori[1] + ori[2]) % 3)) % 3;

  const stickers = cubeToStickers(perm, ori, scheme);
  const res = validate(stickers);
  if (!res.ok) { vfail++; if (vfail < 4) console.log('vfail', res.errors); continue; }

  const cube = new Cube(res.cube.perm, res.cube.ori);
  const sol = solver.solve(cube);
  total += sol.length;
  maxLen = Math.max(maxLen, sol.length);
  if (!cube.applyAlgorithm(sol).isSolved()) {
    fail++;
    if (fail < 4) console.log('FAIL', perm.join(), ori.join(), '->', sol.join(' '));
  }
}
console.log(`Down-solved states: ${N}`);
console.log('validation failures:', vfail);
console.log('solve failures     :', fail);
console.log('max solution length:', maxLen, 'avg:', (total / (N - vfail)).toFixed(2));
