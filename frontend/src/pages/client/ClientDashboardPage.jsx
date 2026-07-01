import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../../components/layout/Sidebar';
import { downloadCraPdf, getCraForClient } from '../../services/craApi';

import '../../styles/dashboard.css';
import '../../styles/cra.css';

export default function ClientDashboardPage() {
  const navigate = useNavigate();

  const [cras, setCras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCra();
  }, []);

  const loadCra = async () => {
    try {
      const data = await getCraForClient();
      setCras(data);
    } catch (err) {
      console.error(err);
      setError('Impossible de charger les CRA de votre service.');
    } finally {
      setLoading(false);
    }
  };

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
    ][Number(monthNumber)] || '-';

  const getStatusLabel = (statut) => {
    const labels = {
      SOUMIS_CLIENT: 'À valider',
      VALIDE_CLIENT: 'Validé client',
      REFUSE_CLIENT: 'Refusé client',
      VALIDE_ADMIN: 'Validé admin',
      REFUSE_ADMIN: 'Refusé admin',
      ARCHIVE: 'Archivé',
    };

    return labels[statut] || statut;
  };

  const getCollaboratorName = (cra) => {
    return `${cra.collaborateur?.prenom || ''} ${
      cra.collaborateur?.nom || ''
    }`.trim();
  };

  const getSubmissionDate = (cra) => {
    const date = cra.date_soumission || cra.dateSoumission;

    if (!date) return '-';

    return new Date(date).toLocaleDateString('fr-FR');
  };

  const handleDownloadPdf = async (cra) => {
    try {
      await downloadCraPdf(cra);
    } catch (err) {
      console.error(err);
      setError("Impossible de télécharger le PDF.");
    }
  };

  const crasToValidate = cras.filter(
    (cra) => cra.statut === 'SOUMIS_CLIENT',
  ).length;

  const crasValidated = cras.filter(
    (cra) => cra.statut === 'VALIDE_CLIENT' || cra.statut === 'VALIDE_ADMIN',
  ).length;

  const crasRefused = cras.filter(
    (cra) => cra.statut === 'REFUSE_CLIENT' || cra.statut === 'REFUSE_ADMIN',
  ).length;

  return (
    <div className="dashboard-page">
      <Sidebar />

      <main className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <h1>Tableau de bord client</h1>
            <p>Bienvenue dans votre espace de validation des CRA.</p>
          </div>
        </header>

        <section className="dashboard-cards client-dashboard-cards">
  <div className="dashboard-card client-dashboard-card stat-waiting">
    <span>CRA à valider</span>
    <strong>{crasToValidate}</strong>
  </div>

  <div className="dashboard-card client-dashboard-card stat-validated">
    <span>CRA validés</span>
    <strong>{crasValidated}</strong>
  </div>

  <div className="dashboard-card client-dashboard-card stat-refused">
    <span>CRA refusés</span>
    <strong>{crasRefused}</strong>
  </div>

  <div className="dashboard-card client-dashboard-card stat-total">
    <span>Total CRA service</span>
    <strong>{cras.length}</strong>
  </div>
</section>

        <section className="dashboard-panel cra-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-icon">✅</span>

              <div>
                <h2>Derniers CRA du service</h2>
                <p>{cras.length} compte-rendu(s)</p>
              </div>
            </div>
          </div>

          {error && <div className="cra-error">{error}</div>}

          {loading ? (
            <p className="empty-text">Chargement...</p>
          ) : cras.length === 0 ? (
            <p className="empty-text">
              Aucun CRA trouvé pour votre service.
            </p>
          ) : (
            <div className="table-responsive">
            <table className="cra-dashboard-table client-dashboard-table">
              <thead>
                <tr>
                  <th>Collaborateur</th>
                  <th>Mois</th>
                  <th>Année</th>
                  <th>Statut</th>
                  <th>Date de soumission</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {[...cras]
                  .sort((a, b) => {
                    const dateA = a.dateSoumission
                      ? new Date(a.dateSoumission)
                      : new Date(a.createdAt);

                    const dateB = b.dateSoumission
                      ? new Date(b.dateSoumission)
                      : new Date(b.createdAt);

                    return dateB - dateA;
                  })
                  .slice(0, 5)
                  .map((cra) => (
                    <tr key={cra.id}>
                      <td>{getCollaboratorName(cra)}</td>

                     <td className="table-month-cell">
  <div className="month-cell">
    <span className="month-icon">📅</span>
    {getMonthName(cra.mois)}
  </div>
</td>

                      <td>{cra.annee}</td>

                     <td className="table-status-cell">
  <span
    className={`status-badge status-${cra.statut.toLowerCase()}`}
  >
    {getStatusLabel(cra.statut)}
  </span>
</td>

                      <td className="table-date-cell">{getSubmissionDate(cra)}</td>

                      <td className="table-actions-cell">
  <div className="actions-cell">
    <button
      type="button"
      className="view-btn compact-action-btn"
      onClick={() => handleDownloadPdf(cra)}
    >
      👁 PDF
    </button>

    <button
      type="button"
      className="edit-btn compact-action-btn"
      onClick={() => navigate(`/client/cra/${cra.id}`)}
    >
      {cra.statut === 'SOUMIS_CLIENT' ? 'À valider' : 'Voir'}
    </button>
  </div>
</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}