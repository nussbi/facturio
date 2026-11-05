const SWISSID_AUTH_URL = "https://login.swissid.ch/idp/oauth2/auth";
const SWISSID_TOKEN_URL = "https://login.swissid.ch/idp/oauth2/access_token";

function getRedirectUri() {
  return (
    process.env.SWISSID_REDIRECT_URI ||
    "https://app.facturio.ch/app/api/auth/swissid/callback"
  );
}

export function swissidConfigured() {
  return Boolean(process.env.SWISSID_CLIENT_ID && process.env.SWISSID_CLIENT_SECRET);
}

export function getSwissIdAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.SWISSID_CLIENT_ID || "",
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: "openid profile email",
    state,
  });
  return `${SWISSID_AUTH_URL}?${params.toString()}`;
}

export async function exchangeSwissIdCode(code: string) {
  const params = new URLSearchParams({
    code,
    client_id: process.env.SWISSID_CLIENT_ID || "",
    client_secret: process.env.SWISSID_CLIENT_SECRET || "",
    redirect_uri: getRedirectUri(),
    grant_type: "authorization_code",
  });
  const res = await fetch(SWISSID_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SwissID token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
  };
}

// Decode the OIDC id_token (JWT) payload without verifying the signature
// (the token comes straight from the SwissID token endpoint over TLS).
export function decodeSwissIdIdToken(idToken: string) {
  try {
    const parts = idToken.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(json) as {
      sub: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      given_name?: string;
      family_name?: string;
    };
  } catch {
    return null;
  }
}
