import { BrowserRouter, Routes, Route } from 'react-router-dom';

import LoginPage from './pages/auth/LoginPage';

import DashboardPage from './pages/collab/DashboardPage';
import CraListPage from './pages/collab/CraListPage';
import CraCreatePage from './pages/collab/CraCreatePage';
import CraDetailPage from './pages/collab/CraDetailPage';

import ProtectedRoute from './router/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['COLLABORATEUR']}><DashboardPage /></ProtectedRoute>}/>
        <Route path="/mes-cra" element={<ProtectedRoute allowedRoles={['COLLABORATEUR']}><CraListPage /></ProtectedRoute>}/>
        <Route path="/nouveau-cra" element={<ProtectedRoute allowedRoles={['COLLABORATEUR']}><CraCreatePage /></ProtectedRoute>}/>
        <Route path="/mes-cra/:id" element={<ProtectedRoute allowedRoles={['COLLABORATEUR']}><CraDetailPage /></ProtectedRoute>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;