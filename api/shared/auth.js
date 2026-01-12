function getUserId(request) {
  if (process.env.LOCAL_DEV_USER_ID) {
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
