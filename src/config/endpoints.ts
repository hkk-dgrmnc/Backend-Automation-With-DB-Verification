export const endpoints = {
  example: {
    products: '/products',
    productById: (productId: number | string) => `/products/${productId}`
  },
  auth: {
    login: '/auth/login'
  }
};
