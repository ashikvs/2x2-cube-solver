import { readFileSync } from 'node:fs';
import { Cube } from '../js/core/Cube.js';
import { validate } from '../js/core/Validator.js';
import { cubeToStickers } from '../js/core/StickerMapper.js';
import { LookupTable } from '../js/solver/LookupTable.js';
import { LookupSolver } from '../js/solver/LookupSolver.js';
import { SOLVER_MOVE_NAMES } from '../js/core/MoveDefinitions.js';

const json = JSON.parse(readFileSync(new URL('../assets/lookup.json', import.meta.url)));
const table = LookupTable.fromJSON(json);
const solver = new LookupSolver(table);
console.log('table size:', table.size, 'maxDepth:', json.maxDepth);

const scheme = { U: 1, D: 0, F: 2, B: 3, L: 4, R: 5 };

// 1. Solver directly on random cubes
let fail = 0, total = 0;
for (let t = 0; t < 5000; t++) {
  let cube = Cube.solved();
  const n = 1 + Math.floor(Math.random() * 20);
  for (let k = 0; k < n; k++) cube = cube.applyMove(SOLVER_MOVE_NAMES[Math.floor(Math.random() * 9)]);
  const sol = solver.solve(cube);
  total += sol.length;
  if (!cube.applyAlgorithm(sol).isSolved()) fail++;
}
console.log('direct solve failures:', fail, 'avg len:', (total / 5000).toFixed(2));

// 2. Full pipeline: scramble -> stickers -> validate -> solve
let pfail = 0, vfail = 0;
for (let t = 0; t < 2000; t++) {
  let cube = Cube.solved();
  const n = 1 + Math.floor(Math.random() * 20);
  for (let k = 0; k < n; k++) cube = cube.applyMove(SOLVER_MOVE_NAMES[Math.floor(Math.random() * 9)]);
  const stickers = cubeToStickers(cube.perm, cube.ori, scheme);
  const res = validate(stickers);
  if (!res.ok) { vfail++; continue; }
  const built = new Cube(res.cube.perm, res.cube.ori);
  const sol = solver.solve(built);
  if (!built.applyAlgorithm(sol).isSolved()) pfail++;
}
console.log('validation failures:', vfail, 'pipeline solve failures:', pfail);

// 3. Solved cube -> empty solution
console.log('solved gives empty:', solver.solve(Cube.solved()).length === 0);

// 4. An invalid (single-twist) cube is rejected
const twisted = cubeToStickers([0,1,2,3,4,5,6,7], [1,0,0,0,0,0,0,2], scheme);
console.log('twisted rejected:', !validate(twisted).ok);
