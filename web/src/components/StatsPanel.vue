<template>
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
</template>

<script setup>
/**
 * StatsPanel Component
 * Displays strike/ball statistics and a heatmap visualization
 */
import { computed, defineProps } from "vue";
import { getZoneRowCol, isInZone } from "../utils/zoneUtils";

const props = defineProps({
  /** @type {Object|null} Session data with strikes/balls/heatmap */
  session: {
    type: Object,
    default: null
  },
  /** @type {Array} Array of pitch objects */
  pitches: {
    type: Array,
    required: true,
    default: () => []
  }
});

const strikeCount = computed(() => {
  if (props.session && typeof props.session.strikes === "number") {
    return props.session.strikes;
  }
  return props.pitches.filter((pitch) => pitch.isStrike === true).length;
});

const ballCount = computed(() => {
  if (props.session && typeof props.session.balls === "number") {
    return props.session.balls;
  }
  return props.pitches.filter((pitch) => pitch.isStrike === false).length;
});

const unknownCount = computed(() =>
  props.pitches.filter((pitch) => pitch.isStrike === null || pitch.isStrike === undefined).length
);

const outsideBallCount = computed(
  () => props.pitches.filter((pitch) => pitch.isStrike === false && !isInZone(pitch)).length
);

const heatmapCells = computed(() => {
  let centerCounts = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => 0));

  if (
    props.session &&
    Array.isArray(props.session.heatmap) &&
    props.session.heatmap.length === 3
  ) {
    centerCounts = props.session.heatmap.map((row) =>
      row.slice(0, 3).map((value) => Number(value) || 0)
    );
  } else {
    props.pitches.forEach((pitch) => {
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
</script>
