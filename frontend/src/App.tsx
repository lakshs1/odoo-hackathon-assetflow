import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { CommandPalette } from './components/CommandPalette';
import { SettingsModal } from './components/SettingsModal';
import { CustomizeModal } from './components/CustomizeModal';
import { ThemeBackgroundGraphics } from './components/ThemeBackgroundGraphics';

// Views
import { DashboardView } from './components/views/DashboardView';
import { AssetDirectoryView } from './components/views/AssetDirectoryView';
import { AllocationView } from './components/views/AllocationView';
import { BookingView } from './components/views/BookingView';
import { MaintenanceView } from './components/views/MaintenanceView';
import { AuditView } from './components/views/AuditView';
import { ReportsView } from './components/views/ReportsView';
import { OrgSetupView } from './components/views/OrgSetupView';

function AppContent() {
  const { currentRole, preset } = useApp();
  const [activeView, setActiveView] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);

  // Auto-redirect if role changes and active view isn't allowed
  useEffect(() => {
    if (activeView === 'setup' && currentRole !== 'Admin') {
      setActiveView('dashboard');
    }
    if (activeView === 'analytics' && currentRole === 'Employee') {
      setActiveView('dashboard');
    }
  }, [currentRole, activeView]);

  // Global keydown listeners for shortcuts
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K to toggle command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView 
            setActiveView={setActiveView}
            onRegisterAssetClick={() => setShowRegisterModal(true)}
            onBookResourceClick={() => setActiveView('bookings')} // redirect to calendar for best UX
            onRaiseMaintenanceClick={() => setActiveView('maintenance')} // redirect to kanban
          />
        );
      case 'assets':
        return (
          <AssetDirectoryView 
            onRegisterClick={() => setShowRegisterModal(true)}
            showRegisterModal={showRegisterModal}
            onCloseRegisterModal={() => setShowRegisterModal(false)}
          />
        );
      case 'allocations':
        return <AllocationView />;
      case 'bookings':
        return <BookingView />;
      case 'maintenance':
        return <MaintenanceView />;
      case 'audits':
        return <AuditView />;
      case 'analytics':
        return <ReportsView />;
      case 'setup':
        return <OrgSetupView />;
      default:
        return <DashboardView 
          setActiveView={setActiveView}
          onRegisterAssetClick={() => setShowRegisterModal(true)}
          onBookResourceClick={() => setActiveView('bookings')}
          onRaiseMaintenanceClick={() => setActiveView('maintenance')}
        />;
    }
  };

  return (
    <div className={`app-container preset-${preset}`}>
      <ThemeBackgroundGraphics />
      {/* Sidebar Navigation */}
      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        openSettings={() => setShowSettings(true)}
        openCustomize={() => setShowCustomize(true)}
      />

      {/* Main View Panel */}
      <div className="main-content">
        <Header 
          onSearchClick={() => setShowCommandPalette(true)} 
          activeView={activeView}
        />
        {renderActiveView()}
      </div>

      {/* Command Palette */}
      <CommandPalette 
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        setActiveView={setActiveView}
        onRegisterAssetClick={() => {
          setActiveView('assets');
          setShowRegisterModal(true);
        }}
      />

      {/* Supabase Linkage Settings Modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {/* Theme Customizer Modal */}
      {showCustomize && (
        <CustomizeModal onClose={() => setShowCustomize(false)} />
      )}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
