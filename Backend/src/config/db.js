const mongoose = require('mongoose');

async function connectDB(uri) {
  const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/invexa';
  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);

    // Verify replica set requirement for multi-document transactions (PRD §10, §11.2)
    try {
      const admin = conn.connection.db.admin();
      const status = await admin.command({ replSetGetStatus: 1 });
      if (!status || !status.ok) {
        console.warn(
          '[MongoDB] WARNING: Could not confirm replica set status. ' +
          'Multi-document transactions (Segment B ledger and quants operations per PRD §10, §11.2) will fail without a replica set.'
        );
      }
    } catch (rsErr) {
      console.warn(
        '[MongoDB] WARNING: MongoDB does not appear to be running as a replica set (replSetGetStatus failed). ' +
        'Multi-document transactions required for StockSense ledger and quants operations (PRD §10, §11.2) require a replica set in all environments, including local dev.'
      );
    }

    return conn;
  } catch (err) {
    console.error(`[MongoDB Connection Error] ${err.message}`);
    throw err;
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = {
  connectDB,
  disconnectDB,
};
