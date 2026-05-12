// Admin API — lists Netlify Forms submissions + manages shipped status via Netlify Blobs.
// GET  ?action=list  → returns all orders enriched with shipped status
// POST ?action=ship  body: { id, shipped }  → updates shipped status
// Auth: Authorization: Bearer <ADMIN_PASSWORD>
const https = require("https");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  const pw = (event.headers.authorization || "").replace("Bearer ", "");
  if (!pw || pw !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const action = (event.queryStringParameters || {}).action || "list";

  try {
    // ── List orders ─────────────────────────────────────────────────────
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
        `/sites/${siteId}/forms/${form.id}/submissions?per_page=100&sort_field=created_at&sort_order=desc`,
        token
      );
      if (!Array.isArray(submissions)) return { statusCode: 200, headers: CORS, body: JSON.stringify([]) };

      // Enrich with shipped status — fail gracefully if Blobs unavailable
      let store = null;
      try {
        const { getStore } = require("@netlify/blobs");
        store = getStore("order-status");
      } catch {}

      const enriched = await Promise.all(
        submissions.map(async (sub) => {
          let shipped = false;
          let shippedAt = null;
          if (store) {
            try {
              const s = await store.get(sub.id, { type: "json" });
              if (s) { shipped = s.shipped || false; shippedAt = s.shippedAt || null; }
            } catch {}
          }
          return { id: sub.id, createdAt: sub.created_at, data: sub.data, shipped, shippedAt };
        })
      );

      return { statusCode: 200, headers: CORS, body: JSON.stringify(enriched) };
    }

    // ── Mark shipped ────────────────────────────────────────────────────
    if (event.httpMethod === "POST" && action === "ship") {
      const { id, shipped } = JSON.parse(event.body || "{}");
      if (!id) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Missing id" }) };

      const { getStore } = require("@netlify/blobs");
      const store = getStore("order-status");
      await store.setJSON(id, { shipped: Boolean(shipped), shippedAt: shipped ? new Date().toISOString() : null });

      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: "Not found" }) };

  } catch (err) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
  }
};

function netlifyGet(path, token) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.netlify.com",
        path:     `/api/v1${path}`,
        method:   "GET",
        headers:  { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error("Parse error: " + raw.slice(0, 200))); }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}
