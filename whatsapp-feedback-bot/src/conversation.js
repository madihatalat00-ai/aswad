const { config } = require('./config');
const store = require('./db');
const { sendText } = require('./whatsapp');

const OPT_OUT_WORDS = new Set(['stop', 'unsubscribe', 'optout', 'opt-out']);
const SKIP_WORDS = new Set(['skip', 'no', 'nothing', 'nope']);

function parseRating(text) {
  const trimmed = text.trim();
  if (/^[1-5]$/.test(trimmed)) return parseInt(trimmed, 10);
  const match = trimmed.match(/\b([1-5])\b/);
  return match ? parseInt(match[1], 10) : null;
}

function extractMessageText(message) {
  if (message.type === 'text') return message.text?.body || '';
  if (message.type === 'button') return message.button?.text || '';
  if (message.type === 'interactive') {
    return (
      message.interactive?.button_reply?.title ||
      message.interactive?.list_reply?.title ||
      ''
    );
  }
  return '';
}

// Handles one inbound customer message and advances that customer's
// feedback conversation: sent -> rated -> completed.
async function handleInboundMessage(message) {
  const phone = message.from;
  const text = extractMessageText(message);
  if (!text) return;

  if (OPT_OUT_WORDS.has(text.trim().toLowerCase())) {
    store.markOptedOut(phone);
    await sendText(phone, `You won't receive any more messages from ${config.brandName}. Thank you!`);
    return;
  }

  const request = store.activeRequestForPhone(phone);
  if (!request) return; // Not mid-conversation — ignore unrelated messages.

  if (request.status === 'sent') {
    const rating = parseRating(text);
    if (rating === null) {
      await sendText(phone, 'Please reply with a number from 1 to 5 (5 = loved it!) to rate your purchase. Reply STOP to opt out.');
      return;
    }
    store.updateRequest(request.id, { rating, status: 'rated' });
    await sendText(
      phone,
      rating >= 4
        ? `Thank you! 🌸 So glad you're enjoying your ${request.product}. Anything you'd like to tell us — what you loved, or ideas for us? Reply with your thoughts, or "skip".`
        : `Thank you for the honest rating. We'd really like to make it right — what didn't work for you with the ${request.product}? Reply with your thoughts, or "skip".`
    );
    return;
  }

  if (request.status === 'rated') {
    const isSkip = SKIP_WORDS.has(text.trim().toLowerCase());
    store.updateRequest(request.id, {
      comment: isSkip ? null : text.trim(),
      status: 'completed'
    });
    let thanks = `Thank you for helping ${config.brandName} grow! 💚`;
    if (config.discountCode) {
      thanks += ` Here's ${config.discountCode} for a discount on your next order at ruposh.in.`;
    }
    await sendText(phone, thanks);
  }
}

module.exports = { handleInboundMessage, parseRating, extractMessageText };
