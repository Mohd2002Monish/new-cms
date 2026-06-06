'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import AuthModal from './AuthModal';

export default function ClientLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      
      <div className="app-main">
        <Header toggleSidebar={() => setSidebarOpen(true)} />
        
        <main id="main-content" className="app-content">
          {children}
        </main>
        
        <div style={{ marginTop: 'auto' }}>
          <Footer />
        </div>
      </div>
      
      <AuthModal />
    </div>
  );
}
