<?php
/**
 * order.php — Checkout form handler for chef-knife.pk (OVH shared hosting)
 *
 * Receives POST from checkout.html, saves order to data/orders.json,
 * sends an HTML notification email via Brevo, then redirects to thank-you.html.
 *
 * Upload to: /chef-knife/order.php  (OVH multisite root for chef-knife.pk)
 *
 * ─── REQUIRED SETUP ────────────────────────────────────────────────────────
 *  1. Set your Brevo API key below (BREVO_API_KEY).
 *     Get it from: https://app.brevo.com → Settings → API Keys
 *
 *  2. Make sure the data/ directory exists and is writable by PHP (chmod 755).
 *     The script will create it automatically if it is missing.
 *
 *  3. Verify data/.htaccess contains "Deny from all" (already included in repo).
 * ───────────────────────────────────────────────────────────────────────────
 */

// ─── Secrets (loaded from server-only file, not in Git) ─────────────────────

$_secrets = __DIR__ . '/secrets.php';
if (file_exists($_secrets)) {
    require_once $_secrets;
}
// Fallback if secrets.php not present (should not happen in production)
if (!defined('BREVO_API_KEY'))  define('BREVO_API_KEY',  '');
if (!defined('ADMIN_PASSWORD')) define('ADMIN_PASSWORD', '');

// ─── Configuration ──────────────────────────────────────────────────────────

define('DATA_FILE',    __DIR__ . '/data/orders.json');
define('SITE_NAME',    'Chef Knife');
define('SITE_URL',     'https://chef-knife.pk');
define('REDIRECT_OK',  'thank-you.html');
define('REDIRECT_ERR', 'checkout.html');

// Notification recipients (same as Netlify setup)
$RECIPIENTS = [
    ['email' => 'kazam.q@gmail.com',      'name' => 'Kamran'],
    ['email' => 'ayemenqureshi@gmail.com', 'name' => 'Ayemen'],
];

// ─── Only accept POST ────────────────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ' . REDIRECT_ERR);
    exit;
}

// ─── Honeypot — discard bots silently ────────────────────────────────────────

if (!empty($_POST['bot-field'])) {
    header('Location: ' . REDIRECT_OK);
    exit;
}

// ─── Sanitise & collect fields ───────────────────────────────────────────────

function clean($v) {
    return htmlspecialchars(trim((string)($v !== null ? $v : '')), ENT_QUOTES, 'UTF-8');
}

function post($key) {
    return isset($_POST[$key]) ? $_POST[$key] : '';
}

$name     = clean(post('name'));
$phone    = clean(post('phone'));
$email    = clean(post('email'));
$address  = clean(post('address'));
$city     = clean(post('city'));
$postal   = clean(post('postal_code'));
$items    = clean(post('order_items'));
$subtotal = clean(post('order_subtotal'));
$total    = clean(post('order_total'));
$ref      = clean(post('payment_reference'));

// Required fields check
if (empty($name) || empty($phone) || empty($address) || empty($city)) {
    header('Location: ' . REDIRECT_ERR . '?error=missing');
    exit;
}

// ─── Build order record ──────────────────────────────────────────────────────

$id = date('Ymd-His') . '-' . sprintf('%04x', mt_rand(0, 0xffff));

$order = [
    'id'        => $id,
    'createdAt' => date('c'),
    'shipped'   => false,
    'spam'      => false,
    'data'      => [
        'name'              => $name,
        'phone'             => $phone,
        'email'             => $email,
        'address'           => $address,
        'city'              => $city,
        'postal_code'       => $postal,
        'order_items'       => $items,
        'order_subtotal'    => $subtotal,
        'order_total'       => $total,
        'payment_reference' => $ref,
    ],
];

// ─── Save to JSON file (with exclusive lock) ─────────────────────────────────

$dataDir = dirname(DATA_FILE);
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

$fp = fopen(DATA_FILE, 'c+');
if ($fp) {
    flock($fp, LOCK_EX);
    $raw     = '';
    while (!feof($fp)) {
        $raw .= fread($fp, 8192);
    }
    $orders = json_decode($raw, true);
    if (!is_array($orders)) {
        $orders = [];
    }
    array_unshift($orders, $order);   // newest first
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    flock($fp, LOCK_UN);
    fclose($fp);
}

// ─── Send email notification via Brevo ───────────────────────────────────────

function sendBrevoEmail($recipients, $subject, $htmlContent, $apiKey) {
    if (!function_exists('curl_init') || $apiKey === 'YOUR_BREVO_API_KEY_HERE' || empty($apiKey)) {
        return false; // Skip if cURL unavailable or key not configured
    }

    $payload = json_encode([
        'sender'      => ['email' => 'kazam.q@gmail.com', 'name' => 'Chef Knife Orders'],
        'to'          => $recipients,
        'subject'     => $subject,
        'htmlContent' => $htmlContent,
    ]);

    $ch = curl_init('https://api.brevo.com/v3/smtp/email');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($payload),
            'api-key: ' . $apiKey,
        ],
    ]);
    $result = curl_exec($ch);
    $code   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ($code >= 200 && $code < 300);
}

// Build HTML email (same style as the Netlify version)
$rows = '';
$fields = [
    ['Nom',                 $name],
    ['Téléphone',           $phone],
    ['Email',               $email ?: '—'],
    ['Adresse',             $address],
    ['Ville',               $city . ($postal ? ' ' . $postal : '')],
    ['Référence paiement',  $ref ?: '—'],
    ['Articles',            $items],
    ['Sous-total',          $subtotal],
    ['Total',               $total],
    ['ID commande',         $id],
];
foreach ($fields as $row) {
    if (empty($row[1]) || $row[1] === '—') {
        continue;
    }
    $rows .= '<tr>
      <td style="padding:8px 16px;font-weight:600;color:#555;white-space:nowrap;border-bottom:1px solid #eee">'
      . htmlspecialchars($row[0], ENT_QUOTES, 'UTF-8') . '</td>
      <td style="padding:8px 16px;border-bottom:1px solid #eee">'
      . htmlspecialchars($row[1], ENT_QUOTES, 'UTF-8') . '</td>
    </tr>';
}

$htmlEmail = '
<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
  <h2 style="color:#1a1814;margin-bottom:4px">Nouvelle commande</h2>
  <p style="color:#888;margin-top:0">Chef Knife — Sialkot, Pakistan</p>
  <table style="border-collapse:collapse;width:100%;margin-top:16px">
    ' . $rows . '
  </table>
  <p style="margin-top:24px;font-size:12px;color:#aaa">
    <a href="' . SITE_URL . '/admin.html">Voir dans l\'admin →</a>
  </p>
</div>';

$subject = 'Commande de ' . $name . ' — ' . ($total ?: SITE_NAME);

sendBrevoEmail($RECIPIENTS, $subject, $htmlEmail, BREVO_API_KEY);

// ─── Redirect to confirmation page ───────────────────────────────────────────

header('Location: ' . REDIRECT_OK);
exit;
