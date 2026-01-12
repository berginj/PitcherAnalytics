const path = require("path");
const fs = require("fs");
const Ajv = require("ajv");

let validator = null;
let schemaLoadError = null;

function getSchemaPath() {
  return (
    process.env.SESSION_SCHEMA_PATH ||
    path.resolve(__dirname, "..", "..", "contracts-shared", "schema", "session_summary.schema.json")
  );
}

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
