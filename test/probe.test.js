import test from 'node:test';
import assert from 'node:assert/strict';
import { certificateDaysRemaining, classify, gradeTransport, isPublicIPv4, normalizeHost, pinnedLookup, probeHost } from '../lib/probe.js';

test('acepta solo dominios .pe bien formados', () => {
  assert.equal(normalizeHost(' WWW.GOB.PE. '), 'www.gob.pe');
  for (const host of ['localhost', 'example.com', '127.0.0.1', 'http://gob.pe', 'a..pe']) assert.throws(() => normalizeHost(host));
});

test('bloquea direcciones internas y reservadas', () => {
  for (const ip of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.1.1', '100.64.0.1', '203.0.113.1']) assert.equal(isPublicIPv4(ip), false);
  assert.equal(isPublicIPv4('8.8.8.8'), true);
});

test('distingue redirección, HTTP abierto y fallo HTTPS', () => {
  assert.equal(classify('x.pe', {ok:true,status:301,location:'https://x.pe/'}, {ok:true,status:200}).kind, 'redirect');
  assert.equal(classify('x.pe', {ok:true,status:200}, {ok:true,status:200}).kind, 'mixed');
  assert.equal(classify('x.pe', {ok:true,status:200}, {ok:false}).kind, 'nohttps');
  assert.equal(classify('x.pe', {ok:false}, {ok:false}).kind, 'unknown');
});

test('califica el transporte con evidencia comprensible', () => {
  assert.equal(gradeTransport({ok:true,status:301,location:'https://x.pe/'}, {ok:true,hsts:'max-age=31536000'}).grade, 'A');
  assert.equal(gradeTransport({ok:true,status:301,location:'https://x.pe/'}, {ok:true}).grade, 'B');
  assert.equal(gradeTransport({ok:true,status:200}, {ok:true}).grade, 'C');
  assert.equal(gradeTransport({ok:true,status:200}, {ok:false}).grade, 'F');
});

test('calcula días restantes del certificado', () => {
  const now = Date.parse('2026-01-01T00:00:00Z');
  assert.equal(certificateDaysRemaining('Jan 11 00:00:00 2026 GMT', now), 10);
  assert.equal(certificateDaysRemaining(null, now), null);
});

test('usa la misma dirección pública para ambas comprobaciones', async () => {
  const calls = [];
  const result = await probeHost('test.pe', {
    resolve: async () => '8.8.8.8',
    request: async (host, ip, secure) => {
      calls.push({host, ip, secure});
      return secure
        ? {ok:true,status:200,hsts:'max-age=31536000',tlsProtocol:'TLSv1.3',certificateValidTo:'Jan 11 00:00:00 2026 GMT'}
        : {ok:true,status:301,location:'https://test.pe/'};
    }
  });
  assert.equal(result.kind, 'redirect');
  assert.equal(result.grade, 'A');
  assert.equal(result.https.hsts, true);
  assert.deepEqual(calls.map(x => x.ip), ['8.8.8.8', '8.8.8.8']);
});

test('fija la dirección con la forma de DNS requerida por Node', () => {
  const lookup = pinnedLookup('8.8.8.8');
  lookup('test.pe', { all: true }, (_error, addresses) => assert.deepEqual(addresses, [{ address: '8.8.8.8', family: 4 }]));
  lookup('test.pe', { all: false }, (_error, address, family) => {
    assert.equal(address, '8.8.8.8');
    assert.equal(family, 4);
  });
});
