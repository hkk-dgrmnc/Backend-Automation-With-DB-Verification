export const endpoints = {
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
    },
    getAllMusteriKartiNames: '/api_musteri/MusteriKarti/GetAllMusteriKartiNames'
  },
  kampanya: {
    addKampanyaKategori: '/api_kampanya/Kampanya/AddKampanyaKategori'
  },
  platform: {
    postPlatform: '/api_musteri/Platform'
  }
};
