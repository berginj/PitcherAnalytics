/**
 * API Service Layer
 * Centralized API communication for the Pitcher Analytics app
 */

const API_BASE = "/api";

/**
 * Generic fetch wrapper with error handling
 * @param {string} url - URL to fetch
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<any>} Parsed JSON response
 * @throws {Error} If response is not OK
 */
async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    ...options
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

/**
 * Fetches all sessions for the current user
 * @returns {Promise<Array>} Array of session objects
 */
export async function getSessions() {
  const data = await apiFetch(`${API_BASE}/sessions`);
  return data.sessions || [];
}

/**
 * Fetches a specific session with its pitches
 * @param {string} sessionId - The session ID to fetch
 * @returns {Promise<{session: Object, pitches: Array}>} Session data and pitches
 */
export async function getSessionById(sessionId) {
  const data = await apiFetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}`);
  return {
    session: data.session || null,
    pitches: data.pitches || []
  };
}

/**
 * Uploads a new session summary
 * @param {Object} payload - Session summary payload
 * @returns {Promise<{sessionId: string, pitchCount: number}>} Upload result
 */
export async function uploadSession(payload) {
  return await apiFetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

/**
 * Uploads a binary file (ZIP) containing session data
 * @param {ArrayBuffer} arrayBuffer - File data as ArrayBuffer
 * @param {string} contentType - Content type (e.g., "application/zip")
 * @returns {Promise<{sessionId: string, pitchCount: number}>} Upload result
 */
export async function uploadSessionBinary(arrayBuffer, contentType = "application/zip") {
  const response = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": contentType
    },
    body: arrayBuffer
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}
