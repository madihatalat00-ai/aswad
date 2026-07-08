require('./load-env');

function env(name, fallback) {
  const value = process.env[name];
  if (value !== undefined && value !== '') return value;
  return fallback;
}

const config = {
  port: parseInt(env('PORT', '3000'), 10),

  // Meta WhatsApp Cloud API
  graphApiBase: env('GRAPH_API_BASE', 'https://graph.facebook.com/v20.0'),
  whatsappToken: env('WHATSAPP_TOKEN', ''),
  phoneNumberId: env('PHONE_NUMBER_ID', ''),
  verifyToken: env('VERIFY_TOKEN', ''),

  // Approved message template used for the first (business-initiated) message
  templateName: env('TEMPLATE_NAME', 'feedback_request'),
  templateLanguage: env('TEMPLATE_LANGUAGE', 'en_US'),

  // Feed sources
  wcWebhookSecret: env('WC_WEBHOOK_SECRET', ''),
  wcTriggerStatus: env('WC_TRIGGER_STATUS', 'completed'),
  adminToken: env('ADMIN_TOKEN', ''),

  // Behaviour
  feedbackDelayHours: parseFloat(env('FEEDBACK_DELAY_HOURS', '24')),
  defaultCountryCode: env('DEFAULT_COUNTRY_CODE', '91'),
  discountCode: env('DISCOUNT_CODE', ''),
  maxSendAttempts: parseInt(env('MAX_SEND_ATTEMPTS', '3'), 10),
  schedulerIntervalMs: parseInt(env('SCHEDULER_INTERVAL_MS', '60000'), 10),

  dbPath: env('DB_PATH', 'feedback.db'),
  brandName: env('BRAND_NAME', 'Ru Posh')
};

function assertRuntimeConfig() {
  const missing = [];
  if (!config.whatsappToken) missing.push('WHATSAPP_TOKEN');
  if (!config.phoneNumberId) missing.push('PHONE_NUMBER_ID');
  if (!config.verifyToken) missing.push('VERIFY_TOKEN');
  if (!config.adminToken) missing.push('ADMIN_TOKEN');
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}. See .env.example`);
  }
}

module.exports = { config, assertRuntimeConfig };
