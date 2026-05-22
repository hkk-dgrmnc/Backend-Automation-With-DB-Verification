export const endpoints = {
  project: {
    auth: {
      login: '/api_yonetim/api/Auth/Login'
    },
    musteriKarti: {
      getAllWithPaging: (params: Record<string, number | string>) => {
        const queryParams = new URLSearchParams({
          PageSize: String(params.pageSize),
          Page: String(params.page)
        });

        return `/api_musteri/MusteriKarti/GetAllMusteriKartiWithPaging?${queryParams.toString()}`;
      }
    }
  }
};
