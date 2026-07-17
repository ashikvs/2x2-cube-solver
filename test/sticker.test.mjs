import { Cube } from '../js/core/Cube.js';
import { stickersToCube, cubeToStickers } from '../js/core/StickerMapper.js';
import { SOLVER_MOVE_NAMES } from '../js/core/MoveDefinitions.js';

const scheme = { U: 1, D: 0, F: 2, B: 3, L: 4, R: 5 };

// 1. solved cube <-> solved stickers
const solvedStickers = cubeToStickers([0,1,2,3,4,5,6,7], [0,0,0,0,0,0,0,0], scheme);
const s0 = stickersToCube(solvedStickers);
console.log('solved perm ok:', JSON.stringify(s0.perm) === JSON.stringify([0,1,2,3,4,5,6,7]));
console.log('solved ori ok:', JSON.stringify(s0.ori) === JSON.stringify([0,0,0,0,0,0,0,0]));

// 2. round-trip through the move engine for many random scrambles
let fail = 0;
for (let t = 0; t < 500; t++) {
  let cube = Cube.solved();
  const n = 1 + Math.floor(Math.random() * 25);
  for (let k = 0; k < n; k++) {
    cube = cube.applyMove(SOLVER_MOVE_NAMES[Math.floor(Math.random() * 9)]);
  }
  const stickers = cubeToStickers(cube.perm, cube.ori, scheme);
  const rebuilt = stickersToCube(stickers);
  if (rebuilt.perm.join() !== cube.perm.join() || rebuilt.ori.join() !== cube.ori.join()) {
    fail++;
    if (fail < 5) {
      console.log('MISMATCH');
      console.log(' cube   ', cube.perm.join(), '|', cube.ori.join());
      console.log(' rebuilt', rebuilt.perm.join(), '|', rebuilt.ori.join());
    }
  }
}
console.log('sticker round-trip failures:', fail, 'of 500');

// 3. color counts of a scrambled layout are always 4 each
let cube = Cube.solved().applyAlgorithm(['R', 'U', "R'", 'F', 'F', "U'"]);
const stickers = cubeToStickers(cube.perm, cube.ori, scheme);
const counts = new Array(6).fill(0);
for (const f of Object.keys(stickers)) for (const c of stickers[f]) counts[c]++;
console.log('color counts:', counts.join(','));
