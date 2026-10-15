import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Every standalone check in turn, stopping at the first failure. check-page-cache reads a .next
// build, so it runs separately as test:build once `next build --webpack` has produced one.
const dir = new URL('./', import.meta.url);
const checks = readdirSync(dir).filter(name => /^check-.+\.mjs$/.test(name) && name !== 'check-page-cache.mjs').sort();
for (const name of checks) {
 console.log(`\n▶ ${name}`);
 const result = spawnSync(process.execPath, [fileURLToPath(new URL(name, dir))], {stdio:'inherit'});
 if (result.error) throw result.error;
 if (result.status !== 0) { console.error(`✖ ${name} failed`); process.exit(result.status ?? 1); }
}
console.log(`\n✓ ${checks.length} checks pass`);
