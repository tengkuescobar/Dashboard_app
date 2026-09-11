import React, { useState, useEffect } from 'react';
import { X, BarChart3, LineChart, PieChart, FileCode2, ArrowRight, ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { generateYamlFromQuickConfig } from '../utils/yamlGenerator.js';
import ChartRenderer from './ChartRenderer.jsx';
import axios from 'axios';

export default function AddChartModal({ isOpen, onClose, onPublish }) {
    const [step, setStep] = useState(1);
    
    // Step 1 State
    const [chartType, setChartType] = useState(null); // 'bar_chart', 'line_chart', 'donut_chart', 'custom_yaml', 'ai_agent'
    
    // Step 2A State (Quick Config)
    const [title, setTitle] = useState('');
    const [dataSource, setDataSource] = useState('dummy');
    const [dummyRows, setDummyRows] = useState([
        { label: 'Category A', value: '100' },
        { label: 'Category B', value: '200' }
    ]);
    const [queryId, setQueryId] = useState('');
    const [dimension, setDimension] = useState('');
    const [metric, setMetric] = useState('');
    
    // Step 2B State (Custom YAML)
    const [customYaml, setCustomYaml] = useState('');

    // Step 2C State (AI Agent)
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiGenerating, setAiGenerating] = useState(false);
    const [aiError, setAiError] = useState('');

    // Step 3 State
    const [finalYaml, setFinalYaml] = useState('');

    // Query Catalog Data
    const [catalogQueries, setCatalogQueries] = useState([]);

    useEffect(() => {
        if (isOpen) {
            axios.get('/api/query-catalog')
                .then(res => {
                    if (res.data && res.data.queries) {
                        setCatalogQueries(res.data.queries);
                    }
                })
                .catch(err => console.error("Failed to fetch query catalog", err));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSelectType = (type) => {
        setChartType(type);
        setStep(2);
        // Reset state
        setTitle('');
        setCustomYaml('');
        setFinalYaml('');
        setQueryId('');
        setDimension('');
        setMetric('');
        setAiPrompt('');
        setAiError('');
    };

    const handleNextToPreview = async () => {
        if (chartType === 'custom_yaml') {
            setFinalYaml(customYaml);
            setStep(3);
        } else if (chartType === 'ai_agent') {
            if (!aiPrompt.trim()) return;
            setAiGenerating(true);
            setAiError('');
            try {
                const res = await axios.post('/api/ai/generate-chart', { prompt: aiPrompt });
                setFinalYaml(res.data.yaml);
                setStep(3);
            } catch (err) {
                console.error(err);
                setAiError(err.response?.data?.error || 'Failed to connect to AI Agent');
            } finally {
                setAiGenerating(false);
            }
        } else {
            const yamlStr = generateYamlFromQuickConfig(
                chartType, 
                title, 
                dataSource, 
                dataSource === 'dummy' ? { rows: dummyRows } : { queryId, dimension, metric }
            );
            setFinalYaml(yamlStr);
            setStep(3);
        }
    };

    const handlePublish = () => {
        onPublish({
            type: chartType === 'custom_yaml' ? 'yaml_custom' : (chartType === 'ai_agent' ? 'yaml_ai' : 'yaml_generated'),
            title: title || 'Custom Chart',
            config_ref: finalYaml,
            status: 'published' // draft/published logic per user role can be handled here or backend
        });
        resetAndClose();
    };

    const resetAndClose = () => {
        setStep(1);
        setChartType(null);
        setDataSource('dummy');
        onClose();
    };

    // Sub-components for Steps
    const Step1 = () => (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 text-center mb-6">Choose Chart Type</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <button onClick={() => handleSelectType('bar_chart')} className="flex flex-col items-center justify-center p-6 border-2 border-gray-100 hover:border-blue-500 rounded-xl hover:bg-blue-50 transition-colors group">
                    <BarChart3 size={32} className="text-gray-400 group-hover:text-blue-500 mb-3" />
                    <span className="font-medium text-gray-700">Bar Chart</span>
                </button>
                <button onClick={() => handleSelectType('line_chart')} className="flex flex-col items-center justify-center p-6 border-2 border-gray-100 hover:border-blue-500 rounded-xl hover:bg-blue-50 transition-colors group">
                    <LineChart size={32} className="text-gray-400 group-hover:text-blue-500 mb-3" />
                    <span className="font-medium text-gray-700">Line Chart</span>
                </button>
                <button onClick={() => handleSelectType('donut_chart')} className="flex flex-col items-center justify-center p-6 border-2 border-gray-100 hover:border-blue-500 rounded-xl hover:bg-blue-50 transition-colors group">
                    <PieChart size={32} className="text-gray-400 group-hover:text-blue-500 mb-3" />
                    <span className="font-medium text-gray-700">Donut Chart</span>
                </button>
                <button onClick={() => handleSelectType('custom_yaml')} className="flex flex-col items-center justify-center p-6 border-2 border-gray-100 hover:border-purple-500 rounded-xl hover:bg-purple-50 transition-colors group md:col-span-1">
                    <FileCode2 size={32} className="text-gray-400 group-hover:text-purple-500 mb-3" />
                    <span className="font-medium text-gray-700">Custom YAML</span>
                </button>
                <button onClick={() => handleSelectType('ai_agent')} className="flex flex-col items-center justify-center p-6 border-2 border-transparent bg-gradient-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border-indigo-200 hover:border-indigo-500 rounded-xl transition-all group md:col-span-2">
                    <Sparkles size={32} className="text-indigo-400 group-hover:text-indigo-600 mb-3" />
                    <span className="font-medium text-indigo-900">Generate with AI Agent</span>
                    <span className="text-xs text-indigo-500 mt-1">Describe what you want to see</span>
                </button>
            </div>
        </div>
    );

    const Step2A = () => {
        const selectedQuery = catalogQueries.find(q => q.id === queryId);
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setStep(1)} className="text-gray-500 hover:text-gray-700 flex items-center text-sm font-medium">
                        <ArrowLeft size={16} className="mr-1" /> Back
                    </button>
                    <h3 className="text-lg font-medium text-gray-800">Quick Configuration</h3>
                    <div className="w-16"></div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chart Title</label>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded" placeholder="e.g. Sales by Region" />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Source</label>
                    <select value={dataSource} onChange={e => setDataSource(e.target.value)} className="w-full p-2 border border-gray-300 rounded">
                        <option value="dummy">Use Dummy Data (Preview only)</option>
                        <option value="catalog">Connect to Query Catalog</option>
                    </select>
                </div>

                {dataSource === 'catalog' && (
                    <div className="bg-blue-50 p-4 rounded border border-blue-100 space-y-3">
                        <div>
                            <label className="block text-xs font-semibold text-blue-800 mb-1">Select Query</label>
                            <select value={queryId} onChange={e => setQueryId(e.target.value)} className="w-full p-2 border border-blue-200 rounded text-sm">
                                <option value="">-- Choose a query --</option>
                                {catalogQueries.map(q => (
                                    <option key={q.id} value={q.id}>{q.id} - {q.description}</option>
                                ))}
                            </select>
                        </div>
                        {selectedQuery && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-blue-800 mb-1">Dimension (X-Axis/Label)</label>
                                    <input type="text" value={dimension} onChange={e => setDimension(e.target.value)} placeholder={`e.g. ${selectedQuery.response_fields?.dimension || 'category'}`} className="w-full p-2 border border-blue-200 rounded text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-blue-800 mb-1">Metric (Y-Axis/Value)</label>
                                    <input type="text" value={metric} onChange={e => setMetric(e.target.value)} placeholder={`e.g. ${selectedQuery.response_fields?.metric || 'revenue'}`} className="w-full p-2 border border-blue-200 rounded text-sm" />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {dataSource === 'dummy' && (
                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                        <label className="block text-xs font-semibold text-gray-600 mb-2">Dummy Rows</label>
                        {dummyRows.map((row, idx) => (
                            <div key={idx} className="flex gap-2 mb-2">
                                <input type="text" value={row.label} onChange={e => { const newRows = [...dummyRows]; newRows[idx].label = e.target.value; setDummyRows(newRows); }} className="flex-1 p-1 border rounded text-sm" placeholder="Label" />
                                <input type="text" value={row.value} onChange={e => { const newRows = [...dummyRows]; newRows[idx].value = e.target.value; setDummyRows(newRows); }} className="w-24 p-1 border rounded text-sm" placeholder="Value" />
                            </div>
                        ))}
                        <button onClick={() => setDummyRows([...dummyRows, {label: '', value: ''}])} className="text-xs text-blue-600 font-medium">+ Add Row</button>
                    </div>
                )}

                <div className="flex justify-end pt-4">
                    <button onClick={handleNextToPreview} disabled={!title || (dataSource === 'catalog' && (!queryId || !dimension || !metric))} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded font-medium disabled:opacity-50">
                        Generate Preview <ArrowRight size={16} className="ml-2" />
                    </button>
                </div>
            </div>
        );
    }

    const Step2B = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => setStep(1)} className="text-gray-500 hover:text-gray-700 flex items-center text-sm font-medium">
                    <ArrowLeft size={16} className="mr-1" /> Back
                </button>
                <h3 className="text-lg font-medium text-gray-800">Custom YAML</h3>
                <div className="w-16"></div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Paste or write YAML</label>
                <textarea
                    value={customYaml}
                    onChange={e => setCustomYaml(e.target.value)}
                    className="w-full h-64 p-3 border border-gray-300 rounded font-mono text-sm bg-gray-50"
                    placeholder="title: My Custom Chart&#10;template: custom_svg&#10;content_html: |&#10;  <svg>...</svg>"
                />
            </div>
            
            <div className="flex justify-end pt-4">
                <button onClick={handleNextToPreview} disabled={!customYaml.trim()} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded font-medium disabled:opacity-50">
                    Preview YAML <ArrowRight size={16} className="ml-2" />
                </button>
            </div>
        </div>
    );

    const Step2C = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => setStep(1)} className="text-gray-500 hover:text-gray-700 flex items-center text-sm font-medium">
                    <ArrowLeft size={16} className="mr-1" /> Back
                </button>
                <h3 className="text-lg font-medium text-gray-800">Generate with AI</h3>
                <div className="w-16"></div> {/* Spacer for centering */}
            </div>
            
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                    <Sparkles className="text-indigo-500 mt-0.5 shrink-0" size={20} />
                    <div>
                        <p className="text-sm text-indigo-900 font-medium">Describe your chart</p>
                        <p className="text-xs text-indigo-700 mt-1">Our AI will pick the best template and connect it to the right data source automatically.</p>
                    </div>
                </div>
            </div>

            {aiError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded text-sm">
                    {aiError}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Prompt</label>
                <textarea
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    placeholder="e.g., Show me the revenue trend over time, or I want to see the composition of sales by region."
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                    disabled={aiGenerating}
                />
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={handleNextToPreview}
                    disabled={!aiPrompt.trim() || aiGenerating}
                    className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium disabled:opacity-50 transition-colors"
                >
                    {aiGenerating ? (
                        <>
                            <Loader2 size={16} className="animate-spin mr-2" />
                            AI is Thinking...
                        </>
                    ) : (
                        <>
                            Generate Chart <Sparkles size={16} className="ml-2" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );

    const Step3 = () => (
        <div className="space-y-4 flex flex-col h-[500px]">
            <div className="flex items-center justify-between mb-4">
                <button onClick={() => setStep(2)} className="text-gray-500 hover:text-gray-700 flex items-center text-sm font-medium">
                    <ArrowLeft size={16} className="mr-1" /> Back to Edit
                </button>
                <h3 className="text-lg font-medium text-gray-800">Preview</h3>
                <div className="w-16"></div> {/* Spacer */}
            </div>
            
            <div className="flex-1 bg-gray-100 rounded-lg border border-gray-200 p-6 flex flex-col min-h-0 relative">
                <ChartRenderer configRef={finalYaml} className="w-full h-full shadow-sm" />
            </div>

            <div className="flex justify-end pt-4 gap-2 shrink-0">
                <button onClick={resetAndClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium transition-colors">
                    Cancel
                </button>
                <button onClick={handlePublish} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors shadow-sm">
                    Publish Chart
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50 shrink-0">
                    <h2 className="text-lg font-semibold text-gray-800">Add New Chart</h2>
                    <button onClick={resetAndClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    {step === 1 && <Step1 />}
                    {step === 2 && (chartType === 'custom_yaml' ? <Step2B /> : chartType === 'ai_agent' ? <Step2C /> : <Step2A />)}
                    {step === 3 && <Step3 />}
                </div>
            </div>
        </div>
    );
}
