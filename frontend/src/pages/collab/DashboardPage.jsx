import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../../components/layout/Sidebar';
import { getAllCra, getCraPdf } from '../../services/craApi';

import '../../styles/dashboard.css';

export default function DashboardPage() {
  const navigate = useNavigate();

  const [cras, setCras] = useState([]);
  const [loadingCra, setLoadingCra] = useState(true);

  useEffect(() => {
    loadCra();
  }, []);

  const loadCra = async () => {
    try {
      const data = await getAllCra();
      setCras(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCra(false);
    }
  };

  const handleViewCra = async (cra) => {
    if (cra.statut === 'BROUILLON') {
      navigate(`/mes-cra/${cra.id}`);
      return;
    }

    try {
      const pdfBlob = await getCraPdf(cra.id);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
    } catch (error) {
      console.error('Erreur PDF :', error);
      alert("Impossible d'ouvrir le PDF.");
    }
  };

  const brouillons = cras.filter((c) => c.statut === 'BROUILLON').length;
  const soumis = cras.filter((c) => c.statut === 'SOUMIS_CLIENT').length;

  const valides = cras.filter(
    (c) => c.statut === 'VALIDE_ADMIN' || c.statut === 'VALIDE_CLIENT'
  ).length;

  const refuses = cras.filter(
    (c) => c.statut === 'REFUSE_ADMIN' || c.statut === 'REFUSE_CLIENT'
  ).length;

  const getMonthName = (monthNumber) =>
    [
      '',
      'Janvier',
      'Février',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juillet',
      'Août',
      'Septembre',
      'Octobre',
      'Novembre',
      'Décembre',
    ][monthNumber];

  const getStatusLabel = (statut) => {
    const labels = {
      BROUILLON: 'Brouillon',
      SOUMIS_CLIENT: 'Soumis',
      VALIDE_CLIENT: 'Validé client',
      VALIDE_ADMIN: 'Validé admin',
      REFUSE_CLIENT: 'Refusé client',
      REFUSE_ADMIN: 'Refusé admin',
    };

    return labels[statut] || statut;
  };

  return (
    <div className="dashboard-page">
      <Sidebar />

      <main className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <h1>Tableau de bord</h1>
            <p>Bienvenue dans votre espace collaborateur.</p>
          </div>
        </header>

        <section className="dashboard-cards">
          <div className="dashboard-card">
            <span>CRA brouillons</span>
            <strong>{brouillons}</strong>
          </div>

          <div className="dashboard-card">
            <span>CRA soumis</span>
            <strong>{soumis}</strong>
          </div>

          <div className="dashboard-card">
            <span>CRA validés</span>
            <strong>{valides}</strong>
          </div>

          <div className="dashboard-card">
            <span>CRA refusés</span>
            <strong>{refuses}</strong>
          </div>
        </section>

        <section className="dashboard-panel cra-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-icon">📄</span>
              <h2>Mes derniers CRA</h2>
            </div>

            <button
              className="see-all-btn"
              onClick={() => navigate('/mes-cra')}
            >
              Voir tout →
            </button>
          </div>

          {loadingCra ? (
            <p className="empty-text">Chargement...</p>
          ) : cras.length === 0 ? (
            <p className="empty-text">Aucun CRA à afficher pour le moment.</p>
          ) : (
            <table className="cra-dashboard-table">
              <thead>
                <tr>
                  <th>Mois</th>
                  <th>Année</th>
                  <th>Statut</th>
                  <th>Date de soumission</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
  {[...cras]
    .sort(
      (a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
    )
    .slice(0, 5)
    .map((cra) => (
      <tr key={cra.id}>
        <td>
          <div className="month-cell">
            <span className="month-icon">📅</span>
            {getMonthName(cra.mois)}
          </div>
        </td>

        <td>{cra.annee}</td>

        <td>
          <span
            className={`status-badge status-${cra.statut.toLowerCase()}`}
          >
            {getStatusLabel(cra.statut)}
          </span>
        </td>

        <td>
          {cra.date_soumission
            ? new Date(cra.date_soumission).toLocaleDateString('fr-FR')
            : '-'}
        </td>

        <td>
          <button
            className="view-btn"
            onClick={() => handleViewCra(cra)}
          >
            👁 Voir le CRA
          </button>
        </td>
      </tr>
    ))}
</tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}