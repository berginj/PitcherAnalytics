const { getUserId } = require('../shared/auth');

describe('Authentication', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    delete process.env.LOCAL_DEV_USER_ID;
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getUserId with Azure SWA header', () => {
    it('should extract user from x-ms-client-principal header', () => {
      const principal = {
        userId: 'user-123',
        userDetails: 'user@example.com'
      };
      const header = Buffer.from(JSON.stringify(principal)).toString('base64');

      const request = {
        headers: {
          get: (name) => name === 'x-ms-client-principal' ? header : null
        }
      };

      const result = getUserId(request);

      expect(result).not.toBeNull();
      expect(result.userId).toBe('user-123');
      expect(result.userDetails).toBe('user@example.com');
      expect(result.principal).toEqual(principal);
    });

    it('should return null if header is missing', () => {
      const request = {
        headers: {
          get: () => null
        }
      };

      const result = getUserId(request);
      expect(result).toBeNull();
    });

    it('should return null if header is malformed', () => {
      const request = {
        headers: {
          get: () => 'invalid-base64-!@#$%'
        }
      };

      const result = getUserId(request);
      expect(result).toBeNull();
    });

    it('should return null if header contains invalid JSON', () => {
      const invalidJson = Buffer.from('not valid json {').toString('base64');

      const request = {
        headers: {
          get: () => invalidJson
        }
      };

      const result = getUserId(request);
      expect(result).toBeNull();
    });

    it('should fallback to userDetails if userId is missing', () => {
      const principal = {
        userDetails: 'user@example.com'
      };
      const header = Buffer.from(JSON.stringify(principal)).toString('base64');

      const request = {
        headers: {
          get: () => header
        }
      };

      const result = getUserId(request);

      expect(result).not.toBeNull();
      expect(result.userId).toBe('user@example.com');
    });

    it('should fallback to "anonymous" if both userId and userDetails are missing', () => {
      const principal = {};
      const header = Buffer.from(JSON.stringify(principal)).toString('base64');

      const request = {
        headers: {
          get: () => header
        }
      };

      const result = getUserId(request);

      expect(result).not.toBeNull();
      expect(result.userId).toBe('anonymous');
    });
  });

  describe('getUserId with LOCAL_DEV_USER_ID', () => {
    it('should use LOCAL_DEV_USER_ID in development mode', () => {
      process.env.LOCAL_DEV_USER_ID = 'dev-user-123';
      process.env.NODE_ENV = 'development';

      const request = { headers: { get: () => null } };
      const result = getUserId(request);

      expect(result).not.toBeNull();
      expect(result.userId).toBe('dev-user-123');
      expect(result.userDetails).toBe('Local Dev');
    });

    it('should use LOCAL_DEV_USER_ID when NODE_ENV is not set', () => {
      process.env.LOCAL_DEV_USER_ID = 'dev-user-456';
      delete process.env.NODE_ENV;

      const request = { headers: { get: () => null } };
      const result = getUserId(request);

      expect(result).not.toBeNull();
      expect(result.userId).toBe('dev-user-456');
    });

    it('should throw error if LOCAL_DEV_USER_ID is set in production', () => {
      process.env.LOCAL_DEV_USER_ID = 'dev-user-789';
      process.env.NODE_ENV = 'production';

      const request = { headers: { get: () => null } };

      expect(() => getUserId(request)).toThrow('Authentication bypass is not allowed in production');
    });

    it('should use LOCAL_DEV_USER_ID in test environment', () => {
      process.env.LOCAL_DEV_USER_ID = 'test-user';
      process.env.NODE_ENV = 'test';

      const request = { headers: { get: () => null } };
      const result = getUserId(request);

      expect(result).not.toBeNull();
      expect(result.userId).toBe('test-user');
    });
  });

  describe('getUserId priority', () => {
    it('should prioritize LOCAL_DEV_USER_ID over header', () => {
      process.env.LOCAL_DEV_USER_ID = 'local-dev';
      process.env.NODE_ENV = 'development';

      const principal = { userId: 'azure-user' };
      const header = Buffer.from(JSON.stringify(principal)).toString('base64');

      const request = {
        headers: {
          get: () => header
        }
      };

      const result = getUserId(request);

      expect(result.userId).toBe('local-dev');
      expect(result.userDetails).toBe('Local Dev');
    });
  });
});
