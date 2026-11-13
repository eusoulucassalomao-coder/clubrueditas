import { createClient } from "npm:@supabase/supabase-js@2";

// API do programa de fidelidade. Autenticação própria (token assinado), por isso verify_jwt = false.
// Os dados só são acessados aqui, com a chave de serviço do banco (que nunca vai ao navegador).
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_KEY, { auth: { persistSession: false } });
const enc = new TextEncoder();
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, content-type, x-fid-key", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Max-Age": "86400" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "content-type": "application/json", "cache-control": "no-store" } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class ApiErr extends Error { constructor(public field: string, public text: string, public status = 400) { super(text); } }

// ---------- token (HMAC) ----------
const b64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const hkey = crypto.subtle.importKey("raw", enc.encode("fid-token:" + SERVICE_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
async function sign(msg: string) { return b64(await crypto.subtle.sign("HMAC", await hkey, enc.encode(msg))); }
async function mint(slug: string, role: string, ttlMs = 12 * 3600 * 1000) {
  const exp = Date.now() + ttlMs, body = `${slug}.${role}.${exp}`;
  return `${body}.${await sign(body)}`;
}
async function checkToken(slug: string, token: string, need: "caja" | "panel") {
  const p = String(token || "").split(".");
  if (p.length !== 4) throw new ApiErr("unauthorized", "unauthorized", 401);
  const [s, role, exp, sig] = p, body = `${s}.${role}.${exp}`;
  const good = await sign(body);
  if (s !== slug || sig.length !== good.length || sig !== good || Number(exp) < Date.now()) throw new ApiErr("unauthorized", "unauthorized", 401);
  if (need === "panel" && role !== "panel") throw new ApiErr("forbidden", "forbidden", 403);
  if (need === "caja" && role !== "caja" && role !== "panel") throw new ApiErr("forbidden", "forbidden", 403);
}
const bearer = (req: Request) => (req.headers.get("authorization") || "").replace(/^Bearer /, "");

// ---------- limite simples por IP (por instância) ----------
const hits = new Map<string, number[]>();
function limit(key: string, max: number, windowMs: number) {
  const now = Date.now(), arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) throw new ApiErr("slow-down", "Demasiados intentos. Esperá un momento.", 429);
  arr.push(now); hits.set(key, arr);
}

// ---------- banco ----------
const RE = /^E\|([a-z]+)\|([\s\S]*)$/;
async function rpc(fn: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(fn, args);
  if (error) { const m = RE.exec(error.message || ""); if (m) throw new ApiErr(m[1], m[2]); console.error(fn, error.message); throw new Error("db"); }
  return data;
}
const cache = new Map<string, { t: number; v: any }>();
async function rest(slug: string) {
  const c = cache.get(slug);
  if (c && Date.now() - c.t < 30000) return c.v;
  const { data, error } = await db.from("restaurants").select("id,slug,name,config,n8n_webhook,n8n_secret,n8n_wa_webhook").eq("slug", slug).maybeSingle();
  if (error) { console.error(error.message); throw new Error("db"); }
  if (!data) throw new ApiErr("restaurant", "Restaurante no encontrado", 404);
  cache.set(slug, { t: Date.now(), v: data });
  return data;
}

// ---------- eventos para o n8n (mensagens de WhatsApp) ----------
// Regra: só se escreve a quem CONFIRMOU o WhatsApp (mandou mensagem ao local), aceitou e não pediu baja.
const canMsg = (c: any) => !!(c && c.consent && c.wa_confirmed_at && !c.opted_out);
function emit(r: any, event: string, payload: Record<string, unknown>) {
  if (!r.n8n_webhook) return;
  const p = fetch(r.n8n_webhook, {
    method: "POST",
    headers: { "content-type": "application/json", "x-fid-event-key": r.n8n_secret || "" },
    body: JSON.stringify({ event, slug: r.slug, restaurant: r.name, ts: new Date().toISOString(), site: r.config?.siteUrl || "", ...payload }),
    signal: AbortSignal.timeout(8000),
  }).catch((e) => console.error("n8n", String(e)));
  try { EdgeRuntime?.waitUntil(p); } catch { /* sem waitUntil: segue */ }
}
// conexão do WhatsApp do local (QR): quem fala com a Evolution API é o n8n; a chave dela nunca passa por aqui
async function waCall(r: any, action: "status" | "connect" | "logout") {
  if (!r.n8n_wa_webhook) return { state: "unconfigured" };
  try {
    const res = await fetch(r.n8n_wa_webhook, {
      method: "POST",
      headers: { "content-type": "application/json", "x-fid-event-key": r.n8n_secret || "" },
      body: JSON.stringify({ action, slug: r.slug }),
      signal: AbortSignal.timeout(50000),
    });
    if (!res.ok) return { state: "unavailable", status: res.status };
    const j = await res.json().catch(() => ({}));
    const qr = typeof j.qr === "string" && j.qr.startsWith("data:image/") && j.qr.length < 300000 ? j.qr : "";
    return { state: String(j.state || "unknown").slice(0, 20), qr, pairingCode: String(j.pairingCode || "").slice(0, 20) };
  } catch { return { state: "unavailable" }; }
}
const link = (r: any, token: string) => (r.config?.siteUrl ? `${r.config.siteUrl}/?t=${token}#puntos` : "");
const pub = (c: any) => ({ name: c.name, code: c.code, points: c.points, visits: c.visits, lastVisit: c.last_visit ?? c.lastVisit ?? null });
const digits = (s: unknown) => String(s ?? "").replace(/\D/g, "");

async function customerByToken(r: any, token: string) {
  if (!/^[a-f0-9]{36}$/.test(String(token || ""))) throw new ApiErr("token", "Link no válido", 401);
  const { data } = await db.from("customers").select("*").eq("restaurant_id", r.id).eq("access_token", token).maybeSingle();
  if (!data) throw new ApiErr("token", "Link no válido", 401);
  return data;
}

// ---------- validação das regras (painel do dono) ----------
function cleanConfig(old: any, c: any) {
  const num = (v: unknown, min: number, max: number, int = true) => { const n = Number(v); if (!Number.isFinite(n) || n < min || n > max || (int && !Number.isInteger(n))) throw new ApiErr("config", "Revisá los números"); return n; };
  const out = { ...old };
  out.earn = { points: num(c?.earn?.points, 1, 1000), perAmount: num(c?.earn?.perAmount, 1, 10000000) };
  out.bonus = { welcome: num(c?.bonus?.welcome, 0, 100000), referral: num(c?.bonus?.referral, 0, 100000), birthday: num(c?.bonus?.birthday, 0, 100000), review: num(c?.bonus?.review, 0, 100000) };
  out.inactiveDays = num(c?.inactiveDays, 7, 365);
  const m: Record<string, number> = {};
  for (const [d, v] of Object.entries(c?.multipliers || {})) { if (/^[0-6]$/.test(d)) { const n = num(v, 1, 10, false); if (n > 1) m[d] = n; } }
  out.multipliers = m;
  const rw = Array.isArray(c?.rewards) ? c.rewards : [];
  if (rw.length < 1 || rw.length > 12) throw new ApiErr("config", "Dejá entre 1 y 12 premios");
  const ids = new Set<string>();
  out.rewards = rw.map((x: any, i: number) => {
    let id = String(x?.id || "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) || "p" + i;
    while (ids.has(id)) id += "x"; ids.add(id);
    const name = String(x?.name || "").trim().slice(0, 60); if (!name) throw new ApiErr("config", "Cada premio necesita un nombre");
    const img = /^assets\/[A-Za-z0-9._-]{1,80}$/.test(String(x?.img || "")) ? x.img : (old?.rewards?.[0]?.img || "assets/logo.webp");
    return { id, name, pts: num(x?.pts, 1, 10000000), note: String(x?.note || "").trim().slice(0, 120), img };
  });
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let b: any;
  try { b = await req.json(); } catch { return json({ error: "bad-json" }, 400); }
  const slug = String(b?.slug || "").toLowerCase();
  if (!/^[a-z0-9_-]{2,40}$/.test(slug)) return json({ error: "bad-slug" }, 400);
  const ip = (req.headers.get("x-forwarded-for") || "?").split(",")[0].trim();
  try {
    const r = await rest(slug);
    const act = String(b.action || "");

    // ===== público =====
    if (act === "config") return json({ name: r.name, config: r.config });

    if (act === "register") {
      limit(`reg:${ip}`, 8, 10 * 60000);
      const c = await rpc("fid_register", { p_slug: slug, p_name: b.name, p_phone: b.phone, p_birthday: b.birthday || null, p_ref: b.ref || null, p_consent: !!b.consent });
      // sem mensagem automática: o cliente toca em “Abrir WhatsApp” e é o robô quem responde a ele
      return json({ customer: pub(c), token: c.accessToken });
    }
    if (act === "me") {
      const c = await customerByToken(r, b.token);
      const [h, rd] = await Promise.all([
        db.from("ledger").select("points,type,note,created_at").eq("customer_id", c.id).order("created_at", { ascending: false }).limit(8),
        db.from("redemptions").select("name,points,code,status,created_at").eq("customer_id", c.id).order("created_at", { ascending: false }).limit(10),
      ]);
      return json({ customer: { ...pub(c), confirmed: !!c.wa_confirmed_at }, history: h.data || [], redemptions: rd.data || [] });
    }
    if (act === "lookup_code") {
      limit(`lookup:${ip}`, 8, 10 * 60000);
      const code = String(b.code ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
      if (code.length < 3) throw new ApiErr("customer-not-found", "Revisá el código e intentá de nuevo.", 404);
      const { data: c, error } = await db.from("customers").select("name,code,points").eq("restaurant_id", r.id).eq("code", code).maybeSingle();
      if (error) throw new Error("db");
      if (!c) throw new ApiErr("customer-not-found", "No encontramos ese código. Revisalo e intentá de nuevo.", 404);
      return json({ customer: { name: c.name, code: c.code, points: c.points } });
    }

    if (act === "claim") {
      limit(`claim:${ip}`, 20, 10 * 60000);
      const c = await customerByToken(r, b.token);
      const red = await rpc("fid_claim", { p_slug: slug, p_customer: c.id, p_reward: String(b.reward || "") });
      if (canMsg(c)) emit(r, "claim", { customer: { name: c.name, phone: c.phone }, reward: { name: red.name, code: red.code, pts: red.pts } });
      return json({ redemption: red });
    }
    if (act === "login") {   // mantido por compatibilidade: só envia o link a quem já confirmou o WhatsApp (resposta sempre igual)
      limit(`login:${ip}`, 6, 10 * 60000);
      const key = digits(b.phone).slice(-8);
      if (key.length === 8) {
        const { data: c } = await db.from("customers").select("name,phone,access_token,consent,opted_out,wa_confirmed_at").eq("restaurant_id", r.id).eq("phone_key", key).maybeSingle();
        if (canMsg(c)) emit(r, "login", { customer: { name: c.name, phone: c.phone }, link: link(r, c.access_token) });
      }
      return json({ ok: true, channel: !!r.n8n_webhook });
    }
    if (act === "auth") {
      limit(`auth:${ip}`, 8, 60000);
      const role = b.role === "panel" ? "panel" : "caja";
      await sleep(400);
      const ok = await rpc("fid_check_secret", { p_slug: slug, p_role: role, p_secret: String(b.secret ?? "") });
      if (!ok) throw new ApiErr("bad-secret", "Incorrecto", 401);
      return json({ token: await mint(slug, role) });
    }

    // ===== caixa =====
    if (["search", "visit", "bonus", "find_code", "deliver", "new_customer", "recent"].includes(act)) {
      await checkToken(slug, bearer(req), "caja");
      if (act === "search") return json({ results: await rpc("fid_search", { p_slug: slug, p_q: String(b.q ?? "").slice(0, 60) }) });
      if (act === "visit") {
        const v = await rpc("fid_add_visit", { p_slug: slug, p_customer: b.customer, p_amount: Number(b.amount), p_staff: "caja" });
        const { data: tk } = await db.from("customers").select("access_token,consent,opted_out,wa_confirmed_at").eq("id", v.customer.id).maybeSingle();
        if (canMsg(tk)) {
          emit(r, "visit", { customer: { name: v.customer.name, phone: v.customer.phone, points: v.customer.points, visits: v.customer.visits, code: v.customer.code }, pts: v.pts, mult: v.mult, bonuses: v.bonuses, link: link(r, tk!.access_token) });
        }
        return json({ ...v, bonuses: (v.bonuses || []).map((x: any) => ({ to: x.to, pts: x.pts, why: x.why })) });
      }
      if (act === "bonus") return json(await rpc("fid_add_bonus", { p_slug: slug, p_customer: b.customer, p_type: String(b.type) }));
      if (act === "find_code") return json(await rpc("fid_find_redemption", { p_slug: slug, p_code: String(b.code ?? "") }));
      if (act === "deliver") {
        const d = await rpc("fid_deliver", { p_slug: slug, p_code: String(b.code ?? "") });
        if (d.confirmed) emit(r, "deliver", { customer: { name: d.customer, phone: d.phone }, reward: { name: d.name } });
        return json({ ...d, phone: undefined, confirmed: undefined });
      }
      if (act === "new_customer") {
        limit(`new:${ip}`, 60, 60 * 60000);
        const c = await rpc("fid_register", { p_slug: slug, p_name: b.name, p_phone: b.phone, p_birthday: b.birthday || null, p_ref: null, p_consent: !!b.consent });
        return json({ customer: { name: c.name, code: c.code, id: c.id } });
      }
      if (act === "recent") {
        const { data } = await db.from("visits").select("amount,points,created_at,customers(name)").eq("restaurant_id", r.id).order("created_at", { ascending: false }).limit(8);
        return json({ visits: (data || []).map((v: any) => ({ amount: v.amount, pts: v.points, ts: v.created_at, name: v.customers?.name || "—" })) });
      }
    }

    // ===== painel do dono =====
    if (["stats", "customers", "export_customers", "export_visits", "redemptions", "save_config", "wa_status", "wa_connect", "wa_logout"].includes(act)) {
      await checkToken(slug, bearer(req), "panel");
      if (act === "wa_status" || act === "wa_connect" || act === "wa_logout") {
        limit(`wa:${ip}`, 40, 10 * 60000);
        return json(await waCall(r, act.slice(3) as "status" | "connect" | "logout"));
      }
      if (act === "stats") return json(await rpc("fid_stats", { p_slug: slug }));
      if (act === "customers") {
        let q = db.from("customers").select("name,phone,visits,points,code,last_visit").eq("restaurant_id", r.id).order("lifetime", { ascending: false }).limit(80);
        const s = String(b.q ?? "").trim().replace(/[%_,()]/g, "").slice(0, 40);
        if (s) { const d = digits(s); q = q.or(d.length >= 4 ? `name.ilike.%${s}%,phone.like.%${d}%,code.eq.${s.toUpperCase()}` : `name.ilike.%${s}%,code.eq.${s.toUpperCase()}`); }
        const { data } = await q; return json({ customers: data || [] });
      }
      if (act === "export_customers") {
        const { data } = await db.from("customers").select("name,phone,birthday,code,visits,points,lifetime,last_visit,created_at,consent,opted_out,wa_confirmed_at").eq("restaurant_id", r.id).order("created_at").limit(10000);
        return json({ customers: data || [] });
      }
      if (act === "export_visits") {
        const { data } = await db.from("visits").select("amount,points,multiplier,created_at,customers(name)").eq("restaurant_id", r.id).order("created_at", { ascending: false }).limit(20000);
        return json({ visits: (data || []).map((v: any) => ({ ts: v.created_at, name: v.customers?.name || "", amount: v.amount, pts: v.points, mult: v.multiplier })) });
      }
      if (act === "redemptions") {
        const { data } = await db.from("redemptions").select("name,code,status,created_at,used_at,customers(name)").eq("restaurant_id", r.id).order("created_at", { ascending: false }).limit(60);
        return json({ redemptions: (data || []).map((x: any) => ({ name: x.name, code: x.code, status: x.status, ts: x.created_at, usedAt: x.used_at, customer: x.customers?.name || "—" })) });
      }
      if (act === "save_config") {
        const next = cleanConfig(r.config, b.config);
        const { error } = await db.from("restaurants").update({ config: next }).eq("id", r.id);
        if (error) throw new Error("db");
        cache.delete(slug);
        return json({ ok: true, config: next });
      }
    }

    // ===== automação (n8n): chave própria no cabeçalho x-fid-key =====
    if (act.startsWith("auto_")) {
      limit(`auto:${ip}`, 240, 60000);
      const ok = await rpc("fid_check_secret", { p_slug: slug, p_role: "auto", p_secret: req.headers.get("x-fid-key") || "" });
      if (!ok) throw new ApiErr("unauthorized", "unauthorized", 401);
      if (act === "auto_candidates") return json({ customers: await rpc("fid_candidates", { p_slug: slug, p_kind: String(b.kind) }), site: r.config?.siteUrl || "" });
      if (act === "auto_log") { await rpc("fid_log_message", { p_slug: slug, p_customer: b.customer, p_kind: String(b.kind), p_meta: b.meta ?? null }); return json({ ok: true }); }
      if (act === "auto_stats") return json(await rpc("fid_stats", { p_slug: slug }));
      if (act === "auto_expire") return json(await rpc("fid_expire", { p_slug: slug }));
      if (act === "auto_optout") {
        const key = digits(b.phone).slice(-8);
        if (key.length === 8) await db.from("customers").update({ opted_out: true }).eq("restaurant_id", r.id).eq("phone_key", key);
        return json({ ok: true });
      }
      if (act === "auto_inbound") {   // o cliente escreveu “puntos” ao WhatsApp do local: confirma o número e devolve os dados da resposta
        const c = await rpc("fid_inbound", { p_slug: slug, p_phone: String(b.phone ?? "") });
        if (!c || !c.found) return json({ found: false, site: r.config?.siteUrl || "" });
        return json({ found: true, name: c.name, points: c.points, code: c.code, link: link(r, c.token), site: r.config?.siteUrl || "" });
      }
    }
    return json({ error: "bad-action" }, 400);
  } catch (e) {
    if (e instanceof ApiErr) return json({ error: e.field, message: e.text }, e.status);
    console.error("fid", String(e));
    return json({ error: "server" }, 500);
  }
});

