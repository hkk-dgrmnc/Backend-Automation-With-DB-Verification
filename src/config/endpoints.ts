export const endpoints = {
  auth: {
    login: '/api_yonetim/api/Auth/Login'
  },
  musteriKarti: {
    getAllMusteriKartiWithPaging: '/api_musteri/MusteriKarti/GetAllMusteriKartiWithPaging',
    getAllMusteriKartiNames: '/api_musteri/MusteriKarti/GetAllMusteriKartiNames'
  },
  kampanya: {
    addKampanyaKategori: '/api_kampanya/Kampanya/AddKampanyaKategori'
  },
  platform: {
    createPlatform: '/api_musteri/Platform'
  },
  sozlesme: {
    getByIdWithAllRelations: '/api_sozlesme/Sozlesme/GetByIdWithAllRelations'
  }
};
