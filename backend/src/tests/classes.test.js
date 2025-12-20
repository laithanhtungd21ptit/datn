import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../index.js';
import { UserModel } from '../models/User.js';
import { ClassModel } from '../models/Class.js';

describe('Classes API', () => {
  let adminToken;
  let teacherId;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test_assignment_system';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
    await ClassModel.deleteMany({});

    // Create admin and teacher
    const admin = await UserModel.create({
      username: 'admin',
      fullName: 'Admin',
      email: 'admin@test.com',
      role: 'admin',
      passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      status: 'active'
    });

    const teacher = await UserModel.create({
      username: 'teacher',
      fullName: 'Teacher',
      email: 'teacher@test.com',
      role: 'teacher',
      passwordHash: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
      status: 'active'
    });

    teacherId = teacher._id.toString();

    // Login as admin
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'password' });

    adminToken = loginResponse.body.accessToken;
  });

  describe('GET /api/admin/classes', () => {
    it('should get classes list', async () => {
      const response = await request(app)
        .get('/api/admin/classes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/admin/classes', () => {
    it('should create new class', async () => {
      const newClass = {
        name: 'Test Class',
        code: 'TEST101',
        teacherId: teacherId,
        department: 'CNTT',
        description: 'Test class description'
      };

      const response = await request(app)
        .post('/api/admin/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newClass);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');

      // Verify class was created
      const createdClass = await ClassModel.findById(response.body.id);
      expect(createdClass).toBeTruthy();
      expect(createdClass.name).toBe('Test Class');
      expect(createdClass.code).toBe('TEST101');
    });

    it('should return 400 for duplicate code', async () => {
      // Create first class
      await ClassModel.create({
        name: 'Test Class 1',
        code: 'TEST101',
        teacherId: teacherId,
        department: 'CNTT'
      });

      const duplicateClass = {
        name: 'Test Class 2',
        code: 'TEST101', // duplicate
        teacherId: teacherId,
        department: 'CNTT'
      };

      const response = await request(app)
        .post('/api/admin/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateClass);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'CODE_EXISTS');
    });

    it('should return 400 for invalid teacher', async () => {
      const invalidClass = {
        name: 'Test Class',
        code: 'TEST101',
        teacherId: '507f1f77bcf86cd799439011', // Invalid ObjectId
        department: 'CNTT'
      };

      const response = await request(app)
        .post('/api/admin/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidClass);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'INVALID_TEACHER');
    });
  });

  describe('PUT /api/admin/classes/:id', () => {
    let classId;

    beforeEach(async () => {
      const testClass = await ClassModel.create({
        name: 'Original Class',
        code: 'ORIG101',
        teacherId: teacherId,
        department: 'CNTT'
      });
      classId = testClass._id.toString();
    });

    it('should update class successfully', async () => {
      const updateData = {
        name: 'Updated Class',
        department: 'KTPM'
      };

      const response = await request(app)
        .put(`/api/admin/classes/${classId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // Verify update
      const updatedClass = await ClassModel.findById(classId);
      expect(updatedClass.name).toBe('Updated Class');
      expect(updatedClass.department).toBe('KTPM');
    });
  });

  describe('DELETE /api/admin/classes/:id', () => {
    let classId;

    beforeEach(async () => {
      const testClass = await ClassModel.create({
        name: 'Class to Delete',
        code: 'DEL101',
        teacherId: teacherId,
        department: 'CNTT'
      });
      classId = testClass._id.toString();
    });

    it('should delete class successfully', async () => {
      const response = await request(app)
        .delete(`/api/admin/classes/${classId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // Verify deletion
      const deletedClass = await ClassModel.findById(classId);
      expect(deletedClass).toBeNull();
    });
  });
});
