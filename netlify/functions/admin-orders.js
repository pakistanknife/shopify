// Admin API — lists Netlify Forms submissions + manages shipped status via Netlify Blobs.
// GET  ?action=list  → returns all orders enriched with shipped status
// POST ?action=ship  body: { id, shipped }  → updates shipped status
// Auth: Authorization: Bearer <ADMIN_PASSWORD>
const https = require("https");
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };

  const pw = (event.headers.authorization || "").replace("Bearer ", "");
  if (!pw || pw !== process.env.ADMIN_PASSWORD) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const action = (event.queryStringParameters || {}).action || "list";

  // ── List orders ───────────────────────────────────────────────────────
  if (event.httpMethod === "GET" && action === "list") {
    const siteId = process.env.SITE_ID;
    const token  = process.env.NETLIFY_TOKEN;

    if (!siteId || !token) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "Missing SITE_ID or NETLIFY_TOKEN env vars" }) };
    }

    // Find the "order" form
    const forms = await netlifyGet(`/sites/${siteId}/forms`, token);
    const form  = forms.find((f) => f.name === "order");
    if (!form) {
      return { statusCode: 200, headers, body: JSON.stringify([]) };
    }

    // Fetch up to 100 most recent submissions
    const submissions = await netlifyGet(
      `/sites/${siteId}/forms/${form.id}/submissions?per_page=100&sort_field=created_at&sort_order=desc`,
      token
    );

    // Enrich with shipped status from Blobs
    const store = getStore("order-status");
    const enriched = await Promise.all(
      submissions.map(async (sub) => {
        let status = null;
        try { status = await store.get(sub.id, { type: "json" }); } catch {}
        return {
          id:        sub.id,
          createdAt: sub.created_at,
          data:      sub.data,
          shipped:   status?.shipped  || false,
          shippedAt: status?.shippedAt || null,
        };
      })
    );

    return { statusCode: 200, headers, body: JSON.stringify(enriched) };
  }

  // ── Mark shipped ──────────────────────────────────────────────────────
  if (event.httpMethod === "POST" && action === "ship") {
    const { id, shipped } = JSON.parse(event.body || "{}");
    if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing id" }) };

    const store = getStore("order-status");
    await store.setJSON(id, {
      shipped:   Boolean(shipped),
      shippedAt: shipped ? new Date().toISOString() : null,
    });

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 404, headers, body: JSON.stringify({ error: "Not found" }) };
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
          try { resolve(JSON.parse(raw)); }
          catch (e) { reject(new Error("Netlify API parse error: " + raw.slice(0, 200))); }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}
