import { useEffect, useState } from 'react';

import Sidebar from '../../components/layout/Sidebar';
import {
  getCraForClient,
  getCraPdf,
  refuseCraByClient,
  validateCraByClient,
} from '../../services/craApi';

import '../../styles/dashboard.css';
import '../../styles/cra.css';

export default function ClientCraValidationPage() {
  const [cras, setCras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCra, setSelectedCra] = useState(null);
  const [refusalMotif, setRefusalMotif] = useState('');
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
      BROUILLON: 'Brouillon',
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
    if (cra.service) {
      return [cra.service.company?.nom, cra.service.nom]
        .filter(Boolean)
        .join(' - ');
    }

    return cra.client?.nom || '-';
  };

  const handleOpenPdf = async (cra) => {
    try {
      const pdfBlob = await getCraPdf(cra.id);
      const pdfUrl = URL.createObjectURL(pdfBlob);

      window.open(pdfUrl, '_blank');
    } catch (err) {
      console.error(err);
      setError("Impossible d'ouvrir le PDF.");
    }
  };

  const handleValidate = async (cra) => {
    const confirmValidation = confirm(
      `Valider le CRA de ${getCollaboratorName(cra)} pour ${getMonthName(
        cra.mois,
      )} ${cra.annee} ?`,
    );

    if (!confirmValidation) return;

    try {
      await validateCraByClient(cra.id);
      await loadCra();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message || 'Impossible de valider ce CRA.',
      );
    }
  };

  const openRefuseModal = (cra) => {
    setSelectedCra(cra);
    setRefusalMotif('');
    setError('');
  };

  const closeRefuseModal = () => {
    setSelectedCra(null);
    setRefusalMotif('');
  };

  const handleRefuse = async () => {
    if (!refusalMotif.trim()) {
      setError('Le motif de refus est obligatoire.');
      return;
    }

    try {
      await refuseCraByClient(selectedCra.id, refusalMotif);
      closeRefuseModal();
      await loadCra();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message || 'Impossible de refuser ce CRA.',
      );
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

        <section className="dashboard-cards">
          <div className="dashboard-card">
            <span>CRA à valider</span>
            <strong>{crasToValidate.length}</strong>
          </div>

          <div className="dashboard-card">
            <span>Total CRA service</span>
            <strong>{cras.length}</strong>
          </div>
        </section>

        <section className="dashboard-panel cra-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-icon">✅</span>

              <div>
                <h2>CRA de mon service</h2>
                <p>{cras.length} compte-rendu(s)</p>
              </div>
            </div>
          </div>

          {error && <div className="cra-error">{error}</div>}

          {loading ? (
            <p className="empty-text">Chargement...</p>
          ) : cras.length === 0 ? (
            <p className="empty-text">Aucun CRA trouvé pour votre service.</p>
          ) : (
            <table className="cra-dashboard-table">
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
                {cras.map((cra) => (
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
                          className="view-btn"
                          onClick={() => handleOpenPdf(cra)}
                        >
                          👁 PDF
                        </button>

                        {cra.statut === 'SOUMIS_CLIENT' && (
                          <>
                            <button
                              type="button"
                              className="validate-btn"
                              onClick={() => handleValidate(cra)}
                            >
                              Valider
                            </button>

                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() => openRefuseModal(cra)}
                            >
                              Refuser
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {selectedCra && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <h2>Refuser le CRA</h2>

              <p>
                CRA de {getCollaboratorName(selectedCra)} —{' '}
                {getMonthName(selectedCra.mois)} {selectedCra.annee}
              </p>

              <label>
                Motif du refus
                <textarea
                  value={refusalMotif}
                  onChange={(e) => setRefusalMotif(e.target.value)}
                  placeholder="Explique pourquoi le CRA est refusé..."
                  rows={5}
                />
              </label>

              <div className="cra-form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeRefuseModal}
                >
                  Annuler
                </button>

                <button
                  type="button"
                  className="delete-btn"
                  onClick={handleRefuse}
                >
                  Confirmer le refus
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}