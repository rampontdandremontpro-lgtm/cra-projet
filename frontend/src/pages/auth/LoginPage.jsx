import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { loginUser } from '../../services/authApi';
import { useAuth } from '../../context/AuthContext';
import { getDashboardPathByRole } from '../../utils/roleRedirect';

import '../../styles/auth.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response = await loginUser(form.email, form.password);

      login(response.user, response.access_token);

      navigate(getDashboardPathByRole(response.user.role));
    } catch (err) {
      console.error(err);
      setError('Email ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">📄</div>

          <div>
            <h1>CRA Manager</h1>
            <p>Gestion des Comptes-Rendus d’Activité</p>
          </div>
        </div>

        <div className="auth-header">
          <h2>Connexion</h2>
          <p>Connectez-vous pour accéder à votre espace CRA.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              name="email"
              placeholder="exemple@gmes.fr"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Mot de passe
            <input
              type="password"
              name="password"
              placeholder="Votre mot de passe"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Connexion...' : 'Connexion'}
          </button>
        </form>
      </section>
    </main>
  );
}