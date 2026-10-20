const configuredApiUrl = import.meta.env.VITE_API_URL;

if (!configuredApiUrl) {
  throw new Error("VITE_API_URL must be configured");
}

export const apiUrl = configuredApiUrl.replace(/\/$/, "");
