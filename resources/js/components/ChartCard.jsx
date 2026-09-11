import React, { forwardRef } from 'react';
import { Trash2, GripHorizontal } from 'lucide-react';
import ChartRenderer from './ChartRenderer.jsx';

const ChartCard = forwardRef(({ chart, onDelete, style, className, onMouseDown, onMouseUp, onTouchEnd, children, ...props }, ref) => {
    return (
        <div 
            ref={ref}
            style={{ ...style }}
            className={`bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden group ${className || ''}`}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onTouchEnd={onTouchEnd}
            {...props}
        >
            {/* Header / Drag Handle */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50 drag-handle cursor-move">
                <div className="flex items-center gap-2">
                    <GripHorizontal size={16} className="text-gray-400" />
                    <h3 className="font-semibold text-gray-700 text-sm">{chart.title || 'Untitled Chart'}</h3>
                    {chart.status === 'draft' && (
                        <span className="ml-2 px-2 py-0.5 text-[10px] uppercase font-bold bg-yellow-100 text-yellow-800 rounded">Draft</span>
                    )}
                </div>
                <button 
                    onMouseDown={(e) => e.stopPropagation()} // Prevent drag when clicking delete
                    onClick={() => onDelete(chart.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove chart"
                >
                    <Trash2 size={14} />
                </button>
            </div>
            
            {/* Body */}
            <div className="flex-1 p-2 flex flex-col bg-white overflow-hidden">
                <ChartRenderer configRef={chart.config_ref} className="h-full w-full" />
                {children}
            </div>
        </div>
    );
});

export default ChartCard;
