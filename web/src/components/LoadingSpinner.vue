<template>
  <div class="loading-spinner" :class="{ small: size === 'small', large: size === 'large' }">
    <div class="spinner"></div>
    <p v-if="message" class="loading-message">{{ message }}</p>
  </div>
</template>

<script setup>
/**
 * LoadingSpinner Component
 * Displays an animated loading spinner with optional message
 */
import { defineProps } from "vue";

defineProps({
  /** @type {'small'|'medium'|'large'} Size of the spinner */
  size: {
    type: String,
    default: "medium",
    validator: (value) => ["small", "medium", "large"].includes(value)
  },
  /** @type {string} Optional loading message */
  message: {
    type: String,
    default: ""
  }
});
</script>

<style scoped>
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.spinner {
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-left-color: var(--primary-color, #007bff);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

.loading-spinner.small .spinner {
  width: 20px;
  height: 20px;
  border-width: 2px;
}

.loading-spinner.large .spinner {
  width: 60px;
  height: 60px;
  border-width: 4px;
}

.loading-message {
  margin-top: 1rem;
  color: var(--text-secondary, #666);
  font-size: 0.9rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
