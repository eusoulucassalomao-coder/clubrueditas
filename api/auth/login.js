const { mintToken } = require("../_lib/fid-auth");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });
  const email = String(req.body?.email || "").trim().toLowerCase();
  const slug = process.env.APPWRITE_OWNER_SLUG || "laruedita";
  const password = String(req.body?.password || "");
  if (!email || !password) return res.status(400).json({ error: "missing_credentials" });
  try {
    // Login oficial do Appwrite Auth: a senha nunca é enviada ao banco de dados do restaurante.
    const endpoint = (process.env.APPWRITE_ENDPOINT || "").replace(/\/+$/, "").replace(/\/v1$/i, "");
    const project = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT || "";
    if (!endpoint || !project) return res.status(503).json({ error: "appwrite_not_configured" });
    const login = await fetch(endpoint + "/v1/account/sessions/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Appwrite-Project": project },
      body: JSON.stringify({ email, password }),
    });
    const session = await login.json().catch(() => ({}));
    if (!login.ok) { console.error("Appwrite owner login rejected", { status: login.status, type: session.type || "unknown" }); return res.status(login.status === 401 ? 401 : 502).json({ error: login.status === 401 ? "invalid_credentials" : "appwrite_login_failed" }); }
    const accountResponse = await fetch(endpoint + "/v1/account", {
      headers: { "X-Appwrite-Project": project, "X-Appwrite-Session": session.secret },
    });
    const account = await accountResponse.json().catch(() => ({}));
    if (!accountResponse.ok) { console.error("Appwrite session validation failed", { status: accountResponse.status, type: account.type || "unknown" }); return res.status(502).json({ error: "appwrite_session_check_failed" }); }

    const ownerId = process.env.APPWRITE_OWNER_USER_ID || "";
    const ownerEmail = String(process.env.APPWRITE_OWNER_EMAIL || "").trim().toLowerCase();
    const labels = Array.isArray(account.labels) ? account.labels : [];
    let role = "";
    if ((ownerId && account.$id === ownerId) || (ownerEmail && account.email?.toLowerCase() === ownerEmail)) role = "owner";
    else if (labels.includes("caja")) role = "caja";
    if (!role) return res.status(403).json({ error: "role_not_authorized" });

    if (role !== "owner") return res.status(403).json({ error: "role_not_authorized" });
    return res.status(200).json({ token: mintToken(slug, "panel"), user: { id: account.$id, name: account.name || "", email: account.email, role } });
  } catch (error) {
    console.error("Appwrite owner login unavailable", { code: error?.code || "unknown", status: error?.status || 0 });
    const code = error?.code === "APPWRITE_NOT_CONFIGURED" ? "appwrite_not_configured" : "login_unavailable";
    return res.status(503).json({ error: code });
  }
};
