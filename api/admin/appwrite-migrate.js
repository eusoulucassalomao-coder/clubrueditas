// TEMPORARY one-time migration: Appwrite -> Supabase.
// Protected to this Vercel preview branch; supports dry-run and explicit apply.
const { randomUUID } = require("crypto");
const { supabase } = require("../_lib/supabase");

module.exports = async function migrateAppwrite(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method" });
  }
  if (process.env.VERCEL_ENV !== "preview" ||
      process.env.VERCEL_GIT_COMMIT_REF !== "fix/supabase-production-readiness") {
    return res.status(404).json({ error: "not_found" });
  }

  const mode = String(req.query?.mode || "dry-run");
  if (!["dry-run", "apply"].includes(mode)) return res.status(400).json({ error: "invalid_mode" });
  if (mode === "apply" && req.query?.confirm !== "APPLY-APPWRITE-TO-SUPABASE") {
    return res.status(403).json({ error: "confirmation_required" });
  }

  const endpoint = (process.env.APPWRITE_ENDPOINT || "").replace(/\/+$/, "").replace(/\/v1$/i, "");
  const project = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT || "";
  const key = process.env.APPWRITE_API_KEY || "";
  const database = process.env.APPWRITE_DATABASE_ID || "clubrueditas";
  const collectionIds = {
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

  const appwriteRequest = async (path) => {
    const response = await fetch(endpoint + "/v1" + path, {
      headers: { "X-Appwrite-Project": project, "X-Appwrite-Key": key }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error("Appwrite read failed: " + response.status);
    return data;
  };
  const list = async (id) => {
    const limit = encodeURIComponent(JSON.stringify({ method: "limit", values: [100] }));
    const offset = encodeURIComponent(JSON.stringify({ method: "offset", values: [0] }));
    return appwriteRequest(
      "/databases/" + encodeURIComponent(database) +
      "/collections/" + encodeURIComponent(id) + "/documents?queries[]=" + limit + "&queries[]=" + offset
    );
  };
  const asIso = (value, fallback = null) => {
    if (!value) return fallback;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
  };
  const isUuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
  const run = async () => {
    const source = {};
    for (const [name, id] of Object.entries(collectionIds)) {
      const result = await list(id);
      source[name] = result.documents || [];
      if (Number(result.total || 0) > 100) throw new Error("Collection exceeds safe one-page migration limit: " + name);
    }

    const sourceRestaurant = source.restaurants.find(x => x.slug === "laruedita");
    if (!sourceRestaurant) throw new Error("Source restaurant laruedita not found");
    const { data: targetRestaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id,slug,config,panel_pass_hash,caja_pin_hash,auto_key_hash,n8n_webhook,n8n_secret,n8n_wa_webhook")
      .eq("slug", "laruedita")
      .single();
    if (restaurantError || !targetRestaurant) throw new Error("Target Supabase restaurant not found");

    const { data: existingCustomers, error: customerReadError } = await supabase
      .from("customers")
      .select("id,code,phone_key")
      .eq("restaurant_id", targetRestaurant.id);
    if (customerReadError) throw customerReadError;

    const customerMap = new Map();
    const conflicts = [];
    for (const customer of source.customers) {
      const match = (existingCustomers || []).find(x =>
        x.code === customer.code || x.phone_key === customer.phone_key
      );
      if (match && match.id !== customer.$id) {
        conflicts.push({ sourceCustomerId: customer.$id, targetCustomerId: match.id, reason: "code_or_phone_key_conflict" });
        customerMap.set(customer.$id, match.id);
      } else {
        customerMap.set(customer.$id, isUuid(customer.$id) ? customer.$id : randomUUID());
      }
    }
    for (const customer of source.customers) {
      if (customer.referred_by && !customerMap.has(customer.referred_by)) {
        conflicts.push({ sourceCustomerId: customer.$id, reason: "unmapped_referrer" });
      }
    }

    const customers = source.customers.map(c => ({
      id: customerMap.get(c.$id),
      restaurant_id: targetRestaurant.id,
      name: String(c.name || "Cliente"),
      phone: String(c.phone || ""),
      phone_key: String(c.phone_key || ""),
      birthday: c.birthday || null,
      code: String(c.code || ""),
      referred_by: c.referred_by ? (customerMap.get(c.referred_by) || null) : null,
      points: Number(c.points || 0),
      lifetime: Number(c.lifetime || 0),
      visits: Number(c.visits || 0),
      last_visit: asIso(c.last_visit),
      consent: !!c.consent,
      consent_at: asIso(c.consent_at),
      opted_out: !!c.opted_out,
      access_token: String(c.access_token || randomUUID().replace(/-/g, "")),
      created_at: asIso(c.created_at || c.$createdAt, new Date().toISOString()),
      wa_confirmed_at: asIso(c.wa_confirmed_at)
    }));

    const visits = source.visits.map(v => ({
      id: isUuid(v.$id) ? v.$id : randomUUID(),
      restaurant_id: targetRestaurant.id,
      customer_id: customerMap.get(v.customer_id) || v.customer_id,
      amount: Number(v.amount || 0),
      points: Number(v.points || 0),
      multiplier: Number(v.multiplier || 1),
      staff: v.staff || null,
      created_at: asIso(v.created_at || v.$createdAt, new Date().toISOString())
    }));

    const ledger = source.ledger.map(v => ({
      id: isUuid(v.$id) ? v.$id : randomUUID(),
      restaurant_id: targetRestaurant.id,
      customer_id: customerMap.get(v.customer_id) || v.customer_id,
      points: Number(v.points || 0),
      type: String(v.type || "legacy"),
      note: v.note || null,
      created_at: asIso(v.created_at || v.$createdAt, new Date().toISOString())
    }));

    const redemptions = source.redemptions.map(v => ({
      id: isUuid(v.$id) ? v.$id : randomUUID(),
      restaurant_id: targetRestaurant.id,
      customer_id: customerMap.get(v.customer_id) || v.customer_id,
      reward_id: String(v.reward_id || ""),
      name: String(v.name || ""),
      points: Number(v.points || 0),
      code: String(v.code || ""),
      status: String(v.status || "pendiente"),
      created_at: asIso(v.created_at || v.$createdAt, new Date().toISOString()),
      used_at: asIso(v.used_at)
    }));

    const surveys = source.surveys.map(v => ({
      id: isUuid(v.$id) ? v.$id : randomUUID(),
      restaurant_id: targetRestaurant.id,
      customer_id: customerMap.get(v.customer_id) || v.customer_id,
      visit_id: v.visit_id,
      token: String(v.token || ""),
      response: v.response || null,
      rating: Number(v.rating || 0),
      created_at: asIso(v.created_at || v.$createdAt, new Date().toISOString()),
      reviewed_at: asIso(v.reviewed_at || v.surveyed_at)
    }));

    const validCustomerIds = new Set([
      ...(existingCustomers || []).map(c => c.id),
      ...customers.map(c => c.id)
    ]);
    const validMessages = [];
    const orphanMessages = [];
    for (const m of source.message_log) {
      const mapped = customerMap.get(m.customer_id) || m.customer_id;
      const row = {
        id: isUuid(m.$id) ? m.$id : randomUUID(),
        restaurant_id: targetRestaurant.id,
        customer_id: mapped,
        kind: String(m.kind || "legacy"),
        meta: m.meta && typeof m.meta === "string" ? (() => { try { return JSON.parse(m.meta); } catch (_) { return { legacy: m.meta }; } })() : (m.meta || null),
        created_at: asIso(m.created_at || m.$createdAt, new Date().toISOString())
      };
      if (validCustomerIds.has(mapped)) validMessages.push(row);
      else orphanMessages.push({ source_collection: "message_log", source_id: String(m.$id), payload: m });
    }

    const plan = {
      sourceCounts: Object.fromEntries(Object.entries(source).map(([k, v]) => [k, v.length])),
      targetBefore: {
        customers: (existingCustomers || []).length,
        restaurantId: targetRestaurant.id
      },
      planned: {
        customers: customers.length,
        visits: visits.length,
        ledger: ledger.length,
        redemptions: redemptions.length,
        surveys: surveys.length,
        message_log: validMessages.length,
        archivedOrphanMessages: orphanMessages.length
      },
      conflicts,
      sourceAuthHashesSet: {
        panel: !!sourceRestaurant.panel_pass_hash,
        caja: !!sourceRestaurant.caja_pin_hash,
        auto: !!sourceRestaurant.auto_key_hash
      },
      targetAuthHashesSet: {
        panel: !!targetRestaurant.panel_pass_hash,
        caja: !!targetRestaurant.caja_pin_hash,
        auto: !!targetRestaurant.auto_key_hash
      },
      targetSecretsPreserved: true
    };

    if (mode === "dry-run") return { ok: true, mode, plan };
    if (conflicts.length) return { ok: false, mode, error: "conflicts_detected", plan };

    const upsert = async (table, rows) => {
      if (!rows.length) return;
      const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
      if (error) throw new Error(table + " migration failed: " + error.message);
    };

    await upsert("customers", customers);
    await upsert("visits", visits);
    await upsert("ledger", ledger);
    await upsert("redemptions", redemptions);
    await upsert("surveys", surveys);
    await upsert("message_log", validMessages);
    if (orphanMessages.length) {
      const { error } = await supabase.from("appwrite_legacy_archive")
        .upsert(orphanMessages, { onConflict: "source_collection,source_id" });
      if (error) throw new Error("legacy archive failed: " + error.message);
    }

    return {
      ok: true,
      mode,
      migrated: plan.planned,
      customerCodes: customers.map(c => c.code),
      targetRestaurantId: targetRestaurant.id,
      targetSecretsPreserved: true
    };
  };

  try {
    const result = await run();
    return res.status(result.ok ? 200 : 409).json(result);
  } catch (error) {
    console.error("appwrite-migrate", error);
    return res.status(502).json({ error: "migration_failed", message: error.message });
  }
};
