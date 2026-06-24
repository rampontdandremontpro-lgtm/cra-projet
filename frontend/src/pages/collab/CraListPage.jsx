import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../../components/layout/Sidebar';
import { getAllCra, getCraPdf, deleteCra } from '../../services/craApi';

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
      const data = await getAllCra();
      setCras(data);
    } catch (error) {
      console.error(error);
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

  const handleViewCra = async (cra) => {
    try {
      const pdfBlob = await getCraPdf(cra.id);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
    } catch (error) {
      console.error(error);
      alert("Impossible d'ouvrir le PDF.");
    }
  };

  const handleDeleteCra = async (cra) => {
    const confirmDelete = confirm(
      `Voulez-vous vraiment supprimer le CRA de ${getMonthName(cra.mois)} ${cra.annee} ?`
    );

    if (!confirmDelete) return;

    try {
      await deleteCra(cra.id);

      setCras((currentCras) =>
        currentCras.filter((item) => item.id !== cra.id)
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
            <p className="breadcrumb">Tableau de bord / Mes CRA</p>
            <h1>Mes CRA</h1>
          </div>
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
            <table className="cra-dashboard-table">
              <thead>
                <tr>
                  <th>Mois</th>
                  <th>Année</th>
                  <th>Client</th>
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

                    <td>{cra.client?.nom || '-'}</td>

                    <td>
                      <span
                        className={`status-badge status-${cra.statut.toLowerCase()}`}
                      >
                        {getStatusLabel(cra.statut)}
                      </span>
                    </td>

                    <td>
                      {cra.date_soumission
                        ? new Date(cra.date_soumission).toLocaleDateString(
                            'fr-FR'
                          )
                        : '-'}
                    </td>

                    <td>
                      <div className="actions-cell">
                        {[
                          'SOUMIS_CLIENT',
                          'VALIDE_CLIENT',
                          'VALIDE_ADMIN',
                        ].includes(cra.statut) && (
                          <button
                            className="view-btn"
                            onClick={() => handleViewCra(cra)}
                          >
                            👁 Voir
                          </button>
                        )}

                        {[
                          'BROUILLON',
                          'REFUSE_CLIENT',
                          'REFUSE_ADMIN',
                        ].includes(cra.statut) && (
                          <button
                            className="edit-btn"
                            onClick={() => navigate(`/mes-cra/${cra.id}`)}
                          >
                            ✏️ Éditer
                          </button>
                        )}

                        {cra.statut === 'BROUILLON' && (
                          <button
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
          )}
        </section>
      </main>
    </div>
  );
}