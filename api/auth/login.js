const { mintToken } = require("../_lib/fid-auth");
const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } = require("../_lib/appwrite");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const slug = process.env.APPWRITE_OWNER_SLUG || "laruedita";
  if (!email || !password) return res.status(400).json({ error: "missing_credentials" });

  try {
    const endpoint = APPWRITE_ENDPOINT;
    const project = APPWRITE_PROJECT_ID;
    if (!endpoint || !project) return res.status(503).json({ error: "appwrite_not_configured" });

    // A criação da sessão já valida e-mail e senha. O Appwrite retorna o ID do usuário.
    const login = await fetch(endpoint + "/v1/account/sessions/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Appwrite-Project": project },
      body: JSON.stringify({ email, password }),
    });
    const session = await login.json().catch(() => ({}));
    if (!login.ok) {
      console.error("Appwrite owner login rejected", { status: login.status, type: session.type || "unknown" });
      return res.status(login.status === 401 ? 401 : 502).json({ error: login.status === 401 ? "invalid_credentials" : "appwrite_login_failed" });
    }

    // Não consultamos /account com X-Appwrite-Session: esse cabeçalho não autentica
    // chamadas REST do Appwrite. A sessão criada acima já confirmou as credenciais.
    const ownerId = process.env.APPWRITE_OWNER_USER_ID || "";
    const ownerEmail = String(process.env.APPWRITE_OWNER_EMAIL || "").trim().toLowerCase();
    const isOwner = (ownerId && session.userId === ownerId) || (ownerEmail && email === ownerEmail);
    if (!isOwner) return res.status(403).json({ error: "role_not_authorized" });

    return res.status(200).json({
      token: mintToken(slug, "panel"),
      user: { id: session.userId || "", name: "", email, role: "owner" },
    });
  } catch (error) {
    console.error("Appwrite owner login unavailable", { code: error?.code || "unknown", status: error?.status || 0 });
    return res.status(503).json({ error: "login_unavailable" });
  }
};
