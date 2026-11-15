const { appwriteRequest } = require("../_lib/appwrite");

const dbId = process.env.APPWRITE_DATABASE_ID || "clubrueditas";
const allowed = ["restaurants", "customers", "visits", "ledger", "redemptions", "message_log"];

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const expected = process.env.APPWRITE_SETUP_TOKEN || "";
  const supplied = String(req.headers["x-setup-token"] || "");
  const bypassExpected = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "";
  const bypassSupplied = String(req.headers["x-vercel-protection-bypass"] || "");
  const setupAuthorized = !!expected && supplied.length === expected.length && supplied === expected;
  const bypassAuthorized = !!bypassExpected && bypassSupplied.length === bypassExpected.length && bypassSupplied === bypassExpected;
  if (!setupAuthorized && !bypassAuthorized) return res.status(401).json({ error: "unauthorized" });

  try {
    const payload = req.body && req.body.collections;
    if (!payload || typeof payload !== "object") return res.status(400).json({ error: "invalid_payload" });
    const result = {};
    for (const name of allowed) {
      const rows = payload[name] || [];
      if (!Array.isArray(rows)) return res.status(400).json({ error: "invalid_collection_payload", collection: name });
      let inserted = 0;
      let skipped = 0;
      for (const row of rows) {
        if (!row || typeof row.id !== "string" || !row.id) throw new Error("Invalid document ID in " + name);
        const { id, ...rawData } = row;
        const data = { ...rawData };
        for (const field of ["config", "meta"]) {
          if (data[field] !== undefined && data[field] !== null && typeof data[field] !== "string") {
            data[field] = JSON.stringify(data[field]);
          }
        }
        const base = "/databases/" + encodeURIComponent(dbId) + "/collections/" + encodeURIComponent(name) + "/documents";
        try {
          await appwriteRequest(base + "/" + encodeURIComponent(id));
          skipped++;
          continue;
        } catch (e) {
          if (e.status !== 404) throw e;
        }
        await appwriteRequest(base, {
          method: "POST",
          body: { documentId: id, data, permissions: [] },
        });
        inserted++;
      }
      result[name] = { received: rows.length, inserted, skipped };
    }
    return res.status(200).json({ ok: true, database: dbId, collections: result });
  } catch (error) {
    console.error("appwrite-data-import", error);
    return res.status(500).json({ error: "import_failed", code: error.code || "unknown" });
  }
};
