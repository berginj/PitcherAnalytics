<template>
  <div class="app">
    <header class="hero">
      <div>
        <p class="eyebrow">Pitcher Analytics</p>
        <h1>Session Dashboard</h1>
        <p class="sub">
          Upload PitchTracker data (JSON or ZIP) to analyze pitch metrics, rotation data, heatmaps,
          and performance statistics.
        </p>
      </div>
      <div class="actions">
        <ExportMenu :session="selectedSession" :pitches="pitches" />
        <a class="btn ghost" href="/.auth/login/aad">Sign in</a>
        <a class="btn ghost" href="/.auth/logout">Sign out</a>
      </div>
    </header>

    <UploadControl
      :is-uploading="isUploading"
      :status-message="statusMessage"
      :error-message="errorMessage"
      @upload="handleUpload"
    />

    <main class="grid">
      <LoadingSpinner v-if="isLoadingSessions" message="Loading sessions..." />
      <template v-else>
        <SessionsList
          :sessions="sessions"
          :selected-session-id="selectedSessionId"
          @select="selectSession"
        />

        <LoadingSpinner
          v-if="isLoadingSession"
          message="Loading session details..."
          size="large"
        />
        <template v-else>
          <StatsPanel :session="selectedSession" :pitches="pitches" />
          <PitchTable :pitches="pitches" />
        </template>
      </template>
    </main>
  </div>
</template>

<script setup>
/**
 * Main Application Component
 * Orchestrates the Pitcher Analytics dashboard
 */
import { ref, onMounted } from "vue";
import SessionsList from "./components/SessionsList.vue";
import StatsPanel from "./components/StatsPanel.vue";
import PitchTable from "./components/PitchTable.vue";
import UploadControl from "./components/UploadControl.vue";
import LoadingSpinner from "./components/LoadingSpinner.vue";
import ExportMenu from "./components/ExportMenu.vue";
import { getSessions, getSessionById, uploadSession, uploadSessionBinary } from "./services/api";
import { zoneIndexFromRowCol } from "./utils/zoneUtils";
import sampleSession from "./sample_session_summary.json";

// State
const sessions = ref([]);
const selectedSessionId = ref(null);
const selectedSession = ref(null);
const pitches = ref([]);
const isUploading = ref(false);
const isLoadingSessions = ref(false);
const isLoadingSession = ref(false);
const statusMessage = ref("");
const errorMessage = ref("");
const usingSample = ref(false);

/**
 * Normalizes a sample pitch for display
 * @param {Object} pitch - Raw pitch data
 * @param {number} index - Pitch index
 * @returns {Object} Normalized pitch object
 */
function normalizeSamplePitch(pitch, index) {
  const zoneRow = pitch.zone_row ?? null;
  const zoneCol = pitch.zone_col ?? null;
  const zone = zoneIndexFromRowCol(zoneRow, zoneCol);

  return {
    pitchId: pitch.pitch_id || `pitch-${index + 1}`,
    speed: pitch.speed_mph ?? null,
    run: pitch.run_in ?? null,
    rise: pitch.rise_in ?? null,
    zone,
    zoneRow,
    zoneCol,
    isStrike: pitch.is_strike ?? null
  };
}

/**
 * Builds sample data from the embedded JSON file
 * @returns {Object} Sample session data structure
 */
function buildSampleData() {
  const pitchesList = Array.isArray(sampleSession.pitches)
    ? sampleSession.pitches.map(normalizeSamplePitch)
    : [];
  const sessionId = sampleSession.session_id || "sample-session";
  const sessionName = "Sample Session";
  const createdAt = new Date().toISOString();

  return {
    listEntry: {
      sessionId,
      sessionName,
      pitchCount: sampleSession.pitch_count ?? pitchesList.length,
      strikes: sampleSession.strikes ?? null,
      balls: sampleSession.balls ?? null,
      createdAt
    },
    session: {
      sessionId,
      sessionName,
      pitchCount: sampleSession.pitch_count ?? pitchesList.length,
      strikes: sampleSession.strikes ?? null,
      balls: sampleSession.balls ?? null,
      heatmap: sampleSession.heatmap ?? null
    },
    pitches: pitchesList
  };
}

const sampleData = buildSampleData();

/**
 * Applies sample data to the UI
 */
function applySampleData() {
  sessions.value = [sampleData.listEntry];
  selectedSessionId.value = sampleData.listEntry.sessionId;
  selectedSession.value = sampleData.session;
  pitches.value = sampleData.pitches;
  usingSample.value = true;
}

/**
 * Loads all sessions from the API
 */
async function loadSessions() {
  errorMessage.value = "";
  isLoadingSessions.value = true;

  try {
    const loadedSessions = await getSessions();
    sessions.value = loadedSessions;

    if (sessions.value.length > 0) {
      usingSample.value = false;
      await selectSession(sessions.value[0].sessionId);
    } else {
      applySampleData();
    }
  } catch (error) {
    errorMessage.value = error.message;
    applySampleData();
  } finally {
    isLoadingSessions.value = false;
  }
}

/**
 * Selects and loads a session
 * @param {string} sessionId - Session ID to load
 */
async function selectSession(sessionId) {
  selectedSessionId.value = sessionId;

  if (!sessionId) {
    return;
  }

  if (usingSample.value && sessionId === sampleData.listEntry.sessionId) {
    applySampleData();
    return;
  }

  isLoadingSession.value = true;
  try {
    const data = await getSessionById(sessionId);
    selectedSession.value = data.session;
    pitches.value = data.pitches;
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isLoadingSession.value = false;
  }
}

/**
 * Handles file upload from the UploadControl component
 * @param {File} file - The uploaded file
 */
async function handleUpload(file) {
  isUploading.value = true;
  statusMessage.value = "";
  errorMessage.value = "";

  try {
    let result;

    // Check if file is ZIP or JSON based on file type and extension
    const isZip =
      file.type === "application/zip" ||
      file.type === "application/x-zip-compressed" ||
      file.name.toLowerCase().endsWith(".zip");

    if (isZip) {
      // Handle ZIP file - send as binary
      const arrayBuffer = await file.arrayBuffer();
      result = await uploadSessionBinary(arrayBuffer, file.type || "application/zip");
    } else {
      // Handle JSON file - parse and send as JSON
      const text = await file.text();
      const payload = JSON.parse(text);
      result = await uploadSession(payload);
    }

    statusMessage.value = `Uploaded session ${result.sessionId}.`;
    await loadSessions();

    if (result.sessionId) {
      await selectSession(result.sessionId);
    }
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isUploading.value = false;
  }
}

// Initialize on mount
onMounted(() => {
  applySampleData();
  loadSessions();
});
</script>
