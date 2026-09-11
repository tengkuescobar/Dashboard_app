import React, { useState } from 'react';
import { X, Key, ShieldCheck, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function SettingsModal({ isOpen, onClose }) {
    const [apiKey, setApiKey] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        setError('');
        try {
            await axios.post('/api/user/llm-key', { llm_api_key: apiKey });
            setMessage('API Key securely saved and encrypted in database.');
            setTimeout(() => {
                onClose();
                setMessage('');
                setApiKey('');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to save API key');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                        <ShieldCheck className="text-blue-500 mr-2" size={20} />
                        Security Settings
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6">
                    <p className="text-sm text-gray-600 mb-6">
                        Bring Your Own Key (BYOK) for the AI Agent. Your key will be heavily encrypted using AES-256-CBC before being saved to the database. We will never expose it to the frontend.
                    </p>

                    {message && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded text-sm font-medium">
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded text-sm">
                            {error}
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                            <Key size={16} className="mr-1 text-gray-400" />
                            LLM API Key (Claude / Gemini / OpenAI)
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-..."
                            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Leave blank and save to remove your key.
                        </p>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-100 mt-6">
                        <button 
                            onClick={onClose} 
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded font-medium mr-2"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSave} 
                            disabled={saving}
                            className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                            Save Securely
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
