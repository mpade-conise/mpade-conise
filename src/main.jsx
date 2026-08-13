import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { LanguageProvider } from './context/LanguageContext' // Import the provider
import { ThemeProvider } from './context/ThemeContext';

// --- GLOBAL WEBRTC CONFIGURATION INJECTION ---
// This prevents ReferenceErrors across all minified production chunks (like VW)
window.webrtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

// Double insurance for advanced module systems or bundler micro-scopes
if (typeof globalThis !== 'undefined') {
  globalThis.webrtcConfig = window.webrtcConfig;
}
// ---------------------------------------------

// Service worker registration for global incoming call notifications
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', async () => {
    try {
      const res = await fetch('/sw.js', { method: 'HEAD' });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('javascript')) {
        await navigator.serviceWorker.register('/sw.js');
      } else {
        console.info("ServiceWorker /sw.js not served as application/javascript, registration skipped.");
      }
    } catch (err) {
      console.warn("ServiceWorker registration skipped:", err.message || err);
    }
  });
}

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>
);
