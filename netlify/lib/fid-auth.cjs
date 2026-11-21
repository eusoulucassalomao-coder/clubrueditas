const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const secret = () => process.env.FID_TOKEN_SECRET || "";
const b64 = value => Buffer.from(value).toString("base64url");

function sign(value) {
  const key = secret();
  if (!key) throw new Error("FID_TOKEN_SECRET is not configured");
  return crypto.createHmac("sha256", "fid-token:" + key).update(value).digest("base64url");
}

// Formato novo (6 partes): restaurante.papel.vence.emitido.usuario.assinatura
//   - "usuario" é o id do usuário da equipe (para o registro de atividade e para derrubar sessões).
// Formato antigo (4 partes): restaurante.papel.vence.assinatura  (continua valendo até vencer, mas sem usuário).
function mintToken(slug, role, ttlMs = 12 * 60 * 60 * 1000, uid = "") {
  const now = Date.now();
  const body = [slug, role, now + ttlMs, now, uid || "-"].join(".");
  return body + "." + sign(body);
}

// Devolve { role, uid, iat } se o token é de verdade, não venceu e o papel é permitido; senão null.
function parseToken(slug, token, allowedRoles) {
  const parts = String(token || "").split(".");
  if (parts.length !== 4 && parts.length !== 6) return null;
  const signature = parts[parts.length - 1];
  const bodyParts = parts.slice(0, -1);
  const body = bodyParts.join(".");
  let expected;
  try { expected = sign(body); } catch (_) { return null; }
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const [tokenSlug, role, expires, iat, uid] = bodyParts;
  if (tokenSlug !== slug || !Number.isFinite(Number(expires)) || Number(expires) < Date.now()) return null;
  if (!allowedRoles.includes(role)) return null;
  return { role, uid: uid && uid !== "-" ? uid : "", iat: Number(iat) || 0 };
}
// Compatível com o uso antigo (if(!verifyToken(...))): devolve o objeto da sessão (verdadeiro) ou false.
function verifyToken(slug, token, allowedRoles) {
  return parseToken(slug, token, allowedRoles) || false;
}
function bearer(req) {
  const value = req.headers.authorization || "";
  return value.replace(/^Bearer\s+/i, "");
}
async function verifyRestaurantSecret(hash, candidate) {
  if (!hash || !candidate) return false;
  try { return await bcrypt.compare(String(candidate), String(hash)); }
  catch (_) { return false; }
}
function hashRestaurantSecret(value) {
  return bcrypt.hash(String(value), 12);
}
module.exports = { mintToken, verifyToken, bearer, verifyRestaurantSecret, hashRestaurantSecret };
