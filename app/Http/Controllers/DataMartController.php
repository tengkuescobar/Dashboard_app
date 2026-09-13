<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DataMartController extends Controller
{
    public function getMetadata()
    {
        return response()->json([
            'dimensions' => [
                ['id' => 'region_name', 'label' => 'Region (Wilayah)', 'table' => 'dim_locations', 'column' => 'region_name'],
                ['id' => 'area_name', 'label' => 'Area (Nasional)', 'table' => 'dim_locations', 'column' => 'area_name'],
                ['id' => 'category', 'label' => 'Kategori Produk (Broadband, Digital, Voice)', 'table' => 'dim_products', 'column' => 'category'],
                ['id' => 'broadband_pack_type', 'label' => 'Broadband Pack (Core, Acquisition)', 'table' => 'dim_products', 'column' => 'broadband_pack_type'],
                ['id' => 'type_name', 'label' => 'Tipe Penjualan (BAU, New Sales)', 'table' => 'dim_sales_types', 'column' => 'type_name'],
                ['id' => 'month', 'label' => 'Bulan (1 - 12)', 'table' => 'dim_dates', 'column' => 'month'],
                ['id' => 'quarter', 'label' => 'Kuartal (Q1 - Q4)', 'table' => 'dim_dates', 'column' => 'quarter'],
                ['id' => 'year', 'label' => 'Tahun', 'table' => 'dim_dates', 'column' => 'year'],
            ],
            'metrics' => [
                ['id' => 'actual_revenue', 'label' => 'Actual Revenue (SUM)', 'type' => 'currency'],
                ['id' => 'target_revenue', 'label' => 'Target Revenue (SUM)', 'type' => 'currency'],
                ['id' => 'achievement_pct', 'label' => 'Achievement % (Actual / Target)', 'type' => 'percentage'],
                ['id' => 'driver_value', 'label' => 'Driver Metric Value (Avg/Sum)', 'type' => 'number'],
            ],
            'sample_queries' => [
                [
                    'name' => 'Actual vs Target by Region',
                    'sql' => "SELECT l.region_name, ROUND(SUM(r.actual_revenue)/1000000, 2) as actual_revenue_mio, ROUND(AVG(t.target_revenue)/1000000, 2) as target_revenue_mio FROM fact_revenues r JOIN dim_locations l ON r.dim_location_id = l.id JOIN dim_dates d ON r.dim_date_id = d.id LEFT JOIN fact_targets t ON t.year = d.year AND t.month = d.month AND t.dim_location_id = l.id GROUP BY l.region_name ORDER BY actual_revenue_mio DESC",
                ],
                [
                    'name' => 'Revenue by Product Category',
                    'sql' => "SELECT p.category, ROUND(SUM(r.actual_revenue)/1000000, 2) as revenue_mio FROM fact_revenues r JOIN dim_products p ON r.dim_product_id = p.id GROUP BY p.category ORDER BY revenue_mio DESC",
                ],
                [
                    'name' => 'Monthly Revenue Trend',
                    'sql' => "SELECT d.month, ROUND(SUM(r.actual_revenue)/1000000, 2) as revenue_mio FROM fact_revenues r JOIN dim_dates d ON r.dim_date_id = d.id GROUP BY d.month ORDER BY d.month ASC",
                ],
            ]
        ]);
    }

    public function query(Request $request)
    {
        $validated = $request->validate([
            'dimensions' => 'required|array|min:1',
            'dimensions.*' => 'string',
            'metrics' => 'required|array|min:1',
            'metrics.*' => 'string',
            'limit' => 'nullable|integer|max:100',
        ]);

        $dimMapping = [
            'region_name' => 'l.region_name',
            'area_name' => 'l.area_name',
            'category' => 'p.category',
            'category_name' => 'p.category',
            'broadband_pack_type' => 'p.broadband_pack_type',
            'type_name' => 'st.type_name',
            'sales_type_name' => 'st.type_name',
            'month' => 'd.month',
            'month_name' => 'd.month',
            'quarter' => 'd.quarter',
            'year' => 'd.year',
        ];

        $selects = [];
        $groupBy = [];
        foreach ($validated['dimensions'] as $dim) {
            if (isset($dimMapping[$dim])) {
                $col = $dimMapping[$dim];
                $selects[] = "{$col} as {$dim}";
                $groupBy[] = $col;
            }
        }

        if (empty($selects)) {
            $selects[] = 'l.region_name as region_name';
            $groupBy[] = 'l.region_name';
        }

        $includeTarget = in_array('target_revenue', $validated['metrics']) || in_array('achievement_pct', $validated['metrics']);

        if (in_array('actual_revenue', $validated['metrics'])) {
            $selects[] = 'ROUND(SUM(r.actual_revenue), 2) as actual_revenue';
        }
        if ($includeTarget) {
            $selects[] = 'ROUND(AVG(t.target_revenue), 2) as target_revenue';
        }
        if (in_array('achievement_pct', $validated['metrics'])) {
            $selects[] = 'ROUND((SUM(r.actual_revenue) / NULLIF(AVG(t.target_revenue), 0)) * 100, 1) as achievement_pct';
        }

        $query = DB::table('fact_revenues as r')
            ->join('dim_locations as l', 'r.dim_location_id', '=', 'l.id')
            ->join('dim_products as p', 'r.dim_product_id', '=', 'p.id')
            ->join('dim_sales_types as st', 'r.dim_sales_type_id', '=', 'st.id')
            ->join('dim_dates as d', 'r.dim_date_id', '=', 'd.id');

        if ($includeTarget) {
            $query->leftJoin('fact_targets as t', function ($join) {
                $join->on('t.year', '=', 'd.year')
                    ->on('t.month', '=', 'd.month')
                    ->on('t.dim_location_id', '=', 'l.id');
            });
        }

        $query->selectRaw(implode(', ', $selects));
        $query->groupByRaw(implode(', ', $groupBy));
        $query->limit($validated['limit'] ?? 50);

        $results = $query->get();

        return response()->json([
            'dimensions' => $validated['dimensions'],
            'metrics' => $validated['metrics'],
            'data' => $results,
        ]);
    }

    public function runCustomSql(Request $request)
    {
        $request->validate([
            'sql' => 'required|string|max:2000',
        ]);

        $sql = trim($request->input('sql'));

        // Security check: Only allow SELECT
        if (!preg_match('/^select\s/i', $sql)) {
            return response()->json(['error' => 'Hanya query SELECT yang diperbolehkan.'], 422);
        }

        $forbidden = ['insert', 'update', 'delete', 'drop', 'truncate', 'alter', 'create', 'grant', 'revoke', 'exec', 'schema'];
        foreach ($forbidden as $word) {
            if (preg_match('/\b' . $word . '\b/i', $sql)) {
                return response()->json(['error' => "Operasi '{$word}' dilarang demi keamanan data."], 422);
            }
        }

        try {
            $results = DB::select($sql);
            $rows = array_map(function ($item) {
                return (array) $item;
            }, array_slice($results, 0, 50));

            $columns = !empty($rows) ? array_keys($rows[0]) : [];

            return response()->json([
                'success' => true,
                'columns' => $columns,
                'rows' => $rows,
                'data' => $rows,
                'total_rows' => count($results),
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'SQL Error: ' . $e->getMessage()], 400);
        }
    }
}
