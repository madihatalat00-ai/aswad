// Sends one real feedback request to a phone number you own, so you can
// try the full conversation before wiring up the store.
// Usage: node scripts/send-test.js 917006282510 "Face Serum" "Aswad"
const { assertRuntimeConfig } = require('../src/config');
const { normalizePhone } = require('../src/phone');
const { sendFeedbackTemplate } = require('../src/whatsapp');

async function main() {
  assertRuntimeConfig();
  const [rawPhone, product = 'Face Serum', name = 'there'] = process.argv.slice(2);
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    console.error('Usage: node scripts/send-test.js <phone> [product] [name]');
    process.exit(1);
  }
  const result = await sendFeedbackTemplate(phone, name, product);
  console.log('Sent!', JSON.stringify(result, null, 2));
  console.log('Reply from that phone to test the rating conversation (run the server first).');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
