// client/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { TodayPage } from './pages/TodayPage';
import { TrendsPage } from './pages/TrendsPage';
import { SettingsPage } from './pages/SettingsPage';
import { PhotosPage } from './pages/PhotosPage';
import { AdminPage } from './pages/AdminPage';
import { Skeleton } from './components/Skeleton';

function AdminRoute() {
  const { user, token, isLoading } = useAuth();
  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-bg">
      <Skeleton className="w-32 h-8" />
    </div>
  );
  if (!token || !user?.isAdmin) return <Navigate to="/" replace />;
  return <AdminPage />;
}

function ProtectedRoutes() {
  const { token, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <Skeleton className="w-32 h-8" />
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/trends" element={<TrendsPage />} />
        <Route path="/photos" element={<PhotosPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/admin" element={<AdminRoute />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
