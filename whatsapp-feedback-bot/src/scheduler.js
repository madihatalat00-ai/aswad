const { config } = require('./config');
const store = require('./db');
const { sendFeedbackTemplate } = require('./whatsapp');

// The "feeding mechanism" consumer: picks up scheduled feedback requests whose
// time has come and sends the WhatsApp template message to the customer.
async function tick() {
  const due = store.dueRequests();
  for (const request of due) {
    try {
      await sendFeedbackTemplate(request.phone, request.customer_name, request.product);
      store.updateRequest(request.id, { status: 'sent', sent_at: Date.now() });
      console.log(`[scheduler] sent feedback request #${request.id} to ${request.phone}`);
    } catch (err) {
      const attempts = request.attempts + 1;
      const failed = attempts >= config.maxSendAttempts;
      store.updateRequest(request.id, {
        attempts,
        status: failed ? 'failed' : 'scheduled',
        // Back off 10 minutes before retrying.
        scheduled_at: failed ? request.scheduled_at : Date.now() + 10 * 60 * 1000
      });
      console.error(`[scheduler] send failed for #${request.id} (attempt ${attempts}): ${err.message}`);
    }
  }
  return due.length;
}

function start() {
  tick().catch((err) => console.error('[scheduler]', err));
  const timer = setInterval(() => {
    tick().catch((err) => console.error('[scheduler]', err));
  }, config.schedulerIntervalMs);
  timer.unref();
  return timer;
}

module.exports = { start, tick };
