<template>
  <section class="card sessions">
    <h3>Sessions</h3>
    <div v-if="sessions.length === 0" class="empty">No sessions yet.</div>
    <div class="session-list">
      <button
        v-for="session in sessions"
        :key="session.sessionId"
        class="session-item"
        :class="{ active: session.sessionId === selectedSessionId }"
        @click="$emit('select', session.sessionId)"
      >
        <div class="session-title">{{ session.sessionName || session.sessionId }}</div>
        <div class="session-meta">
          <span>{{ session.pitchCount }} pitches</span>
          <span>{{ formatDate(session.createdAt) }}</span>
        </div>
      </button>
    </div>
  </section>
</template>

<script setup>
/**
 * SessionsList Component
 * Displays a list of pitch analysis sessions with basic metadata
 *
 * @emits {string} select - Emitted when a session is clicked, passes sessionId
 */
import { defineProps, defineEmits } from "vue";

defineProps({
  /** @type {Array<{sessionId: string, sessionName: string|null, pitchCount: number, createdAt: string}>} */
  sessions: {
    type: Array,
    required: true,
    default: () => []
  },
  /** @type {string|null} */
  selectedSessionId: {
    type: String,
    default: null
  }
});

defineEmits(["select"]);

/**
 * Formats an ISO date string for display
 * @param {string|null} value - ISO date string
 * @returns {string} Formatted date or "--"
 */
function formatDate(value) {
  if (!value) {
    return "--";
  }
  return new Date(value).toLocaleString();
}
</script>
