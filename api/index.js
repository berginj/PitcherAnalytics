const { app } = require("@azure/functions");
const { getUserId } = require("./shared/auth");
const { getTableClients } = require("./shared/table");
const { validateSessionSummary } = require("./shared/schema");
const { extractSession, toTableKey } = require("./shared/normalize");

function unauthorized() {
  return { status: 401, jsonBody: { error: "Unauthorized" } };
}

function normalizeEntity(entity) {
  return Object.fromEntries(
    Object.entries(entity).filter(([, value]) => value !== undefined && value !== null)
  );
}

function escapeOData(value) {
  return String(value).replace(/'/g, "''");
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

    try {
      const { sessionsTable, pitchesTable } = await getTableClients();

      if (request.method === "GET") {
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

        return { status: 200, jsonBody: { sessions } };
      }

      const payload = await request.json();
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
          raw: JSON.stringify(pitch.raw)
        })
      );

      for (let i = 0; i < pitchEntities.length; i += 100) {
        const batch = pitchEntities.slice(i, i + 100).map((entity) => ({
          operationType: "upsert",
          partitionKey: entity.partitionKey,
          rowKey: entity.rowKey,
          entity
        }));
        if (batch.length > 0) {
          await pitchesTable.submitTransaction(batch);
        }
      }

      return {
        status: 201,
        jsonBody: { sessionId: extracted.sessionId, pitchCount: extracted.pitchCount ?? extracted.pitches.length }
      };
    } catch (error) {
      return { status: 500, jsonBody: { error: error.message } };
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

    const sessionId = request.params.session_id;
    const sessionKey = toTableKey(sessionId);

    try {
      const { sessionsTable, pitchesTable } = await getTableClients();
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
          isStrike: entity.isStrike ?? null
        });
      }

      return {
        status: 200,
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
      if (error.statusCode === 404) {
        return { status: 404, jsonBody: { error: "Session not found" } };
      }
      return { status: 500, jsonBody: { error: error.message } };
    }
  }
});
