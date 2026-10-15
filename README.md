<p align="center">
  <img src="./assets/icon.png" alt="Dear Diary logosu" width="140" />
</p>

<h1 align="center">Dear Diary</h1>

<p align="center">
  Kendine ait küçük bir alan.<br />
  Kâğıt temalı, tamamen cihazında çalışan günlük uygulaması.
</p>

---

## Nedir?

Dear Diary, **React Native + Expo** ile yapılmış bir günlük uygulamasıdır. Hesap açmana ya da internete bağlanmana gerek yok. Yazdığın her şey yalnızca telefonundaki yerel veritabanında saklanır.


## Özellikler

- **Günlük listesi:** notlar son düzenlenme tarihine göre sıralanır
- **Kâğıt temaları:** Krem, Lavanta, Pudra ve Simli Pembe. Tema sonradan da değiştirilebilir
- **Zengin metin editörü:** kalın, italik, altı çizili, üstü çizili, başlıklar (H1/H2), paragraf, madde işaretli ve numaralı liste
- **Yazı rengi:** altı hazır renkle seçili metni renklendirme
- **Otomatik kayıt:** yazmayı bıraktığında not kendiliğinden kaydedilir, istersen elle de kaydedebilirsin
- **PDF dışa aktarma:** notunu seçtiğin kâğıt temasıyla A4 PDF yapıp paylaş
- **Silmeden önce onay:** yanlışlıkla not kaybetmemen için
- **Küçük bir sürpriz:** liste ekranında ara sıra bir inek gezinir 🐄

## Kullanılan teknolojiler

| Alan | Teknoloji |
| --- | --- |
| Çatı | Expo, React Native, React, TypeScript |
| Yerel veri | `expo-sqlite` |
| Zengin metin | `react-native-pell-rich-editor`, `react-native-webview` |
| PDF ve paylaşım | `expo-print`, `expo-sharing`, `expo-file-system` |
| Animasyon | `lottie-react-native` |
| Güvenli alan | `react-native-safe-area-context` |

## Kurulum

Gereksinimler: [Node.js](https://nodejs.org) (LTS) ve telefonda **Expo Go** uygulaması ya da bir Android emülatörü / iOS simülatörü.

```bash
git clone https://github.com/Busrwa/dear_diary.git
cd dear_diary
npm install
npx expo start
```

Terminalde çıkan QR kodu Expo Go ile okut. Emülatör için `a` (Android) veya `i` (iOS, yalnızca macOS) tuşuna bas.

Bir şeyler garip davranırsa önbelleği temizleyerek başlat:

```bash
npx expo start -c
```

TypeScript kontrolü:

```bash
npx tsc --noEmit
```

## Proje yapısı

```text
App.tsx                  Ana uygulama: liste ekranı, editör, paneller
index.ts                 Giriş noktası
app.json                 Expo ayarları
assets/                  Simgeler ve inek animasyonları
src/
  components/
    NoteCard.tsx         Liste kartı
  database/
    db.ts                Tablo oluşturma
    notesRepository.ts   Not ekleme, listeleme, silme
  papers/
    paperThemes.ts       Kâğıt temaları
  services/
    pdfExport.ts         PDF oluşturma ve paylaşma
  types/
    note.ts              Not tipi
  editor/                Şimdilik kullanılmayan yardımcılar
```

## Durum

- Android'de test edildi.
- iOS için uyarlamalar yapıldı. (klavye, PDF kenar boşlukları, gölge)
- Notlar yalnızca cihazda saklanır. Uygulama silinirse notlar da silinir.


## Nasıl geliştirildi?

Uygulamanın fikri, tasarımı, ürün kararları ve testleri [@Busrwa](https://github.com/Busrwa)'ya aittir. 


## Lisans

[MIT](./LICENSE) © 2026 Busrwa
