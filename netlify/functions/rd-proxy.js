exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const token = params.token;
    const endpoint = params.endpoint;
    const method = (params.method || 'GET').toUpperCase();

    if (!token || !endpoint) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'token e endpoint são obrigatórios' }) };
    }

    const sep = endpoint.includes('?') ? '&' : '?';
    const url = 'https://crm.rdstation.com/api/v1/' + endpoint + sep + 'token=' + token;

    const fetchOptions = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (event.body && method !== 'GET') {
      fetchOptions.body = event.body;
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.text();

    return {
      statusCode: response.status,
      headers,
      body: data
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
