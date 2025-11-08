// Test setup file
import 'dotenv/config';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test_assignment_system';
process.env.JWT_SECRET = 'test_jwt_secret';

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  // Keep error and warn for debugging
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};
