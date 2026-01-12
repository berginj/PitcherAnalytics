function toTableKey(value) {
  return String(value).replace(/[\\/#?]/g, "_");
}

function zoneIndexFromRowCol(row, col) {
  if (typeof row !== "number" || typeof col !== "number") {
    return null;
  }
  if (row >= 0 && row <= 2 && col >= 0 && col <= 2) {
    return row * 3 + col + 1;
  }
  if (row >= 1 && row <= 3 && col >= 1 && col <= 3) {
    return (row - 1) * 3 + col;
  }
  return null;
}

function normalizePitch(pitch, index) {
  const pitchId = pitch.pitch_id || pitch.pitchId || pitch.id || `pitch-${index + 1}`;
  const speed = pitch.speed_mph ?? pitch.speed ?? null;
  const run = pitch.run_in ?? pitch.run ?? null;
  const rise = pitch.rise_in ?? pitch.rise ?? null;
  const zoneRow = pitch.zone_row ?? pitch.zoneRow ?? null;
  const zoneCol = pitch.zone_col ?? pitch.zoneCol ?? null;
  const zone = pitch.zone ?? zoneIndexFromRowCol(zoneRow, zoneCol);
  const isStrike = pitch.is_strike ?? pitch.isStrike ?? null;

  return {
    pitchId,
    speed,
    run,
    rise,
    zone,
    zoneRow,
    zoneCol,
    isStrike,
    raw: pitch
  };
}

function extractSession(payload) {
  const sessionId = payload.session_id || payload.sessionId || payload.id || `session-${Date.now()}`;
  const sessionName = payload.session_name || payload.sessionName || null;
  const startedAt = payload.started_at || payload.startedAt || null;
  const pitches = Array.isArray(payload.pitches) ? payload.pitches.map(normalizePitch) : [];

  return {
    sessionId,
    sessionName,
    startedAt,
    pitchCount: payload.pitch_count ?? pitches.length,
    strikes: payload.strikes ?? null,
    balls: payload.balls ?? null,
    heatmap: payload.heatmap ?? null,
    pitches
  };
}

module.exports = { extractSession, toTableKey };
