import './bootstrap';
import '../css/app.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import AppRoot from './AppRoot.jsx';

const container = document.getElementById('app');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <AppRoot />
        </React.StrictMode>
    );
} else {
    console.error("Target container '#app' not found in DOM");
}
