const { TableServiceClient } = require("@azure/data-tables");

const SESSION_TABLE = "Sessions";
const PITCH_TABLE = "Pitches";

let cachedClients = null;

function getConnectionString() {
  return process.env.TABLE_CONNECTION_STRING || process.env.AzureWebJobsStorage;
}

async function ensureTable(tableClient) {
  try {
    await tableClient.createTable();
  } catch (error) {
    if (error.statusCode !== 409) {
      throw error;
    }
  }
}

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
