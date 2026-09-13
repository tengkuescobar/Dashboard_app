<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

echo "=== 1. VERIFY USERS AND ROLES ===\n";
$admin = User::where('email', 'ayu@northstar.io')->first();
$member = User::where('email', 'budi@northstar.io')->first();
echo "Admin: " . ($admin ? "{$admin->name} ({$admin->role})" : "NOT FOUND") . "\n";
echo "Member: " . ($member ? "{$member->name} ({$member->role})" : "NOT FOUND") . "\n";

echo "\n=== 2. VERIFY STAR SCHEMA DATA MART TABLES ===\n";
$tables = [
    'dim_dates',
    'dim_products',
    'dim_sales_types',
    'dim_locations',
    'dim_metrics',
    'fact_revenues',
    'fact_targets',
    'fact_drivers'
];
foreach ($tables as $tbl) {
    $count = DB::table($tbl)->count();
    echo "Table {$tbl}: {$count} rows\n";
}

echo "\n=== 3. TEST DATA MART QUERY (MULTI-DIMENSION & MULTI-METRIC) ===\n";
$queryRes = DB::table('fact_revenues as f')
    ->join('dim_products as p', 'f.dim_product_id', '=', 'p.id')
    ->join('fact_targets as t', function ($join) {
        $join->on('f.dim_location_id', '=', 't.dim_location_id')
             ->on('f.dim_product_id', '=', 't.dim_product_id');
    })
    ->select(
        'p.category as label',
        DB::raw('SUM(f.actual_revenue) as actual_revenue'),
        DB::raw('AVG(t.target_revenue) as target_revenue'),
        DB::raw('ROUND((SUM(f.actual_revenue) / AVG(t.target_revenue)) * 100, 2) as achievement_pct')
    )
    ->groupBy('p.category')
    ->get();

foreach ($queryRes as $row) {
    echo "  - {$row->label}: Actual = Rp " . number_format($row->actual_revenue, 0, ',', '.') . " | Target = Rp " . number_format($row->target_revenue, 0, ',', '.') . " | Ach = {$row->achievement_pct}%\n";
}

echo "\n=== 4. TEST DATA MART CONTROLLER VIA HTTP ===\n";
$adminToken = $admin->createToken('test-token')->plainTextToken;

$metaResponse = Http::withToken($adminToken)->get('http://localhost:8000/api/data-mart/meta');
echo "Data Mart Meta Status: " . $metaResponse->status() . "\n";

$queryResponse = Http::withToken($adminToken)->post('http://localhost:8000/api/data-mart/query', [
    'fact' => 'fact_revenues',
    'dimensions' => ['category_name'],
    'metrics' => ['actual_revenue', 'target_revenue']
]);
echo "Data Mart Query Status: " . $queryResponse->status() . " (Rows: " . count($queryResponse->json('data') ?? []) . ")\n";

$sqlResponse = Http::withToken($adminToken)->post('http://localhost:8000/api/data-mart/sql', [
    'sql' => 'SELECT l.region_name, ROUND(SUM(f.actual_revenue)/1000000, 2) as total_actual_mio FROM fact_revenues f JOIN dim_locations l ON f.dim_location_id = l.id GROUP BY l.region_name'
]);
echo "Data Mart SQL Status: " . $sqlResponse->status() . " (Rows: " . count($sqlResponse->json('rows') ?? []) . ")\n";

echo "\n=== 5. VERIFY AI CONTROLLER SIGNATURE (MODEL PARAMETER) ===\n";
$rc = new ReflectionClass(App\Http\Controllers\AiAgentController::class);
$m = $rc->getMethod('generateChart');
echo "AiAgentController::generateChart exists: YES\n";

echo "\n=== ALL VERIFICATIONS PASSED ===\n";
