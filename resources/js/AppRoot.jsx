import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import PageManager from './pages/PageManager.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function AppRoutes() {
    const { user, loading } = useContext(AuthContext);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#EEF2FA]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-600 font-medium text-sm">Loading Dashboard United...</span>
                </div>
            </div>
        );
    }

    return (
        <BrowserRouter>
            <Routes>
                <Route 
                    path="/login" 
                    element={user ? <Navigate to="/" replace /> : <Login />} 
                />
                
                <Route element={<ProtectedRoute user={user} />}>
                    <Route path="/" element={<PageManager />} />
                </Route>
                
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default function AppRoot() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    );
}
