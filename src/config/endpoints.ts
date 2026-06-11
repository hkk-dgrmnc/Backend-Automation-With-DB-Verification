export const endpoints = {
  auth: {
    login: '/api_yonetim/api/Auth/Login'
  },
  musteriKarti: {
    getAllWithPaging: '/api_musteri/MusteriKarti/GetAllMusteriKartiWithPaging',
    getAllMusteriKartiNames: '/api_musteri/MusteriKarti/GetAllMusteriKartiNames'
  },
  kampanya: {
    addKampanyaKategori: '/api_kampanya/Kampanya/AddKampanyaKategori'
  },
  platform: {
    postPlatform: '/api_musteri/Platform'
  },
  sozlesme: {
    getByIdWithAllRelations: '/api_sozlesme/Sozlesme/GetByIdWithAllRelations'
  }
};
