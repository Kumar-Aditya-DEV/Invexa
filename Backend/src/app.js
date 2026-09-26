const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const receiptsRouter = require('./routes/receipts');
const deliveriesRouter = require('./routes/deliveries');
const transfersRouter = require('./routes/transfers');
const adjustmentsRouter = require('./routes/adjustments');
const ledgerRouter = require('./routes/ledger');
const dashboardRouter = require('./routes/dashboard');
const adminRouter = require('./routes/admin');

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'StockSense Inventory Engine', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/receipts', receiptsRouter);
app.use('/api/deliveries', deliveriesRouter);
app.use('/api/transfers', transfersRouter);
app.use('/api/adjustments', adjustmentsRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/move-history', dashboardRouter); // Supports GET /api/move-history as well
app.use('/api/admin', adminRouter);

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
