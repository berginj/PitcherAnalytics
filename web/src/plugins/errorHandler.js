/**
 * Global error handler plugin for Vue
 * Catches unhandled errors and logs them appropriately
 */

export default {
  install(app) {
    // Handle Vue errors
    app.config.errorHandler = (err, instance, info) => {
      console.error("Vue error:", err);
      console.error("Component:", instance);
      console.error("Error info:", info);

      // In production, you might want to send this to a logging service
      if (import.meta.env.PROD) {
        // TODO: Send to logging service (e.g., Application Insights)
      }
    };

    // Handle Promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      console.error("Unhandled promise rejection:", event.reason);

      // Prevent default browser behavior (console warning)
      event.preventDefault();

      // In production, send to logging service
      if (import.meta.env.PROD) {
        // TODO: Send to logging service
      }
    });

    // Handle general errors
    window.addEventListener("error", (event) => {
      console.error("Global error:", event.error);

      // In production, send to logging service
      if (import.meta.env.PROD) {
        // TODO: Send to logging service
      }
    });
  }
};
