<?php

namespace Database\Seeders;

use App\Models\Page;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PageSeeder extends Seeder
{
    public function run(): void
    {
        // Ensure default admin user Ayu Rahma exists
        User::updateOrCreate(
            ['email' => 'ayu@northstar.io'],
            [
                'name' => 'Ayu Rahma',
                'password' => Hash::make('password'),
                'role' => 'admin',
            ]
        );

        // Ensure default regular member user Budi Santoso exists
        User::updateOrCreate(
            ['email' => 'budi@northstar.io'],
            [
                'name' => 'Budi Santoso',
                'password' => Hash::make('password'),
                'role' => 'member',
            ]
        );

        // Reset pages to official spec
        Page::truncate();

        Page::create([
            'name' => 'Sales Overview',
            'order' => 0,
            'charts' => [
                [
                    'id' => 'c1',
                    'type' => 'bar',
                    'title' => 'Revenue by Region',
                    'endpoint' => '/api/reports/region-revenue',
                    'dimension' => 'region',
                    'metric' => 'revenue',
                    'w' => 1,
                    'h' => 1
                ],
                [
                    'id' => 'c2',
                    'type' => 'donut',
                    'title' => 'Sales by Category',
                    'endpoint' => '/api/reports/category-summary',
                    'dimension' => 'category',
                    'metric' => 'quantity',
                    'w' => 1,
                    'h' => 1
                ],
                [
                    'id' => 'c3',
                    'type' => 'line',
                    'title' => 'Weekly Signups',
                    'w' => 1,
                    'h' => 1
                ],
                [
                    'id' => 'c4',
                    'type' => 'summary',
                    'title' => 'Performance Summary',
                    'w' => 1,
                    'h' => 1
                ]
            ]
        ]);

        Page::create([
            'name' => 'Marketing Report',
            'order' => 1,
            'charts' => [
                ['id' => 'c5', 'type' => 'line', 'title' => 'Campaign Reach', 'w' => 1, 'h' => 1],
                ['id' => 'c6', 'type' => 'bar', 'title' => 'Lead Conversion', 'w' => 1, 'h' => 1],
                ['id' => 'c7', 'type' => 'donut', 'title' => 'Channel Distribution', 'w' => 1, 'h' => 1]
            ]
        ]);

        Page::create([
            'name' => 'Product Analytics',
            'order' => 2,
            'charts' => [] // Empty state (2b)
        ]);

        Page::create([
            'name' => 'Interactive States (3b)',
            'order' => 3,
            'charts' => [] // Interactive States view (3b & 10)
        ]);
    }
}
