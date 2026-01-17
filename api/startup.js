/**
 * API Startup Script
 * Validates environment and performs initialization tasks
 * This runs once when the Azure Functions host starts
 */

const { validateEnvironmentOrThrow } = require('./shared/env');
const { initialize: initializeMonitoring } = require('./shared/monitoring');

/**
 * Initialize the API
 * Validates environment and logs startup information
 */
function initialize() {
  console.log('Pitcher Analytics API initializing...');

  try {
    // Validate environment variables
    const config = validateEnvironmentOrThrow();

    // Initialize Application Insights monitoring
    const monitoringEnabled = initializeMonitoring();

    console.log('API initialized successfully');
    console.log(`  Environment: ${config.nodeEnv}`);
    console.log(`  Storage: ${config.tableConnectionString ? 'Configured' : 'Missing'}`);
    console.log(`  Monitoring: ${monitoringEnabled ? 'Enabled' : 'Disabled'}`);

    return config;
  } catch (error) {
    console.error('FATAL: API initialization failed');
    console.error(error.message);

    // In production, we want to fail fast
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }

    throw error;
  }
}

// Run initialization
initialize();

module.exports = { initialize };
