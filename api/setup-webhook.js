export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false });
  }
  const setupSecret = process.env.TELEGRAM_SETUP_SECRET;
  const supplied = req.headers["x-setup-secret"];
  if (!setupSecret || supplied !== setupSecret) return res.status(401).json({ ok: false, error: "Unauthorized" });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !webhookSecret) return res.status(503).json({ ok: false, error: "Missing bot configuration" });

  const host = req.headers.host;
  if (!host || !host.endsWith("vercel.app")) return res.status(400).json({ ok: false, error: "Unexpected host" });
  const url = "https://" + host + "/api/telegram";
  const response = await fetch("https://api.telegram.org/bot" + token + "/setWebhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url,
      secret_token: webhookSecret,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) return res.status(502).json({ ok: false, error: result.description || "Webhook setup failed" });
  return res.status(200).json({ ok: true, webhook: url, description: result.description });
}
