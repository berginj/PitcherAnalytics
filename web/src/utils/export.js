/**
 * Data export utilities
 * Provides functions for exporting pitch data and heatmaps
 */

/**
 * Converts pitches array to CSV format
 * @param {Array} pitches - Array of pitch objects
 * @param {string} sessionName - Session name for the file
 * @returns {string} CSV content
 */
export function pitchesToCSV(pitches, sessionName = "session") {
  if (!pitches || pitches.length === 0) {
    return "";
  }

  // CSV headers
  const headers = [
    "Pitch ID",
    "Speed (mph)",
    "Run (in)",
    "Rise (in)",
    "Zone",
    "Strike",
    "RPM",
    "Spin Efficiency",
    "Spin Axis",
    "Confidence",
    "Release Height",
    "Release Side",
    "Extension"
  ];
  const csvRows = [headers.join(",")];

  // Add data rows
  pitches.forEach((pitch) => {
    const row = [
      pitch.pitchId || "",
      pitch.speed !== null && pitch.speed !== undefined ? pitch.speed.toFixed(1) : "",
      pitch.run !== null && pitch.run !== undefined ? pitch.run.toFixed(1) : "",
      pitch.rise !== null && pitch.rise !== undefined ? pitch.rise.toFixed(1) : "",
      pitch.zone || "",
      pitch.isStrike !== null && pitch.isStrike !== undefined
        ? pitch.isStrike
          ? "Strike"
          : "Ball"
        : "Unknown",
      pitch.rotationRpm !== null && pitch.rotationRpm !== undefined
        ? Math.round(pitch.rotationRpm)
        : "",
      pitch.spinEfficiency !== null && pitch.spinEfficiency !== undefined
        ? pitch.spinEfficiency.toFixed(2)
        : "",
      pitch.spinAxis !== null && pitch.spinAxis !== undefined ? pitch.spinAxis.toFixed(1) : "",
      pitch.confidence !== null && pitch.confidence !== undefined ? pitch.confidence.toFixed(2) : "",
      pitch.releaseHeight !== null && pitch.releaseHeight !== undefined
        ? pitch.releaseHeight.toFixed(2)
        : "",
      pitch.releaseSide !== null && pitch.releaseSide !== undefined
        ? pitch.releaseSide.toFixed(2)
        : "",
      pitch.extension !== null && pitch.extension !== undefined ? pitch.extension.toFixed(2) : ""
    ];
    csvRows.push(row.join(","));
  });

  return csvRows.join("\n");
}

/**
 * Downloads CSV content as a file
 * @param {string} csvContent - CSV content
 * @param {string} filename - Filename without extension
 */
export function downloadCSV(csvContent, filename = "pitches") {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Exports pitches to CSV and triggers download
 * @param {Array} pitches - Array of pitch objects
 * @param {string} sessionName - Session name for the filename
 */
export function exportPitchesToCSV(pitches, sessionName = "session") {
  const csvContent = pitchesToCSV(pitches, sessionName);
  if (csvContent) {
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `${sessionName}-pitches-${timestamp}`;
    downloadCSV(csvContent, filename);
  }
}

/**
 * Exports heatmap as a PNG image
 * @param {HTMLElement} heatmapElement - The heatmap DOM element
 * @param {string} filename - Filename without extension
 * @returns {Promise<void>}
 */
export async function exportHeatmapAsImage(heatmapElement, filename = "heatmap") {
  if (!heatmapElement) {
    throw new Error("Heatmap element not found");
  }

  // Use html2canvas if available (would need to be installed)
  // For now, we'll use a simple canvas-based approach

  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Set canvas size to match element
    const rect = heatmapElement.getBoundingClientRect();
    canvas.width = rect.width * 2; // 2x for better quality
    canvas.height = rect.height * 2;

    // Scale for better quality
    ctx.scale(2, 2);

    // Draw white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Convert SVG or HTML to canvas
    // This is a simplified version - for production, consider using html2canvas library
    const svgData = new XMLSerializer().serializeToString(heatmapElement);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    return new Promise((resolve, reject) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);

        // Convert canvas to blob and download
        canvas.toBlob((blob) => {
          const link = document.createElement("a");
          const downloadUrl = URL.createObjectURL(blob);

          link.setAttribute("href", downloadUrl);
          link.setAttribute("download", `${filename}.png`);
          link.style.visibility = "hidden";

          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          URL.revokeObjectURL(url);
          URL.revokeObjectURL(downloadUrl);
          resolve();
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load heatmap image"));
      };

      img.src = url;
    });
  } catch (error) {
    console.error("Error exporting heatmap:", error);
    throw error;
  }
}

/**
 * Exports session summary as JSON
 * @param {Object} session - Session object
 * @param {Array} pitches - Pitches array
 * @param {string} filename - Filename without extension
 */
export function exportSessionAsJSON(session, pitches, filename = "session") {
  const data = {
    session,
    pitches,
    exportedAt: new Date().toISOString()
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.json`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
