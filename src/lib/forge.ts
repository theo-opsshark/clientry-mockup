/**
 * Forge webtrigger client.
 * Signs requests with HMAC-SHA256 and calls the Forge webtrigger endpoint.
 * Used for portals that have forge_cloud_id set (installed via Marketplace).
 */

import crypto from "crypto";

export interface ForgePortalConfig {
  forgeCloudId: string;
  forgeWebtriggerUrl: string;
  forgeWebhookSecret: string;
  serviceDeskId: string;
}

/**
 * Call a Forge webtrigger action with HMAC-signed request.
 */
export async function forgeCall<T>(
  config: ForgePortalConfig,
  action: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  const payload = { action, cloudId: config.forgeCloudId, params };
  const payloadStr = JSON.stringify(payload);

  // Sign the payload
  const signature = crypto
    .createHmac("sha256", config.forgeWebhookSecret)
    .update(payloadStr)
    .digest("hex");

  const res = await fetch(config.forgeWebtriggerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, signature }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Forge webtrigger ${res.status}: ${text}`);
  }

  const responseBody = await res.json();

  // The webtrigger wraps the response in { statusCode, body }
  // Parse the inner body if it's a string
  if (typeof responseBody === "string") {
    return JSON.parse(responseBody) as T;
  }

  return responseBody as T;
}
