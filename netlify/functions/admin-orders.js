// Admin API
// GET  ?action=list              → orders + shipped status
// POST ?action=ship  {id,shipped} → persist status via Blobs
// POST ?action=delete {id}        → delete submission via Netlify API
// Auth: Authorization: Bearer <ADMIN_PASSWORD>
const https = require("https");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

function getStore() {
  const { getStore } = require("@netlify/blobs");
  return getStore({
    name:      "order-status",
    siteID:    process.env.SITE_ID,
    token:     process.env.NETLIFY_TOKEN,
    consistency: "strong",
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  const pw = (event.headers.authorization || "").replace("Bearer ", "");
  if (!pw || pw !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const action = (event.queryStringParameters || {}).action || "list";

  try {
    // ── List ─────────────────────────────────────────────────────────────
    if (event.httpMethod === "GET" && action === "list") {
      const siteId = process.env.SITE_ID;
      const token  = process.env.NETLIFY_TOKEN;
      if (!siteId || !token) {
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "Missing SITE_ID or NETLIFY_TOKEN" }) };
      }

      const forms = await netlifyGet(`/sites/${siteId}/forms`, token);
      if (!Array.isArray(forms)) {
        return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: "Netlify API error", detail: forms }) };
      }
      const form = forms.find((f) => f.name === "order");
      if (!form) return { statusCode: 200, headers: CORS, body: JSON.stringify([]) };

      const submissions = await netlifyGet(
        `/sites/${siteId}/forms/${form.id}/submissions?per_page=100&sort_field=created_at&sort_order=desc&include_spam=true`,
        token
      );
      if (!Array.isArray(submissions)) return { statusCode: 200, headers: CORS, body: JSON.stringify([]) };

      let store = null;
      try { store = getStore(); } catch {}

      const enriched = await Promise.all(
        submissions.map(async (sub) => {
          let shipped = false, shippedAt = null;
          if (store) {
            try {
              const s = await store.get(sub.id, { type: "json" });
              if (s) { shipped = s.shipped || false; shippedAt = s.shippedAt || null; }
            } catch {}
          }
          return { id: sub.id, createdAt: sub.created_at, data: sub.data, shipped, shippedAt, spam: sub.spam || false };
        })
      );

      return { statusCode: 200, headers: CORS, body: JSON.stringify(enriched) };
    }

    // ── Ship / Unship ─────────────────────────────────────────────────────
    if (event.httpMethod === "POST" && action === "ship") {
      const { id, shipped } = JSON.parse(event.body || "{}");
      if (!id) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Missing id" }) };
      const store = getStore();
      await store.setJSON(id, { shipped: Boolean(shipped), shippedAt: shipped ? new Date().toISOString() : null });
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    // ── Delete ────────────────────────────────────────────────────────────
    if (event.httpMethod === "POST" && action === "delete") {
      const { id } = JSON.parse(event.body || "{}");
      if (!id) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Missing id" }) };
      await netlifyDelete(`/submissions/${id}`, process.env.NETLIFY_TOKEN);
      // Clean up blob status too
      try { await getStore().delete(id); } catch {}
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: "Not found" }) };

  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};

function netlifyGet(path, token) {
  return netlifyRequest("GET", path, token, null);
}

function netlifyDelete(path, token) {
  return netlifyRequest("DELETE", path, token, null);
}

function netlifyRequest(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.netlify.com",
        path:     `/api/v1${path}`,
        method,
        headers:  { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          if (!raw) { resolve({}); return; }
          try { resolve(JSON.parse(raw)); } catch { resolve(raw); }
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}
