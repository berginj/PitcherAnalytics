<template>
  <div v-if="hasError" class="error-boundary">
    <div class="error-boundary-content">
      <h2>Something went wrong</h2>
      <p class="error-message">{{ errorMessage }}</p>
      <button class="btn" @click="reset">Try Again</button>
    </div>
  </div>
  <slot v-else />
</template>

<script setup>
/**
 * ErrorBoundary Component
 * Catches and displays errors from child components
 * Vue 3 doesn't have error boundaries like React, so this uses onErrorCaptured
 */
import { ref, onErrorCaptured } from "vue";

const hasError = ref(false);
const errorMessage = ref("");

/**
 * Captures errors from child components
 */
onErrorCaptured((err) => {
  hasError.value = true;
  errorMessage.value = err.message || "An unexpected error occurred";

  console.error("Error caught by ErrorBoundary:", err);

  // Return false to prevent error from propagating further
  return false;
});

/**
 * Resets the error state to allow retry
 */
function reset() {
  hasError.value = false;
  errorMessage.value = "";
}
</script>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 2rem;
}

.error-boundary-content {
  text-align: center;
  max-width: 500px;
}

.error-boundary h2 {
  color: var(--error-color, #d32f2f);
  margin-bottom: 1rem;
}

.error-message {
  margin-bottom: 1.5rem;
  color: var(--text-secondary, #666);
}

.btn {
  padding: 0.5rem 1.5rem;
  background: var(--primary-color, #007bff);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.btn:hover {
  background: var(--primary-hover, #0056b3);
}
</style>
