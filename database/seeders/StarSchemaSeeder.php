<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class StarSchemaSeeder extends Seeder
{
    public function run(): void
    {
        // 1. DIM PRODUCTS
        $products = [
            ['category' => 'Broadband', 'broadband_pack_type' => 'Core'],
            ['category' => 'Broadband', 'broadband_pack_type' => 'Acquisition'],
            ['category' => 'Digital', 'broadband_pack_type' => null],
            ['category' => 'Voice', 'broadband_pack_type' => null],
        ];
        foreach ($products as $p) {
            DB::table('dim_products')->updateOrInsert(
                ['category' => $p['category'], 'broadband_pack_type' => $p['broadband_pack_type']],
                ['created_at' => now(), 'updated_at' => now()]
            );
        }
        $prodIds = DB::table('dim_products')->pluck('id')->toArray();

        // 2. DIM SALES TYPES
        $salesTypes = ['BAU', 'New Sales'];
        foreach ($salesTypes as $st) {
            DB::table('dim_sales_types')->updateOrInsert(
                ['type_name' => $st],
                ['created_at' => now(), 'updated_at' => now()]
            );
        }
        $salesTypeIds = DB::table('dim_sales_types')->pluck('id')->toArray();

        // 3. DIM LOCATIONS
        $locations = [
            ['area_name' => 'Area 1 Sumatera', 'region_name' => 'Region Sumbagut'],
            ['area_name' => 'Area 1 Sumatera', 'region_name' => 'Region Sumbagteng'],
            ['area_name' => 'Area 1 Sumatera', 'region_name' => 'Region Sumbagsel'],
            ['area_name' => 'Area 2 Jabotabek', 'region_name' => 'Region Central'],
            ['area_name' => 'Area 2 Jabotabek', 'region_name' => 'Region West'],
            ['area_name' => 'Area 3 Jawa Barat', 'region_name' => 'Region Bandung'],
            ['area_name' => 'Area 4 Jawa Timur', 'region_name' => 'Region Surabaya'],
        ];
        foreach ($locations as $loc) {
            DB::table('dim_locations')->updateOrInsert(
                ['area_name' => $loc['area_name'], 'region_name' => $loc['region_name']],
                ['created_at' => now(), 'updated_at' => now()]
            );
        }
        $locIds = DB::table('dim_locations')->pluck('id')->toArray();

        // 4. DIM METRICS
        $metrics = ['Playing User', 'Payload User', 'Active Subscribers', 'Data Consumption (TB)'];
        foreach ($metrics as $m) {
            DB::table('dim_metrics')->updateOrInsert(
                ['metric_name' => $m],
                ['created_at' => now(), 'updated_at' => now()]
            );
        }
        $metricIds = DB::table('dim_metrics')->pluck('id')->toArray();

        // 5. DIM DATES (12 months of 2025 + early 2026)
        $dateIds = [];
        $startDate = Carbon::create(2025, 1, 1);
        for ($i = 0; $i < 400; $i += 15) { // every 15 days sample
            $d = $startDate->copy()->addDays($i);
            $dateStr = $d->format('Y-m-d');
            $id = DB::table('dim_dates')->updateOrInsert(
                ['date' => $dateStr],
                [
                    'year' => $d->year,
                    'month' => $d->month,
                    'quarter' => $d->quarter,
                    'day_of_week' => $d->dayOfWeekIso,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
            $inserted = DB::table('dim_dates')->where('date', $dateStr)->first();
            if ($inserted) $dateIds[] = $inserted->id;
        }

        // 6. FACT REVENUES
        if (DB::table('fact_revenues')->count() === 0) {
            $revenues = [];
            foreach ($dateIds as $dateId) {
                foreach ($locIds as $locId) {
                    foreach ($prodIds as $prodId) {
                        $stId = $salesTypeIds[array_rand($salesTypeIds)];
                        $baseRev = ($prodId == 1) ? 85000000 : (($prodId == 2) ? 62000000 : 34000000);
                        $variance = rand(-15, 25) / 100.0;
                        $actual = round($baseRev * (1 + $variance), 2);

                        $revenues[] = [
                            'dim_date_id' => $dateId,
                            'dim_product_id' => $prodId,
                            'dim_sales_type_id' => $stId,
                            'dim_location_id' => $locId,
                            'actual_revenue' => $actual,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                }
            }
            foreach (array_chunk($revenues, 200) as $chunk) {
                DB::table('fact_revenues')->insert($chunk);
            }
        }

        // 7. FACT TARGETS
        if (DB::table('fact_targets')->count() === 0) {
            $targets = [];
            for ($month = 1; $month <= 12; $month++) {
                foreach ($locIds as $locId) {
                    foreach ($prodIds as $prodId) {
                        $stId = $salesTypeIds[array_rand($salesTypeIds)];
                        $baseTarget = ($prodId == 1) ? 90000000 : (($prodId == 2) ? 65000000 : 35000000);
                        $targets[] = [
                            'year' => 2025,
                            'month' => $month,
                            'dim_sales_type_id' => $stId,
                            'dim_product_id' => $prodId,
                            'dim_location_id' => $locId,
                            'target_revenue' => $baseTarget,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }
                }
            }
            foreach (array_chunk($targets, 200) as $chunk) {
                DB::table('fact_targets')->insert($chunk);
            }
        }

        // 8. FACT DRIVERS
        if (DB::table('fact_drivers')->count() === 0) {
            $drivers = [];
            foreach ($dateIds as $dateId) {
                foreach ($metricIds as $metId) {
                    $val = ($metId == 1) ? rand(450000, 750000) : (($metId == 2) ? rand(120000, 250000) : rand(85000, 150000));
                    $drivers[] = [
                        'dim_date_id' => $dateId,
                        'dim_metric_id' => $metId,
                        'value' => $val,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }
            foreach (array_chunk($drivers, 200) as $chunk) {
                DB::table('fact_drivers')->insert($chunk);
            }
        }
    }
}
