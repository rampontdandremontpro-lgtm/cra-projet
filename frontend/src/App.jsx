import { BrowserRouter, Routes, Route } from 'react-router-dom';

import LoginPage from './pages/auth/LoginPage';

import DashboardPage from './pages/collab/DashboardPage';
import CraListPage from './pages/collab/CraListPage';
import CraCreatePage from './pages/collab/CraCreatePage';
import CraDetailPage from './pages/collab/CraDetailPage';

import ClientDashboardPage from './pages/client/ClientDashboardPage';
import ClientCraValidationPage from './pages/client/ClientCraValidationPage';
import ClientCraDetailPage from './pages/client/ClientCraDetailPage';

import RhDashboardPage from './pages/rh/RhDashboardPage';
import RhCollaboratorsPage from './pages/rh/RhCollaboratorsPage';
import RhClientsPage from './pages/rh/RhClientsPage';
import RhAssignmentsPage from './pages/rh/RhAssignmentsPage';

import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminClientsPage from './pages/admin/AdminClientsPage';
import AdminHolidaysPage from './pages/admin/AdminHolidaysPage';
import AdminStatsPage from './pages/admin/AdminStatsPage';

import ProtectedRoute from './router/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['COLLABORATEUR']}><DashboardPage /></ProtectedRoute>} />
        <Route path="/mes-cra" element={<ProtectedRoute allowedRoles={['COLLABORATEUR']}><CraListPage /></ProtectedRoute>} />
        <Route path="/nouveau-cra" element={<ProtectedRoute allowedRoles={['COLLABORATEUR']}><CraCreatePage /></ProtectedRoute>} />
        <Route path="/mes-cra/:id" element={<ProtectedRoute allowedRoles={['COLLABORATEUR']}><CraDetailPage /></ProtectedRoute>} />
        <Route path="/client/dashboard" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientDashboardPage /></ProtectedRoute>} />
        <Route path="/client/cra-a-valider" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientCraValidationPage /></ProtectedRoute>} />
        <Route path="/client/cra/:id" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientCraDetailPage /></ProtectedRoute>} />
        <Route path="/rh/dashboard" element={<ProtectedRoute allowedRoles={['RH']}><RhDashboardPage /></ProtectedRoute>} />
        <Route path="/rh/collaborateurs" element={<ProtectedRoute allowedRoles={['RH']}><RhCollaboratorsPage /></ProtectedRoute>} />
        <Route path="/rh/clients" element={<ProtectedRoute allowedRoles={['RH']}><RhClientsPage /></ProtectedRoute>} />
        <Route path="/rh/affectations" element={<ProtectedRoute allowedRoles={['RH']}><RhAssignmentsPage /></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboardPage /></ProtectedRoute>} />
        <Route path="/admin/utilisateurs" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminUsersPage /></ProtectedRoute>} />
        <Route path="/admin/clients" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminClientsPage /></ProtectedRoute>} />
        <Route path="/admin/jours-feries" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminHolidaysPage /></ProtectedRoute>} />
        <Route path="/admin/statistiques" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminStatsPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
