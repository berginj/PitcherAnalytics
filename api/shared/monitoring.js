/**
 * Azure Application Insights monitoring integration
 * Provides structured logging and telemetry tracking
 */

const appInsights = require("applicationinsights");

let telemetryClient = null;
let isInitialized = false;

/**
 * Initializes Application Insights if connection string is available
 * Safe to call multiple times - only initializes once
 * @returns {boolean} True if initialized successfully
 */
function initialize() {
  if (isInitialized) {
    return true;
  }

  const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

  if (!connectionString) {
    console.warn(
      "Application Insights not configured. Set APPLICATIONINSIGHTS_CONNECTION_STRING for monitoring."
    );
    return false;
  }

  try {
    appInsights
      .setup(connectionString)
      .setAutoDependencyCorrelation(true)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(true, true)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .setAutoCollectConsole(true, true)
      .setUseDiskRetryCaching(true)
      .start();

    telemetryClient = appInsights.defaultClient;

    // Add common properties to all telemetry
    telemetryClient.commonProperties = {
      application: "pitcher-analytics-api",
      environment: process.env.NODE_ENV || "development"
    };

    isInitialized = true;
    console.log("Application Insights initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize Application Insights:", error.message);
    return false;
  }
}

/**
 * Tracks a custom event
 * @param {string} name - Event name
 * @param {Object} properties - Custom properties
 * @param {Object} measurements - Numeric measurements
 */
function trackEvent(name, properties = {}, measurements = {}) {
  if (!telemetryClient) {
    return;
  }

  telemetryClient.trackEvent({
    name,
    properties,
    measurements
  });
}

/**
 * Tracks an HTTP request
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {number} duration - Request duration in ms
 */
function trackRequest(req, res, duration) {
  if (!telemetryClient) {
    return;
  }

  telemetryClient.trackRequest({
    name: `${req.method} ${req.url}`,
    url: req.url,
    duration,
    resultCode: res.status,
    success: res.status < 400
  });
}

/**
 * Tracks an exception/error
 * @param {Error} error - Error object
 * @param {Object} properties - Additional context
 */
function trackException(error, properties = {}) {
  if (!telemetryClient) {
    return;
  }

  telemetryClient.trackException({
    exception: error,
    properties
  });
}

/**
 * Tracks a dependency call (e.g., database, external API)
 * @param {string} name - Dependency name
 * @param {string} type - Dependency type (e.g., "HTTP", "SQL", "Azure Table")
 * @param {boolean} success - Whether the call succeeded
 * @param {number} duration - Duration in ms
 * @param {Object} properties - Additional properties
 */
function trackDependency(name, type, success, duration, properties = {}) {
  if (!telemetryClient) {
    return;
  }

  telemetryClient.trackDependency({
    name,
    dependencyTypeName: type,
    success,
    duration,
    properties
  });
}

/**
 * Tracks a custom metric
 * @param {string} name - Metric name
 * @param {number} value - Metric value
 * @param {Object} properties - Additional properties
 */
function trackMetric(name, value, properties = {}) {
  if (!telemetryClient) {
    return;
  }

  telemetryClient.trackMetric({
    name,
    value,
    properties
  });
}

/**
 * Tracks a rate limit violation
 * @param {string} userId - User ID
 * @param {string} endpoint - API endpoint
 */
function trackRateLimitViolation(userId, endpoint) {
  trackEvent("RateLimitExceeded", {
    userId,
    endpoint
  });

  trackMetric("RateLimitViolations", 1, {
    userId,
    endpoint
  });
}

/**
 * Tracks a failed login attempt
 * @param {string} reason - Failure reason
 */
function trackAuthenticationFailure(reason) {
  trackEvent("AuthenticationFailed", {
    reason
  });
}

/**
 * Tracks a successful session upload
 * @param {string} sessionId - Session ID
 * @param {number} pitchCount - Number of pitches
 */
function trackSessionUploaded(sessionId, pitchCount) {
  trackEvent("SessionUploaded", {
    sessionId,
    pitchCount: String(pitchCount)
  });

  trackMetric("SessionPitchCount", pitchCount, {
    sessionId
  });
}

/**
 * Flushes telemetry data to Application Insights
 * Useful for ensuring data is sent before Azure Functions shuts down
 * @returns {Promise<void>}
 */
function flush() {
  if (!telemetryClient) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    telemetryClient.flush({
      callback: () => resolve()
    });
  });
}

module.exports = {
  initialize,
  trackEvent,
  trackRequest,
  trackException,
  trackDependency,
  trackMetric,
  trackRateLimitViolation,
  trackAuthenticationFailure,
  trackSessionUploaded,
  flush
};
