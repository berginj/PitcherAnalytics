const { applyRateLimit, checkRateLimit, cleanupRateLimitStore } = require('../shared/rateLimit');

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear any existing rate limit data between tests
    cleanupRateLimitStore();
  });

  describe('checkRateLimit', () => {
    it('should allow first request and return correct remaining count', () => {
      const userId = 'test-user-1';
      const result = checkRateLimit(userId);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99); // 100 - 1
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should increment count on subsequent requests', () => {
      const userId = 'test-user-2';

      checkRateLimit(userId);
      const result = checkRateLimit(userId);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(98); // 100 - 2
    });

    it('should block requests after limit is exceeded', () => {
      const userId = 'test-user-3';

      // Make 100 requests (the limit)
      for (let i = 0; i < 100; i++) {
        checkRateLimit(userId);
      }

      // 101st request should be blocked
      const result = checkRateLimit(userId);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after time window passes', (done) => {
      const userId = 'test-user-4';

      // First request
      const first = checkRateLimit(userId);
      expect(first.allowed).toBe(true);

      // Wait for reset time to pass (mocked by manipulating resetTime)
      setTimeout(() => {
        const result = checkRateLimit(userId);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(99);
        done();
      }, 100);
    }, 200);

    it('should track separate limits for different users', () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      // User 1 makes requests
      for (let i = 0; i < 50; i++) {
        checkRateLimit(user1);
      }

      // User 2 should have fresh limit
      const result = checkRateLimit(user2);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });
  });

  describe('applyRateLimit', () => {
    it('should return allowed for authenticated user with remaining quota', () => {
      const user = { userId: 'test-user-5' };
      const result = applyRateLimit(user);

      expect(result.allowed).toBe(true);
      expect(result.headers).toHaveProperty('X-RateLimit-Limit');
      expect(result.headers).toHaveProperty('X-RateLimit-Remaining');
      expect(result.headers).toHaveProperty('X-RateLimit-Reset');
    });

    it('should return 429 response when limit exceeded', () => {
      const user = { userId: 'test-user-6' };

      // Exhaust the limit
      for (let i = 0; i < 100; i++) {
        applyRateLimit(user);
      }

      // Next request should be denied
      const result = applyRateLimit(user);
      expect(result.allowed).toBe(false);
      expect(result.response).toBeDefined();
      expect(result.response.status).toBe(429);
      expect(result.response.jsonBody.error).toContain('Too many requests');
      expect(result.response.headers).toHaveProperty('Retry-After');
    });

    it('should handle missing user gracefully', () => {
      const result = applyRateLimit(null);
      expect(result.allowed).toBe(true);
      expect(result.headers).toEqual({});
    });

    it('should handle user without userId', () => {
      const user = { userDetails: 'test' };
      const result = applyRateLimit(user);
      expect(result.allowed).toBe(true);
      expect(result.headers).toEqual({});
    });
  });

  describe('cleanupRateLimitStore', () => {
    it('should remove expired entries', (done) => {
      const userId = 'test-user-7';

      checkRateLimit(userId);

      // Force cleanup after reset time
      setTimeout(() => {
        cleanupRateLimitStore();

        // User should get fresh limit after cleanup
        const result = checkRateLimit(userId);
        expect(result.remaining).toBe(99);
        done();
      }, 100);
    }, 200);
  });
});
