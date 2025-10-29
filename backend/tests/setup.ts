// backend/tests/setup.ts

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';

// Increase timeout for integration tests
jest.setTimeout(10000);

