import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { UserStoriesPage } from './pages/UserStoriesPage';
import { UserStoryDetailPage } from './pages/UserStoryDetailPage';
import { ExecutionsPage } from './pages/ExecutionsPage';
import { ExecuteTestPage } from './pages/ExecuteTestPage';
import { TestCasesPage } from './pages/TestCasesPage';
import { AIGeneratorPage } from './pages/AIGeneratorPage';
import { ExecutionDetailPage } from './pages/ExecutionDetailPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f7fb' }}>
          <Sidebar />
          <div style={{ marginLeft: '240px', width: 'calc(100% - 240px)', minHeight: '100vh' }}>
            <Topbar />
            <main>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:projectId/user-stories" element={<UserStoriesPage />} />
                <Route path="/projects/:projectId/user-stories/:id" element={<UserStoryDetailPage />} />
                <Route path="/user-stories" element={<UserStoriesPage />} />
                <Route path="/user-stories/:id" element={<UserStoryDetailPage />} />
                <Route path="/executions" element={<ExecutionsPage />} />
                <Route path="/executions/:id" element={<ExecutionDetailPage />} />
                <Route path="/execute-test" element={<ExecuteTestPage />} />
                <Route path="/cases" element={<TestCasesPage />} />
                <Route path="/ai-generator" element={<AIGeneratorPage />} />
                <Route path="/incidents" element={<IncidentsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
