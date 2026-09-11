import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Trash2, Edit2, Check, X, Plus } from 'lucide-react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import ChartCard from './ChartCard.jsx';
import AddChartModal from './AddChartModal.jsx';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext.jsx';

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function PageCanvas({ page, onRename, onDelete }) {
    const { user } = useContext(AuthContext);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState(page.name);
    const [charts, setCharts] = useState(page.charts || []);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Reset local state when page changes
    useEffect(() => {
        setEditName(page.name);
        setIsEditingName(false);
        setCharts(page.charts || []);
        setIsModalOpen(false);
    }, [page]);

    const handleRenameSubmit = () => {
        if (editName.trim() && editName.trim() !== page.name) {
            onRename(editName.trim());
        } else {
            setEditName(page.name);
        }
        setIsEditingName(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleRenameSubmit();
        } else if (e.key === 'Escape') {
            setEditName(page.name);
            setIsEditingName(false);
        }
    };

    const saveChartsToBackend = async (updatedCharts) => {
        try {
            await axios.put(`/api/pages/${page.id}`, { charts: updatedCharts });
        } catch (error) {
            console.error('Failed to save layout', error);
        }
    };

    const handlePublishChart = (chartConfig) => {
        const newChart = {
            id: `chart_${Date.now()}`,
            title: chartConfig.title,
            type: chartConfig.type,
            status: chartConfig.status,
            config_ref: chartConfig.config_ref,
            i: `chart_${Date.now()}`,
            x: (charts.length * 4) % 12,
            y: Infinity, // puts it at the bottom
            w: 6,
            h: 4
        };
        const updatedCharts = [...charts, newChart];
        setCharts(updatedCharts);
        saveChartsToBackend(updatedCharts);
    };

    const handleDeleteChart = (id) => {
        const updatedCharts = charts.filter(c => c.id !== id);
        setCharts(updatedCharts);
        saveChartsToBackend(updatedCharts);
    };

    const onLayoutChange = (currentLayout) => {
        // currentLayout is an array of objects {i, x, y, w, h}
        // we merge this with our charts array to keep titles/types intact
        const updatedCharts = charts.map(chart => {
            const layoutItem = currentLayout.find(l => l.i === chart.id);
            if (layoutItem) {
                return { ...chart, x: layoutItem.x, y: layoutItem.y, w: layoutItem.w, h: layoutItem.h };
            }
            return chart;
        });
        
        // Only save if things actually changed position/size to avoid too many requests
        // A deep comparison could be done, but for now we just save
        setCharts(updatedCharts);
        saveChartsToBackend(updatedCharts);
    };

    // Filter charts for rendering: viewers cannot see 'draft' charts
    const visibleCharts = useMemo(() => {
        return charts.filter(chart => {
            if (chart.status === 'draft') {
                return user?.role === 'admin' || user?.role === 'editor';
            }
            return true;
        });
    }, [charts, user]);

    return (
        <div className="flex-1 flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            {/* Canvas Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    {isEditingName ? (
                        <div className="flex items-center gap-2">
                            <input
                                autoFocus
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-lg text-gray-800"
                            />
                            <button onClick={handleRenameSubmit} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                <Check size={18} />
                            </button>
                            <button onClick={() => { setEditName(page.name); setIsEditingName(false); }} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group">
                            <h1 className="text-xl font-bold text-gray-800">{page.name}</h1>
                            <button 
                                onClick={() => setIsEditingName(true)}
                                className="p-1 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-blue-600 transition-all rounded"
                                title="Rename page"
                            >
                                <Edit2 size={16} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors text-sm font-medium shadow-sm"
                    >
                        <Plus size={16} />
                        <span>Add Chart</span>
                    </button>
                    <div className="w-px h-6 bg-gray-200"></div>
                    <button 
                        onClick={() => {
                            if (confirm(`Are you sure you want to delete "${page.name}"?`)) {
                                onDelete();
                            }
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                        <Trash2 size={16} />
                        <span className="hidden sm:inline">Delete Page</span>
                    </button>
                </div>
            </div>

            {/* Canvas Body with Grid Layout */}
            <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6 relative">
                {visibleCharts.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center text-gray-400">
                            <p className="mb-2">Canvas is empty</p>
                            <p className="text-sm">Click "Add Chart" to start building your dashboard</p>
                        </div>
                    </div>
                ) : null}

                <ResponsiveGridLayout
                    className="layout"
                    layouts={{ lg: visibleCharts }}
                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                    cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                    rowHeight={100}
                    onLayoutChange={onLayoutChange}
                    draggableHandle=".drag-handle"
                    containerPadding={[0, 0]}
                    margin={[20, 20]}
                >
                    {visibleCharts.map((chart) => (
                        <div key={chart.id} data-grid={{ i: chart.id, x: chart.x, y: chart.y, w: chart.w, h: chart.h, minW: 2, minH: 2 }}>
                            <ChartCard 
                                chart={chart} 
                                onDelete={handleDeleteChart} 
                            />
                        </div>
                    ))}
                </ResponsiveGridLayout>
            </div>
            
            <AddChartModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onPublish={handlePublishChart}
            />
        </div>
    );
}
