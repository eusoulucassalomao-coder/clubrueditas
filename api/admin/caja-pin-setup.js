const { databaseReady, queryEqual, listDocuments, updateDocument } = require("../_lib/appwrite-db");
const { hashRestaurantSecret } = require("../_lib/fid-auth");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") return res.status(405).json({ error: "method" });
  const expected = process.env.CAJA_PIN_SETUP_TOKEN || "";
  const supplied = String(req.query?.token || "");
  if (!expected || supplied.length !== expected.length || supplied !== expected) {
    return res.status(401).json({ error: "unauthorized" });
  }
  if (!databaseReady()) return res.status(503).json({ error: "appwrite_not_ready" });
  const pin = String(process.env.CAJA_PIN_TO_SET || "");
  if (!/^\d{4,8}$/.test(pin)) return res.status(503).json({ error: "pin_not_configured" });
  try {
    const result = await listDocuments("restaurants", [queryEqual("slug", "laruedita")]);
    const restaurant = (result.documents || [])[0];
    if (!restaurant) return res.status(404).json({ error: "restaurant_not_found" });
    const hash = await hashRestaurantSecret(pin);
    await updateDocument("restaurants", restaurant.$id, { caja_pin_hash: hash });
    return res.status(200).json({ ok: true, caja_pin_updated: true });
  } catch (error) {
    console.error("caja-pin-setup", { code: error.code || "unknown", status: error.status || 0 });
    return res.status(500).json({ error: "setup_failed" });
  }
};
