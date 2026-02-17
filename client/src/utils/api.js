
let logoutCallback = null;

// Set the logout callback (called from AuthContext)
export const setLogoutCallback = (callback) => {
  logoutCallback = callback;
};

// Centralized fetch wrapper
export const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    // Automatic token expiration handling
    if (response.status === 401 && data.tokenExpired) {
      console.log("Token expired, logging out...");
      if (logoutCallback) {
        logoutCallback();
      }
      return null;
    }

    return { response, data };
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};
