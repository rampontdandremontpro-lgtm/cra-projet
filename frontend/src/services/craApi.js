import api from './api';

const normalizeCraDay = (day) => ({
  ...day,
  duree: Number(day.duree),
});

const normalizeCra = (cra) => {
  if (!cra) return cra;

  const jours =
    cra.jours?.length > 0
      ? cra.jours
      : cra.days?.length > 0
        ? cra.days
        : [];

  const serviceLabel = cra.service
    ? [cra.service.company?.nom, cra.service.nom].filter(Boolean).join(' - ')
    : '-';

  return {
    ...cra,

    jours: jours.map(normalizeCraDay),
    days: jours.map(normalizeCraDay),

    client: cra.client || {
      id: cra.service?.id || null,
      nom: serviceLabel,
    },

    date_soumission: cra.date_soumission || cra.dateSoumission,
    date_validation_client:
      cra.date_validation_client || cra.dateValidationClient,
    date_validation_admin:
      cra.date_validation_admin || cra.dateValidationAdmin,

    motif_refus_client: cra.motif_refus_client || cra.motifRefusClient,
    motif_refus_admin: cra.motif_refus_admin || cra.motifRefusAdmin,

    created_at: cra.created_at || cra.createdAt,
    updated_at: cra.updated_at || cra.updatedAt,
  };
};

const normalizeCraList = (cras) => {
  return cras.map(normalizeCra);
};

const buildCraPayload = (craData) => {
  const jours = craData.jours || craData.days || [];

  return {
    mois: Number(craData.mois),
    annee: Number(craData.annee),
    days: jours
      .filter((jour) => jour.date)
      .map((jour) => ({
        date: jour.date,
        type: jour.type,
        duree: Number(jour.duree),
        commentaire: jour.commentaire || '',
      })),
  };
};

export const getAllCra = async () => {
  const response = await api.get('/cra/my');
  return normalizeCraList(response.data);
};

export const getMyCra = async () => {
  const response = await api.get('/cra/my');
  return normalizeCraList(response.data);
};

export const getCraForClient = async () => {
  const response = await api.get('/cra/client');
  return normalizeCraList(response.data);
};

export const getCraForAdminValidation = async () => {
  const response = await api.get('/cra/admin/to-validate');
  return normalizeCraList(response.data);
};

export const getCraForRhOrAdmin = async () => {
  const response = await api.get('/cra');
  return normalizeCraList(response.data);
};

export const getCraById = async (id) => {
  const response = await api.get(`/cra/${id}`);
  return normalizeCra(response.data);
};

export const getCraPdf = async (id) => {
  const response = await api.get(`/cra/${id}/pdf`, {
    responseType: 'blob',
  });

  return response.data;
};

export const createCra = async (craData) => {
  const response = await api.post('/cra', buildCraPayload(craData));
  return normalizeCra(response.data);
};

export const updateCra = async (id, craData) => {
  const response = await api.patch(`/cra/${id}`, buildCraPayload(craData));
  return normalizeCra(response.data);
};

export const submitCra = async (id) => {
  const response = await api.post(`/cra/${id}/submit`);
  return normalizeCra(response.data);
};

export const deleteCra = async (id) => {
  const response = await api.delete(`/cra/${id}`);
  return response.data;
};

export const validateCraByClient = async (id) => {
  const response = await api.post(`/cra/${id}/client-validate`);
  return normalizeCra(response.data);
};

export const refuseCraByClient = async (id, motif) => {
  const response = await api.post(`/cra/${id}/client-refuse`, {
    motif,
  });

  return normalizeCra(response.data);
};

export const validateCraByAdmin = async (id) => {
  const response = await api.post(`/cra/${id}/admin-validate`);
  return normalizeCra(response.data);
};

export const refuseCraByAdmin = async (id, motif) => {
  const response = await api.post(`/cra/${id}/admin-refuse`, {
    motif,
  });

  return normalizeCra(response.data);
};

export const archiveCra = async (id) => {
  const response = await api.patch(`/cra/${id}/archive`);
  return normalizeCra(response.data);
};

export const checkCra = async () => {
  return {
    valid: true,
    message:
      'La vérification est faite par le backend au moment de la soumission.',
  };
};

const monthNames = {
  1: 'Janvier',
  2: 'Fevrier',
  3: 'Mars',
  4: 'Avril',
  5: 'Mai',
  6: 'Juin',
  7: 'Juillet',
  8: 'Aout',
  9: 'Septembre',
  10: 'Octobre',
  11: 'Novembre',
  12: 'Decembre',
};

const cleanFileName = (value) => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
};

export const downloadCraPdf = async (cra) => {
  let craDetails = cra;

  if (!craDetails.collaborateur) {
    craDetails = await getCraById(cra.id);
  }

  const pdfBlob = await getCraPdf(craDetails.id);

  const collaborateurPrenom = cleanFileName(
    craDetails.collaborateur?.prenom || 'Collaborateur',
  );

  const collaborateurNom = cleanFileName(
    craDetails.collaborateur?.nom || '',
  );

  const mois = monthNames[Number(craDetails.mois)] || craDetails.mois;

  const fileName = `CRA_${collaborateurPrenom}_${collaborateurNom}_${mois}_${craDetails.annee}.pdf`;

  const pdfUrl = URL.createObjectURL(pdfBlob);

  const link = document.createElement('a');
  link.href = pdfUrl;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(pdfUrl);
};