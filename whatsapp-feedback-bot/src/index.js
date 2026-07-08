const { config, assertRuntimeConfig } = require('./config');
const { createApp } = require('./server');
const scheduler = require('./scheduler');

assertRuntimeConfig();

const app = createApp();
app.listen(config.port, () => {
  console.log(`${config.brandName} feedback bot listening on port ${config.port}`);
  scheduler.start();
});
