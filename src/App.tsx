import React, { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SiteNav from './components/Navigation/SiteNav';
import Hero from './components/Hero/Hero';
import Skills from './components/Skills/Skills';
import Mission from './components/Mission/Mission';
import CallToAction from './components/CallToAction/CallToAction';
import Community from './components/Community/Community';
import Contact from './components/Contact/Contact';
import SignUpPage from './pages/SignUpPage';
import SignInPage from './pages/SignInPage';
import DashboardPage from './pages/DashboardPage';
import AppPage from './pages/AppPage';

const HomePage = () => (
  <>
    <Hero />
    <Skills />
    <Mission />
    <CallToAction />
    <Community />
    <Contact />
  </>
);

const AuthRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLoading, setShowLoading] = React.useState(true);

  useEffect(() => {
    if (!loading && user && (location.pathname === '/sign-in' || location.pathname === '/sign-up')) {
      navigate('/app', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  useEffect(() => {
    // Don't show loading spinner indefinitely - max 1 second
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 1000);

    if (!loading) {
      setShowLoading(false);
    }

    return () => clearTimeout(timer);
  }, [loading]);

  if (loading && showLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};

function App() {
  return (
    <div className="bg-black text-white overflow-x-hidden">
      <Routes>
        <Route path="/" element={
          <>
            <SiteNav />
            <HomePage />
          </>
        } />
        <Route path="/sign-up" element={
          <AuthRedirect>
            <SignUpPage />
          </AuthRedirect>
        } />
        <Route path="/sign-in" element={
          <AuthRedirect>
            <SignInPage />
          </AuthRedirect>
        } />
        <Route path="/dashboard" element={
          <>
            <SiteNav />
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          </>
        } />
        <Route path="/app" element={
          <ProtectedRoute>
            <AppPage />
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
}

export default App;