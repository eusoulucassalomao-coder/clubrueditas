// TEMPORARY: read-only Appwrite inventory for the protected preview only.
// Remove after the source-data migration plan is finalized.
module.exports = async function appwriteInventory(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method" });
  }
  if (process.env.VERCEL_ENV !== "preview" ||
      process.env.VERCEL_GIT_COMMIT_REF !== "fix/supabase-production-readiness") {
    return res.status(404).json({ error: "not_found" });
  }

  const endpoint = (process.env.APPWRITE_ENDPOINT || "")
    .replace(/\\/+$/, "")
    .replace(/\\/v1$/i, "");
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
    if (!response.ok) throw new Error("Appwrite inventory request failed: " + response.status);
    return data;
  };

  try {
    const names = await Promise.all(Object.entries(collections).map(async ([name, id]) => {
      const query = encodeURIComponent(JSON.stringify({ method: "limit", values: [1] }));
      const result = await request(
        "/databases/" + encodeURIComponent(database) +
        "/collections/" + encodeURIComponent(id) +
        "/documents?queries[]=" + query
      );
      return { collection: name, collectionId: id, totalDocuments: Number(result.total || 0) };
    }));
    return res.status(200).json({
      ok: true,
      databaseId: database,
      collections: names
    });
  } catch (error) {
    console.error("appwrite-inventory", error);
    return res.status(502).json({ error: "inventory_failed", message: error.message });
  }
};
