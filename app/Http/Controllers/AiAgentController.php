<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiAgentController extends Controller
{
    public function generateChart(Request $request)
    {
        $request->validate([
            'prompt' => 'required|string|max:1000'
        ]);

        $userPrompt = $request->input('prompt');
        $user = $request->user();
        
        $apiKey = env('LLM_API_KEY'); // Fallback to env
        
        // Use user's key if available
        if ($user && !empty($user->llm_api_key)) {
            try {
                $apiKey = \Illuminate\Support\Facades\Crypt::decryptString($user->llm_api_key);
            } catch (\Exception $e) {
                Log::error('Failed to decrypt user LLM key: ' . $e->getMessage());
            }
        }

        // Check if real API Key exists, if not, fallback to Mock Response
        if (!$apiKey) {
            return $this->mockAiResponse($userPrompt);
        }

        // --- REAL LLM CALL LOGIC ---
        // Context: Read Query Catalog
        $catalogPath = storage_path('app/query-catalog.json');
        $catalog = file_exists($catalogPath) ? file_get_contents($catalogPath) : '[]';

        // System Prompt
        $systemPrompt = "
        You are a Dashboard Chart Generator Assistant.
        Your task is to convert the user's natural language request into a valid YAML configuration.
        
        AVAILABLE TEMPLATES:
        - bar_chart
        - line_chart
        - donut_chart

        QUERY CATALOG:
        {$catalog}

        RULES:
        1. You must ONLY output valid YAML inside a markdown code block. Do not output any conversational text.
        2. Pick the closest template.
        3. Pick the closest query_id from the catalog. Use its corresponding dimension and metric exactly.
        4. Output format MUST be:
        title: \"<A suitable title>\"
        template: \"<template_id>\"
        data_source:
          type: \"catalog\"
          query_id: \"<query_id>\"
          dimension: \"<dimension>\"
          metric: \"<metric>\"
        ";

        try {
            // Example using Google Gemini API (Placeholder structure)
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}", [
                'contents' => [
                    ['role' => 'user', 'parts' => [['text' => $systemPrompt . "\n\nUser Request: " . $userPrompt]]]
                ]
            ]);

            if ($response->successful()) {
                $yaml = $this->extractYamlFromResponse($response->json());
                $validationError = $this->validateAiOutput($yaml);
                if ($validationError) {
                    return response()->json(['error' => $validationError], 422);
                }
                return response()->json(['yaml' => $yaml]);
            }

            Log::error('LLM API Error: ' . $response->body());
            return response()->json(['error' => 'Failed to generate chart from AI'], 500);

        } catch (\Exception $e) {
            Log::error('LLM Connection Error: ' . $e->getMessage());
            return response()->json(['error' => 'Error connecting to AI service'], 500);
        }
    }

    private function validateAiOutput($yaml)
    {
        // Simple regex extraction for guardrails
        preg_match('/template:\s*["\']?(.*?)["\']?(?:\r|\n|$)/i', $yaml, $tmplMatch);
        preg_match('/query_id:\s*["\']?(.*?)["\']?(?:\r|\n|$)/i', $yaml, $queryMatch);
        preg_match('/dimension:\s*["\']?(.*?)["\']?(?:\r|\n|$)/i', $yaml, $dimMatch);
        preg_match('/metric:\s*["\']?(.*?)["\']?(?:\r|\n|$)/i', $yaml, $metMatch);

        $template = $tmplMatch[1] ?? null;
        $queryId = $queryMatch[1] ?? null;
        $dimension = $dimMatch[1] ?? null;
        $metric = $metMatch[1] ?? null;

        // 1. Template Check
        $allowedTemplates = ['bar_chart', 'line_chart', 'donut_chart'];
        if (!in_array($template, $allowedTemplates)) {
            return "AI Hallucination Detected: Invalid template '{$template}'";
        }

        // 2. Query ID & Fields Check
        if ($queryId) {
            $catalogPath = storage_path('app/query-catalog.json');
            if (file_exists($catalogPath)) {
                $catalogData = json_decode(file_get_contents($catalogPath), true);
                $queries = $catalogData['queries'] ?? [];
                
                $foundQuery = null;
                foreach ($queries as $q) {
                    if ($q['id'] === $queryId) {
                        $foundQuery = $q;
                        break;
                    }
                }

                if (!$foundQuery) {
                    return "AI Hallucination Detected: Invalid query ID '{$queryId}'. This query does not exist in the catalog.";
                }

                $allowedDim = $foundQuery['response_fields']['dimension'] ?? null;
                $allowedMet = $foundQuery['response_fields']['metric'] ?? null;

                if ($dimension !== $allowedDim || $metric !== $allowedMet) {
                    return "AI Hallucination Detected: Invalid fields for query '{$queryId}'. Expected dimension='{$allowedDim}', metric='{$allowedMet}'.";
                }
            }
        }

        return null; // Valid
    }

    private function extractYamlFromResponse($jsonResponse)
    {
        // Dummy extraction logic for Gemini API format
        $text = $jsonResponse['candidates'][0]['content']['parts'][0]['text'] ?? '';
        
        // Strip out markdown formatting if present
        if (preg_match('/```(?:yaml)?\n(.*?)\n```/s', $text, $matches)) {
            return trim($matches[1]);
        }
        return trim($text);
    }

    private function mockAiResponse($prompt)
    {
        // Simulate network delay
        sleep(1);

        // HALLUCINATION SIMULATION for testing
        if (stripos($prompt, 'halusinasi') !== false) {
            $mockYaml = "title: \"Hallucinated Chart\"\ntemplate: \"bar_chart\"\ndata_source:\n  type: \"catalog\"\n  query_id: \"fake_query_123\"\n  dimension: \"fake_dim\"\n  metric: \"fake_met\"";
            $validationError = $this->validateAiOutput($mockYaml);
            if ($validationError) {
                return response()->json(['error' => $validationError], 422);
            }
            return response()->json(['yaml' => $mockYaml]);
        }

        // Check if prompt matches available data
        $matchesSales = stripos($prompt, 'sale') !== false || stripos($prompt, 'category') !== false || stripos($prompt, 'kategori') !== false || stripos($prompt, 'penjualan') !== false || stripos($prompt, 'product') !== false;
        $matchesRevenue = stripos($prompt, 'revenue') !== false || stripos($prompt, 'pendapatan') !== false || stripos($prompt, 'region') !== false || stripos($prompt, 'wilayah') !== false || stripos($prompt, 'omset') !== false;
        $matchesGeneric = stripos($prompt, 'chart') !== false || stripos($prompt, 'bar') !== false || stripos($prompt, 'line') !== false || stripos($prompt, 'donut') !== false;

        if (!$matchesSales && !$matchesRevenue && !$matchesGeneric) {
            return response()->json([
                'no_data' => true,
                'message' => 'Maaf, saya tidak menemukan data yang sesuai.',
                'available_queries' => ['orders', 'sessions', 'subscriptions', 'sales_by_category', 'revenue_by_region']
            ]);
        }

        // Simple keyword matching for mock response
        $template = 'bar_chart';
        $queryId = 'sales_by_category';
        $dim = 'category';
        $met = 'quantity';
        $chartType = 'bar';

        if (stripos($prompt, 'garis') !== false || stripos($prompt, 'line') !== false || stripos($prompt, 'tren') !== false) {
            $template = 'line_chart';
            $chartType = 'line';
        } elseif (stripos($prompt, 'lingkaran') !== false || stripos($prompt, 'donut') !== false || stripos($prompt, 'pie') !== false || stripos($prompt, 'komposisi') !== false) {
            $template = 'donut_chart';
            $chartType = 'donut';
        }

        if ($matchesRevenue) {
            $queryId = 'revenue_by_region';
            $dim = 'region';
            $met = 'revenue';
            $chartTitle = 'Revenue by Region';
            $endpoint = '/api/reports/region-revenue';
        } else {
            $chartTitle = 'Sales by Category';
            $endpoint = '/api/reports/category-summary';
        }

        $mockYaml = "title: \"{$chartTitle}\"\ntemplate: \"{$template}\"\ndata_source:\n  type: \"catalog\"\n  query_id: \"{$queryId}\"\n  dimension: \"{$dim}\"\n  metric: \"{$met}\"";

        $validationError = $this->validateAiOutput($mockYaml);
        if ($validationError) {
            return response()->json(['error' => $validationError], 422);
        }

        return response()->json([
            'yaml' => $mockYaml,
            'chart' => [
                'title' => $chartTitle,
                'type' => $chartType,
                'endpoint' => $endpoint,
                'dimension' => $dim,
                'metric' => $met,
                'w' => 1,
                'h' => 1
            ]
        ]);
    }
}
