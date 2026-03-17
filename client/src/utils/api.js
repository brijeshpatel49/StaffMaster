
let logoutCallback = null;

// Set the logout callback (called from AuthContext)
export const setLogoutCallback = (callback) => {
  logoutCallback = callback;
};

// Centralized fetch wrapper
export const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem("token");
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...options.headers,
  };

  const hasContentType = Object.keys(headers).some(
    (key) => key.toLowerCase() === "content-type"
  );

  if (!isFormData && !hasContentType) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    // Logout only for token expiry/invalidity, not every unauthorized case.
    if (response.status === 401) {
      const authText = `${data?.message || ""} ${data?.error || ""}`.toLowerCase();
      const shouldLogout =
        authText.includes("token expired") ||
        authText.includes("jwt expired") ||
        authText.includes("invalid token") ||
        authText.includes("jwt malformed") ||
        authText.includes("invalid signature");

      if (shouldLogout) {
        console.log("Token expired/invalid, logging out...");
        if (logoutCallback) {
          logoutCallback();
        }
        return null;
      }
    }

    return { response, data };
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};
