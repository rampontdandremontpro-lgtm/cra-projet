import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Sidebar from '../../components/layout/Sidebar';
import {
  downloadCraPdf,
  getCraById,
  refuseCraByClient,
  validateCraByClient,
} from '../../services/craApi';

import '../../styles/dashboard.css';
import '../../styles/cra.css';

export default function ClientCraDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cra, setCra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [observation, setObservation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadCra();
  }, [id]);

  const loadCra = async () => {
    try {
      const data = await getCraById(id);
      setCra(data);
    } catch (err) {
      console.error(err);
      setError('Impossible de charger le CRA.');
    } finally {
      setLoading(false);
    }
  };

  const jours = cra?.jours || cra?.days || [];

  const canValidate = cra?.statut === 'SOUMIS_CLIENT';

  const totals = useMemo(() => {
    return jours.reduce(
      (acc, jour) => {
        const duree = Number(jour.duree || 0);

        if (jour.type === 'TRAVAIL') acc.travail += duree;
        if (jour.type === 'CONGE') acc.conge += duree;
        if (jour.type === 'ABSENCE') acc.absence += duree;
        if (jour.type === 'RTT') acc.rtt += duree;

        return acc;
      },
      {
        travail: 0,
        conge: 0,
        absence: 0,
        rtt: 0,
      },
    );
  }, [jours]);

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

  const getCollaboratorName = () => {
    return `${cra?.collaborateur?.prenom || ''} ${
      cra?.collaborateur?.nom || ''
    }`.trim();
  };

  const getServiceLabel = () => {
    if (!cra?.service) return '-';

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

  const formatDuration = (duree) => {
    const value = Number(duree);

    if (value === 0.5) return '0.5 jour';
    if (value === 1) return '1 jour';

    return `${value} jour(s)`;
  };

  const handleDownloadPdf = async () => {
    try {
      await downloadCraPdf(cra);
    } catch (err) {
      console.error(err);
      setError("Impossible de télécharger le PDF.");
    }
  };

  const handleValidate = async () => {
    const confirmValidation = confirm(
      `Valider le CRA de ${getCollaboratorName()} pour ${getMonthName(
        cra.mois,
      )} ${cra.annee} ?`,
    );

    if (!confirmValidation) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await validateCraByClient(cra.id);
      setSuccess('CRA validé avec succès.');

      setTimeout(() => {
        navigate('/client/cra-a-valider');
      }, 700);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message || 'Impossible de valider ce CRA.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRefuse = async () => {
    if (!observation.trim()) {
      setError('Le motif de refus est obligatoire pour refuser un CRA.');
      return;
    }

    const confirmRefusal = confirm(
      `Refuser le CRA de ${getCollaboratorName()} pour ${getMonthName(
        cra.mois,
      )} ${cra.annee} ?`,
    );

    if (!confirmRefusal) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await refuseCraByClient(cra.id, observation.trim());
      setSuccess('CRA refusé avec succès.');

      setTimeout(() => {
        navigate('/client/cra-a-valider');
      }, 700);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message || 'Impossible de refuser ce CRA.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <Sidebar />

        <main className="dashboard-content client-cra-detail">
          <p className="empty-text">Chargement du CRA...</p>
        </main>
      </div>
    );
  }

  if (!cra) {
    return (
      <div className="dashboard-page">
        <Sidebar />

        <main className="dashboard-content client-cra-detail">
          <p className="empty-text">CRA introuvable.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <Sidebar />

      <main className="dashboard-content client-cra-detail">
        <div className="cra-page-title">
          <p className="breadcrumb">Espace client / Détail CRA</p>

          <h1>
            CRA — {getMonthName(cra.mois)} {cra.annee}
          </h1>
        </div>

        <section className="cra-main-card">
          <div className="cra-section-header">
            <h2>Validation du CRA</h2>

            <span
              className={`status-badge status-${cra.statut.toLowerCase()}`}
            >
              {getStatusLabel(cra.statut)}
            </span>
          </div>

          <div className="cra-info-grid">
            <label>
              Collaborateur
              <input type="text" value={getCollaboratorName()} disabled readOnly />
            </label>

            <label>
              Entreprise
              <input
                type="text"
                value={cra.service?.company?.nom || '-'}
                disabled
                readOnly
              />
            </label>

            <label>
              Service
              <input type="text" value={getServiceLabel()} disabled readOnly />
            </label>

            <label>
              Période
              <input
                type="text"
                value={`${getMonthName(cra.mois)} ${cra.annee}`}
                disabled
                readOnly
              />
            </label>
          </div>
        </section>

        <section className="dashboard-cards client-summary-cards">
  <div className="dashboard-card client-stat-card stat-travail">
    <span>Jours travaillés</span>
    <strong>{totals.travail}</strong>
  </div>

  <div className="dashboard-card client-stat-card stat-conge">
    <span>Congés</span>
    <strong>{totals.conge}</strong>
  </div>

  <div className="dashboard-card client-stat-card stat-absence">
    <span>Absences</span>
    <strong>{totals.absence}</strong>
  </div>

  <div className="dashboard-card client-stat-card stat-rtt">
    <span>RTT</span>
    <strong>{totals.rtt}</strong>
  </div>
</section>

        <section className="dashboard-panel cra-panel">
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-icon">📅</span>

              <div>
                <h2>Tableau des jours déclarés</h2>
                <p>{jours.length} journée(s)</p>
              </div>
            </div>

            <button type="button" className="view-btn" onClick={handleDownloadPdf}>
              👁 PDF
            </button>
          </div>

          <table className="cra-dashboard-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Durée</th>
                <th>Commentaire</th>
              </tr>
            </thead>

            <tbody>
              {jours.map((jour) => (
                <tr key={jour.id} className={`cra-day-row row-${jour.type.toLowerCase()}`}>
                  <td>{formatDate(jour.date)}</td>

                  <td>
                    <span className={`cra-type-badge badge-${jour.type.toLowerCase()}`}>
                     {jour.type}
                    </span>
                  </td>

                  <td>{formatDuration(jour.duree)}</td>

                  <td>{jour.commentaire || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="cra-main-card client-observation-card">
          <div className="cra-section-header">
            <h2>Observations du client</h2>
          </div>

          <div style={{ padding: '24px' }}>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              disabled={!canValidate}
              placeholder={
                canValidate
                  ? 'Ajoutez une observation ou un motif de refus...'
                  : 'Le CRA a déjà été traité.'
              }
              rows={5}
              style={{
                width: '100%',
                resize: 'vertical',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '14px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {error && <div className="cra-error">{error}</div>}
          {success && <div className="cra-success">{success}</div>}

          <div className="cra-form-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => navigate('/client/cra-a-valider')}
            >
              Retour
            </button>

            {canValidate && (
              <>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleValidate}
                  disabled={saving}
                >
                  Valider le CRA
                </button>

                <button
                  type="button"
                  className="delete-draft-btn"
                  onClick={handleRefuse}
                  disabled={saving}
                >
                  Refuser le CRA
                </button>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}