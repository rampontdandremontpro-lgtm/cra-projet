import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            isActive ? 'sidebar-link active' : 'sidebar-link'
          }
        >
          Tableau de bord
        </NavLink>

        <NavLink
          to="/mes-cra"
          className={({ isActive }) =>
            isActive ? 'sidebar-link active' : 'sidebar-link'
          }
        >
          Mes CRA
        </NavLink>

        <NavLink
          to="/nouveau-cra"
          className={({ isActive }) =>
            isActive ? 'sidebar-link active' : 'sidebar-link'
          }
        >
          Nouveau CRA
        </NavLink>
      </nav>

      <div className="sidebar-user">
        <strong>
          {user?.prenom} {user?.nom}
        </strong>

        <span>{user?.role}</span>

        <button onClick={handleLogout}>
          Déconnexion
        </button>
      </div>
    </aside>
  );
}