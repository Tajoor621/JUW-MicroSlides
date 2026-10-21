// Paid owner quota is opt-in and requires real authenticated server identity.
// Pages and Windows use the independent local Ollama path.
export async function requirePaidAiAccess() {
  if (process.env.JUW_ENABLE_PAID_CLOUD_AI !== "true" || process.env.VITE_AUTH_ENABLED !== "true")
    return false;
  const { assertSameSiteRequest } = await import("./auth/isolation.server");
  const { requireUserId } = await import("./auth/verify.server");
  assertSameSiteRequest();
  await requireUserId();
  return true;
}
