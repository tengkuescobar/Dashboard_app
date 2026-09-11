import React from 'react';
import useChartData from '../hooks/useChartData.js';
import BarChartTemplate from './charts/BarChartTemplate.jsx';
import LineChartTemplate from './charts/LineChartTemplate.jsx';
import DonutChartTemplate from './charts/DonutChartTemplate.jsx';

export default function ChartRenderer({ configRef, className }) {
    const { loading, error, data, config } = useChartData(configRef);

    if (loading) {
        return (
            <div className={`flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg ${className || ''}`}>
                <div className="flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 text-sm font-medium">Loading Data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`flex items-center justify-center bg-red-50 border-2 border-dashed border-red-200 rounded-lg p-4 ${className || ''}`}>
                <div className="text-center">
                    <p className="text-red-500 text-sm font-bold">Error Loading Chart</p>
                    <p className="text-red-400 text-xs mt-1">{error}</p>
                </div>
            </div>
        );
    }

    if (!config) {
        return (
            <div className={`flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg ${className || ''}`}>
                <div className="text-center">
                    <p className="text-gray-500 text-sm font-medium">No Configuration</p>
                </div>
            </div>
        );
    }

    const renderChart = () => {
        if (!data || data.length === 0) {
            return (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm bg-gray-50 m-4 rounded border border-dashed border-gray-200">
                    No data to display
                </div>
            );
        }

        switch (config.template) {
            case 'bar_chart':
                return <BarChartTemplate data={data} />;
            case 'line_chart':
                return <LineChartTemplate data={data} />;
            case 'donut_chart':
                return <DonutChartTemplate data={data} />;
            default:
                return (
                    <div className="flex-1 p-3 overflow-auto bg-gray-900 m-4 rounded">
                        <p className="text-yellow-400 text-xs mb-2">Unsupported template: {config.template}. Raw data:</p>
                        <pre className="text-xs text-green-400 m-0 font-mono">
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    </div>
                );
        }
    };

    return (
        <div className={`flex flex-col w-full h-full bg-white border border-gray-200 rounded-lg overflow-hidden ${className || ''}`}>
            <div className="px-4 py-3 border-b border-gray-100 bg-white">
                <h4 className="font-semibold text-gray-800 text-sm">{config.title || 'Untitled Chart'}</h4>
                {config.data_source && (
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">
                        Source: {config.data_source.type}
                    </p>
                )}
            </div>
            <div className="flex-1 min-h-0 relative">
                {renderChart()}
            </div>
        </div>
    );
}
