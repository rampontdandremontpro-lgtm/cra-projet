import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../../components/layout/Sidebar';
import { downloadCraPdf, getCraForClient } from '../../services/craApi';

import '../../styles/dashboard.css';
import '../../styles/cra.css';

export default function ClientCraValidationPage() {
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
      setError('Impossible de charger les CRA du service.');
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
    };

    return labels[statut] || statut;
  };

  const getCollaboratorName = (cra) => {
    return `${cra.collaborateur?.prenom || ''} ${
      cra.collaborateur?.nom || ''
    }`.trim();
  };

  const getServiceLabel = (cra) => {
    if (cra.service) {
      return [cra.service.company?.nom, cra.service.nom]
        .filter(Boolean)
        .join(' - ');
    }

    return '-';
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
  );

  return (
    <div className="dashboard-page">
      <Sidebar />

      <main className="dashboard-content">
        <div className="cra-list-header">
          <div>
            <p className="breadcrumb">Espace client / Validation CRA</p>
            <h1>Validation des CRA</h1>
          </div>
        </div>

        <section className="dashboard-panel cra-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-icon">✅</span>

              <div>
                <h2>CRA à valider</h2>
                <p>{crasToValidate.length} CRA en attente</p>
              </div>
            </div>
          </div>

          {error && <div className="cra-error">{error}</div>}

          {loading ? (
            <p className="empty-text">Chargement...</p>
          ) : crasToValidate.length === 0 ? (
            <p className="empty-text">Aucun CRA à valider pour le moment.</p>
          ) : (
            <div className="table-responsive">
            <table className="cra-dashboard-table client-validation-table">
              <thead>
                <tr>
                  <th>Collaborateur</th>
                  <th>Mois</th>
                  <th>Année</th>
                  <th>Service</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {crasToValidate.map((cra) => (
                  <tr key={cra.id}>
                    <td>{getCollaboratorName(cra)}</td>

                    <td>
                      <div className="month-cell">
                        <span className="month-icon">📅</span>
                        {getMonthName(cra.mois)}
                      </div>
                    </td>

                    <td>{cra.annee}</td>

                    <td>{getServiceLabel(cra)}</td>

                    <td>
                      <span
                        className={`status-badge status-${cra.statut.toLowerCase()}`}
                      >
                        {getStatusLabel(cra.statut)}
                      </span>
                    </td>

                    <td>
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
                          À valider
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