/**
 * @file generate.js
 * @module generator/generate
 *
 * Offline entry point that builds the lookup table and writes it to
 * `assets/lookup.json`. Run it with:
 *
 * ```
 *   npm run generate
 * ```
 *
 * The JSON payload stores the per-state discovering-move indices as a base64
 * encoded byte array, keeping the file small and fast to load in the browser.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LookupGenerator } from './LookupGenerator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, '../../assets/lookup.json');

console.log('Generating 2x2 lookup table (BFS from solved)...');
const result = new LookupGenerator().generate();

console.log(`  states visited : ${result.visited} / ${result.stateCount}`);
console.log(`  God's number   : ${result.maxDepth}`);
console.log(`  generation time: ${result.elapsedMs} ms`);

const payload = {
  version: 1,
  description: '2x2 corner-cube BFS solution table (move index per state).',
  stateCount: result.stateCount,
  maxDepth: result.maxDepth,
  moveNames: result.moveNames,
  inverse: result.inverse,
  encoding: 'base64',
  data: Buffer.from(result.moves).toString('base64'),
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(payload));

const bytes = Buffer.byteLength(JSON.stringify(payload));
console.log(`  wrote ${OUTPUT} (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
