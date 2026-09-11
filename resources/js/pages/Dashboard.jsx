import React, { useContext, useState } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext.jsx';
import { Settings } from 'lucide-react';
import SettingsModal from '../components/SettingsModal.jsx';

export default function Dashboard() {
    const { user, setUser } = useContext(AuthContext);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await axios.post('/api/logout');
            setUser(null);
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    return (
        <div className="min-h-screen bg-[#EEF2FA] p-8">
            <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Dashboard United</h1>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setIsSettingsModalOpen(true)}
                            className="p-2 text-gray-500 hover:text-gray-700 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                            title="Settings (BYOK)"
                        >
                            <Settings size={20} />
                        </button>
                        <button 
                            onClick={handleLogout}
                            className="px-4 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>
                
                <div className="p-4 bg-blue-50 rounded text-blue-800">
                    <p className="font-medium">Welcome back, {user?.name}!</p>
                    <p className="text-sm mt-1">Role: {user?.role}</p>
                </div>

                <div className="mt-8 text-gray-500">
                    <p>This is the placeholder dashboard. Other pages will be added here in future phases.</p>
                </div>
            </div>
        </div>
    );
}
