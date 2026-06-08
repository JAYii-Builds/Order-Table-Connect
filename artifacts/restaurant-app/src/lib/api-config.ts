import { setAuthTokenGetter } from "@workspace/api-client-react";

setAuthTokenGetter(() => {
  const token = localStorage.getItem("auth_token");
  return token || null;
});
