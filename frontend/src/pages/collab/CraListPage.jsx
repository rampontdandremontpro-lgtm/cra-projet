import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../../components/layout/Sidebar';
import { deleteCra, downloadCraPdf, getMyCra } from '../../services/craApi';

import '../../styles/cra.css';
import '../../styles/dashboard.css';

export default function CraListPage() {
  const navigate = useNavigate();

  const [cras, setCras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCra();
  }, []);

  const loadCra = async () => {
    try {
      const data = await getMyCra();
      setCras(data);
    } catch (error) {
      console.error(error);
      alert("Impossible de charger la liste des CRA.");
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

  const getServiceLabel = (cra) => {
    if (cra.client?.nom) {
      return cra.client.nom;
    }

    if (cra.service) {
      return [cra.service.company?.nom, cra.service.nom]
        .filter(Boolean)
        .join(' - ');
    }

    return '-';
  };

  const getSubmissionDate = (cra) => {
    const date = cra.date_soumission || cra.dateSoumission;

    if (!date) return '-';

    return new Date(date).toLocaleDateString('fr-FR');
  };

  const handleViewCra = async (cra) => {
    try {
      await downloadCraPdf(cra);
    } catch (error) {
      console.error(error);
      alert("Impossible d'ouvrir le PDF.");
    }
  };

  const handleDeleteCra = async (cra) => {
    const confirmDelete = confirm(
      `Voulez-vous vraiment supprimer le CRA de ${getMonthName(cra.mois)} ${cra.annee} ?`,
    );

    if (!confirmDelete) return;

    try {
      await deleteCra(cra.id);

      setCras((currentCras) =>
        currentCras.filter((item) => item.id !== cra.id),
      );
    } catch (error) {
      console.error(error);
      alert("Impossible de supprimer ce CRA.");
    }
  };

  return (
    <div className="dashboard-page">
      <Sidebar />

      <main className="dashboard-content">
        <div className="cra-list-header">
          <div>
            <h1>Mes CRA</h1>
          </div>

          <button
            type="button"
            className="primary-btn"
            onClick={() => navigate('/nouveau-cra')}
          >
            + Nouveau CRA
          </button>
        </div>

        <section className="dashboard-panel cra-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-icon">📄</span>

              <div>
                <h2>Liste des CRA</h2>
                <p>{cras.length} compte-rendu(s)</p>
              </div>
            </div>
          </div>

          {loading ? (
            <p className="empty-text">Chargement...</p>
          ) : cras.length === 0 ? (
            <p className="empty-text">Aucun CRA trouvé.</p>
          ) : (
            <div className="table-responsive">
            <table className="cra-dashboard-table collab-list-table">
              <thead>
                <tr>
                  <th>Mois</th>
                  <th>Année</th>
                  <th>Service / Client</th>
                  <th>Statut</th>
                  <th>Date de soumission</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {cras.map((cra) => (
                  <tr key={cra.id}>
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

                    <td>{getSubmissionDate(cra)}</td>

                    <td>
                      <div className="actions-cell">
                        {[
                          'SOUMIS_CLIENT',
                          'VALIDE_CLIENT',
                          'VALIDE_ADMIN',
                          'ARCHIVE',
                        ].includes(cra.statut) && (
                          <button
                            type="button"
                            className="view-btn"
                            onClick={() => handleViewCra(cra)}
                          >
                            👁 PDF
                          </button>
                        )}

                        {[
                          'BROUILLON',
                          'REFUSE_CLIENT',
                          'REFUSE_ADMIN',
                        ].includes(cra.statut) && (
                          <button
                            type="button"
                            className="edit-btn"
                            onClick={() => navigate(`/mes-cra/${cra.id}`)}
                          >
                            ✏️ Éditer
                          </button>
                        )}

                        {cra.statut === 'BROUILLON' && (
                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => handleDeleteCra(cra)}
                          >
                            🗑 Supprimer
                          </button>
                        )}
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