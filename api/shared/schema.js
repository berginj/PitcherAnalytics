/**
 * JSON Schema validation for session summary payloads
 * Uses AJV (Another JSON Validator) for validation
 */
const path = require("path");
const fs = require("fs");
const Ajv = require("ajv");

/** @type {Function|null} Compiled AJV validator function */
let validator = null;

/** @type {Error|null} Cached schema loading error */
let schemaLoadError = null;

/**
 * Gets the path to the session summary JSON schema
 * @returns {string} Absolute path to schema file
 */
function getSchemaPath() {
  return (
    process.env.SESSION_SCHEMA_PATH ||
    path.resolve(__dirname, "..", "..", "contracts-shared", "schema", "session_summary.schema.json")
  );
}

/**
 * Loads and compiles the JSON schema validator
 * Results are cached to avoid repeated loading
 * Errors during loading are also cached
 */
function loadValidator() {
  if (validator || schemaLoadError) {
    return;
  }

  try {
    const schemaPath = getSchemaPath();
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
    const ajv = new Ajv({ allErrors: true, strict: false });
    validator = ajv.compile(schema);
  } catch (error) {
    schemaLoadError = error;
  }
}

/**
 * Validates a session summary payload against the JSON schema
 * @param {Object} payload - Session summary to validate
 * @returns {{ok: boolean, error?: string, details?: Array}} Validation result
 */
function validateSessionSummary(payload) {
  loadValidator();

  if (schemaLoadError) {
    return { ok: false, error: `Schema load failed: ${schemaLoadError.message}` };
  }

  const valid = validator(payload);
  if (!valid) {
    return { ok: false, error: "Schema validation failed", details: validator.errors };
  }

  return { ok: true };
}

module.exports = { validateSessionSummary, getSchemaPath };
