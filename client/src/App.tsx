import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import Home from './pages/Home';
import { Toaster } from './components/ui/toaster';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<div>404: Not Found</div>} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </Router>
  );
}
