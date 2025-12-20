import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../index.js'; // Import your Express app
import { UserModel } from '../models/User.js';

describe('Authentication API', () => {
  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test_assignment_system';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    // Clean up and close connection
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear users collection before each test
    await UserModel.deleteMany({});
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const testUser = {
        username: 'testuser',
        fullName: 'Test User',
        email: 'test@example.com',
        role: 'student',
        passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // 'password'
        status: 'active'
      };
      await UserModel.create(testUser);
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('testuser');
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser'
          // missing password
        });

      expect(response.status).toBe(400);
    });
  });

  describe('User Management', () => {
    let adminToken;

    beforeEach(async () => {
      // Create admin user and get token
      const adminUser = {
        username: 'admin',
        fullName: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // 'password'
        status: 'active'
      };
      await UserModel.create(adminUser);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'password'
        });

      adminToken = loginResponse.body.accessToken;
    });

    describe('GET /api/admin/accounts', () => {
      it('should get users list when authenticated as admin', async () => {
        const response = await request(app)
          .get('/api/admin/accounts')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('items');
        expect(Array.isArray(response.body.items)).toBe(true);
      });

      it('should return 401 when not authenticated', async () => {
        const response = await request(app)
          .get('/api/admin/accounts');

        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/admin/accounts', () => {
      it('should create new user when authenticated as admin', async () => {
        const newUser = {
          username: 'newuser',
          fullName: 'New User',
          email: 'newuser@example.com',
          role: 'student',
          password: 'password123',
          phone: '0123456789',
          department: 'CNTT'
        };

        const response = await request(app)
          .post('/api/admin/accounts')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(newUser);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.username).toBe('newuser');
      });

      it('should return 400 for invalid data', async () => {
        const invalidUser = {
          username: '', // invalid
          fullName: 'New User',
          email: 'invalid-email', // invalid
          role: 'student',
          password: '123' // too short
        };

        const response = await request(app)
          .post('/api/admin/accounts')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidUser);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      });
    });
  });
});
