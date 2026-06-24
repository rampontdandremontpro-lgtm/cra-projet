// src/pages/admin/AdminClientsPage.jsx
import Sidebar from '../../components/layout/Sidebar';

export default function AdminClientsPage() {
  return (
    <div className="dashboard-page">
      <Sidebar />
      <main className="dashboard-content">
        <h1>Gestion clients</h1>
      </main>
    </div>
  );
}