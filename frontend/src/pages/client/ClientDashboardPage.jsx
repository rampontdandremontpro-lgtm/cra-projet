import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { downloadCraPdf, getCraForClient } from '../../services/craApi';

import '../../styles/dashboard.css';
import '../../styles/cra.css';

export default function ClientDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const userDisplayName = `${user?.prenom || ''} ${user?.nom || ''}`.trim();

  const [cras, setCras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [collaboratorFilter, setCollaboratorFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

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

  const getServiceLabel = (cra) => {
    if (!cra.service) return '-';

    return [cra.service.company?.nom, cra.service.nom]
      .filter(Boolean)
      .join(' - ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';

    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-');

    return `${day}/${month}/${year}`;
  };

  const getSubmissionDate = (cra) => {
    return cra.date_soumission || cra.dateSoumission || cra.createdAt;
  };

  const getSortDate = (cra) => {
    const value =
      cra.dateSoumission ||
      cra.date_soumission ||
      cra.dateValidationClient ||
      cra.dateRefusClient ||
      cra.createdAt;

    return value ? new Date(value) : new Date(0);
  };

  const handleDownloadPdf = async (cra, event) => {
    event?.stopPropagation();

    try {
      await downloadCraPdf(cra);
    } catch (err) {
      console.error(err);
      setError('Impossible de télécharger le PDF.');
    }
  };

  const openCra = (cra) => {
    navigate(`/client/cra/${cra.id}`);
  };

  const collaborators = useMemo(() => {
    const names = cras.map((cra) => getCollaboratorName(cra));
    return [...new Set(names)].filter(Boolean).sort();
  }, [cras]);

  const years = useMemo(() => {
    const values = cras.map((cra) => cra.annee);
    return [...new Set(values)].sort((a, b) => b - a);
  }, [cras]);

  const filteredCras = useMemo(() => {
    return [...cras]
      .filter((cra) => {
        const collaboratorName = getCollaboratorName(cra);

        const matchStatus =
          statusFilter === 'ALL' || cra.statut === statusFilter;

        const matchCollaborator =
          collaboratorFilter === 'ALL' ||
          collaboratorName === collaboratorFilter;

        const matchMonth =
          monthFilter === 'ALL' || Number(cra.mois) === Number(monthFilter);

        const matchYear =
          yearFilter === 'ALL' || Number(cra.annee) === Number(yearFilter);

        return matchStatus && matchCollaborator && matchMonth && matchYear;
      })
      .sort((a, b) => getSortDate(b) - getSortDate(a));
  }, [cras, statusFilter, collaboratorFilter, monthFilter, yearFilter]);

  const resetFilters = () => {
    setStatusFilter('ALL');
    setCollaboratorFilter('ALL');
    setMonthFilter('ALL');
    setYearFilter('ALL');
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

            <div className="dashboard-welcome-block">
              <p className="dashboard-user-name">Bonjour {userDisplayName}</p>

              <p className="dashboard-welcome-text">
                Bienvenue dans votre espace de validation des CRA.
              </p>
            </div>
          </div>
        </header>

        <section className="dashboard-panel cra-panel client-all-cra-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-icon">📄</span>

              <div>
                <h2>Tous mes CRA</h2>
                <p>{filteredCras.length} compte-rendu(s)</p>
              </div>
            </div>

            <button type="button" className="secondary-btn" onClick={resetFilters}>
              Réinitialiser
            </button>
          </div>

          <div className="client-history-filters dashboard-table-filters">
            <label>
              Statut
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="ALL">Tous les statuts</option>
                <option value="SOUMIS_CLIENT">À valider</option>
                <option value="VALIDE_CLIENT">Validé client</option>
                <option value="REFUSE_CLIENT">Refusé client</option>
                <option value="VALIDE_ADMIN">Validé admin</option>
                <option value="REFUSE_ADMIN">Refusé admin</option>
                <option value="ARCHIVE">Archivé</option>
              </select>
            </label>

            <label>
              Collaborateur
              <select
                value={collaboratorFilter}
                onChange={(event) => setCollaboratorFilter(event.target.value)}
              >
                <option value="ALL">Tous les collaborateurs</option>

                {collaborators.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Mois
              <select
                value={monthFilter}
                onChange={(event) => setMonthFilter(event.target.value)}
              >
                <option value="ALL">Tous les mois</option>

                {Array.from({ length: 12 }, (_, index) => index + 1).map(
                  (month) => (
                    <option key={month} value={month}>
                      {getMonthName(month)}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              Année
              <select
                value={yearFilter}
                onChange={(event) => setYearFilter(event.target.value)}
              >
                <option value="ALL">Toutes les années</option>

                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && <div className="cra-error">{error}</div>}

          {loading ? (
            <p className="empty-text">Chargement...</p>
          ) : filteredCras.length === 0 ? (
            <p className="empty-text">Aucun CRA trouvé.</p>
          ) : (
            <div className="table-responsive">
              <table className="cra-dashboard-table client-history-table clickable-table">
                <thead>
                  <tr>
                    <th>Collaborateur</th>
                    <th>Mois</th>
                    <th>Année</th>
                    <th>Service</th>
                    <th>Date de soumission</th>
                    <th aria-label="Télécharger PDF"></th>
                    <th>Statut</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCras.map((cra) => (
                    <tr
                      key={cra.id}
                      className="clickable-row"
                      onClick={() => openCra(cra)}
                    >
                      <td>{getCollaboratorName(cra)}</td>

                      <td>
                        <div className="month-cell">
                          <span className="month-icon">📅</span>
                          {getMonthName(cra.mois)}
                        </div>
                      </td>

                      <td>{cra.annee}</td>

                      <td>{getServiceLabel(cra)}</td>

                      <td>{formatDate(getSubmissionDate(cra))}</td>

                      <td>
                        <div className="actions-cell download-actions-cell">
                          <button
                            type="button"
                            className="download-btn compact-action-btn"
                            onClick={(event) => handleDownloadPdf(cra, event)}
                            title="Télécharger le PDF"
                            aria-label="Télécharger le PDF"
                          >
                            ⬇️
                          </button>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`status-badge status-${cra.statut.toLowerCase()}`}
                        >
                          {getStatusLabel(cra.statut)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="dashboard-cards client-dashboard-cards dashboard-cards-bottom">
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
      </main>
    </div>
  );
}
