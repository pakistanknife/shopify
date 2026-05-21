<?php
/**
 * admin-api.php — Order management JSON API for admin.html
 *
 * Replaces /.netlify/functions/admin-orders on OVH shared hosting.
 * Reads and writes data/orders.json using file locks for concurrency safety.
 *
 * Actions:
 *   GET  ?action=list             → JSON array of all orders (newest first)
 *   POST ?action=ship  {id, shipped} → mark order shipped / unshipped
 *   POST ?action=delete {id}         → remove order permanently
 *
 * Auth: Authorization: Bearer <ADMIN_PASSWORD>
 *
 * Upload to: /chef-knife/admin-api.php  (OVH multisite root for chef-knife.pk)
 *
 * ─── REQUIRED SETUP ────────────────────────────────────────────────────────
 *   Set ADMIN_PASSWORD below to a strong password.
 *   The admin.html login screen will ask for this password.
 * ───────────────────────────────────────────────────────────────────────────
 */

// ─── Secrets (loaded from server-only file, not in Git) ─────────────────────

$_secrets = __DIR__ . '/secrets.php';
if (file_exists($_secrets)) {
    require_once $_secrets;
}
if (!defined('ADMIN_PASSWORD')) define('ADMIN_PASSWORD', '');

// ─── Configuration ──────────────────────────────────────────────────────────

define('DATA_FILE', __DIR__ . '/data/orders.json');

// ─── Response helpers ─────────────────────────────────────────────────────────

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, no-cache');
header('X-Content-Type-Options: nosniff');

function respond($code, $data) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function getBearer() {
    // Standard header
    $h = '';
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $h = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (function_exists('apache_request_headers')) {
        $hdrs = apache_request_headers();
        $h = $hdrs['Authorization'] ?? '';
    }
    if (preg_match('/^Bearer\s+(.+)$/i', $h, $m)) {
        return trim($m[1]);
    }
    return '';
}

if (getBearer() !== ADMIN_PASSWORD) {
    respond(401, ['error' => 'Unauthorized']);
}

// ─── File helpers ─────────────────────────────────────────────────────────────

function readOrders() {
    if (!file_exists(DATA_FILE)) {
        return [];
    }
    $raw = file_get_contents(DATA_FILE);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function writeOrders(array $orders) {
    $fp = fopen(DATA_FILE, 'c+');
    if (!$fp) {
        return false;
    }
    flock($fp, LOCK_EX);
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    flock($fp, LOCK_UN);
    fclose($fp);
    return true;
}

// ─── Router ───────────────────────────────────────────────────────────────────

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {

    // ── List all orders ───────────────────────────────────────────────────
    case 'list':
        respond(200, readOrders());
        break;

    // ── Toggle shipped status ─────────────────────────────────────────────
    case 'ship':
        if ($method !== 'POST') {
            respond(405, ['error' => 'Method not allowed']);
        }
        $body    = json_decode(file_get_contents('php://input'), true) ?? [];
        $id      = $body['id'] ?? '';
        $shipped = (bool)($body['shipped'] ?? false);

        if (empty($id)) {
            respond(400, ['error' => 'Missing id']);
        }

        $orders = readOrders();
        $found  = false;
        foreach ($orders as &$o) {
            if ($o['id'] === $id) {
                $o['shipped']   = $shipped;
                $o['shippedAt'] = $shipped ? date('c') : null;
                $found = true;
                break;
            }
        }
        unset($o);

        if (!$found) {
            respond(404, ['error' => 'Order not found']);
        }
        writeOrders($orders);
        respond(200, ['ok' => true]);
        break;

    // ── Delete order ──────────────────────────────────────────────────────
    case 'delete':
        if ($method !== 'POST') {
            respond(405, ['error' => 'Method not allowed']);
        }
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $id   = $body['id'] ?? '';

        if (empty($id)) {
            respond(400, ['error' => 'Missing id']);
        }

        $orders   = readOrders();
        $filtered = [];
        foreach ($orders as $o) {
            if ($o['id'] !== $id) {
                $filtered[] = $o;
            }
        }
        writeOrders($filtered);
        respond(200, ['ok' => true]);
        break;

    default:
        respond(400, ['error' => 'Unknown action']);
}
