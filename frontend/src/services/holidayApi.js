import api from './api';

export const getHolidaysByYear = async (year) => {
  const response = await api.get(`/holidays/year/${year}`);
  return response.data;
};