export const getDashboardPathByRole = (role) => {
  switch (role) {
    case 'COLLABORATEUR':
      return '/dashboard';

    case 'CLIENT':
      return '/client/dashboard';

    case 'RH':
      return '/rh/dashboard';

    case 'ADMIN':
      return '/admin/dashboard';

    default:
      return '/login';
  }
};