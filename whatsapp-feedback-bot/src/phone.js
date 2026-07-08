const { config } = require('./config');

// Normalize any phone format ("+91 70062-82510", "07006282510", "7006282510")
// to the digits-only E.164 form the WhatsApp Cloud API expects ("917006282510").
function normalizePhone(raw, countryCode = config.defaultCountryCode) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  digits = digits.replace(/^0+/, '');
  if (!digits) return null;
  if (digits.length === 10) digits = countryCode + digits;
  if (digits.length < 11 || digits.length > 15) return null;
  return digits;
}

module.exports = { normalizePhone };
