import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/collab/DashboardPage';
import CraListPage from './pages/collab/CraListPage';
import CraCreatePage from './pages/collab/CraCreatePage';
import CraDetailPage from './pages/collab/CraDetailPage';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/mes-cra" element={<CraListPage />} />
        <Route path="/nouveau-cra" element={<CraCreatePage />} />
        <Route path="/mes-cra/:id" element={<CraDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;