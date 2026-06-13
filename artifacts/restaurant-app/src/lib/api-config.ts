import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

setAuthTokenGetter(() => {
  const token = localStorage.getItem("auth_token");
  return token || null;
});

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
if (apiBaseUrl) {
  setBaseUrl(String(apiBaseUrl));
}

export function getApiBaseUrl(): string {
  return apiBaseUrl ? String(apiBaseUrl).replace(/\/+$/, "") : "";
}
