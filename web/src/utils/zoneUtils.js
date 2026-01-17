/**
 * Zone calculation utilities for pitch data
 * Shared between components for consistent zone handling
 */

/**
 * Converts row/col coordinates to a zone index (1-9)
 * @param {number|null} row - Row number (1-3)
 * @param {number|null} col - Column number (1-3)
 * @returns {number|null} Zone index (1-9) or null if invalid
 */
export function zoneIndexFromRowCol(row, col) {
  if (typeof row !== "number" || typeof col !== "number") {
    return null;
  }
  if (row >= 1 && row <= 3 && col >= 1 && col <= 3) {
    return (row - 1) * 3 + col;
  }
  return null;
}

/**
 * Extracts zone row and column from a pitch object
 * @param {Object} pitch - Pitch object with zone data
 * @returns {{ row: number|null, col: number|null }} Row and column coordinates
 */
export function getZoneRowCol(pitch) {
  const row = pitch.zoneRow ?? pitch.zone_row ?? null;
  const col = pitch.zoneCol ?? pitch.zone_col ?? null;

  if (Number.isInteger(row) && Number.isInteger(col)) {
    return { row, col };
  }

  // Fallback: derive from zone index if available
  if (typeof pitch.zone === "number" && pitch.zone >= 1 && pitch.zone <= 9) {
    return {
      row: Math.floor((pitch.zone - 1) / 3) + 1,
      col: ((pitch.zone - 1) % 3) + 1
    };
  }

  return { row: null, col: null };
}

/**
 * Checks if a pitch is within the strike zone (1-3 row/col)
 * @param {Object} pitch - Pitch object with zone data
 * @returns {boolean} True if pitch is in the zone
 */
export function isInZone(pitch) {
  const { row, col } = getZoneRowCol(pitch);
  return row >= 1 && row <= 3 && col >= 1 && col <= 3;
}
