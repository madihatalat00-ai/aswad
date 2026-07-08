# Ru Posh WhatsApp Feedback Bot

Automatically collects product feedback from customers over WhatsApp after they buy.

**How it works**

1. A customer buys a product (on ruposh.in or any other channel) and their phone
   number enters the bot through the *feeding mechanism* — a WooCommerce webhook
   that fires automatically on every completed order, or a simple API for orders
   from Instagram / offline sales.
2. After a configurable delay (default 24h) the bot sends the customer an approved
   WhatsApp template message asking them to rate the product 1–5.
3. The customer replies with a rating, the bot asks for comments, thanks them
   (optionally with a discount code), and stores everything.
4. You view results on a dashboard at `/admin` or export them as CSV.

Customers can reply `STOP` at any time and will never be messaged again.

```
WooCommerce order ──┐
                    ├──> feedback queue (SQLite) ──> scheduler ──> WhatsApp template
POST /api/orders ───┘                                                    │
                                                                 customer replies
dashboard /admin  <── ratings & comments <── conversation flow <─────────┘
```

## 1. Set up WhatsApp Cloud API (free, official)

1. Go to [developers.facebook.com](https://developers.facebook.com) → **Create App** → type **Business**.
2. Add the **WhatsApp** product to the app.
3. Under **WhatsApp → API Setup**, add and verify the business phone number you
   want the bot to send from (this becomes your brand's WhatsApp identity —
   don't use a number already registered on the WhatsApp app).
4. Note the **Phone number ID** (`PHONE_NUMBER_ID`).
5. Create a permanent access token: Business Settings → **System Users** → create
   one, assign the app with `whatsapp_business_messaging` permission, generate a
   token (`WHATSAPP_TOKEN`). (The token shown on the API Setup page expires in 24h —
   fine for testing only.)

## 2. Create the message template

WhatsApp requires the first business-initiated message to be a pre-approved
template. In **WhatsApp Manager → Message templates**, create:

- **Name:** `feedback_request` · **Category:** Marketing · **Language:** English (US)
- **Body:**

  > Hi {{1}}! Thank you for shopping with Ru Posh 🌸 We'd love to hear how you're
  > liking your *{{2}}*. On a scale of 1–5, how happy are you with it? Just reply
  > with a number. Reply STOP to opt out.

Approval usually takes a few minutes to a few hours. If you change the name or
language, update `TEMPLATE_NAME` / `TEMPLATE_LANGUAGE` in `.env`.

## 3. Run the bot

Needs Node.js ≥ 22.13 (uses the built-in SQLite — no database server required).

```bash
cd whatsapp-feedback-bot
npm install
cp .env.example .env   # fill in the values
npm start
```

Deploy anywhere that gives you a public HTTPS URL (Railway, Render, a small VPS
with Caddy/nginx). For local testing, expose the port with `ngrok http 3000`.

## 4. Connect the webhooks

**WhatsApp (inbound replies):** in the Meta app → WhatsApp → Configuration →
Webhook, set the callback URL to `https://YOUR-DOMAIN/webhook/whatsapp`, enter
your `VERIFY_TOKEN`, then subscribe to the **messages** field.

**WooCommerce (the feed):** in wp-admin → WooCommerce → Settings → Advanced →
Webhooks → Add webhook:

- Topic: **Order updated**
- Delivery URL: `https://YOUR-DOMAIN/webhook/woocommerce`
- Secret: same value as `WC_WEBHOOK_SECRET`

The bot only reacts when the order status becomes `completed`
(`WC_TRIGGER_STATUS`), and each order is de-duplicated, so repeated webhook
deliveries are safe.

**Other channels:** feed orders in manually:

```bash
curl -X POST https://YOUR-DOMAIN/api/orders \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Madiha","phone":"9876543210","product":"Lavender Essential Oil","delayHours":24}'
```

## 5. Try it

```bash
# one real template message to your own phone
node scripts/send-test.js 91XXXXXXXXXX "Face Serum" "YourName"

# full offline test of the entire flow (no real messages sent)
npm run smoke-test
```

Dashboard: `https://YOUR-DOMAIN/admin?token=YOUR_ADMIN_TOKEN` ·
CSV export: `/admin/export.csv?token=...`

## Configuration reference

| Variable | Meaning | Default |
|---|---|---|
| `WHATSAPP_TOKEN` | Cloud API access token | — (required) |
| `PHONE_NUMBER_ID` | Cloud API phone number ID | — (required) |
| `VERIFY_TOKEN` | Webhook verification secret you choose | — (required) |
| `ADMIN_TOKEN` | Protects `/api/orders` and `/admin` | — (required) |
| `WC_WEBHOOK_SECRET` | WooCommerce webhook secret | empty (signature check off) |
| `WC_TRIGGER_STATUS` | Order status that triggers a request | `completed` |
| `FEEDBACK_DELAY_HOURS` | Wait before messaging the customer | `24` |
| `DEFAULT_COUNTRY_CODE` | Assumed for 10-digit numbers | `91` |
| `DISCOUNT_CODE` | Optional coupon in the thank-you message | empty |
| `TEMPLATE_NAME` / `TEMPLATE_LANGUAGE` | Approved template | `feedback_request` / `en_US` |
| `DB_PATH` | SQLite file location | `feedback.db` |

## Notes & limits

- WhatsApp free tier currently includes 1,000 business-initiated conversations
  per month; beyond that Meta charges per conversation (marketing category for
  India is a few rupees per conversation).
- Customers must have opted in to receive WhatsApp messages — add a checkbox or
  note at checkout ("Get order updates & share feedback on WhatsApp") to stay
  compliant with WhatsApp Business policy.
- Replies outside an active feedback conversation are ignored by design; `STOP`
  always works.
