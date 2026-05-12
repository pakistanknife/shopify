// Netlify Function — triggered by Netlify Forms webhook on every new submission.
// Sends an order notification email to both recipients via Brevo transactional API.
// Required env var: BREVO_API_KEY (set in Netlify → Site settings → Environment variables)
const https = require("https");

const RECIPIENTS = [
  { email: "kazam.q@gmail.com",       name: "Kamran" },
  { email: "ayemenqureshi@gmail.com",  name: "Ayemen" },
];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let data;
  try {
    const payload = JSON.parse(event.body);
    // Netlify Forms webhook wraps fields inside payload.data
    data = payload.data || payload;
  } catch {
    return { statusCode: 400, body: "Bad Request" };
  }

  const rows = [
    ["Nom",                data.name],
    ["Téléphone",          data.phone],
    ["Email",              data.email],
    ["Adresse",            data.address],
    ["Ville",              data.city],
    ["Code postal",        data.postal_code],
    ["Référence paiement", data.payment_reference],
    ["Articles",           data.order_items],
    ["Sous-total",         data.order_subtotal],
    ["Total",              data.order_total],
  ]
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr>
          <td style="padding:8px 16px;font-weight:600;color:#555;white-space:nowrap;border-bottom:1px solid #eee">${k}</td>
          <td style="padding:8px 16px;border-bottom:1px solid #eee">${v}</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#1a1814;margin-bottom:4px">Nouvelle commande</h2>
      <p style="color:#888;margin-top:0">Chef Knife — Sialkot, Pakistan</p>
      <table style="border-collapse:collapse;width:100%;margin-top:16px">
        ${rows}
      </table>
    </div>`;

  const brevoPayload = JSON.stringify({
    sender:      { email: "kazam.q@gmail.com", name: "Chef Knife Orders" },
    to:          RECIPIENTS,
    subject:     `Commande de ${data.name || "client"} — ${data.order_total || "Chef Knife"}`,
    htmlContent: html,
  });

  await sendBrevo(brevoPayload);

  return { statusCode: 200, body: "OK" };
};

function sendBrevo(body) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.brevo.com",
        path:     "/v3/smtp/email",
        method:   "POST",
        headers: {
          "Content-Type":   "application/json",
          "Content-Length": Buffer.byteLength(body),
          "api-key":        process.env.BREVO_API_KEY,
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          if (res.statusCode >= 400) {
            reject(new Error(`Brevo ${res.statusCode}: ${raw}`));
          } else {
            resolve(raw);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}
