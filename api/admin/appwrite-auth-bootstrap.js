const { Pool } = require("pg");
const { appwriteRequest } = require("../_lib/appwrite");

const databaseId = process.env.APPWRITE_DATABASE_ID || "clubrueditas";

function runSchemaSetup(token) {
  return new Promise((resolve, reject) => {
    const response = {
      statusCode: 200,
      setHeader() {},
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ status: this.statusCode, body }); return this; },
    };
    Promise.resolve(require("./appwrite-schema")({
      method: "POST",
      headers: { "x-setup-token": token },
    }, response)).catch(reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "method_not_allowed" });

  const expected = process.env.APPWRITE_SETUP_TOKEN || "";
  const supplied = String(req.query?.token || "");
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
    statement_timeout: 30000,
  });

  try {
    const setup = await runSchemaSetup(supplied);
    if (setup.status !== 200 || !setup.body?.ok) {
      return res.status(500).json({ error: "appwrite_schema_setup_failed", status: setup.status });
    }

    const { rows } = await pool.query(
      'SELECT id, slug, name, config, panel_pass_hash, caja_pin_hash FROM public."restaurants" WHERE slug = $1 LIMIT 1',
      ["laruedita"]
    );
    if (!rows.length) return res.status(404).json({ error: "restaurant_not_found" });

    const row = rows[0];
    if (!row.panel_pass_hash || !row.caja_pin_hash) {
      return res.status(409).json({ error: "credentials_missing" });
    }

    const data = {
      slug: row.slug,
      name: row.name,
      config: typeof row.config === "string" ? row.config : JSON.stringify(row.config || {}),
      panel_pass_hash: row.panel_pass_hash,
      caja_pin_hash: row.caja_pin_hash,
    };
    const base = "/databases/" + encodeURIComponent(databaseId) +
      "/collections/restaurants/documents/" + encodeURIComponent(String(row.id));

    let existing = false;
    try {
      await appwriteRequest(base);
      existing = true;
    } catch (error) {
      if (error.status !== 404) throw error;
    }

    if (existing) {
      await appwriteRequest(base, { method: "PATCH", body: { data } });
    } else {
      await appwriteRequest("/databases/" + encodeURIComponent(databaseId) +
        "/collections/restaurants/documents", {
        method: "POST",
        body: { documentId: String(row.id), data, permissions: [] },
      });
    }

    return res.status(200).json({
      ok: true,
      schema: "ready",
      restaurant: row.slug,
      credentials: { panel: "migrated", caja: "migrated" },
      customerRecordsCopied: 0,
      sourceRowsRead: 1,
    });
  } catch (error) {
    console.error("appwrite-auth-bootstrap", { code: error.code || "unknown", status: error.status || 0 });
    return res.status(500).json({ error: "bootstrap_failed", code: error.code || "unknown" });
  } finally {
    await pool.end().catch(() => {});
  }
};
