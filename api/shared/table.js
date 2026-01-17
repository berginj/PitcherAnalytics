/**
 * Azure Table Storage client management
 * Provides cached table clients for sessions and pitches
 */
const { TableServiceClient } = require("@azure/data-tables");

const SESSION_TABLE = "Sessions";
const PITCH_TABLE = "Pitches";

/** @type {{sessionsTable: Object, pitchesTable: Object}|null} Cached table clients */
let cachedClients = null;

/**
 * Gets the Azure Storage connection string from environment variables
 * @returns {string|undefined} Connection string or undefined
 */
function getConnectionString() {
  return process.env.TABLE_CONNECTION_STRING || process.env.AzureWebJobsStorage;
}

/**
 * Ensures a table exists, creating it if necessary
 * Ignores 409 (Conflict) errors which indicate the table already exists
 * @param {Object} tableClient - Azure TableClient instance
 * @returns {Promise<void>}
 */
async function ensureTable(tableClient) {
  try {
    await tableClient.createTable();
  } catch (error) {
    if (error.statusCode !== 409) {
      throw error;
    }
  }
}

/**
 * Gets or creates cached Azure Table Storage clients
 * Creates the tables if they don't exist on first access
 * @returns {Promise<{sessionsTable: Object, pitchesTable: Object}>} Table clients
 * @throws {Error} If connection string is missing
 */
async function getTableClients() {
  if (cachedClients) {
    return cachedClients;
  }

  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error("Missing TABLE_CONNECTION_STRING or AzureWebJobsStorage.");
  }

  const serviceClient = TableServiceClient.fromConnectionString(connectionString);
  const sessionsTable = serviceClient.getTableClient(SESSION_TABLE);
  const pitchesTable = serviceClient.getTableClient(PITCH_TABLE);

  await ensureTable(sessionsTable);
  await ensureTable(pitchesTable);

  cachedClients = { sessionsTable, pitchesTable };
  return cachedClients;
}

module.exports = { getTableClients };
