const { config } = require('./config');

async function callGraphApi(payload) {
  const url = `${config.graphApiBase}/${config.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.whatsappToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = body.error ? `${body.error.code} ${body.error.message}` : res.statusText;
    throw new Error(`WhatsApp API error (${res.status}): ${detail}`);
  }
  return body;
}

// First contact must use a pre-approved template (business-initiated message).
// Template body expected to have two variables: {{1}} = name, {{2}} = product.
function sendFeedbackTemplate(to, customerName, product) {
  return callGraphApi({
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: config.templateName,
      language: { code: config.templateLanguage },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: customerName },
            { type: 'text', text: product }
          ]
        }
      ]
    }
  });
}

// Free-form messages are allowed inside the 24h window after the customer replies.
function sendText(to, body) {
  return callGraphApi({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body }
  });
}

module.exports = { sendFeedbackTemplate, sendText };
