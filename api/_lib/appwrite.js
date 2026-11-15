// Cliente Appwrite exclusivamente del servidor Vercel.
// Nunca importar este archivo desde scripts del navegador.
const APPWRITE_ENDPOINT = (process.env.APPWRITE_ENDPOINT || "").replace(/\\/$/, "");
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || "";

function appwriteReady() {
  return Boolean(APPWRITE_ENDPOINT && APPWRITE_PROJECT_ID && APPWRITE_API_KEY);
}

async function appwriteRequest(path, { method = "GET", body, headers = {} } = {}) {
  if (!appwriteReady()) {
    const error = new Error("Appwrite server environment is not configured");
    error.code = "APPWRITE_NOT_CONFIGURED";
    throw error;
  }
  const response = await fetch(`${APPWRITE_ENDPOINT}/v1${path}`, {
    method,
    headers: {
      "X-Appwrite-Project": APPWRITE_PROJECT_ID,
      "X-Appwrite-Key": APPWRITE_API_KEY,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `Appwrite request failed (${response.status})`);
    error.code = data.type || "APPWRITE_REQUEST_FAILED";
    error.status = response.status;
    throw error;
  }
  return data;
}

module.exports = { appwriteReady, appwriteRequest };
