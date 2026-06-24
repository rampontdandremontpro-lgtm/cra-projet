import api from './api';

export const getAllCra = async () => {
  const response = await api.get('/cra');
  return response.data;
};

export const getCraById = async (id) => {
  const response = await api.get(`/cra/${id}`);
  return response.data;
};

export const getCraPdf = async (id) => {
  const response = await api.get(`/cra/${id}/pdf`, {
    responseType: 'blob',
  });

  return response.data;
};

export const createCra = async (craData) => {
  const response = await api.post('/cra', craData);
  return response.data;
};

export const submitCra = async (id) => {
  const response = await api.post(`/cra/${id}/submit`);
  return response.data;
};

export const checkCra = async (craData) => {
  const response = await api.post('/cra/check', craData);
  return response.data;
};

export const updateCra = async (id, craData) => {
  const response = await api.patch(`/cra/${id}`, craData);
  return response.data;
};

export const deleteCra = async (id) => {
  const response = await api.delete(`/cra/${id}`);
  return response.data;
};