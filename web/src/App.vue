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

        <h3 class="heatmap-title">3x3 Heatmap</h3>
        <div class="heatmap">
          <div
            v-for="cell in heatmapCells"
            :key="cell.zone"
            class="heat-cell"
            :style="{ opacity: cell.intensity }"
          >
            <span>{{ cell.count }}</span>
          </div>
        </div>
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

const sessions = ref([]);
const selectedSessionId = ref(null);
const selectedSession = ref(null);
const pitches = ref([]);
const isUploading = ref(false);
const statusMessage = ref("");
const errorMessage = ref("");
const fileInput = ref(null);

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
      selectSession(sessions.value[0].sessionId);
    }
  } catch (error) {
    errorMessage.value = error.message;
  }
}

async function selectSession(sessionId) {
  selectedSessionId.value = sessionId;
  if (!sessionId) {
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

const heatmapCells = computed(() => {
  let counts = Array.from({ length: 9 }, () => 0);

  if (selectedSession.value && Array.isArray(selectedSession.value.heatmap)) {
    counts = selectedSession.value.heatmap.flat().slice(0, 9).map((value) => value || 0);
  } else {
    pitches.value.forEach((pitch) => {
      if (typeof pitch.zone === "number" && pitch.zone >= 1 && pitch.zone <= 9) {
        counts[pitch.zone - 1] += 1;
      }
    });
  }
  const max = Math.max(1, ...counts);
  return counts.map((count, index) => ({
    zone: index + 1,
    count,
    intensity: 0.2 + (count / max) * 0.8
  }));
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

onMounted(loadSessions);
</script>
