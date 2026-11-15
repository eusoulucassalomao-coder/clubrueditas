const { mintToken } = require("../_lib/fid-auth");
const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } = require("../_lib/appwrite");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const slug = process.env.APPWRITE_OWNER_SLUG || "laruedita";
  const allowedEmail = String(process.env.APPWRITE_CAJA_EMAIL || "").trim().toLowerCase();
  const allowedUserId = String(process.env.APPWRITE_CAJA_USER_ID || "");

  if (!email || !password) return res.status(400).json({ error: "missing_credentials" });
  if (!allowedEmail && !allowedUserId) return res.status(503).json({ error: "caja_login_not_configured" });

  try {
    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID) {
      return res.status(503).json({ error: "appwrite_not_configured" });
    }
    const login = await fetch(APPWRITE_ENDPOINT + "/v1/account/sessions/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Appwrite-Project": APPWRITE_PROJECT_ID },
      body: JSON.stringify({ email, password }),
    });
    const session = await login.json().catch(() => ({}));
    if (!login.ok) {
      console.error("Appwrite Caja login rejected", { status: login.status, type: session.type || "unknown" });
      return res.status(login.status === 401 ? 401 : 502).json({
        error: login.status === 401 ? "invalid_credentials" : "appwrite_login_failed",
      });
    }

    const isAllowed = (allowedUserId && session.userId === allowedUserId) ||
      (allowedEmail && email === allowedEmail);
    if (!isAllowed) return res.status(403).json({ error: "role_not_authorized" });

    return res.status(200).json({ token: mintToken(slug, "caja") });
  } catch (error) {
    console.error("Appwrite Caja login unavailable", { code: error?.code || "unknown", status: error?.status || 0 });
    return res.status(503).json({ error: "login_unavailable" });
  }
};
