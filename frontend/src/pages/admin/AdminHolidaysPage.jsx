// src/pages/admin/AdminHolidaysPage.jsx
import Sidebar from '../../components/layout/Sidebar';

export default function AdminHolidaysPage() {
  return (
    <div className="dashboard-page">
      <Sidebar />
      <main className="dashboard-content">
        <h1>Gestion jours fériés</h1>
      </main>
    </div>
  );
}