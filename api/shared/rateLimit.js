/**
 * Simple in-memory rate limiter for API endpoints.
 *
 * Note: This is a basic implementation suitable for single-instance deployments.
 * For production multi-instance scenarios, consider using Redis or Azure Cache.
 */

const { trackRateLimitViolation } = require('./monitoring');

// Store rate limit data: { userId: { count: number, resetTime: number } }
const rateLimitStore = new Map();

// Configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100; // 100 requests per minute per user

/**
 * Check if a user has exceeded the rate limit.
 *
 * @param {string} userId - The user ID to check
 * @returns {{ allowed: boolean, remaining: number, resetTime: number }} Rate limit status
 */
function checkRateLimit(userId) {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);

  // Initialize or reset if window has passed
  if (!userLimit || now > userLimit.resetTime) {
    const resetTime = now + RATE_LIMIT_WINDOW_MS;
    rateLimitStore.set(userId, {
      count: 1,
      resetTime
    });

    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      resetTime
    };
  }

  // Increment count
  userLimit.count++;

  // Check if limit exceeded
  if (userLimit.count > MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: userLimit.resetTime
    };
  }

  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - userLimit.count,
    resetTime: userLimit.resetTime
  };
}

/**
 * Middleware to apply rate limiting to API endpoints.
 * Returns a 429 response if rate limit is exceeded.
 *
 * @param {Object} user - User object with userId
 * @returns {{ allowed: boolean, response?: Object, headers: Object }} Rate limit result
 */
function applyRateLimit(user) {
  if (!user || !user.userId) {
    // No user means no rate limiting (authentication will handle this)
    return { allowed: true, headers: {} };
  }

  const status = checkRateLimit(user.userId);

  // Add rate limit headers
  const headers = {
    "X-RateLimit-Limit": String(MAX_REQUESTS_PER_WINDOW),
    "X-RateLimit-Remaining": String(status.remaining),
    "X-RateLimit-Reset": new Date(status.resetTime).toISOString()
  };

  if (!status.allowed) {
    const retryAfter = Math.ceil((status.resetTime - Date.now()) / 1000);

    // Track rate limit violation
    trackRateLimitViolation(user.userId, "api");

    return {
      allowed: false,
      response: {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(retryAfter)
        },
        jsonBody: {
          error: "Too many requests. Please try again later.",
          retryAfter: retryAfter
        }
      },
      headers
    };
  }

  return { allowed: true, headers };
}

/**
 * Clean up old entries from the rate limit store (periodic maintenance).
 * Should be called periodically to prevent memory leaks.
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [userId, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(userId);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);

module.exports = {
  applyRateLimit,
  checkRateLimit,
  cleanupRateLimitStore
};
