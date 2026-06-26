import api from './api';

export const getMyActiveAssignment = async () => {
  const response = await api.get('/collaborator-assignments/my-active');
  return response.data;
};