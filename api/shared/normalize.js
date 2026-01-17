/**
 * Converts a value into a safe Azure Table Storage row/partition key
 * Replaces characters that are invalid in table keys
 * @param {string|number} value - Value to convert
 * @returns {string} Safe key string
 */
function toTableKey(value) {
  return String(value).replace(/[\\/#?]/g, "_");
}

/**
 * Converts row/col coordinates to a zone index (1-9)
 * Supports both 0-based (0-2) and 1-based (1-3) indexing
 * @param {number|null} row - Row number (0-2 or 1-3)
 * @param {number|null} col - Column number (0-2 or 1-3)
 * @returns {number|null} Zone index (1-9) or null if invalid
 */
function zoneIndexFromRowCol(row, col) {
  if (typeof row !== "number" || typeof col !== "number") {
    return null;
  }
  // 0-based indexing
  if (row >= 0 && row <= 2 && col >= 0 && col <= 2) {
    return row * 3 + col + 1;
  }
  // 1-based indexing
  if (row >= 1 && row <= 3 && col >= 1 && col <= 3) {
    return (row - 1) * 3 + col;
  }
  return null;
}

/**
 * Normalizes a pitch object from various input formats to a consistent structure
 * @param {Object} pitch - Raw pitch data (supports snake_case or camelCase)
 * @param {number} index - Pitch index for generating IDs
 * @returns {Object} Normalized pitch with standardized field names
 */
function normalizePitch(pitch, index) {
  const pitchId = pitch.pitch_id || pitch.pitchId || pitch.id || `pitch-${index + 1}`;
  const speed = pitch.speed_mph ?? pitch.speed ?? null;
  const run = pitch.run_in ?? pitch.run ?? null;
  const rise = pitch.rise_in ?? pitch.rise ?? null;
  const zoneRow = pitch.zone_row ?? pitch.zoneRow ?? null;
  const zoneCol = pitch.zone_col ?? pitch.zoneCol ?? null;
  const zone = pitch.zone ?? zoneIndexFromRowCol(zoneRow, zoneCol);
  const isStrike = pitch.is_strike ?? pitch.isStrike ?? null;

  // Additional PitchTracker fields
  const rotationRpm = pitch.rotation_rpm ?? pitch.rpm ?? null;
  const spinAxis = pitch.spin_axis ?? null;
  const spinEfficiency = pitch.spin_efficiency ?? null;
  const confidence = pitch.confidence ?? null;
  const plateX = pitch.plate_x ?? null;
  const plateZ = pitch.plate_z ?? null;
  const releaseHeight = pitch.release_height ?? null;
  const releaseSide = pitch.release_side ?? null;
  const extension = pitch.extension ?? null;

  return {
    pitchId,
    speed,
    run,
    rise,
    zone,
    zoneRow,
    zoneCol,
    isStrike,
    rotationRpm,
    spinAxis,
    spinEfficiency,
    confidence,
    plateX,
    plateZ,
    releaseHeight,
    releaseSide,
    extension,
    raw: pitch
  };
}

/**
 * Extracts and normalizes session data from a payload
 * @param {Object} payload - Raw session summary payload
 * @returns {Object} Normalized session with metadata and pitch array
 */
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
