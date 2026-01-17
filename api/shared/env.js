/**
 * Environment variable validation and configuration management
 * Validates required environment variables on startup
 */

/**
 * Required environment variables for production
 */
const REQUIRED_ENV_VARS = [
  {
    name: "TABLE_CONNECTION_STRING",
    fallback: "AzureWebJobsStorage",
    description: "Azure Table Storage connection string"
  }
];

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_ENV_VARS = [
  {
    name: "SESSION_SCHEMA_PATH",
    description: "Path to session summary JSON schema",
    default: null
  },
  {
    name: "NODE_ENV",
    description: "Node environment (development, production, test)",
    default: "development"
  }
];

/**
 * Development-only environment variables that should NOT be in production
 */
const DEV_ONLY_ENV_VARS = ["LOCAL_DEV_USER_ID"];

/**
 * Validates that required environment variables are set
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
function validateEnvironment() {
  const errors = [];

  // Check required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar.name];
    const fallbackValue = envVar.fallback ? process.env[envVar.fallback] : null;

    if (!value && !fallbackValue) {
      errors.push(
        `Missing required environment variable: ${envVar.name}` +
          (envVar.fallback ? ` (or ${envVar.fallback})` : "") +
          ` - ${envVar.description}`
      );
    }
  }

  // Warn about development variables in production
  const nodeEnv = process.env.NODE_ENV || "development";
  if (nodeEnv === "production") {
    for (const devVar of DEV_ONLY_ENV_VARS) {
      if (process.env[devVar]) {
        errors.push(
          `CRITICAL: Development-only variable ${devVar} is set in production environment. ` +
            `This is a security risk and must be removed.`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Gets environment configuration with defaults applied
 * @returns {Object} Environment configuration
 */
function getEnvironmentConfig() {
  const config = {
    nodeEnv: process.env.NODE_ENV || "development",
    isProduction: process.env.NODE_ENV === "production",
    isDevelopment: process.env.NODE_ENV !== "production",
    tableConnectionString:
      process.env.TABLE_CONNECTION_STRING || process.env.AzureWebJobsStorage,
    schemaPath: process.env.SESSION_SCHEMA_PATH,
    localDevUserId: process.env.LOCAL_DEV_USER_ID
  };

  return config;
}

/**
 * Validates environment and throws if invalid
 * Call this on application startup
 * @throws {Error} If required environment variables are missing
 */
function validateEnvironmentOrThrow() {
  const result = validateEnvironment();

  if (!result.valid) {
    const errorMessage =
      "Environment validation failed:\n" + result.errors.map((e) => `  - ${e}`).join("\n");

    console.error(errorMessage);
    throw new Error("Environment validation failed. See logs for details.");
  }

  const config = getEnvironmentConfig();
  console.log(`Environment validated successfully (${config.nodeEnv} mode)`);

  // Log warnings for development mode
  if (config.isDevelopment && config.localDevUserId) {
    console.warn("WARNING: Running with LOCAL_DEV_USER_ID (development mode)");
  }

  return config;
}

module.exports = {
  validateEnvironment,
  validateEnvironmentOrThrow,
  getEnvironmentConfig
};
