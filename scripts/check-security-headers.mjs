import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const source = await readFile(new URL('../next.config.ts', import.meta.url), 'utf8');
const { default: config } = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`);
const originalEnv = process.env.NODE_ENV;
try {
  for (const environment of ['production', 'development']) {
    process.env.NODE_ENV = environment;
    const [rule] = await config.headers();
    assert.equal(rule.source, '/:path*');
    const headers = new Headers(rule.headers.map(({ key, value }) => [key, value]));
    assert.equal(headers.get('x-frame-options'), 'DENY');
    assert.match(headers.get('strict-transport-security'), /max-age=31536000/);
    assert.equal(headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.equal(headers.get('permissions-policy'), 'camera=(), microphone=(), geolocation=()');
    assert.equal(headers.get('x-content-type-options'), 'nosniff');
    const csp = new Map(headers.get('content-security-policy').split('; ').map(directive => {
      const [name, ...values] = directive.split(' ');
      return [name, values];
    }));
    for (const directive of ['object-src', 'frame-ancestors', 'frame-src']) {
      assert.deepEqual(csp.get(directive), ["'none'"]);
    }
    assert.deepEqual(csp.get('default-src'), ["'self'"]);
    assert.ok(csp.get('script-src').includes('https://collect.tracwell.app'));
    assert.ok(csp.get('connect-src').includes('https://collect.tracwell.app'));
    assert.ok(csp.get('connect-src').includes('https://api.github.com'));
    assert.ok(csp.get('img-src').includes('https://www.google.com'));
    assert.ok(csp.get('img-src').includes('https://*.gstatic.com'));
    assert.equal(csp.get('script-src').includes("'unsafe-eval'"), environment === 'development');
    assert.equal(csp.get('connect-src').includes('ws:'), environment === 'development');
    assert.equal(csp.get('connect-src').includes('wss:'), environment === 'development');
  }
} finally {
  if (originalEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalEnv;
}
console.log('Security headers cover every route; production CSP excludes eval and external WebSockets.');
