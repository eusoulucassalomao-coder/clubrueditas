// Esquema canónico Appwrite del Club Ruedita. Todos los accesos son server-side.
const collections = {
  restaurants: {
    strings: [["slug",80,true],["name",120,true],["config",10000,true],["caja_pin_hash",255,false],["panel_pass_hash",255,false],["auto_key_hash",255,false],["n8n_webhook",2048,false],["n8n_secret",255,false],["n8n_wa_webhook",2048,false]],
    indexes: [["slug_unique","unique",["slug"]]],
  },
  customers: {
    strings: [["restaurant_id",36,true],["name",80,true],["phone",20,true],["phone_key",8,true],["birthday",10,false],["code",20,true],["referred_by",36,false],["last_visit",40,false],["consent_at",40,false],["access_token",64,true],["created_at",40,true],["wa_confirmed_at",40,false]],
    integers: [["points",true,0],["lifetime",true,0],["visits",true,0]],
    booleans: [["consent",true,false],["opted_out",true,false]],
    indexes: [["customer_phone_unique","unique",["restaurant_id","phone_key"]],["customer_code_unique","unique",["restaurant_id","code"]],["customer_token_unique","unique",["access_token"]],["customer_restaurant","key",["restaurant_id"]],["customer_last_visit","key",["restaurant_id","last_visit"]]],
  },
  visits: {
    strings: [["restaurant_id",36,true],["customer_id",36,true],["created_at",40,true],["staff",40,false]],
    floats: [["amount",true],["multiplier",true,1]],
    integers: [["points",true,0]],
    indexes: [["visits_restaurant_date","key",["restaurant_id","created_at"]],["visits_customer","key",["customer_id"]]],
  },
  ledger: {
    strings: [["restaurant_id",36,true],["customer_id",36,true],["type",40,true],["note",500,false],["created_at",40,true]],
    integers: [["points",true]],
    indexes: [["ledger_customer_date","key",["customer_id","created_at"]],["ledger_restaurant","key",["restaurant_id"]]],
  },
  redemptions: {
    strings: [["restaurant_id",36,true],["customer_id",36,true],["reward_id",40,true],["name",120,true],["code",20,true],["status",20,true],["created_at",40,true],["used_at",40,false]],
    integers: [["points",true]],
    indexes: [["redemption_code_unique","unique",["restaurant_id","code"]],["redemption_customer_date","key",["customer_id","created_at"]],["redemption_status","key",["restaurant_id","status"]]],
  },
  message_log: {
    strings: [["restaurant_id",36,true],["customer_id",36,true],["kind",40,true],["meta",10000,false],["created_at",40,true]],
    indexes: [["message_customer_kind_date","key",["customer_id","kind","created_at"]]],
  },
};
module.exports = { collections };
