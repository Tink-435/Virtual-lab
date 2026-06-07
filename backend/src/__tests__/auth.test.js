/**
 * AUTH INTEGRATION TESTS
 *
 * These test the full HTTP request → controller → DB pipeline.
 * We use supertest to fire real HTTP requests against our Express app
 * and mongodb-memory-server to run a real in-memory MongoDB instance.
 *
 * Why integration tests vs unit tests?
 * - Middleware chains, validators, DB interactions all tested together
 * - Catches bugs that unit tests miss (e.g., schema validation rejecting data)
 * - Still fast: in-memory DB, no network
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.JWT_SECRET = 'test_secret_key';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.CLIENT_URL = 'http://localhost:3000';

  // Import app AFTER setting env vars
  const serverModule = require('../server');
  app = serverModule.app;
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

describe('POST /api/auth/register', () => {
  const validUser = {
    name: 'Test Student',
    email: 'student@test.com',
    password: 'password123',
    role: 'student',
  };

  test('registers a new user and returns JWT', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(validUser);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('student@test.com');
    expect(res.body.user.role).toBe('student');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  test('rejects duplicate email', async () => {
    await request(app).post('/api/auth/register').send(validUser);
    const res = await request(app).post('/api/auth/register').send(validUser);
    expect(res.status).toBe(409);
  });

  test('rejects invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...validUser,
      email: 'not-an-email',
    });
    expect(res.status).toBe(400);
  });

  test('rejects weak password (< 8 chars)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...validUser,
      password: 'abc',
    });
    expect(res.status).toBe(400);
  });

  test('prevents admin role self-assignment', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...validUser,
      role: 'admin',
    });
    expect(res.status).toBe(201);
    // Role should be capped at 'student', not 'admin'
    expect(res.body.user.role).not.toBe('admin');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'user@test.com',
      password: 'password123',
    });
  });

  test('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'user@test.com',
      password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'user@test.com',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  test('returns vague message (does not reveal which field is wrong)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@test.com',
      password: 'password123',
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });
});

describe('GET /api/auth/me', () => {
  test('returns user profile with valid JWT', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Me User',
      email: 'me@test.com',
      password: 'password123',
    });
    const token = reg.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@test.com');
  });

  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('returns 401 with tampered token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer fake.token.here');
    expect(res.status).toBe(401);
  });
});
