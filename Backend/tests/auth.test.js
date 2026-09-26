const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const User = require('../src/models/User');
const BootstrapSentinel = require('../src/models/BootstrapSentinel');
const { generateTempPassword, hashPassword, verifyPassword } = require('../src/services/passwordUtils');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  await User.init();
  await BootstrapSentinel.init();
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
  await BootstrapSentinel.deleteMany({});
});

describe('Segment A: Auth Layer & Password Utilities', () => {
  describe('1. passwordUtils', () => {
    test('generateTempPassword returns human-typeable random string', () => {
      const pwd1 = generateTempPassword();
      const pwd2 = generateTempPassword();
      expect(pwd1).toBeDefined();
      expect(pwd2).toBeDefined();
      expect(typeof pwd1).toBe('string');
      // Format: Word-Word-Digits
      expect(pwd1).toMatch(/^[A-Z][a-z]+-[A-Z][a-z]+-\d{4}$/);
      expect(pwd1).not.toEqual(pwd2);
    });

    test('hashPassword and verifyPassword correctly hash and compare', async () => {
      const plain = 'SecretPass123!';
      const hash = await hashPassword(plain);
      expect(hash).not.toEqual(plain);
      expect(hash.startsWith('$2')).toBe(true);

      const isValid = await verifyPassword(plain, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('2. POST /api/setup/first-admin (Atomic bootstrap)', () => {
    test('concurrent requests resolve to exactly one 201 and one 409', async () => {
      const payload1 = {
        name: 'Admin One',
        email: 'admin1@stocksense.test',
        password: 'password123',
      };
      const payload2 = {
        name: 'Admin Two',
        email: 'admin2@stocksense.test',
        password: 'password456',
      };

      // Fire two concurrent calls
      const [res1, res2] = await Promise.all([
        request(app).post('/api/setup/first-admin').send(payload1),
        request(app).post('/api/setup/first-admin').send(payload2),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 409]);

      // Exactly one user was created in the database
      const usersCount = await User.countDocuments();
      expect(usersCount).toBe(1);

      // Sentinel was created and marked used
      const sentinel = await BootstrapSentinel.findById('bootstrap');
      expect(sentinel).toBeTruthy();
      expect(sentinel.used).toBe(true);
    });

    test('subsequent calls after success are permanently inert with 409', async () => {
      const res1 = await request(app).post('/api/setup/first-admin').send({
        name: 'Admin Initial',
        email: 'initial@stocksense.test',
        password: 'password123',
      });
      expect(res1.status).toBe(201);

      const res2 = await request(app).post('/api/setup/first-admin').send({
        name: 'Admin Late',
        email: 'late@stocksense.test',
        password: 'password123',
      });
      expect(res2.status).toBe(409);
      expect(res2.body.error.code).toBe('ALREADY_BOOTSTRAPPED');
    });
  });

  describe('3. POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      const passwordHash = await hashPassword('correctPassword');
      testUser = await User.create({
        name: 'Staff User',
        email: 'staff@stocksense.test',
        passwordHash,
        role: 'staff',
        assignedWarehouses: [new mongoose.Types.ObjectId()],
        mustChangePassword: true,
        active: true,
      });
    });

    test('rejects invalid password with 401', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'staff@stocksense.test',
        password: 'wrongPassword',
      });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('CRITICAL: rejects login with 403 if active === false (disabled user)', async () => {
      // Disable user
      testUser.active = false;
      await testUser.save();

      const res = await request(app).post('/api/auth/login').send({
        email: 'staff@stocksense.test',
        password: 'correctPassword',
      });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_DISABLED');
    });

    test('issues JWT containing ONLY { userId, role } and NOT assignedWarehouses', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'staff@stocksense.test',
        password: 'correctPassword',
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();

      const decoded = jwt.decode(res.body.token);
      expect(decoded.userId).toBe(testUser._id.toString());
      expect(decoded.role).toBe('staff');
      expect(decoded.assignedWarehouses).toBeUndefined();
      expect(decoded.email).toBeUndefined();
      expect(decoded.name).toBeUndefined();
    });
  });

  describe('4. requireAuth live DB active check', () => {
    test('rejects request with 401 if user was disabled after token issuance', async () => {
      const passwordHash = await hashPassword('password123');
      const user = await User.create({
        name: 'Active Staff',
        email: 'activestaff@stocksense.test',
        passwordHash,
        role: 'staff',
        mustChangePassword: false,
        active: true,
      });

      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'activestaff@stocksense.test',
        password: 'password123',
      });
      const token = loginRes.body.token;

      // Access succeeds while active
      const resBefore = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(resBefore.status).toBe(200);

      // Disable user in DB
      user.active = false;
      await user.save();

      // Next request with the same token must be rejected with 401
      const resAfter = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(resAfter.status).toBe(401);
      expect(resAfter.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('5. Profile, logout, and change-password', () => {
    test('PUT /api/auth/change-password updates password and clears mustChangePassword', async () => {
      const passwordHash = await hashPassword('tempPass123');
      const user = await User.create({
        name: 'New Staff',
        email: 'newstaff@stocksense.test',
        passwordHash,
        role: 'staff',
        mustChangePassword: true,
        active: true,
      });

      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'newstaff@stocksense.test',
        password: 'tempPass123',
      });
      const token = loginRes.body.token;

      const changeRes = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'tempPass123',
          newPassword: 'MyNewSecurePassword!2026',
        });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body.user.mustChangePassword).toBe(false);

      // Verify in DB
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.mustChangePassword).toBe(false);
      const isNewValid = await verifyPassword('MyNewSecurePassword!2026', updatedUser.passwordHash);
      expect(isNewValid).toBe(true);
    });

    test('POST /api/auth/logout succeeds with valid token', async () => {
      const passwordHash = await hashPassword('password123');
      const user = await User.create({
        name: 'Logout User',
        email: 'logout@stocksense.test',
        passwordHash,
        role: 'manager',
        mustChangePassword: false,
        active: true,
      });

      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'logout@stocksense.test',
        password: 'password123',
      });
      const token = loginRes.body.token;

      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);
      expect(logoutRes.status).toBe(200);
    });
  });

  describe('6. mustChangePassword server-side enforcement middleware', () => {
    test('blocks non-allowlisted routes with 403 when mustChangePassword is true', async () => {
      const passwordHash = await hashPassword('tempPass123');
      await User.create({
        name: 'Forced Staff',
        email: 'forced@stocksense.test',
        passwordHash,
        role: 'staff',
        mustChangePassword: true,
        active: true,
      });

      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'forced@stocksense.test',
        password: 'tempPass123',
      });
      const token = loginRes.body.token;

      // Allowlisted routes MUST succeed
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(meRes.status).toBe(200);

      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);
      expect(logoutRes.status).toBe(200);

      // Non-allowlisted route must be BLOCKED with 403
      const blockedRes = await request(app)
        .get('/api/receipts')
        .set('Authorization', `Bearer ${token}`);
      expect(blockedRes.status).toBe(403);
      expect(blockedRes.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');
    });
  });
});
