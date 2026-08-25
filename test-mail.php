<?php
/**
 * test-mail.php — Email delivery test for chef-knife.pk
 *
 * Access once via browser: https://chef-knife.pk/test-mail.php
 * DELETE this file from the server afterwards.
 *
 * Tests:
 *   1. PHP mail() via OVH native mailer
 *   2. Brevo API (if BREVO_API_KEY is configured in secrets.php)
 */

$_secrets = __DIR__ . '/secrets.php';
if (file_exists($_secrets)) {
    require_once $_secrets;
}
if (!defined('BREVO_API_KEY'))  define('BREVO_API_KEY',  '');

$TO      = 'kazam.q@gmail.com';
$FROM    = 'orders@chef-knife.pk';
$results = [];

// ─── Test 1 : PHP mail() ─────────────────────────────────────────────────────

$subject = '[TEST] PHP mail() — chef-knife.pk ' . date('H:i:s');
$body    = '<p>Test mail() depuis OVH — si tu reçois ça, le fallback fonctionne.</p>';
$headers = implode("\r\n", [
    'From: Chef Knife Orders <' . $FROM . '>',
    'Reply-To: ' . $FROM,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
]);
$sent = mail($TO, $subject, $body, $headers);
$results[] = ['method' => 'PHP mail()', 'ok' => $sent, 'detail' => $sent ? 'Envoyé' : 'Échec (mail() a retourné false)'];

// ─── Test 2 : Brevo API ───────────────────────────────────────────────────────

$invalid = ['', 'YOUR_BREVO_API_KEY_HERE', 'xkeysib-REPLACE_WITH_YOUR_KEY'];
if (!in_array(BREVO_API_KEY, $invalid, true) && function_exists('curl_init')) {
    $payload = json_encode([
        'sender'      => ['email' => $FROM, 'name' => 'Chef Knife Orders'],
        'to'          => [['email' => $TO, 'name' => 'Kamran']],
        'subject'     => '[TEST] Brevo API — chef-knife.pk ' . date('H:i:s'),
        'htmlContent' => '<p>Test Brevo API — si tu reçois ça, Brevo fonctionne.</p>',
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
            'api-key: ' . BREVO_API_KEY,
        ],
    ]);
    $result = curl_exec($ch);
    $code   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $ok = ($code >= 200 && $code < 300);
    $results[] = ['method' => 'Brevo API', 'ok' => $ok, 'detail' => "HTTP $code — $result"];
} else {
    $results[] = ['method' => 'Brevo API', 'ok' => null, 'detail' => 'Clé API non configurée — ignoré'];
}

// ─── Output ───────────────────────────────────────────────────────────────────
?><!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Test mail — chef-knife.pk</title>
<style>
  body { font-family: sans-serif; max-width: 560px; margin: 40px auto; padding: 0 16px; }
  h1   { font-size: 1.2rem; margin-bottom: 24px; }
  .row { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; padding: 14px 16px; border: 1px solid #e5e5e5; border-radius: 6px; }
  .dot { width: 12px; height: 12px; border-radius: 50%; margin-top: 3px; flex-shrink: 0; }
  .ok   { background: #22c55e; }
  .fail { background: #ef4444; }
  .skip { background: #94a3b8; }
  .label { font-weight: 600; font-size: .9rem; }
  .detail{ font-size: .82rem; color: #666; margin-top: 4px; word-break: break-all; }
  .warn  { margin-top: 28px; padding: 12px 14px; background: #fef9c3; border-radius: 6px; font-size: .82rem; }
</style>
</head>
<body>
<h1>Test email — chef-knife.pk</h1>
<?php foreach ($results as $r): ?>
<div class="row">
  <div class="dot <?= $r['ok'] === true ? 'ok' : ($r['ok'] === false ? 'fail' : 'skip') ?>"></div>
  <div>
    <div class="label"><?= htmlspecialchars($r['method']) ?></div>
    <div class="detail"><?= htmlspecialchars($r['detail']) ?></div>
  </div>
</div>
<?php endforeach; ?>
<div class="warn">
  ⚠️ <strong>Supprimer ce fichier du serveur</strong> après le test.<br>
  FTP → supprimer <code>test-mail.php</code>
</div>
</body>
</html>
