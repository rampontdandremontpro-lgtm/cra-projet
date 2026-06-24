import { NavLink, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';

import '../../styles/layout.css';

const menuByRole = {
  COLLABORATEUR: [
    { label: 'Tableau de bord', path: '/dashboard' },
    { label: 'Mes CRA', path: '/mes-cra' },
    { label: 'Nouveau CRA', path: '/nouveau-cra' },
  ],

  CLIENT: [
    { label: 'Tableau de bord', path: '/client/dashboard' },
    { label: 'CRA à valider', path: '/client/cra-a-valider' },
    { label: 'Historique', path: '/client/historique' },
  ],

  RH: [
    { label: 'Tableau de bord RH', path: '/rh/dashboard' },
    { label: 'Collaborateurs', path: '/rh/collaborateurs' },
    { label: 'Clients', path: '/rh/clients' },
    { label: 'Affectations', path: '/rh/affectations' },
  ],

  ADMIN: [
    { label: 'Tableau de bord Admin', path: '/admin/dashboard' },
    { label: 'Utilisateurs', path: '/admin/utilisateurs' },
    { label: 'Clients', path: '/admin/clients' },
    { label: 'Jours fériés', path: '/admin/jours-feries' },
    { label: 'Statistiques', path: '/admin/statistiques' },
  ],
};

const roleLabels = {
  COLLABORATEUR: 'COLLABORATEUR',
  CLIENT: 'CLIENT',
  RH: 'RH',
  ADMIN: 'ADMIN',
};

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const menuItems = menuByRole[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-icon">📄</div>

        <div>
          <h2>CRA Manager</h2>
          <p>Gestion CRA</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? 'sidebar-link active' : 'sidebar-link'
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-user">
        <strong>
          {user?.prenom} {user?.nom}
        </strong>

        <span>{roleLabels[user?.role] || user?.role}</span>

        <button type="button" onClick={handleLogout}>
          Déconnexion
        </button>
      </div>
    </aside>
  );
}