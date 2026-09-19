import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const manifest = JSON.parse(await readFile('.next/prerender-manifest.json','utf8'));
assert.equal(manifest.routes['/']?.initialRevalidateSeconds,900,'Homepage must use 15-minute ISR');
const html = await readFile('.next/server/app/index.html','utf8');
assert.ok(html.includes('patch-entry'),'Patch notes must be present before JavaScript loads');
assert.ok(!html.includes('Receiving planetary updates'),'Cached homepage must not show a news loading gate');
console.log('Homepage contains prerendered notes and refreshes every 15 minutes.');
