import assert from 'node:assert/strict';
import { earthFrame } from '../lib/ascii-earth.mjs';
const frame = earthFrame(0);
assert.equal(frame.split('\n').length, 30);
assert.ok(frame.split('\n').every(row => row.length === 60));
assert.match(frame, /[#@]/);
assert.match(frame, /[.:]/);
assert.notEqual(frame, earthFrame(90));
assert.equal(frame, earthFrame(360));
assert.equal(earthFrame(-90), earthFrame(270));
console.log('ASCII globe dimensions, land/ocean, rotation and wrapping pass.');

const compact = earthFrame(0,20,10);
assert.equal(compact.split('\n').length,10);
assert.ok(compact.split('\n').every(row=>row.length===20));
assert.notEqual(compact,earthFrame(90,20,10));
