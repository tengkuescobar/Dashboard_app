<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;

class UserSettingsController extends Controller
{
    public function updateLlmKey(Request $request)
    {
        $request->validate([
            'llm_api_key' => 'nullable|string'
        ]);

        $user = $request->user();
        
        try {
            if ($request->filled('llm_api_key')) {
                // Encrypt the key before storing
                $user->llm_api_key = Crypt::encryptString($request->llm_api_key);
            } else {
                // Clear the key if empty string passed
                $user->llm_api_key = null;
            }
            
            $user->save();
            return response()->json(['message' => 'API Key saved successfully']);
            
        } catch (\Exception $e) {
            Log::error("Failed to encrypt/save LLM Key for User ID {$user->id}: " . $e->getMessage());
            return response()->json(['error' => 'Failed to save settings securely'], 500);
        }
    }
}
