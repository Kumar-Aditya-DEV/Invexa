require('dotenv').config();
const mongoose = require('mongoose');
const { runReconciliation } = require('../services/reconciliation');

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stocksense';
  console.log(`[Reconciliation Job] Connecting to MongoDB: ${mongoUri.replace(/\/\/.*@/, '//***@')}`);

  try {
    await mongoose.connect(mongoUri);
    console.log('[Reconciliation Job] Database connected. Starting reconciliation...');

    const result = await runReconciliation();
    console.log('[Reconciliation Job] Reconciliation completed successfully:');
    console.log(`- Tuples checked: ${result.reconciledTuplesCount}`);
    console.log(`- Drift alerts created: ${result.driftAlertsCreatedCount}`);

    if (result.driftAlertsCreatedCount > 0) {
      console.warn(`[Reconciliation Job] WARNING: ${result.driftAlertsCreatedCount} stock drift alerts detected!`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Reconciliation Job] Error during reconciliation:', err);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = main;
