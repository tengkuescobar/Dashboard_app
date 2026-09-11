<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class QueryCatalogController extends Controller
{
    public function index()
    {
        $path = storage_path('app/query-catalog.json');
        
        if (!file_exists($path)) {
            return response()->json(['queries' => []]);
        }

        $content = file_get_contents($path);
        return response()->json(json_decode($content, true));
    }

    // Mock endpoint: Sales by Category
    public function categorySummary(Request $request)
    {
        return response()->json([
            'data' => [
                ['category' => 'Electronics', 'quantity' => 150],
                ['category' => 'Furniture', 'quantity' => 85],
                ['category' => 'Clothing', 'quantity' => 200],
            ]
        ]);
    }

    // Mock endpoint: Revenue by Region
    public function regionRevenue(Request $request)
    {
        return response()->json([
            'data' => [
                ['region' => 'North America', 'revenue' => 50000],
                ['region' => 'Europe', 'revenue' => 45000],
                ['region' => 'Asia', 'revenue' => 60000],
            ]
        ]);
    }
}
