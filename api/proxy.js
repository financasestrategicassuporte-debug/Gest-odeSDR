// api/proxy.js — Vercel Serverless Function
// Resolve CORS para: Claude API, RD Station CRM, Microsoft Graph
// Deploy: push para o GitHub conectado ao Vercel — sem configuração extra

module.exports = async (req, res) => {
  // Permite chamadas do próprio site
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Apenas POST' });

  const { service, payload, token, apiKey } = req.body || {};

  try {
    let response, data;

    // ─── CLAUDE AI ───────────────────────────────────────────────────
    if (service === 'claude') {
      if (!apiKey) return res.status(400).json({ error: 'apiKey obrigatório' });

      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(payload)
      });

      data = await response.json();
      return res.status(response.status).json(data);
    }

    // ─── RD STATION CRM ──────────────────────────────────────────────
    if (service === 'rd') {
      if (!token) return res.status(400).json({ error: 'token RD Station obrigatório' });

      const { endpoint, method = 'GET', body: rdBody } = payload || {};
      const sep = endpoint.includes('?') ? '&' : '?';
      const url = `https://crm.rdstation.com/api/v1/${endpoint}${sep}token=${encodeURIComponent(token)}`;

      const opts = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      if (rdBody) opts.body = JSON.stringify(rdBody);

      response = await fetch(url, opts);
      data = await response.json().catch(() => ({ status: response.status }));
      return res.status(response.status).json(data);
    }

    // ─── MICROSOFT GRAPH — buscar dados ──────────────────────────────
    if (service === 'ms') {
      if (!token) return res.status(400).json({ error: 'token MS obrigatório' });

      const { endpoint: msEndpoint } = payload || {};
      response = await fetch(`https://graph.microsoft.com/v1.0/${msEndpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      data = await response.json().catch(() => ({}));
      return res.status(response.status).json(data);
    }

    // ─── MICROSOFT GRAPH — gerar token (client_credentials) ──────────
    if (service === 'ms_token') {
      const { tenantId, clientId, clientSecret } = payload || {};
      if (!tenantId || !clientId || !clientSecret) {
        return res.status(400).json({ error: 'tenantId, clientId e clientSecret obrigatórios' });
      }

      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default'
      });

      response = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString()
        }
      );

      data = await response.json();
      return res.status(response.status).json(data);
    }

    // ─── EVOLUTION API (opcional — se tiver CORS bloqueado) ──────────
    if (service === 'evolution') {
      const { baseUrl, apiKeyEvo, endpoint: evoEndpoint, method: evoMethod = 'GET', body: evoBody } = payload || {};
      response = await fetch(`${baseUrl}${evoEndpoint}`, {
        method: evoMethod,
        headers: { 'Content-Type': 'application/json', 'apikey': apiKeyEvo }
      });
      data = await response.json().catch(() => ({}));
      return res.status(response.status).json(data);
    }

    return res.status(400).json({ error: `Serviço desconhecido: ${service}` });

  } catch (e) {
    console.error('[proxy]', e);
    return res.status(500).json({ error: e.message });
  }
};
