const crypto = require("crypto");
const {
  databaseReady, queryEqual, queryOrderDesc, queryLimit,
  listDocuments, getDocument, createDocument, updateDocument, deleteDocument,
} = require("./_lib/appwrite-db");
const { mintToken, verifyToken, bearer, verifyRestaurantSecret } = require("./_lib/fid-auth");

const digits = value => String(value || "").replace(/\D/g, "");
const isoNow = () => new Date().toISOString();
const parseConfig = value => {
  if (value && typeof value === "object") return value;
  try { return JSON.parse(value || "{}"); } catch (_) { return {}; }
};
const publicCustomer = c => ({
  id: c.$id, name: c.name, phone: c.phone, code: c.code, birthday: c.birthday || null,
  points: c.points, lifetime: c.lifetime, visits: c.visits,
  lastVisit: c.last_visit || null, createdAt: c.created_at,
  optedOut: !!c.opted_out, confirmed: !!c.wa_confirmed_at,
});

async function one(collection, queries) {
  const result = await listDocuments(collection, [...queries, ...queryLimit(1)]);
  return result.documents?.[0] || null;
}
async function many(collection, queries, limit = 25) {
  const result = await listDocuments(collection, [...queries, ...queryLimit(limit)]);
  return result.documents || [];
}
async function restaurantBySlug(slug) {
  const r = await one("restaurants", [queryEqual("slug", slug)]);
  if (!r) {
    const e = new Error("Restaurante no encontrado");
    e.status = 404; e.code = "restaurant";
    throw e;
  }
  r.config = parseConfig(r.config);
  return r;
}
async function customerByToken(r, token) {
  if (!/^[a-f0-9]{36}$/.test(String(token || ""))) {
    const e = new Error("Link no válido"); e.status = 401; e.code = "token"; throw e;
  }
  const c = await one("customers", [queryEqual("restaurant_id", r.$id), queryEqual("access_token", token)]);
  if (!c) { const e = new Error("Link no válido"); e.status = 401; e.code = "token"; throw e; }
  return c;
}
function makeCustomerCode(name) {
  const base = String(name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3).padEnd(3, "X");
  return base + String(100 + crypto.randomInt(0, 900));
}
async function registerCustomer(r, input) {
  const name = String(input.name || "").trim();
  const phone = digits(input.phone);
  if (name.length < 2 || name.length > 80) throw Object.assign(new Error("Escribí tu nombre"), { code: "name" });
  if (phone.length < 8 || phone.length > 15) throw Object.assign(new Error("Revisá tu número de celular con código de área"), { code: "phone" });
  if (!input.consent) throw Object.assign(new Error("Necesitamos tu autorización para gestionar tu membresía y tus puntos"), { code: "consent" });
  const phoneKey = phone.slice(-8);
  if (await one("customers", [queryEqual("restaurant_id", r.$id), queryEqual("phone_key", phoneKey)])) {
    throw Object.assign(new Error("Este número de celular ya está registrado"), { code: "exists" });
  }
  let referredBy = null;
  const refCode = String(input.ref || "").trim().toUpperCase();
  if (refCode) {
    const ref = await one("customers", [queryEqual("restaurant_id", r.$id), queryEqual("code", refCode)]);
    if (ref) referredBy = ref.$id;
  }
  let code = makeCustomerCode(name);
  for (let i = 0; i < 10 && await one("customers", [queryEqual("restaurant_id", r.$id), queryEqual("code", code)]); i++) code = makeCustomerCode(name);
  const welcome = Math.max(0, Number(r.config?.bonus?.welcome) || 0);
  const id = crypto.randomUUID();
  const customer = {
    restaurant_id: r.$id, name, phone, phone_key: phoneKey,
    birthday: input.birthday || null, code, referred_by: referredBy,
    points: welcome, lifetime: welcome, visits: 0, last_visit: null,
    consent: true, consent_at: isoNow(), opted_out: false,
    access_token: crypto.randomBytes(18).toString("hex"), created_at: isoNow(), wa_confirmed_at: null,
  };
  const created = await createDocument("customers", id, customer);
  try {
    if (welcome > 0) await createDocument("ledger", crypto.randomUUID(), {
      restaurant_id: r.$id, customer_id: id, points: welcome,
      type: "bienvenida", note: "Bienvenida al club", created_at: isoNow(),
    });
  } catch (error) {
    await deleteDocument("customers", id).catch(() => {});
    throw error;
  }
  return { ...created, ...customer };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  if (!databaseReady()) return res.status(503).json({ error: "appwrite_database_not_configured" });
  const body = req.body || {};
  const slug = String(body.slug || "").toLowerCase();
  if (!/^[a-z0-9_-]{2,40}$/.test(slug)) return res.status(400).json({ error: "bad-slug" });
  try {
    const restaurant = await restaurantBySlug(slug);
    const action = String(body.action || "");

    if (action === "config") return res.status(200).json({ name: restaurant.name, config: restaurant.config });

    if (action === "register" || action === "new_customer") {
      const customer = await registerCustomer(restaurant, body);
      if (action === "new_customer") return res.status(200).json({ customer: { id: customer.$id, name: customer.name, code: customer.code } });
      return res.status(200).json({ customer: publicCustomer(customer), token: customer.access_token });
    }

    if (action === "me") {
      const customer = await customerByToken(restaurant, body.token);
      const [history, redemptions] = await Promise.all([
        many("ledger", [queryEqual("customer_id", customer.$id), queryOrderDesc("created_at")], 8),
        many("redemptions", [queryEqual("customer_id", customer.$id), queryOrderDesc("created_at")], 10),
      ]);
      return res.status(200).json({
        customer: { ...publicCustomer(customer), confirmed: !!customer.wa_confirmed_at },
        history: history.map(x => ({ points: x.points, type: x.type, note: x.note, created_at: x.created_at })),
        redemptions: redemptions.map(x => ({ name: x.name, points: x.points, code: x.code, status: x.status, created_at: x.created_at })),
      });
    }

    if (action === "lookup_code") {
      const code = String(body.code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
      if (code.length < 3) return res.status(404).json({ error: "customer-not-found", message: "Revisá el código e intentá de nuevo." });
      const customer = await one("customers", [queryEqual("restaurant_id", restaurant.$id), queryEqual("code", code)]);
      if (!customer) return res.status(404).json({ error: "customer-not-found", message: "No encontramos ese código. Revisalo e intentá de nuevo." });
      return res.status(200).json({ customer: { name: customer.name, code: customer.code, points: customer.points } });
    }

    if (action === "login") return res.status(200).json({ ok: true, channel: false });

    if (action === "auth") {
      const role = body.role === "panel" ? "panel" : "caja";
      const hash = role === "panel" ? restaurant.panel_pass_hash : restaurant.caja_pin_hash;
      if (!(await verifyRestaurantSecret(hash, String(body.secret || "")))) {
        await new Promise(resolve => setTimeout(resolve, 350));
        return res.status(401).json({ error: "bad-secret", message: "Incorrecto" });
      }
      return res.status(200).json({ token: mintToken(slug, role) });
    }

    const token = bearer(req);
    if (["search","visit","bonus","find_code","deliver","recent","stats","customers","export_customers","export_visits","redemptions","save_config","wa_status","wa_connect","wa_logout"].includes(action)) {
      const required = ["stats","customers","export_customers","export_visits","redemptions","save_config","wa_status","wa_connect","wa_logout"].includes(action) ? ["panel"] : ["caja","panel"];
      if (!verifyToken(slug, token, required)) return res.status(401).json({ error: "unauthorized", message: "La sesión venció. Entrá de nuevo." });
      return res.status(501).json({ error: "migration_in_progress", message: "Esta operación todavía está en migración." });
    }

    if (action.startsWith("auto_")) return res.status(501).json({ error: "migration_in_progress" });
    if (action === "claim") return res.status(501).json({ error: "migration_in_progress" });
    return res.status(400).json({ error: "bad-action" });
  } catch (error) {
    const status = error.status || (error.code === "APPWRITE_NOT_CONFIGURED" ? 503 : 500);
    const code = error.code || "server";
    if (status >= 500) console.error("fid-appwrite", error);
    return res.status(status).json({ error: code, message: status >= 500 ? "No se pudo completar. Probá de nuevo." : error.message });
  }
};
