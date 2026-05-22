export const endpoints = {
  example: {
    products: '/products',
    productById: (productId: number | string) => `/products/${productId}`
  },
  auth: {
    login: '/auth/login'
  },
  project: {
    auth: {
      login: '/api_yonetim/api/Auth/Login'
    },
    musteriKarti: {
      getAllWithPaging: (pageSize: number | string, page: number | string) =>
        `/api_musteri/MusteriKarti/GetAllMusteriKartiWithPaging?PageSize=${pageSize}&Page=${page}`
    }
  }
};
