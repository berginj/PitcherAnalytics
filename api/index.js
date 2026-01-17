/**
 * Pitcher Analytics API
 * Azure Functions endpoints for managing pitch analysis sessions
 */

// Initialize and validate environment on startup
require("./startup");

const { app } = require("@azure/functions");
const { getUserId } = require("./shared/auth");
const { getTableClients } = require("./shared/table");
const { validateSessionSummary } = require("./shared/schema");
const { extractSession, toTableKey } = require("./shared/normalize");
const { applyRateLimit } = require("./shared/rateLimit");
const { processUploadedFile } = require("./shared/zipHandler");

/**
 * Returns a 401 Unauthorized response
 * @returns {{status: number, jsonBody: Object}} HTTP response
 */
function unauthorized() {
  return { status: 401, jsonBody: { error: "Unauthorized" } };
}

/**
 * Removes undefined and null values from an entity object
 * Azure Table Storage doesn't allow these values
 * @param {Object} entity - Entity object to normalize
 * @returns {Object} Normalized entity with only defined values
 */
function normalizeEntity(entity) {
  return Object.fromEntries(
    Object.entries(entity).filter(([, value]) => value !== undefined && value !== null)
  );
}

/**
 * Escapes single quotes for OData filter strings
 * Single quotes must be doubled in OData queries
 * @param {string|number} value - Value to escape
 * @returns {string} Escaped value
 */
function escapeOData(value) {
  return String(value).replace(/'/g, "''");
}

/**
 * Validates that a value is safe for use in OData queries
 * Only allows alphanumeric characters, hyphens, and underscores
 * @param {string} value - Value to validate
 * @param {string} fieldName - Field name for error messages
 * @returns {string} The validated value
 * @throws {Error} If value contains unsafe characters
 */
function validateODataSafeValue(value, fieldName = "value") {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid ${fieldName}: must be a non-empty string`);
  }

  // Allow only alphanumeric, hyphen, underscore
  const safePattern = /^[a-zA-Z0-9_-]+$/;
  if (!safePattern.test(value)) {
    throw new Error(`Invalid ${fieldName}: contains unsafe characters`);
  }

  return value;
}

app.http("sessions", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "sessions",
  handler: async (request) => {
    const user = getUserId(request);
    if (!user) {
      return unauthorized();
    }

    // Apply rate limiting
    const rateLimit = applyRateLimit(user);
    if (!rateLimit.allowed) {
      return rateLimit.response;
    }

    try {
      const { sessionsTable, pitchesTable } = await getTableClients();

      if (request.method === "GET") {
        // Validate userId is safe for OData query
        validateODataSafeValue(user.userId, "userId");
        const filter = `PartitionKey eq '${escapeOData(user.userId)}'`;
        const sessions = [];
        for await (const entity of sessionsTable.listEntities({ queryOptions: { filter } })) {
          sessions.push({
            sessionId: entity.sessionId || entity.rowKey,
            sessionKey: entity.rowKey,
            createdAt: entity.createdAt,
            pitchCount: entity.pitchCount || 0,
            sessionName: entity.sessionName || null,
            startedAt: entity.startedAt || null
          });
        }

        sessions.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

        return { status: 200, headers: rateLimit.headers, jsonBody: { sessions } };
      }

      // Handle both JSON and ZIP file uploads
      let payload;
      const contentType = request.headers.get("content-type") || "";

      try {
        if (contentType.includes("application/zip") || contentType.includes("application/x-zip")) {
          // Handle ZIP file upload
          const fileBuffer = await request.arrayBuffer();
          payload = processUploadedFile(Buffer.from(fileBuffer), contentType);
        } else if (
          contentType.includes("multipart/form-data") ||
          contentType.includes("application/octet-stream")
        ) {
          // Handle binary upload (could be ZIP)
          const fileBuffer = await request.arrayBuffer();
          payload = processUploadedFile(Buffer.from(fileBuffer), contentType);
        } else {
          // Handle JSON upload (default)
          payload = await request.json();
        }
      } catch (error) {
        return {
          status: 400,
          jsonBody: {
            error: `Failed to parse upload: ${error.message}`
          }
        };
      }

      const validation = validateSessionSummary(payload);
      if (!validation.ok) {
        return {
          status: 400,
          jsonBody: {
            error: validation.error,
            details: validation.details || null
          }
        };
      }

      const extracted = extractSession(payload);
      const sessionKey = toTableKey(extracted.sessionId);
      const createdAt = new Date().toISOString();

      const sessionEntity = normalizeEntity({
        partitionKey: user.userId,
        rowKey: sessionKey,
        sessionId: extracted.sessionId,
        sessionName: extracted.sessionName,
        startedAt: extracted.startedAt,
        createdAt,
        pitchCount: extracted.pitchCount ?? extracted.pitches.length,
        strikes: extracted.strikes,
        balls: extracted.balls,
        heatmap: extracted.heatmap ? JSON.stringify(extracted.heatmap) : null,
        raw: JSON.stringify(payload)
      });

      await sessionsTable.upsertEntity(sessionEntity, "Replace");

      const pitchEntities = extracted.pitches.map((pitch) =>
        normalizeEntity({
          partitionKey: sessionKey,
          rowKey: toTableKey(pitch.pitchId),
          sessionId: extracted.sessionId,
          pitchId: pitch.pitchId,
          speed: pitch.speed,
          run: pitch.run,
          rise: pitch.rise,
          zone: pitch.zone,
          zoneRow: pitch.zoneRow,
          zoneCol: pitch.zoneCol,
          isStrike: pitch.isStrike,
          // Additional PitchTracker fields
          rotationRpm: pitch.rotationRpm,
          spinAxis: pitch.spinAxis,
          spinEfficiency: pitch.spinEfficiency,
          confidence: pitch.confidence,
          plateX: pitch.plateX,
          plateZ: pitch.plateZ,
          releaseHeight: pitch.releaseHeight,
          releaseSide: pitch.releaseSide,
          extension: pitch.extension,
          raw: JSON.stringify(pitch.raw)
        })
      );

      // Process batches with transaction integrity tracking
      let batchesProcessed = 0;
      const totalBatches = Math.ceil(pitchEntities.length / 100);

      try {
        for (let i = 0; i < pitchEntities.length; i += 100) {
          const batch = pitchEntities.slice(i, i + 100).map((entity) => ({
            operationType: "upsert",
            partitionKey: entity.partitionKey,
            rowKey: entity.rowKey,
            entity
          }));

          if (batch.length > 0) {
            await pitchesTable.submitTransaction(batch);
            batchesProcessed++;
          }
        }
      } catch (batchError) {
        // Log detailed error about partial batch failure
        console.error(`Batch transaction failed: ${batchesProcessed}/${totalBatches} batches completed before failure`, {
          sessionId: extracted.sessionId,
          sessionKey,
          userId: user.userId,
          error: batchError
        });

        // Attempt to clean up the session entity since pitch data is incomplete
        try {
          await sessionsTable.deleteEntity(user.userId, sessionKey);
          console.info(`Cleaned up session entity after batch failure: ${sessionKey}`);
        } catch (cleanupError) {
          console.error(`Failed to clean up session entity after batch failure: ${sessionKey}`, cleanupError);
        }

        // Re-throw with clear message
        throw new Error("Transaction failed: Unable to save all pitch data. The operation has been rolled back.");
      }

      return {
        status: 201,
        headers: rateLimit.headers,
        jsonBody: { sessionId: extracted.sessionId, pitchCount: extracted.pitchCount ?? extracted.pitches.length }
      };
    } catch (error) {
      // Log detailed error server-side for debugging
      console.error("Error in POST /sessions:", error);

      // Return generic error message to client (don't expose internals)
      // Only expose validation errors which are safe
      if (error.message && error.message.includes("Invalid")) {
        return { status: 400, jsonBody: { error: error.message } };
      }

      return { status: 500, jsonBody: { error: "An internal server error occurred" } };
    }
  }
});

app.http("sessionById", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "sessions/{session_id}",
  handler: async (request) => {
    const user = getUserId(request);
    if (!user) {
      return unauthorized();
    }

    // Apply rate limiting
    const rateLimit = applyRateLimit(user);
    if (!rateLimit.allowed) {
      return rateLimit.response;
    }

    const sessionId = request.params.session_id;
    const sessionKey = toTableKey(sessionId);

    try {
      const { sessionsTable, pitchesTable } = await getTableClients();

      // Validate userId and sessionKey are safe for queries
      validateODataSafeValue(user.userId, "userId");
      validateODataSafeValue(sessionKey, "sessionKey");

      const sessionEntity = await sessionsTable.getEntity(user.userId, sessionKey);

      if (!sessionEntity) {
        return { status: 404, jsonBody: { error: "Session not found" } };
      }

      const pitches = [];
      const filter = `PartitionKey eq '${escapeOData(sessionKey)}'`;
      for await (const entity of pitchesTable.listEntities({ queryOptions: { filter } })) {
        pitches.push({
          pitchId: entity.pitchId || entity.rowKey,
          speed: entity.speed ?? null,
          run: entity.run ?? null,
          rise: entity.rise ?? null,
          zone: entity.zone ?? null,
          zoneRow: entity.zoneRow ?? null,
          zoneCol: entity.zoneCol ?? null,
          isStrike: entity.isStrike ?? null,
          // Additional PitchTracker fields
          rotationRpm: entity.rotationRpm ?? null,
          spinAxis: entity.spinAxis ?? null,
          spinEfficiency: entity.spinEfficiency ?? null,
          confidence: entity.confidence ?? null,
          plateX: entity.plateX ?? null,
          plateZ: entity.plateZ ?? null,
          releaseHeight: entity.releaseHeight ?? null,
          releaseSide: entity.releaseSide ?? null,
          extension: entity.extension ?? null
        });
      }

      return {
        status: 200,
        headers: rateLimit.headers,
        jsonBody: {
          session: {
            sessionId: sessionEntity.sessionId || sessionEntity.rowKey,
            sessionKey: sessionEntity.rowKey,
            createdAt: sessionEntity.createdAt,
            pitchCount: sessionEntity.pitchCount || pitches.length,
            sessionName: sessionEntity.sessionName || null,
            startedAt: sessionEntity.startedAt || null,
            strikes: sessionEntity.strikes ?? null,
            balls: sessionEntity.balls ?? null,
            heatmap: sessionEntity.heatmap ? JSON.parse(sessionEntity.heatmap) : null
          },
          pitches
        }
      };
    } catch (error) {
      // Log detailed error server-side for debugging
      console.error("Error in GET /sessions/{session_id}:", error);

      // Handle specific error cases with appropriate messages
      if (error.statusCode === 404) {
        return { status: 404, jsonBody: { error: "Session not found" } };
      }

      // Return generic error for validation errors that are safe to expose
      if (error.message && error.message.includes("Invalid")) {
        return { status: 400, jsonBody: { error: error.message } };
      }

      // Generic error for all other cases (don't expose internals)
      return { status: 500, jsonBody: { error: "An internal server error occurred" } };
    }
  }
});
