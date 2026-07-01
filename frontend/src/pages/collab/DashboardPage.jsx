import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { downloadCraPdf, getMyCra } from '../../services/craApi';
import { getMyActiveAssignment } from '../../services/collaboratorAssignmentApi';

import '../../styles/dashboard.css';

export default function DashboardPage() {
  const navigate = useNavigate();

  const { user } = useAuth();

const userDisplayName = `${user?.prenom || ''} ${user?.nom || ''}`.trim();

  const [cras, setCras] = useState([]);
  const [loadingCra, setLoadingCra] = useState(true);
  const [assignment, setAssignment] = useState(null);

  useEffect(() => {
  loadCra();
}, []);

const loadCra = async () => {
  try {
    setLoadingCra(true);

    const [craData, activeAssignment] = await Promise.all([
      getMyCra(),
      getMyActiveAssignment(),
    ]);

    setCras(craData);
    setAssignment(activeAssignment);
  } catch (error) {
    console.error(error);
    alert("Impossible de charger le tableau de bord.");
  } finally {
    setLoadingCra(false);
  }
};

  const handleViewCra = async (cra) => {
    if (
      cra.statut === 'BROUILLON' ||
      cra.statut === 'REFUSE_CLIENT' ||
      cra.statut === 'REFUSE_ADMIN'
    ) {
      navigate(`/mes-cra/${cra.id}`);
      return;
    }

    try {
      await downloadCraPdf(cra);
    } catch (error) {
      console.error('Erreur PDF :', error);
      alert("Impossible d'ouvrir le PDF.");
    }
  };

  const brouillons = cras.filter((cra) => cra.statut === 'BROUILLON').length;

  const soumis = cras.filter(
    (cra) => cra.statut === 'SOUMIS_CLIENT',
  ).length;

  const valides = cras.filter(
    (cra) => cra.statut === 'VALIDE_ADMIN' || cra.statut === 'VALIDE_CLIENT',
  ).length;

  const refuses = cras.filter(
    (cra) => cra.statut === 'REFUSE_ADMIN' || cra.statut === 'REFUSE_CLIENT',
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
    ][Number(monthNumber)] || '-';

  const getStatusLabel = (statut) => {
    const labels = {
      BROUILLON: 'Brouillon',
      SOUMIS_CLIENT: 'Soumis au client',
      VALIDE_CLIENT: 'Validé client',
      VALIDE_ADMIN: 'Validé admin',
      REFUSE_CLIENT: 'Refusé client',
      REFUSE_ADMIN: 'Refusé admin',
      ARCHIVE: 'Archivé',
    };

    return labels[statut] || statut;
  };

  const getSubmissionDate = (cra) => {
    const date = cra.date_soumission || cra.dateSoumission;

    if (!date) return '-';

    return new Date(date).toLocaleDateString('fr-FR');
  };

  const getCreationDate = (cra) => {
    return cra.created_at || cra.createdAt || null;
  };

  const getCompanyLogo = (companyName) => {
  if (!companyName) return null;

  const normalizedCompanyName = companyName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalizedCompanyName.includes('gfa')) {
    return '/company-logos/gfa_logo.png';
  }

  if (normalizedCompanyName.includes('edf')) {
    return '/company-logos/edf_logo.png';
  }

  if (
    normalizedCompanyName.includes('fort') ||
    normalizedCompanyName.includes('fdf') ||
    normalizedCompanyName.includes('ville')
  ) {
    return '/company-logos/fdf_logo.jpg';
  }

  if (
    normalizedCompanyName.includes('maritime') ||
    normalizedCompanyName.includes('hub') ||
    normalizedCompanyName.includes('port')
  ) {
    return '/company-logos/port-maritime_logo.png';
  }

  if (normalizedCompanyName.includes('sara')) {
    return '/company-logos/sara_logo.png';
  }

  return null;
};

const companyName = assignment?.service?.company?.nom || '-';
const companyLogo = getCompanyLogo(companyName);

  return (
    <div className="dashboard-page">
      <Sidebar />

      <main className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <h1>Tableau de bord</h1>
            <div className="dashboard-welcome-block">
  <p className="dashboard-user-name">
    Bonjour {userDisplayName}
  </p>

  <p className="dashboard-welcome-text">
    Bienvenue dans votre espace collaborateur.
  </p>
</div>
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
        <div className="dashboard-assignment-card">
  <div className="assignment-company-info">
    <p className="assignment-label">Affectation actuelle</p>

    <h2>{companyName}</h2>

    <p className="assignment-service">
      {assignment?.service?.nom || '-'}
    </p>
  </div>

  {companyLogo && (
    <div className="assignment-logo-box">
      <img
        src={companyLogo}
        alt={`Logo ${companyName}`}
        className="assignment-logo"
      />
    </div>
  )}

  <div className="assignment-responsable">
    <span>Responsable</span>
    <strong>
      {assignment?.responsableService
        ? `${assignment.responsableService.prenom} ${assignment.responsableService.nom}`
        : '-'}
    </strong>
  </div>
</div>
        <section className="dashboard-panel cra-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-icon">📄</span>
              <h2>Mes derniers CRA</h2>
            </div>

            <button
              type="button"
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
            <div className="table-responsive">
            <table className="cra-dashboard-table collab-dashboard-table">
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
                  .sort((a, b) => {
                    const dateA = getCreationDate(a)
                      ? new Date(getCreationDate(a))
                      : new Date(0);

                    const dateB = getCreationDate(b)
                      ? new Date(getCreationDate(b))
                      : new Date(0);

                    return dateB - dateA;
                  })
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

                      <td>{getSubmissionDate(cra)}</td>

                      <td>
  <div className="actions-cell">
    <button
      type="button"
      className="view-btn"
      onClick={() => handleViewCra(cra)}
    >
      {cra.statut === 'BROUILLON' ||
      cra.statut === 'REFUSE_CLIENT' ||
      cra.statut === 'REFUSE_ADMIN'
        ? '✏️ Modifier'
        : 'Voir le PDF'}
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