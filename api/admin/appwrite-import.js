const { Pool } = require("pg");
const { appwriteRequest } = require("../_lib/appwrite");

const databaseId = process.env.APPWRITE_DATABASE_ID || "clubrueditas";
const tables = ["restaurants", "customers", "visits", "ledger", "redemptions", "message_log"];

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "method_not_allowed" });

  const expected = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "";
  const supplied = String(req.headers["x-vercel-protection-bypass"] || "");
  if (!expected || supplied.length !== expected.length || supplied !== expected) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const connectionString = process.env.SUPABASE_MIGRATION_DATABASE_URL;
  if (!connectionString) return res.status(500).json({ error: "migration_source_not_configured" });

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 15000,
    statement_timeout: 60000,
  });

  try {
    const result = {};
    for (const table of tables) {
      const { rows } = await pool.query('SELECT * FROM public."' + table + '"');
      let inserted = 0;
      let skipped = 0;
      for (const row of rows) {
        if (!row.id) throw new Error("A source row is missing its ID in " + table);
        const data = {};
        for (const [key, value] of Object.entries(row)) {
          if (key === "id" || value === null || value === undefined) continue;
          data[key] = (key === "config" || key === "meta") && typeof value !== "string"
            ? JSON.stringify(value)
            : value;
        }
        const base = "/databases/" + encodeURIComponent(databaseId) +
          "/collections/" + encodeURIComponent(table) + "/documents";
        try {
          await appwriteRequest(base + "/" + encodeURIComponent(String(row.id)));
          skipped++;
          continue;
        } catch (error) {
          if (error.status !== 404) throw error;
        }
        try {
          await appwriteRequest(base, {
            method: "POST",
            body: { documentId: String(row.id), data, permissions: [] },
          });
          inserted++;
        } catch (error) {
          if (error.status === 409) skipped++;
          else throw error;
        }
      }
      result[table] = { sourceRows: rows.length, inserted, alreadyPresent: skipped };
    }
    return res.status(200).json({ ok: true, database: databaseId, collections: result });
  } catch (error) {
    console.error("temporary-appwrite-import", error);
    return res.status(500).json({ error: "migration_failed", code: error.code || "unknown" });
  } finally {
    await pool.end().catch(() => {});
  }
};
