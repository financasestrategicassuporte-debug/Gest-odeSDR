export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { service, payload, token, apiKey, evolutionUrl } = req.body || {};

  if (service === '__ping__') return res.status(400).json({ pong: true });

  try {

    // ── CLAUDE ──────────────────────────────────────────────────────
    if (service === 'claude') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(payload)
      });
      const data = await r.json().catch(() => ({}));
      return res.status(r.status).json(data);
    }

    // ── RD STATION ───────────────────────────────────────────────────
    if (service === 'rd') {
      const { endpoint, method: m, body: b } = payload || {};
      const sep = (endpoint || '').includes('?') ? '&' : '?';
      const url = `https://crm.rdstation.com/api/v1/${endpoint}${sep}token=${token}`;
      const r = await fetch(url, {
        method: m || 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: b ? JSON.stringify(b) : undefined
      });
      const data = await r.json().catch(() => ({}));
      return res.status(r.ok ? 200 : r.status).json(data);
    }

    // ── EVOLUTION API ─────────────────────────────────────────────────
    // Roda server-side → sem CORS, sem 401 de origem bloqueada
    if (service === 'evolution') {
      const { path, method: m, body: b } = payload || {};
      const base = (evolutionUrl || '').replace(/\/+$/, '');
      if (!base) return res.status(400).json({ error: 'evolutionUrl não informada' });

      const url = base + path;
      const opts = {
        method: m || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': token || ''
        }
      };
      if (b && m !== 'GET') opts.body = JSON.stringify(b);

      const r = await fetch(url, opts);
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); }
      catch { data = { _raw: text.substring(0, 500) }; }

      return res.status(r.ok ? 200 : r.status).json(data);
    }

    return res.status(400).json({ error: `Serviço desconhecido: ${service}` });

  } catch (e) {
    console.error('[proxy]', service, e.message);
    return res.status(500).json({ error: e.message });
  }
}
