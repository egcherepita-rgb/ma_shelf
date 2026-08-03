<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$dataDir = __DIR__ . '/data';
$dataFile = $dataDir . '/project-counter.json';
if (!is_dir($dataDir)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'counter_storage_missing']);
    exit;
}

$payload = ['count' => 0, 'projects' => []];
if (is_file($dataFile)) {
    $decoded = json_decode((string)file_get_contents($dataFile), true);
    if (is_array($decoded)) $payload = array_merge($payload, $decoded);
}
$payload['projects'] = is_array($payload['projects']) ? $payload['projects'] : [];

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'POST') {
    $body = json_decode((string)file_get_contents('php://input'), true);
    $projectId = is_array($body) ? preg_replace('/[^a-zA-Z0-9_-]/', '', (string)($body['projectId'] ?? '')) : '';
    if ($projectId === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'project_id_required']);
        exit;
    }
    $handle = fopen($dataFile, 'c+');
    if (!$handle || !flock($handle, LOCK_EX)) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'counter_storage_unavailable']);
        exit;
    }
    rewind($handle);
    $fresh = json_decode((string)stream_get_contents($handle), true);
    if (is_array($fresh)) $payload = array_merge($payload, $fresh);
    $payload['projects'] = is_array($payload['projects']) ? $payload['projects'] : [];
    $created = !in_array($projectId, $payload['projects'], true);
    if ($created) {
        $payload['projects'][] = $projectId;
        $payload['count'] = count($payload['projects']);
        ftruncate($handle, 0); rewind($handle);
        fwrite($handle, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        fflush($handle);
    }
    flock($handle, LOCK_UN); fclose($handle);
    echo json_encode(['ok' => true, 'created' => $created, 'count' => (int)$payload['count']]);
    exit;
}

echo json_encode(['ok' => true, 'count' => (int)$payload['count']]);
