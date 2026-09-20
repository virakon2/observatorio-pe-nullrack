import domains from '../domains.json' with { type: 'json' };
import { normalizeHost, probeHost } from '../lib/probe.js';

const allowed = new Set(domains.map(item => item.host));

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });
  try {
    const host = normalizeHost(req.query.host);
    if (!allowed.has(host)) return res.status(400).json({ error: 'Dominio fuera del catálogo' });
    const result = await probeHost(host);
    if (result.kind === 'unknown') console.warn('Inconclusive transport check', host, result.http.error, result.https.error);
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'No se pudo comprobar el dominio' });
  }
}
