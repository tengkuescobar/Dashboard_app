<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PageController;
use App\Http\Controllers\QueryCatalogController;
use App\Http\Controllers\AiAgentController;

// Existing auth routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function () {
    // Page Manager Routes
    Route::post('/pages/reorder', [PageController::class, 'reorder']);
    Route::apiResource('pages', PageController::class);

    // Query Catalog & Reports (Phase 5 Mock)
    Route::get('/query-catalog', [QueryCatalogController::class, 'index']);
    Route::get('/reports/category-summary', [QueryCatalogController::class, 'categorySummary']);
    Route::get('/reports/region-revenue', [QueryCatalogController::class, 'regionRevenue']);

    // AI Agent Integration (Phase 8)
    Route::post('/ai/generate-chart', [AiAgentController::class, 'generateChart']);

    // User Settings (Phase 10)
    Route::post('/user/llm-key', [App\Http\Controllers\UserSettingsController::class, 'updateLlmKey']);
});
