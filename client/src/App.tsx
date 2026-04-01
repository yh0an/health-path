import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { WeightPage } from './pages/WeightPage';
import { NutritionPage } from './pages/NutritionPage';
import { WaterPage } from './pages/WaterPage';
import { HealthPage } from './pages/HealthPage';
import { PhotosPage } from './pages/PhotosPage';
import { SuiviPage } from './pages/SuiviPage';
import { CalendarPage } from './pages/CalendarPage';
import { SettingsPage } from './pages/SettingsPage';
import { Skeleton } from './components/Skeleton';

function ProtectedRoutes() {
  const { token, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="w-32 h-8" />
      </div>
    );
  }
  if (!token) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/weight" element={<WeightPage />} />
        <Route path="/suivi" element={<SuiviPage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/nutrition" element={<NutritionPage />} />
        <Route path="/water" element={<WaterPage />} />
        <Route path="/photos" element={<PhotosPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
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
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
