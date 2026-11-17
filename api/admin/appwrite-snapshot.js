// TEMPORARY: protected, read-only Appwrite snapshot for the Supabase migration.
module.exports = async function appwriteSnapshot(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method" });
  }
  if (process.env.VERCEL_ENV !== "preview" ||
      process.env.VERCEL_GIT_COMMIT_REF !== "fix/supabase-production-readiness") {
    return res.status(404).json({ error: "not_found" });
  }

  const endpoint = (process.env.APPWRITE_ENDPOINT || "").replace(/\/+$/, "").replace(/\/v1$/i, "");
  const project = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT || "";
  const key = process.env.APPWRITE_API_KEY || "";
  const database = process.env.APPWRITE_DATABASE_ID || "clubrueditas";
  const collections = {
    restaurants: process.env.APPWRITE_COLLECTION_RESTAURANTS || "restaurants",
    customers: process.env.APPWRITE_COLLECTION_CUSTOMERS || "customers",
    visits: process.env.APPWRITE_COLLECTION_VISITS || "visits",
    ledger: process.env.APPWRITE_COLLECTION_LEDGER || "ledger",
    redemptions: process.env.APPWRITE_COLLECTION_REDEMPTIONS || "redemptions",
    message_log: process.env.APPWRITE_COLLECTION_MESSAGE_LOG || "message_log",
    surveys: process.env.APPWRITE_COLLECTION_SURVEYS || "surveys"
  };
  if (!endpoint || !project || !key || !database) {
    return res.status(503).json({ error: "appwrite_not_configured" });
  }

  const headers = { "X-Appwrite-Project": project, "X-Appwrite-Key": key };
  const request = async (path) => {
    const response = await fetch(endpoint + "/v1" + path, { headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error("Appwrite request failed: " + response.status);
    return data;
  };
  const list = async (id) => {
    const limit = encodeURIComponent(JSON.stringify({ method: "limit", values: [100] }));
    const offset = encodeURIComponent(JSON.stringify({ method: "offset", values: [0] }));
    return request("/databases/" + encodeURIComponent(database) +
      "/collections/" + encodeURIComponent(id) + "/documents?queries[]=" + limit + "&queries[]=" + offset);
  };

  try {
    const result = {};
    for (const [name, id] of Object.entries(collections)) {
      const docs = await list(id);
      result[name] = { total: Number(docs.total || 0), documents: docs.documents || [] };
    }
    return res.status(200).json({ ok: true, databaseId: database, data: result });
  } catch (error) {
    console.error("appwrite-snapshot", error);
    return res.status(502).json({ error: "snapshot_failed", message: error.message });
  }
};
