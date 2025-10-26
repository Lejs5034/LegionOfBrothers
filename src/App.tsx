import React from 'react';
import { Routes, Route } from 'react-router-dom';
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
import ChatPage from './pages/ChatPage';

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
function App() {
  return (
    <div className="bg-black text-white overflow-x-hidden">
      <SiteNav />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    </div>
  );
}

export default App;