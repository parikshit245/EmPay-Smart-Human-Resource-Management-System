export interface EdgeJwtPayload {
  id: string;
  role: string;
  loginId: string;
  isFirstLogin?: boolean;
  exp?: number;
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return atob(padded);
}

function encodeBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  const values = new Uint8Array(bytes);
  values.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function isPayload(value: unknown): value is EdgeJwtPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.id === "string" &&
    typeof payload.role === "string" &&
    typeof payload.loginId === "string" &&
    (payload.isFirstLogin === undefined ||
      typeof payload.isFirstLogin === "boolean") &&
    (payload.exp === undefined || typeof payload.exp === "number")
  );
}

export async function verifyEdgeToken(token: string): Promise<EdgeJwtPayload | null> {
  try {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) return null;

    const secret = process.env.JWT_SECRET || "fallback_secret_change_this";
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const expectedSignature = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${header}.${payload}`)
    );

    if (encodeBase64Url(expectedSignature) !== signature) return null;

    const parsed: unknown = JSON.parse(decodeBase64Url(payload));
    if (!isPayload(parsed)) return null;

    if (parsed.exp && parsed.exp * 1000 < Date.now()) return null;

    return parsed;
  } catch {
    return null;
  }
}
