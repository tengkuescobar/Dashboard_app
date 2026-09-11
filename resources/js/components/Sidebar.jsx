import React, { useContext } from 'react';
import { Plus, LayoutTemplate, LogOut } from 'lucide-react';
import { AuthContext } from '../context/AuthContext.jsx';
import axios from 'axios';

export default function Sidebar({ pages, activePageId, onSelectPage, onCreatePage, onReorder }) {
    const { user, setUser } = useContext(AuthContext);

    const handleLogout = async () => {
        try {
            await axios.post('/api/logout');
            setUser(null);
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    const movePageUp = (index) => {
        if (index === 0) return;
        const newPages = [...pages];
        const temp = newPages[index - 1];
        newPages[index - 1] = newPages[index];
        newPages[index] = temp;
        onReorder(newPages);
    };

    const movePageDown = (index) => {
        if (index === pages.length - 1) return;
        const newPages = [...pages];
        const temp = newPages[index + 1];
        newPages[index + 1] = newPages[index];
        newPages[index] = temp;
        onReorder(newPages);
    };

    return (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
            <div className="p-4 border-b border-gray-200 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-gray-800">Dashboard United</h2>
                    <button 
                        onClick={handleLogout}
                        className="p-1 hover:bg-red-50 rounded text-red-500 transition-colors"
                        title="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Pages</span>
                    <button 
                        onClick={onCreatePage}
                        className="p-1 hover:bg-gray-100 rounded text-blue-600 transition-colors"
                        title="Add new page"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
                {pages.length === 0 ? (
                    <div className="text-center text-sm text-gray-400 mt-4">
                        No pages yet
                    </div>
                ) : (
                    <div className="space-y-1">
                        {pages.map((page, index) => (
                            <div 
                                key={page.id}
                                className={`group flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                                    activePageId === page.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                                }`}
                                onClick={() => onSelectPage(page.id)}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <LayoutTemplate size={16} className={activePageId === page.id ? 'text-blue-500' : 'text-gray-400'} />
                                    <span className="truncate text-sm font-medium">{page.name}</span>
                                </div>
                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); movePageUp(index); }}
                                        disabled={index === 0}
                                        className="p-1 hover:bg-white rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Move Up"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); movePageDown(index); }}
                                        disabled={index === pages.length - 1}
                                        className="p-1 hover:bg-white rounded text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Move Down"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
