const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const Quant = require('../src/models/Quant');
const Ledger = require('../src/models/Ledger');
const Receipt = require('../src/models/Receipt');
const Delivery = require('../src/models/Delivery');
const Transfer = require('../src/models/Transfer');
const Adjustment = require('../src/models/Adjustment');
const DriftAlert = require('../src/models/DriftAlert');
const { hasNonZeroStock, getStockByProduct } = require('../src/services/stockCheck');
const { runReconciliation } = require('../src/services/reconciliation');
const { toDecimal128 } = require('../src/utils/decimalHelper');

jest.setTimeout(120000);

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  // Ensure all model indexes are created
  await Ledger.init();
  await Quant.init();
  await Receipt.init();
  await Delivery.init();
  await Transfer.init();
  await Adjustment.init();
  await DriftAlert.init();
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
});

beforeEach(async () => {
  // Clean all collections before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('StockSense Inventory Engine - Segment B Test Suite', () => {
  const warehouse1 = new mongoose.Types.ObjectId();
  const warehouse2 = new mongoose.Types.ObjectId();
  const location1 = new mongoose.Types.ObjectId();
  const location2 = new mongoose.Types.ObjectId();
  const prodA = new mongoose.Types.ObjectId();
  const prodB = new mongoose.Types.ObjectId();
  const prodC = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();

  const authHeaders = {
    'x-user-id': userId.toString(),
    'x-user-role': 'manager'
  };

  /**
   * §4.1: CRITICAL INDEX TEST
   * Multi-line receipt into one location must write 3 ledger entries without collision.
   */
  test('§4.1: Critical Ledger Index allows 3-line receipt in a single location', async () => {
    const res = await request(app)
      .post('/api/receipts')
      .set(authHeaders)
      .send({
        warehouseId: warehouse1,
        locationId: location1,
        supplier: 'Acme Corp',
        lines: [
          { productId: prodA, quantity: '10.5' },
          { productId: prodB, quantity: '20' },
          { productId: prodC, quantity: '5' }
        ]
      });

    expect(res.status).toBe(201);
    const receiptId = res.body._id;

    // Validate the receipt
    const valRes = await request(app)
      .post(`/api/receipts/${receiptId}/validate`)
      .set(authHeaders);

    expect(valRes.status).toBe(200);
    expect(valRes.body.status).toBe('done');

    // Confirm 3 distinct ledger entries were written
    const ledgers = await Ledger.find({ documentId: receiptId, type: 'receipt' });
    expect(ledgers.length).toBe(3);

    // Confirm Quants are updated
    const quantA = await Quant.findOne({ productId: prodA, locationId: location1 });
    const quantB = await Quant.findOne({ productId: prodB, locationId: location1 });
    const quantC = await Quant.findOne({ productId: prodC, locationId: location1 });

    expect(quantA.quantity.toString()).toBe('10.5');
    expect(quantB.quantity.toString()).toBe('20');
    expect(quantC.quantity.toString()).toBe('5');
  });

  /**
   * §5.2: CONCURRENCY ACCEPTANCE TEST
   * 8 units in stock. Two simultaneous validate calls for 5 units each:
   * exactly one 200, one 409, quant ends at 3.
   */
  test('§5.2: Concurrency acceptance test prevents overselling stock', async () => {
    // 1. Initial stock: 8 units of prodA in location1
    await Quant.create({
      productId: prodA,
      warehouseId: warehouse1,
      locationId: location1,
      quantity: toDecimal128('8')
    });

    // Write initial ledger balance
    await Ledger.create({
      documentId: new mongoose.Types.ObjectId(),
      type: 'receipt',
      warehouseId: warehouse1,
      locationId: location1,
      productId: prodA,
      quantityDelta: toDecimal128('8'),
      balanceAfter: toDecimal128('8'),
      user: userId,
      timestamp: new Date()
    });

    // 2. Create two separate deliveries of 5 units each
    const del1Res = await request(app)
      .post('/api/deliveries')
      .set(authHeaders)
      .send({
        warehouseId: warehouse1,
        locationId: location1,
        customer: 'Customer Alpha',
        lines: [{ productId: prodA, quantity: '5' }]
      });
    expect(del1Res.status).toBe(201);
    const del1Id = del1Res.body._id;

    const del2Res = await request(app)
      .post('/api/deliveries')
      .set(authHeaders)
      .send({
        warehouseId: warehouse1,
        locationId: location1,
        customer: 'Customer Beta',
        lines: [{ productId: prodA, quantity: '5' }]
      });
    expect(del2Res.status).toBe(201);
    const del2Id = del2Res.body._id;

    // 3. Fire both validate calls concurrently
    const [res1, res2] = await Promise.all([
      request(app).post(`/api/deliveries/${del1Id}/validate`).set(authHeaders),
      request(app).post(`/api/deliveries/${del2Id}/validate`).set(authHeaders)
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 409]);

    const failedRes = res1.status === 409 ? res1 : res2;
    expect(failedRes.body.error.code).toBe('INSUFFICIENT_STOCK');

    // 4. Verify Quant ends at exactly 3
    const finalQuant = await Quant.findOne({ productId: prodA, locationId: location1 });
    expect(finalQuant.quantity.toString()).toBe('3');
  });

  /**
   * §4.2: TRANSFER GROUP ID INHERITANCE ON REVERSAL
   */
  test('§4.2: Transfer creates transfer_out and transfer_in, and reversal inherits original transferGroupId', async () => {
    // Seed 50 units in source location
    await Quant.create({
      productId: prodA,
      warehouseId: warehouse1,
      locationId: location1,
      quantity: toDecimal128('50')
    });

    // Create transfer from loc1 to loc2
    const transferRes = await request(app)
      .post('/api/transfers')
      .set(authHeaders)
      .send({
        sourceWarehouseId: warehouse1,
        sourceLocationId: location1,
        destWarehouseId: warehouse2,
        destLocationId: location2,
        lines: [{ productId: prodA, quantity: '15' }]
      });

    expect(transferRes.status).toBe(201);
    const transferId = transferRes.body._id;

    // Validate transfer
    const valRes = await request(app)
      .post(`/api/transfers/${transferId}/validate`)
      .set(authHeaders);

    expect(valRes.status).toBe(200);

    const sourceQuant = await Quant.findOne({ productId: prodA, locationId: location1 });
    const destQuant = await Quant.findOne({ productId: prodA, locationId: location2 });
    expect(sourceQuant.quantity.toString()).toBe('35');
    expect(destQuant.quantity.toString()).toBe('15');

    const ledgers = await Ledger.find({ documentId: transferId });
    expect(ledgers.length).toBe(2);
    const originalGroupId = ledgers[0].transferGroupId.toString();
    expect(ledgers[1].transferGroupId.toString()).toBe(originalGroupId);

    // Reverse transfer (Manager only)
    const revRes = await request(app)
      .post(`/api/transfers/${transferId}/reverse`)
      .set(authHeaders);

    expect(revRes.status).toBe(200);
    expect(revRes.body.status).toBe('reversed');

    // Verify 4 total ledger records sharing the exact same transferGroupId
    const allLedgers = await Ledger.find({ documentId: transferId });
    expect(allLedgers.length).toBe(4);
    allLedgers.forEach(l => {
      expect(l.transferGroupId.toString()).toBe(originalGroupId);
    });

    // Quantities restored
    const sourceRestored = await Quant.findOne({ productId: prodA, locationId: location1 });
    const destRestored = await Quant.findOne({ productId: prodA, locationId: location2 });
    expect(sourceRestored.quantity.toString()).toBe('50');
    expect(destRestored.quantity.toString()).toBe('0');
  });

  /**
   * §2: STOCK CHECK FUNCTIONS (Segment A dependencies)
   */
  test('§2: stockCheck service exports hasNonZeroStock and getStockByProduct', async () => {
    await Quant.create({
      productId: prodA,
      warehouseId: warehouse1,
      locationId: location1,
      quantity: toDecimal128('25')
    });

    const hasStock = await hasNonZeroStock(warehouse1);
    expect(hasStock).toBe(true);

    const hasStockLoc = await hasNonZeroStock(warehouse1, location1);
    expect(hasStockLoc).toBe(true);

    const hasNoStockWh = await hasNonZeroStock(warehouse2);
    expect(hasNoStockWh).toBe(false);

    const stockByProd = await getStockByProduct(prodA);
    expect(stockByProd.length).toBe(1);
    expect(stockByProd[0].quantity).toBe('25');
  });

  /**
   * §6 & §7: ADJUSTMENTS & STATE MACHINE
   */
  test('§6 & §7: Adjustment validates counted quantity and updates stock ledger', async () => {
    // Initial stock 10
    await Quant.create({
      productId: prodA,
      warehouseId: warehouse1,
      locationId: location1,
      quantity: toDecimal128('10')
    });

    // Create adjustment to 7 (damage)
    const adjRes = await request(app)
      .post('/api/adjustments')
      .set(authHeaders)
      .send({
        productId: prodA,
        warehouseId: warehouse1,
        locationId: location1,
        countedQuantity: '7',
        reasonCode: 'damage'
      });

    expect(adjRes.status).toBe(201);
    const adjId = adjRes.body._id;

    // Validate adjustment
    const valRes = await request(app)
      .post(`/api/adjustments/${adjId}/validate`)
      .set(authHeaders);

    expect(valRes.status).toBe(200);

    const updatedQuant = await Quant.findOne({ productId: prodA, locationId: location1 });
    expect(updatedQuant.quantity.toString()).toBe('7');

    const ledger = await Ledger.findOne({ documentId: adjId });
    expect(ledger.quantityDelta.toString()).toBe('-3');
    expect(ledger.reasonCode).toBe('damage');
  });

  /**
   * §8: RECONCILIATION & DRIFT DETECTION
   */
  test('§8: Reconciliation detects drift and records driftAlert without auto-correcting', async () => {
    // Seed ledger with total delta = 30
    await Ledger.create({
      documentId: new mongoose.Types.ObjectId(),
      type: 'receipt',
      warehouseId: warehouse1,
      locationId: location1,
      productId: prodA,
      quantityDelta: toDecimal128('30'),
      balanceAfter: toDecimal128('30'),
      user: userId,
      timestamp: new Date()
    });

    // Seed corrupted Quant with quantity = 25 (drift of 5)
    await Quant.create({
      productId: prodA,
      warehouseId: warehouse1,
      locationId: location1,
      quantity: toDecimal128('25')
    });

    const report = await runReconciliation();
    expect(report.driftAlertsCreatedCount).toBe(1);

    // Verify DriftAlert created in DB
    const alerts = await DriftAlert.find({});
    expect(alerts.length).toBe(1);
    expect(alerts[0].ledgerDerivedBalance.toString()).toBe('30');
    expect(alerts[0].quantsBalance.toString()).toBe('25');

    // Confirm Quants was NOT auto-corrected!
    const quantAfter = await Quant.findOne({ productId: prodA, locationId: location1 });
    expect(quantAfter.quantity.toString()).toBe('25');
  });

  /**
   * §9: DASHBOARD KPIS & MOVE HISTORY
   */
  test('§9: Dashboard KPIs and move history return accurate real-time aggregates', async () => {
    await Quant.create({
      productId: prodA,
      warehouseId: warehouse1,
      locationId: location1,
      quantity: toDecimal128('5')
    });

    await Receipt.create({
      warehouseId: warehouse1,
      locationId: location1,
      status: 'waiting',
      createdBy: userId,
      lines: [{ productId: prodA, quantity: toDecimal128('10') }]
    });

    const kpiRes = await request(app)
      .get('/api/dashboard/kpis')
      .set(authHeaders);

    expect(kpiRes.status).toBe(200);
    expect(kpiRes.body.totalProductsInStock).toBe(1);
    expect(kpiRes.body.pendingReceipts).toBe(1);

    const historyRes = await request(app)
      .get('/api/move-history')
      .set(authHeaders);

    expect(historyRes.status).toBe(200);
    expect(Array.isArray(historyRes.body.data)).toBe(true);
  });
});
