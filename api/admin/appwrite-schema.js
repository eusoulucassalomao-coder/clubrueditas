const { appwriteRequest } = require("../_lib/appwrite");
const { collections } = require("../_lib/appwrite-schema");

const dbId = process.env.APPWRITE_DATABASE_ID || "clubrueditas";
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function ensure(path, createBody) {
  try { return await appwriteRequest(path); }
  catch (e) {
    if (e.status !== 404) throw e;
    try { return await appwriteRequest(path.replace(/\?.*$/, ""), { method: "POST", body: createBody }); }
    catch (createError) { if (createError.status === 409) return appwriteRequest(path); throw createError; }
  }
}
async function ensureAttribute(base, kind, attr) {
  const [key, sizeOrRequired, requiredOrDefault, defaultValue] = attr;
  const getPath = base + "/attributes/" + encodeURIComponent(key);
  const createPath = base + "/attributes/" + kind;
  try { return await appwriteRequest(getPath); }
  catch (e) {
    if (e.status !== 404) throw e;
    let body;
    if (kind === "string") body = { key, size: sizeOrRequired, required: requiredOrDefault, ...(defaultValue === undefined ? {} : { default: defaultValue }) };
    else if (kind === "integer" || kind === "float") body = { key, required: sizeOrRequired, ...(requiredOrDefault === undefined ? {} : { default: requiredOrDefault }) };
    else body = { key, required: sizeOrRequired, ...(requiredOrDefault === undefined ? {} : { default: requiredOrDefault }) };
    try { return await appwriteRequest(createPath, { method: "POST", body }); }
    catch (createError) { if (createError.status === 409) return appwriteRequest(getPath); throw createError; }
  }
}
async function waitAttribute(base, key) {
  for (let i = 0; i < 20; i++) {
    const a = await appwriteRequest(base + "/attributes/" + encodeURIComponent(key));
    if (a.status === "available") return;
    if (a.status === "failed") throw new Error("Attribute creation failed: " + key);
    await wait(1000);
  }
  throw new Error("Attribute still processing: " + key);
}
async function ensureIndex(base, index) {
  const [key, type, attributes] = index;
  try { return await appwriteRequest(base + "/indexes/" + encodeURIComponent(key)); }
  catch (e) {
    if (e.status !== 404) throw e;
    try { return await appwriteRequest(base + "/indexes", { method: "POST", body: { key, type, attributes } }); }
    catch (createError) { if (createError.status === 409) return appwriteRequest(base + "/indexes/" + encodeURIComponent(key)); throw createError; }
  }
}

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
    // La API Key nunca sale de esta función. Las colecciones se crean sin permisos públicos.
    try { await appwriteRequest("/databases/" + encodeURIComponent(dbId)); }
    catch (e) {
      if (e.status !== 404) throw e;
      await appwriteRequest("/databases", { method: "POST", body: { databaseId: dbId, name: "Club Ruedita", enabled: true } });
    }

    const result = {};
    for (const [name, spec] of Object.entries(collections)) {
      const base = "/databases/" + encodeURIComponent(dbId) + "/collections/" + encodeURIComponent(name);
      try { await appwriteRequest(base); }
      catch (e) {
        if (e.status !== 404) throw e;
        await appwriteRequest("/databases/" + encodeURIComponent(dbId) + "/collections", {
          method: "POST",
          body: { collectionId: name, name, permissions: [], documentSecurity: true, enabled: true },
        });
      }
      const attrs = [
        ...(spec.strings || []).map(x => ["string", x[0], x[1], x[2]]),
        ...(spec.integers || []).map(x => ["integer", x[0], x[1], x[2]]),
        ...(spec.floats || []).map(x => ["float", x[0], x[1], x[2]]),
        ...(spec.booleans || []).map(x => ["boolean", x[0], x[1], x[2]]),
      ];
      for (const [kind, key, a, b, c] of attrs) {
        await ensureAttribute(base, kind, [key, a, b, c]);
        await waitAttribute(base, key);
      }
      for (const idx of spec.indexes || []) {
        await ensureIndex(base, idx);
      }
      result[name] = { attributes: attrs.length, indexes: (spec.indexes || []).length, status: "ready" };
    }
    return res.status(200).json({ ok: true, database: dbId, collections: result });
  } catch (error) {
    console.error("appwrite-schema-setup", error);
    return res.status(500).json({ error: "setup_failed", message: "Confira o APPWRITE_ENDPOINT e as permissões da chave Appwrite.", code: error.code || "unknown" });
  }
};
