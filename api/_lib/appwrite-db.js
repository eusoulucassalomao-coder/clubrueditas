// Acceso tipado por configuración a las colecciones Appwrite. Solo servidor.
const { appwriteRequest } = require("./appwrite");

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "clubrueditas";
const COLLECTIONS = {
  restaurants: process.env.APPWRITE_COLLECTION_RESTAURANTS || "restaurants",
  customers: process.env.APPWRITE_COLLECTION_CUSTOMERS || "customers",
  visits: process.env.APPWRITE_COLLECTION_VISITS || "visits",
  ledger: process.env.APPWRITE_COLLECTION_LEDGER || "ledger",
  redemptions: process.env.APPWRITE_COLLECTION_REDEMPTIONS || "redemptions",
  message_log: process.env.APPWRITE_COLLECTION_MESSAGE_LOG || "message_log",
};

function databaseReady() {
  return Boolean(DATABASE_ID && Object.values(COLLECTIONS).every(Boolean));
}
function collection(name) {
  const id = COLLECTIONS[name];
  if (!DATABASE_ID || !id) {
    const error = new Error("Appwrite database/collection environment is not configured");
    error.code = "APPWRITE_DATABASE_NOT_CONFIGURED";
    throw error;
  }
  return { databaseId: DATABASE_ID, collectionId: id };
}
function queryParam(query) {
  return encodeURIComponent(JSON.stringify(query));
}
function queryEqual(field, value) {
  return { method: "equal", attribute: field, values: [value] };
}
function querySearch(field, value) {
  return { method: "search", attribute: field, values: [value] };
}
function queryLimit(limit = 25, offset = 0) {
  return [
    { method: "limit", values: [limit] },
    { method: "offset", values: [offset] },
  ];
}
async function listDocuments(name, queries = []) {
  const { databaseId, collectionId } = collection(name);
  const qs = queries.map((q) => "queries[]=" + queryParam(q)).join("&");
  return appwriteRequest(
    `/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(collectionId)}/documents${qs ? "?" + qs : ""}`
  );
}
async function getDocument(name, id) {
  const { databaseId, collectionId } = collection(name);
  return appwriteRequest(`/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(collectionId)}/documents/${encodeURIComponent(id)}`);
}
async function createDocument(name, id, data, permissions) {
  const { databaseId, collectionId } = collection(name);
  return appwriteRequest(`/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(collectionId)}/documents`, {
    method: "POST",
    body: { documentId: id || "unique()", data, ...(permissions ? { permissions } : {}) },
  });
}
async function updateDocument(name, id, data) {
  const { databaseId, collectionId } = collection(name);
  return appwriteRequest(`/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(collectionId)}/documents/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { data },
  });
}
async function deleteDocument(name, id) {
  const { databaseId, collectionId } = collection(name);
  return appwriteRequest(`/databases/${encodeURIComponent(databaseId)}/collections/${encodeURIComponent(collectionId)}/documents/${encodeURIComponent(id)}`, { method: "DELETE" });
}

module.exports = {
  DATABASE_ID, COLLECTIONS, databaseReady, collection, queryEqual, querySearch,
  queryLimit, listDocuments, getDocument, createDocument, updateDocument, deleteDocument,
};
