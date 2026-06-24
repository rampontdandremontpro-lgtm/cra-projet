export const MONTHS = [
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
];

export const CRA_STATUS_LABELS = {
  BROUILLON: 'Brouillon',
  SOUMIS_CLIENT: 'Soumis au client',
  VALIDE_CLIENT: 'Validé client',
  VALIDE_ADMIN: 'Validé admin',
  REFUSE_CLIENT: 'Refusé client',
  REFUSE_ADMIN: 'Refusé admin',
};

export const createEmptyCraDay = () => ({
  date: '',
  type: 'TRAVAIL',
  duree: 1,
  commentaire: '',
});

export const getMonthName = (monthNumber) => {
  return MONTHS[monthNumber] || '';
};

export const getStatusLabel = (statut) => {
  return CRA_STATUS_LABELS[statut] || statut;
};

export const getLastDayOfMonth = (annee, mois) => {
  return new Date(annee, mois, 0).getDate();
};

export const getDayFromDate = (date) => {
  if (!date) return '';
  return Number(date.split('-')[2]);
};

export const buildDateFromDay = (day, mois, annee) => {
  const month = String(mois).padStart(2, '0');
  const formattedDay = String(day).padStart(2, '0');

  return `${annee}-${month}-${formattedDay}`;
};

export const calculateCraTotals = (jours) => {
  return jours.reduce(
    (acc, jour) => {
      const duree = Number(jour.duree || 0);

      acc.total += duree;
      if (jour.type === 'TRAVAIL') acc.travail += duree;
      if (jour.type === 'CONGE') acc.conge += duree;
      if (jour.type === 'ABSENCE') acc.absence += duree;
      if (jour.type === 'RTT') acc.rtt += duree;

      return acc;
    },
    { total: 0, travail: 0, conge: 0, absence: 0, rtt: 0 }
  );
};