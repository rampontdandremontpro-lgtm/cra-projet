import api from './api';

export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const getUserById = async (id) => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};

export const getAssignedClients = async (userId) => {
  const response = await api.get(`/users/${userId}/clients`);
  return response.data;
};

export const assignClients = async (userId, clientIds) => {
  const response = await api.post(
    `/users/${userId}/clients`,
    {
      clientIds,
    }
  );

  return response.data;
};