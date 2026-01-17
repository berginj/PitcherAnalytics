/**
 * Extracts and validates user identity from Azure Static Web Apps authentication
 *
 * Azure SWA injects the x-ms-client-principal header after authentication.
 * This function decodes the header and returns user information.
 *
 * Development mode: Set LOCAL_DEV_USER_ID to bypass authentication (non-production only)
 *
 * @param {Object} request - Azure Functions HTTP request object
 * @returns {{userId: string, userDetails: string, principal: Object}|null} User info or null if unauthenticated
 * @throws {Error} If LOCAL_DEV_USER_ID is set in production environment
 */
function getUserId(request) {
  // Development-only authentication bypass with strict safeguards
  if (process.env.LOCAL_DEV_USER_ID) {
    // Only allow in development or test environments
    const nodeEnv = process.env.NODE_ENV || "";
    const isProduction = nodeEnv === "production";

    if (isProduction) {
      // CRITICAL: Never allow auth bypass in production
      console.error("SECURITY ERROR: LOCAL_DEV_USER_ID is set in production environment. This is a critical security vulnerability.");
      throw new Error("Authentication bypass is not allowed in production");
    }

    // Log warning for development use
    console.warn("WARNING: Using LOCAL_DEV_USER_ID for authentication bypass. This should ONLY be used in local development.");

    return {
      userId: process.env.LOCAL_DEV_USER_ID,
      userDetails: "Local Dev",
      principal: { userId: process.env.LOCAL_DEV_USER_ID }
    };
  }

  const header = request.headers.get("x-ms-client-principal");
  if (!header) {
    return null;
  }

  try {
    const decoded = Buffer.from(header, "base64").toString("utf8");
    const principal = JSON.parse(decoded);
    const userId = principal.userId || principal.userDetails || "anonymous";

    return {
      userId,
      userDetails: principal.userDetails || userId,
      principal
    };
  } catch (error) {
    return null;
  }
}

module.exports = { getUserId };
