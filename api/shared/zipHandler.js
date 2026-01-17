/**
 * ZIP file handling for PitchTracker exports
 * Extracts and parses session data from ZIP archives
 */

const AdmZip = require("adm-zip");

/**
 * Extracts JSON content from a ZIP buffer
 * @param {Buffer} zipBuffer - ZIP file buffer
 * @returns {Object} Extracted files as { filename: content }
 */
function extractZipContents(zipBuffer) {
  try {
    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();
    const contents = {};

    for (const entry of zipEntries) {
      // Skip directories and non-JSON files (like videos, CSVs for now)
      if (entry.isDirectory) {
        continue;
      }

      const filename = entry.entryName;

      // Extract JSON files
      if (filename.endsWith(".json")) {
        try {
          const content = zip.readAsText(entry);
          contents[filename] = JSON.parse(content);
        } catch (error) {
          console.warn(`Failed to parse JSON file ${filename}:`, error.message);
        }
      }
    }

    return contents;
  } catch (error) {
    throw new Error(`Failed to extract ZIP contents: ${error.message}`);
  }
}

/**
 * Parses PitchTracker ZIP export and extracts session data
 * @param {Buffer} zipBuffer - ZIP file buffer
 * @returns {Object} Parsed session data in our format
 */
function parsePitchTrackerZip(zipBuffer) {
  const contents = extractZipContents(zipBuffer);

  // Find manifest.json and session_summary.json
  const manifestFile = Object.keys(contents).find((name) => name.endsWith("manifest.json"));
  const summaryFile = Object.keys(contents).find((name) =>
    name.endsWith("session_summary.json")
  );

  if (!manifestFile && !summaryFile) {
    throw new Error("ZIP file must contain either manifest.json or session_summary.json");
  }

  // Prefer session_summary.json if available, fall back to manifest
  const sessionData = contents[summaryFile] || contents[manifestFile];

  if (!sessionData) {
    throw new Error("No valid session data found in ZIP");
  }

  // Extract individual pitch data from pitch folders if available
  const pitchFiles = Object.keys(contents).filter(
    (name) => name.includes("/pitch_") && name.endsWith("/manifest.json")
  );

  const individualPitches = pitchFiles.map((filename) => contents[filename]).filter(Boolean);

  // Merge individual pitch data with summary if available
  if (individualPitches.length > 0 && sessionData.pitches) {
    // Enrich pitches array with detailed data from individual manifests
    sessionData.pitches = sessionData.pitches.map((summaryPitch, index) => {
      const detailedPitch = individualPitches[index];
      if (detailedPitch) {
        return {
          ...summaryPitch,
          // Add rotation data
          rotation_rpm: detailedPitch.rotation_rpm || detailedPitch.rpm,
          spin_axis: detailedPitch.spin_axis,
          spin_efficiency: detailedPitch.spin_efficiency,
          // Add confidence scores
          confidence: detailedPitch.confidence,
          // Add trajectory data
          plate_x: detailedPitch.plate_x,
          plate_z: detailedPitch.plate_z,
          release_height: detailedPitch.release_height,
          release_side: detailedPitch.release_side,
          extension: detailedPitch.extension
        };
      }
      return summaryPitch;
    });
  }

  return sessionData;
}

/**
 * Determines if uploaded content is a ZIP file
 * @param {Buffer} buffer - File buffer
 * @returns {boolean} True if ZIP file
 */
function isZipFile(buffer) {
  if (!buffer || buffer.length < 4) {
    return false;
  }

  // Check for ZIP file signature (PK\x03\x04)
  return (
    buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04
  );
}

/**
 * Processes uploaded file - handles both JSON and ZIP
 * @param {Buffer} fileBuffer - Uploaded file buffer
 * @param {string} contentType - Content type header
 * @returns {Object} Parsed session data
 */
function processUploadedFile(fileBuffer, contentType) {
  // Check if it's a ZIP file
  if (isZipFile(fileBuffer) || contentType?.includes("zip")) {
    return parsePitchTrackerZip(fileBuffer);
  }

  // Otherwise, treat as JSON
  try {
    const jsonString = fileBuffer.toString("utf8");
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error(`Failed to parse file: ${error.message}`);
  }
}

module.exports = {
  extractZipContents,
  parsePitchTrackerZip,
  isZipFile,
  processUploadedFile
};
