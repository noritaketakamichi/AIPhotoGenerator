import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* Add other routes here */}
          <Route path="*" element={<div>404: Not Found</div>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
