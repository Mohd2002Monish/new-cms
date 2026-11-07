import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from './app/store.js';
import { queryClient } from './app/queryClient.js';
import { bootstrapSession } from './features/auth/authSlice.js';
import { initAdminGtm } from './utils/gtm.js';

import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';

import Login from './pages/Login.jsx';
import OTPVerify from './pages/OTPVerify.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PostList from './pages/PostList.jsx';
import PostEditor from './pages/PostEditor.jsx';
import Categories from './pages/Categories.jsx';
import EmployeesPage from './pages/EmployeesPage.jsx';
import ReadersPage from './pages/ReadersPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import Permissions from './pages/Permissions.jsx';
import AuditLogs from './pages/AuditLogs.jsx';
import RateLimits from './pages/RateLimits.jsx';
import Notifications from './pages/Notifications.jsx';
import MediaLibraryPage from './pages/MediaLibraryPage.jsx';
import Reports from './pages/Reports.jsx';
import SliderManager from './pages/SliderManager.jsx';
import ChatPage from './pages/ChatPage.jsx';

// ─── Inner component that runs bootstrap after store is available ─────────────
function AppRoutes() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(bootstrapSession());
    initAdminGtm();
  }, [dispatch]);

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/verify-otp" element={<OTPVerify />} />

      {/* Protected app routes under shared Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />

        {/* Posts */}
        <Route path="posts" element={<PostList />} />
        <Route path="posts/new" element={<PostEditor />} />
        <Route path="posts/:id" element={<PostEditor />} />

        {/* Media Library */}
        <Route path="media" element={<MediaLibraryPage />} />

        {/* Newsroom Chat */}
        <Route path="chat" element={<ChatPage />} />

        {/* Categories – Admin only */}
        <Route
          path="categories"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Categories />
            </ProtectedRoute>
          }
        />

        {/* Slider Manager - Admin only */}
        <Route
          path="admin/slider"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SliderManager />
            </ProtectedRoute>
          }
        />

        {/* Staff & Employees – Admin & Manager */}
        <Route
          path="employees"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />

        {/* Portal Users & Readers – Admin & Manager */}
        <Route
          path="readers"
          element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <ReadersPage />
            </ProtectedRoute>
          }
        />

        {/* Backwards compatibility for /users */}
        <Route path="users" element={<Navigate to="/employees" replace />} />

        {/* Settings – Admin only */}
        <Route
          path="admin/settings"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Permissions – Admin only */}
        <Route
          path="users/:userId/permissions"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Permissions />
            </ProtectedRoute>
          }
        />

        {/* Audit Logs – Admin only */}
        <Route
          path="admin/audit-logs"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AuditLogs />
            </ProtectedRoute>
          }
        />

        {/* Reports & Analytics – Admin only */}
        <Route
          path="admin/reports"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Reports />
            </ProtectedRoute>
          }
        />

        {/* Notifications */}
        <Route path="notifications" element={<Notifications />} />

        {/* Rate Limits – Admin only */}
        <Route
          path="admin/rate-limits"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <RateLimits />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppRoutes />
        </Router>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
