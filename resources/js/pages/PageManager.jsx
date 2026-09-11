import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar.jsx';
import PageCanvas from '../components/PageCanvas.jsx';

export default function PageManager() {
    const [pages, setPages] = useState([]);
    const [activePageId, setActivePageId] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchPages = async () => {
        try {
            const response = await axios.get('/api/pages');
            setPages(response.data);
            if (response.data.length > 0 && !activePageId) {
                setActivePageId(response.data[0].id);
            } else if (response.data.length === 0) {
                setActivePageId(null);
            }
        } catch (error) {
            console.error('Error fetching pages', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPages();
    }, []);

    const activePage = pages.find(p => p.id === activePageId);

    const handleCreatePage = async () => {
        try {
            const newName = `New Page ${pages.length + 1}`;
            const response = await axios.post('/api/pages', { name: newName });
            setPages([...pages, response.data]);
            setActivePageId(response.data.id);
        } catch (error) {
            console.error('Error creating page', error);
        }
    };

    const handleDeletePage = async (id) => {
        try {
            await axios.delete(`/api/pages/${id}`);
            const updatedPages = pages.filter(p => p.id !== id);
            setPages(updatedPages);
            if (activePageId === id) {
                setActivePageId(updatedPages.length > 0 ? updatedPages[0].id : null);
            }
        } catch (error) {
            console.error('Error deleting page', error);
        }
    };

    const handleRenamePage = async (id, newName) => {
        try {
            const response = await axios.put(`/api/pages/${id}`, { name: newName });
            setPages(pages.map(p => p.id === id ? response.data : p));
        } catch (error) {
            console.error('Error renaming page', error);
        }
    };

    const handleReorder = async (newPagesArray) => {
        setPages(newPagesArray);
        try {
            const payload = newPagesArray.map((p, index) => ({ id: p.id, order: index }));
            await axios.post('/api/pages/reorder', { pages: payload });
        } catch (error) {
            console.error('Error reordering pages', error);
            // Optionally, revert on error
            fetchPages();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#EEF2FA]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#EEF2FA] overflow-hidden">
            <Sidebar 
                pages={pages} 
                activePageId={activePageId} 
                onSelectPage={setActivePageId} 
                onCreatePage={handleCreatePage}
                onReorder={handleReorder}
            />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden p-4 lg:p-8">
                {activePage ? (
                    <PageCanvas 
                        page={activePage} 
                        onRename={(name) => handleRenamePage(activePage.id, name)}
                        onDelete={() => handleDeletePage(activePage.id)}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100">
                        <div className="text-center text-gray-400">
                            <p className="mb-4">No pages yet.</p>
                            <button 
                                onClick={handleCreatePage}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Create First Page
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
