<template>
  <div class="app">
    <header class="hero">
      <div>
        <p class="eyebrow">Pitcher Analytics</p>
        <h1>Session Dashboard</h1>
        <p class="sub">
          Upload a session summary to see pitch metrics, heatmaps, and strike/ball counts.
        </p>
      </div>
      <div class="actions">
        <a class="btn ghost" href="/.auth/login/aad">Sign in</a>
        <a class="btn ghost" href="/.auth/logout">Sign out</a>
      </div>
    </header>

    <section class="upload-card">
      <div>
        <h2>Upload session_summary.json</h2>
        <p>Validate against the shared contract and ingest into Table Storage.</p>
      </div>
      <div class="upload-actions">
        <input ref="fileInput" type="file" accept="application/json" @change="onFileSelected" />
        <button class="btn" :disabled="isUploading" @click="uploadSelected">
          {{ isUploading ? "Uploading..." : "Upload JSON" }}
        </button>
      </div>
      <p v-if="statusMessage" class="status">{{ statusMessage }}</p>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </section>

    <main class="grid">
      <section class="card sessions">
        <h3>Sessions</h3>
        <div v-if="sessions.length === 0" class="empty">No sessions yet.</div>
        <div class="session-list">
          <button
            v-for="session in sessions"
            :key="session.sessionId"
            class="session-item"
            :class="{ active: session.sessionId === selectedSessionId }"
            @click="selectSession(session.sessionId)"
          >
            <div class="session-title">{{ session.sessionName || session.sessionId }}</div>
            <div class="session-meta">
              <span>{{ session.pitchCount }} pitches</span>
              <span>{{ formatDate(session.createdAt) }}</span>
            </div>
          </button>
        </div>
      </section>

      <section class="card stats">
        <h3>Strike/Ball Counts</h3>
        <div class="stat-row">
          <div class="stat">
            <span class="stat-label">Strikes</span>
            <span class="stat-value">{{ strikeCount }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Balls</span>
            <span class="stat-value">{{ ballCount }}</span>
          </div>
          <div class="stat" v-if="unknownCount > 0">
            <span class="stat-label">Unknown</span>
            <span class="stat-value">{{ unknownCount }}</span>
          </div>
        </div>

        <h3 class="heatmap-title">Heatmap (Zone + Outside)</h3>
        <div class="heatmap">
          <div
            v-for="cell in heatmapCells"
            :key="cell.key"
            class="heat-cell"
            :class="{ outside: cell.isOutside }"
            :style="{ opacity: cell.intensity }"
          >
            <span v-if="!cell.isOutside">{{ cell.count }}</span>
            <span v-else class="heat-cell-label">OUT</span>
          </div>
        </div>
        <p class="heatmap-note">Outside zone balls: {{ outsideBallCount }}</p>
      </section>

      <section class="card table">
        <h3>Pitch Table</h3>
        <div v-if="pitches.length === 0" class="empty">Select a session to view pitches.</div>
        <table v-else>
          <thead>
            <tr>
              <th>#</th>
              <th>Speed</th>
              <th>Run</th>
              <th>Rise</th>
              <th>Zone</th>
              <th>Rotation</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(pitch, index) in pitches" :key="pitch.pitchId">
              <td>{{ index + 1 }}</td>
              <td>{{ formatNumber(pitch.speed, "mph") }}</td>
              <td>{{ formatNumber(pitch.run, "in") }}</td>
              <td>{{ formatNumber(pitch.rise, "in") }}</td>
              <td>{{ pitch.zone ?? "--" }}</td>
              <td class="placeholder">--</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import sampleSession from "./sample_session_summary.json";

const sessions = ref([]);
const selectedSessionId = ref(null);
const selectedSession = ref(null);
const pitches = ref([]);
const isUploading = ref(false);
const statusMessage = ref("");
const errorMessage = ref("");
const fileInput = ref(null);
const usingSample = ref(false);

function zoneIndexFromRowCol(row, col) {
  if (typeof row !== "number" || typeof col !== "number") {
    return null;
  }
  if (row >= 1 && row <= 3 && col >= 1 && col <= 3) {
    return (row - 1) * 3 + col;
  }
  return null;
}

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

function applySampleData() {
  sessions.value = [sampleData.listEntry];
  selectedSessionId.value = sampleData.listEntry.sessionId;
  selectedSession.value = sampleData.session;
  pitches.value = sampleData.pitches;
  usingSample.value = true;
}

async function loadSessions() {
  errorMessage.value = "";
  try {
    const response = await fetch("/api/sessions", { credentials: "include" });
    if (!response.ok) {
      throw new Error(`Unable to load sessions (${response.status}).`);
    }
    const data = await response.json();
    sessions.value = data.sessions || [];
    if (sessions.value.length > 0) {
      usingSample.value = false;
      selectSession(sessions.value[0].sessionId);
    } else {
      applySampleData();
    }
  } catch (error) {
    errorMessage.value = error.message;
    applySampleData();
  }
}

async function selectSession(sessionId) {
  selectedSessionId.value = sessionId;
  if (!sessionId) {
    return;
  }
  if (usingSample.value && sessionId === sampleData.listEntry.sessionId) {
    applySampleData();
    return;
  }
  try {
    const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
      credentials: "include"
    });
    if (!response.ok) {
      throw new Error(`Unable to load session (${response.status}).`);
    }
    const data = await response.json();
    selectedSession.value = data.session || null;
    pitches.value = data.pitches || [];
  } catch (error) {
    errorMessage.value = error.message;
  }
}

function onFileSelected() {
  statusMessage.value = "";
  errorMessage.value = "";
}

async function uploadSelected() {
  if (!fileInput.value || !fileInput.value.files.length) {
    errorMessage.value = "Select a JSON file first.";
    return;
  }

  const file = fileInput.value.files[0];
  isUploading.value = true;
  statusMessage.value = "";
  errorMessage.value = "";

  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });

    const responseBody = await response.json();
    if (!response.ok) {
      throw new Error(responseBody.error || "Upload failed.");
    }

    statusMessage.value = `Uploaded session ${responseBody.sessionId}.`;
    await loadSessions();
    if (responseBody.sessionId) {
      await selectSession(responseBody.sessionId);
    }
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isUploading.value = false;
  }
}

const strikeCount = computed(() => {
  if (selectedSession.value && typeof selectedSession.value.strikes === "number") {
    return selectedSession.value.strikes;
  }
  return pitches.value.filter((pitch) => pitch.isStrike === true).length;
});

const ballCount = computed(() => {
  if (selectedSession.value && typeof selectedSession.value.balls === "number") {
    return selectedSession.value.balls;
  }
  return pitches.value.filter((pitch) => pitch.isStrike === false).length;
});

const unknownCount = computed(() =>
  pitches.value.filter((pitch) => pitch.isStrike === null || pitch.isStrike === undefined).length
);

function getZoneRowCol(pitch) {
  const row = pitch.zoneRow ?? pitch.zone_row ?? null;
  const col = pitch.zoneCol ?? pitch.zone_col ?? null;
  if (Number.isInteger(row) && Number.isInteger(col)) {
    return { row, col };
  }
  if (typeof pitch.zone === "number" && pitch.zone >= 1 && pitch.zone <= 9) {
    return {
      row: Math.floor((pitch.zone - 1) / 3) + 1,
      col: ((pitch.zone - 1) % 3) + 1
    };
  }
  return { row: null, col: null };
}

function isInZone(pitch) {
  const { row, col } = getZoneRowCol(pitch);
  return row >= 1 && row <= 3 && col >= 1 && col <= 3;
}

const outsideBallCount = computed(
  () => pitches.value.filter((pitch) => pitch.isStrike === false && !isInZone(pitch)).length
);

const heatmapCells = computed(() => {
  let centerCounts = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => 0));

  if (
    selectedSession.value &&
    Array.isArray(selectedSession.value.heatmap) &&
    selectedSession.value.heatmap.length === 3
  ) {
    centerCounts = selectedSession.value.heatmap.map((row) =>
      row.slice(0, 3).map((value) => Number(value) || 0)
    );
  } else {
    pitches.value.forEach((pitch) => {
      if (isInZone(pitch)) {
        const { row, col } = getZoneRowCol(pitch);
        centerCounts[row - 1][col - 1] += 1;
      }
    });
  }
  const maxInside = Math.max(0, ...centerCounts.flat());
  const max = Math.max(1, maxInside, outsideBallCount.value);
  const cells = [];
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const isOutside = row === 0 || row === 4 || col === 0 || col === 4;
      const count = isOutside ? outsideBallCount.value : centerCounts[row - 1][col - 1];
      cells.push({
        key: `${row}-${col}`,
        count,
        isOutside,
        intensity: 0.15 + (count / max) * 0.85
      });
    }
  }
  return cells;
});

function formatDate(value) {
  if (!value) {
    return "--";
  }
  return new Date(value).toLocaleString();
}

function formatNumber(value, suffix) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  return `${Number(value).toFixed(1)} ${suffix}`;
}

onMounted(() => {
  applySampleData();
  loadSessions();
});
</script>
