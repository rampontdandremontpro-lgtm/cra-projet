import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../../components/layout/Sidebar';
import { downloadCraPdf, getCraForClient } from '../../services/craApi';

import '../../styles/dashboard.css';
import '../../styles/cra.css';

export default function ClientHistoryPage() {
  const navigate = useNavigate();

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
      setError("Impossible de charger l'historique des CRA.");
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

  const getTreatmentDate = (cra) => {
    return (
      cra.dateValidationAdmin ||
      cra.dateRefusAdmin ||
      cra.dateValidationClient ||
      cra.dateRefusClient ||
      cra.dateSoumission ||
      cra.createdAt
    );
  };

  const handleDownloadPdf = async (cra) => {
    try {
      await downloadCraPdf(cra);
    } catch (err) {
      console.error(err);
      setError('Impossible de télécharger le PDF.');
    }
  };

  const historyCras = useMemo(() => {
    return cras.filter((cra) =>
      [
        'VALIDE_CLIENT',
        'REFUSE_CLIENT',
        'VALIDE_ADMIN',
        'REFUSE_ADMIN',
        'ARCHIVE',
      ].includes(cra.statut),
    );
  }, [cras]);

  const collaborators = useMemo(() => {
    const names = historyCras.map((cra) => getCollaboratorName(cra));
    return [...new Set(names)].filter(Boolean).sort();
  }, [historyCras]);

  const years = useMemo(() => {
    const values = historyCras.map((cra) => cra.annee);
    return [...new Set(values)].sort((a, b) => b - a);
  }, [historyCras]);

  const filteredCras = useMemo(() => {
    return historyCras.filter((cra) => {
      const collaboratorName = getCollaboratorName(cra);

      const matchStatus =
        statusFilter === 'ALL' || cra.statut === statusFilter;

      const matchCollaborator =
        collaboratorFilter === 'ALL' || collaboratorName === collaboratorFilter;

      const matchMonth =
        monthFilter === 'ALL' || Number(cra.mois) === Number(monthFilter);

      const matchYear =
        yearFilter === 'ALL' || Number(cra.annee) === Number(yearFilter);

      return matchStatus && matchCollaborator && matchMonth && matchYear;
    });
  }, [historyCras, statusFilter, collaboratorFilter, monthFilter, yearFilter]);

  const resetFilters = () => {
    setStatusFilter('ALL');
    setCollaboratorFilter('ALL');
    setMonthFilter('ALL');
    setYearFilter('ALL');
  };

  const validatedCount = historyCras.filter((cra) =>
    ['VALIDE_CLIENT', 'VALIDE_ADMIN', 'ARCHIVE'].includes(cra.statut),
  ).length;

  const refusedCount = historyCras.filter((cra) =>
    ['REFUSE_CLIENT', 'REFUSE_ADMIN'].includes(cra.statut),
  ).length;

  return (
    <div className="dashboard-page">
      <Sidebar />

      <main className="dashboard-content">
        <div className="cra-list-header">
          <div>
            <h1>Historique des CRA</h1>
          </div>
        </div>

        <section className="dashboard-cards client-validation-cards">
          <div className="dashboard-card client-validation-card stat-validated">
            <span>CRA validés</span>
            <strong>{validatedCount}</strong>
          </div>

          <div className="dashboard-card client-validation-card stat-refused">
            <span>CRA refusés</span>
            <strong>{refusedCount}</strong>
          </div>

          <div className="dashboard-card client-validation-card stat-total">
            <span>Total historique</span>
            <strong>{historyCras.length}</strong>
          </div>

          <div className="dashboard-card client-validation-card stat-total">
            <span>Résultats filtrés</span>
            <strong>{filteredCras.length}</strong>
          </div>
        </section>

        <section className="dashboard-panel cra-panel client-history-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-icon">📚</span>

              <div>
                <h2>Filtres</h2>
                <p>Rechercher un CRA déjà traité</p>
              </div>
            </div>

            <button type="button" className="secondary-btn" onClick={resetFilters}>
              Réinitialiser
            </button>
          </div>

          <div className="client-history-filters">
            <label>
              Statut
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Tous les statuts</option>
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
                onChange={(e) => setCollaboratorFilter(e.target.value)}
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
                onChange={(e) => setMonthFilter(e.target.value)}
              >
                <option value="ALL">Tous les mois</option>

                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>
                    {getMonthName(month)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Année
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
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
        </section>

        <section className="dashboard-panel cra-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-icon">📄</span>

              <div>
                <h2>CRA traités</h2>
                <p>{filteredCras.length} compte-rendu(s)</p>
              </div>
            </div>
          </div>

          {error && <div className="cra-error">{error}</div>}

          {loading ? (
            <p className="empty-text">Chargement...</p>
          ) : filteredCras.length === 0 ? (
            <p className="empty-text">Aucun CRA trouvé dans l’historique.</p>
          ) : (
            <div className="table-responsive">
            <table className="cra-dashboard-table client-history-table">
              <thead>
                <tr>
                  <th>Collaborateur</th>
                  <th>Mois</th>
                  <th>Année</th>
                  <th>Service</th>
                  <th>Statut</th>
                  <th>Date de traitement</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredCras.map((cra) => (
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

                    <td>{formatDate(getTreatmentDate(cra))}</td>

                    <td>
                      <div className="actions-cell">
                        <button
  type="button"
  className="view-btn compact-action-btn"
  onClick={() => handleDownloadPdf(cra)}
>
  PDF
</button>

<button
  type="button"
  className="edit-btn compact-action-btn"
  onClick={() => navigate(`/client/cra/${cra.id}`)}
>
  Voir
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