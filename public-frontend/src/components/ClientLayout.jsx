'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import AuthModal from './AuthModal';
import ReactQueryProvider from './ReactQueryProvider';

export default function ClientLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ReactQueryProvider>
      <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="app-layout" style={{ flex: 1 }}>
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        
        <div className="app-main">
          <Header toggleSidebar={() => setSidebarOpen(true)} />
          
          <main id="main-content" className="app-content">
            {children}
          </main>
        </div>
      </div>
      
      <AuthModal />
    </div>
    </ReactQueryProvider>
  );
}
