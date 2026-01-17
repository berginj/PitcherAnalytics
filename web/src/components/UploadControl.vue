<template>
  <section class="upload-bar">
    <input
      ref="fileInput"
      class="visually-hidden"
      type="file"
      accept="application/json,.json,application/zip,.zip,application/x-zip-compressed"
      @change="onFileSelected"
    />
    <button
      class="btn icon-btn"
      :disabled="isUploading"
      :title="isUploading ? 'Uploading...' : 'Upload JSON or ZIP file from PitchTracker'"
      @click="openFilePicker"
    >
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 4l4 4h-3v6h-2V8H8l4-4zm-6 12h12v2H6v-2z"
          fill="currentColor"
        />
      </svg>
      <span class="visually-hidden">
        {{ isUploading ? "Uploading..." : "Upload JSON or ZIP file from PitchTracker" }}
      </span>
    </button>
    <p v-if="statusMessage" class="status">{{ statusMessage }}</p>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </section>
</template>

<script setup>
/**
 * UploadControl Component
 * File upload interface with status messages
 *
 * @emits {File} upload - Emitted when a file is selected, passes the File object
 */
import { ref, defineEmits, defineProps } from "vue";

defineProps({
  /** @type {boolean} Whether an upload is in progress */
  isUploading: {
    type: Boolean,
    required: true
  },
  /** @type {string} Success status message */
  statusMessage: {
    type: String,
    default: ""
  },
  /** @type {string} Error message */
  errorMessage: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["upload"]);

const fileInput = ref(null);

/**
 * Opens the file picker dialog
 */
function openFilePicker() {
  if (!fileInput.value) {
    return;
  }
  fileInput.value.click();
}

/**
 * Handles file selection
 */
function onFileSelected() {
  if (!fileInput.value || !fileInput.value.files.length) {
    return;
  }
  emit("upload", fileInput.value.files[0]);
}
</script>
