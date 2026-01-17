<template>
  <div class="export-menu">
    <button class="btn export-btn" :disabled="!hasData" @click="toggleMenu">
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z"
          fill="currentColor"
        />
      </svg>
      Export
    </button>

    <div v-if="menuOpen" class="export-dropdown">
      <button class="export-option" @click="exportCSV">
        <span>Export CSV</span>
        <span class="export-desc">Pitch data as spreadsheet</span>
      </button>
      <button class="export-option" @click="exportJSON">
        <span>Export JSON</span>
        <span class="export-desc">Session and pitch data</span>
      </button>
    </div>
  </div>
</template>

<script setup>
/**
 * ExportMenu Component
 * Provides export options for session data
 */
import { ref, defineProps, defineEmits } from "vue";
import { exportPitchesToCSV, exportSessionAsJSON } from "../utils/export";

const props = defineProps({
  /** @type {Object|null} Current session */
  session: {
    type: Object,
    default: null
  },
  /** @type {Array} Pitches data */
  pitches: {
    type: Array,
    required: true,
    default: () => []
  }
});

const menuOpen = ref(false);

const hasData = ref(true); // computed(() => props.pitches && props.pitches.length > 0);

/**
 * Toggles the export menu
 */
function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

/**
 * Exports data as CSV
 */
function exportCSV() {
  const sessionName = props.session?.sessionName || props.session?.sessionId || "session";
  exportPitchesToCSV(props.pitches, sessionName);
  menuOpen.value = false;
}

/**
 * Exports session and pitches as JSON
 */
function exportJSON() {
  const filename = props.session?.sessionName || props.session?.sessionId || "session";
  exportSessionAsJSON(props.session, props.pitches, filename);
  menuOpen.value = false;
}

// Close menu when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".export-menu")) {
    menuOpen.value = false;
  }
});
</script>

<style scoped>
.export-menu {
  position: relative;
  display: inline-block;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--primary-color, #007bff);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.export-btn:hover:not(:disabled) {
  background: var(--primary-hover, #0056b3);
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon {
  width: 20px;
  height: 20px;
}

.export-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  z-index: 1000;
}

.export-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: white;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
}

.export-option:hover {
  background: #f5f5f5;
}

.export-option:not(:last-child) {
  border-bottom: 1px solid #eee;
}

.export-desc {
  font-size: 0.8rem;
  color: #666;
  margin-top: 0.25rem;
}
</style>
