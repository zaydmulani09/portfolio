import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const src = await readFile(new URL('../site/explorer.js', import.meta.url), 'utf8');
const { matrix, spectralRadius, ceiling } = new Function(`${src.slice(src.indexOf('const matrix'), src.indexOf('const fmt'))}; return { matrix, spectralRadius, ceiling };`)();

const cycle = matrix(3, [[0, 1, 0.2], [1, 2, 0.2], [2, 0, 0.2]], 3, -1);
assert.ok(Math.abs(spectralRadius(cycle) - 0.6) < 1e-9);
ceiling(cycle).forEach((x) => assert.ok(Math.abs(x - 2.5) < 1e-9));

const star = matrix(5, [[0, 1, 0.25], [0, 2, 0.25], [0, 3, 0.25], [0, 4, 0.25], [1, 0, 1], [2, 0, 1], [3, 0, 1], [4, 0, 1]], 2, -1);
assert.ok(Math.abs(spectralRadius(star) - 2) < 1e-9);

const chain = matrix(3, [[0, 1, 1], [1, 2, 1]], 5, -1);
assert.equal(spectralRadius(chain), 0);
assert.deepEqual(ceiling(chain).map((x) => Math.round(x)), [1, 6, 31]);

assert.equal(spectralRadius(matrix(3, [[0, 1, 0.2], [1, 2, 0.2], [2, 0, 0.2]], 3, 2)), 0);
console.log('explorer fixtures match the draft');
