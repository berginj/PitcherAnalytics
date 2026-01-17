<template>
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
          <th>RPM</th>
          <th>Spin Eff</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(pitch, index) in pitches" :key="pitch.pitchId">
          <td>{{ index + 1 }}</td>
          <td>{{ formatNumber(pitch.speed, "mph") }}</td>
          <td>{{ formatNumber(pitch.run, "in") }}</td>
          <td>{{ formatNumber(pitch.rise, "in") }}</td>
          <td>{{ pitch.zone ?? "--" }}</td>
          <td>{{ formatRpm(pitch.rotationRpm) }}</td>
          <td>{{ formatPercent(pitch.spinEfficiency) }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup>
/**
 * PitchTable Component
 * Displays detailed pitch metrics in a tabular format
 */
import { defineProps } from "vue";

defineProps({
  /** @type {Array} Array of pitch objects with metrics */
  pitches: {
    type: Array,
    required: true,
    default: () => []
  }
});

/**
 * Formats a numeric value with a suffix
 * @param {number|null} value - The value to format
 * @param {string} suffix - Unit suffix (e.g., "mph", "in")
 * @returns {string} Formatted string or "--"
 */
function formatNumber(value, suffix) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  return `${Number(value).toFixed(1)} ${suffix}`;
}

/**
 * Formats RPM value
 * @param {number|null} value - RPM value
 * @returns {string} Formatted RPM or "--"
 */
function formatRpm(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  return `${Math.round(value)}`;
}

/**
 * Formats percentage value
 * @param {number|null} value - Percentage (0-1 or 0-100)
 * @returns {string} Formatted percentage or "--"
 */
function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }
  // Handle both 0-1 and 0-100 ranges
  const percent = value <= 1 ? value * 100 : value;
  return `${Math.round(percent)}%`;
}
</script>
