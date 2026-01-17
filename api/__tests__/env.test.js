const { validateEnvironment, validateEnvironmentOrThrow, getEnvironmentConfig } = require('../shared/env');

describe('Environment Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('validateEnvironment', () => {
    it('should pass with valid environment', () => {
      process.env.TABLE_CONNECTION_STRING = 'UseDevelopmentStorage=true';
      process.env.NODE_ENV = 'development';

      const result = validateEnvironment();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass with fallback environment variable', () => {
      delete process.env.TABLE_CONNECTION_STRING;
      process.env.AzureWebJobsStorage = 'UseDevelopmentStorage=true';

      const result = validateEnvironment();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when required variables are missing', () => {
      delete process.env.TABLE_CONNECTION_STRING;
      delete process.env.AzureWebJobsStorage;

      const result = validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('TABLE_CONNECTION_STRING');
    });

    it('should detect development variables in production', () => {
      process.env.TABLE_CONNECTION_STRING = 'test';
      process.env.NODE_ENV = 'production';
      process.env.LOCAL_DEV_USER_ID = 'dev-user';

      const result = validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('LOCAL_DEV_USER_ID'))).toBe(true);
      expect(result.errors.some(e => e.includes('CRITICAL'))).toBe(true);
    });

    it('should allow development variables in non-production', () => {
      process.env.TABLE_CONNECTION_STRING = 'test';
      process.env.NODE_ENV = 'development';
      process.env.LOCAL_DEV_USER_ID = 'dev-user';

      const result = validateEnvironment();

      expect(result.valid).toBe(true);
    });
  });

  describe('getEnvironmentConfig', () => {
    it('should return configuration with all values', () => {
      process.env.NODE_ENV = 'production';
      process.env.TABLE_CONNECTION_STRING = 'connection-string';
      process.env.SESSION_SCHEMA_PATH = '/path/to/schema';

      const config = getEnvironmentConfig();

      expect(config.nodeEnv).toBe('production');
      expect(config.isProduction).toBe(true);
      expect(config.isDevelopment).toBe(false);
      expect(config.tableConnectionString).toBe('connection-string');
      expect(config.schemaPath).toBe('/path/to/schema');
    });

    it('should default to development mode', () => {
      delete process.env.NODE_ENV;
      process.env.TABLE_CONNECTION_STRING = 'test';

      const config = getEnvironmentConfig();

      expect(config.nodeEnv).toBe('development');
      expect(config.isProduction).toBe(false);
      expect(config.isDevelopment).toBe(true);
    });

    it('should use fallback for connection string', () => {
      delete process.env.TABLE_CONNECTION_STRING;
      process.env.AzureWebJobsStorage = 'fallback-connection';

      const config = getEnvironmentConfig();

      expect(config.tableConnectionString).toBe('fallback-connection');
    });
  });

  describe('validateEnvironmentOrThrow', () => {
    it('should return config when environment is valid', () => {
      process.env.TABLE_CONNECTION_STRING = 'test';
      process.env.NODE_ENV = 'test';

      const config = validateEnvironmentOrThrow();

      expect(config).toBeDefined();
      expect(config.nodeEnv).toBe('test');
    });

    it('should throw when environment is invalid', () => {
      delete process.env.TABLE_CONNECTION_STRING;
      delete process.env.AzureWebJobsStorage;

      expect(() => validateEnvironmentOrThrow()).toThrow('Environment validation failed');
    });

    it('should throw when dev variables are in production', () => {
      process.env.TABLE_CONNECTION_STRING = 'test';
      process.env.NODE_ENV = 'production';
      process.env.LOCAL_DEV_USER_ID = 'dev';

      expect(() => validateEnvironmentOrThrow()).toThrow('Environment validation failed');
    });
  });
});
