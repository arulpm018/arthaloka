/** Ganti isi di sini. Tidak perlu mengubah komponen atau layout.
 * Tanggal tanpa jam: YYYY-MM-DD. Waktu acara: ISO dengan offset, misalnya +07:00.
 * Biarkan jam dan lokasi kosong sampai detail acara sudah pasti.
 */
window.weddingConfig = {
  // title: sebutan adat Minang di atas nama lengkap (kosongkan untuk menyembunyikan).
  bride: { nickname: 'Fifi', fullName: 'Fifi Mufida Syamra', title: 'Anak Daro', childOrder: '[pertama/kedua]', father: '[Nama Ayah]', mother: '[Nama Ibu]' },
  groom: { nickname: 'Arul', fullName: 'Hasrul Malik Putra Mashun', title: 'Marapulai', childOrder: '[pertama/kedua]', father: '[Nama Ayah]', mother: '[Nama Ibu]' },
  monogram: 'F & A',
  // Alamat undangan setelah online, misalnya 'https://fifi-arul.netlify.app/'.
  // Dipakai kirim-undangan.html untuk membuat link pribadi tiap tamu (?to=Nama).
  siteUrl: '',
  guestDefault: 'Bapak/Ibu/Saudara/i',
  date: '2026-12-26',
  // Kalender Slide 04. Ganti YYYY-MM-DD di sini; tanggal acara berjam di atas
  // (jika sudah diisi) akan dipakai otomatis. Tanpa jam, unduhan bersifat seharian.
  calendar: { date: '2026-12-26' },
  timeZone: 'Asia/Jakarta',
  timeZoneLabel: 'WIB',
  // title/subtitle: nama acara di undangan dan di file kalender. Baralek = pesta pernikahan adat Minang.
  akad: { title: 'Akad Nikah', start: null, end: null, venue: '[Nama Venue]', address: '[Alamat Lengkap]', mapUrl: 'https://maps.app.goo.gl/vn1mMLRZdnRBQqss7' },
  reception: { title: 'Baralek', subtitle: 'Resepsi Pernikahan', start: null, end: null, venue: '[Nama Venue]', address: '[Alamat Lengkap]', mapUrl: 'https://maps.app.goo.gl/vn1mMLRZdnRBQqss7',
    // Sesi resepsi (opsional). Tamu dengan link ...&sesi=2 melihat jam sesi ke-2 di undangan
    // dan di file kalender. Link tanpa &sesi tetap menampilkan jam resepsi di atas.
    // Isi start/end seperti format jam acara. Kosongkan daftar ini jika resepsi tidak dibagi sesi.
    sessions: [
      { name: 'Sesi 1', start: null, end: null },
      { name: 'Sesi 2', start: null, end: null }
    ] },
  illustrations: {
    venueSketch: 'assets/illustrations/venue-sketch-landscape.jpg',
    // Kartu di dalam amplop. Pita nama di atas karpetnya dipasang khusus untuk gambar ini
    // (vas dan bunga di depan pita diambil dari opening-card-front.webp).
    opening: 'assets/illustrations/opening-card-burgundy.webp',
    closing: 'assets/illustrations/closing-fifi-arul-portraits.webp',
    couple: 'assets/illustrations/couple.webp',
    profileCouple: 'assets/illustrations/profile-pair.webp',
    bride: '', groom: ''
  },
  decorations: {
    galleryCamera: 'assets/decorations/gallery-vintage-camera.webp',
    galleryFlorals: 'assets/decorations/gallery-songket-florals.webp',
    stage: 'assets/decorations/stage.webp',
    flowers: 'assets/decorations/orchids.webp',
    closingFlorals: 'assets/decorations/closing-orchid-garland.webp',
    verseFlorals: 'assets/decorations/verse-reference-florals.png',
    profileFlorals: 'assets/decorations/profile-reference-florals.png',
    dateFlorals: 'assets/decorations/profile-reference-florals.png',
    namesBotanical: 'assets/decorations/names-botanical.webp',
    namesCrest: 'assets/decorations/names-gold-crest.svg',
    celebrationFlorals: 'assets/decorations/celebration-rose-corner.webp',
    envelopePaper: 'assets/decorations/envelope-paper.webp',
    envelopeBouquet: 'assets/decorations/cover-art/bouquet.webp',
    envelopeCrest: 'assets/decorations/cover-art/crest.webp'
  },
  music: { src: 'assets/music/wedding-backsound-v2.mp3', volume: 0.45 },
  verse: {"reference": "QS. Ar-Rum: 21", "arabic": "وَمِنْ اٰيٰتِهٖٓ اَنْ خَلَقَ لَكُمْ مِّنْ اَنْفُسِكُمْ اَزْوَاجًا لِّتَسْكُنُوْٓا اِلَيْهَا وَجَعَلَ بَيْنَكُمْ مَّوَدَّةً وَّرَحْمَةً ۗ اِنَّ فِيْ ذٰلِكَ لَاٰيٰتٍ لِّقَوْمٍ يَّتَفَكَّرُوْنَ ۝٢١", "arabicLines": ["وَمِنْ اٰيٰتِهٖٓ اَنْ خَلَقَ لَكُمْ مِّنْ اَنْفُسِكُمْ اَزْوَاجًا", "لِّتَسْكُنُوْٓا اِلَيْهَا وَجَعَلَ بَيْنَكُمْ مَّوَدَّةً وَّرَحْمَةً ۗ", "اِنَّ فِيْ ذٰلِكَ لَاٰيٰتٍ لِّقَوْمٍ يَّتَفَكَّرُوْنَ ۝٢١"], "translation": "Di antara tanda-tanda (kebesaran)-Nya ialah bahwa Dia menciptakan pasangan-pasangan untukmu dari (jenis) dirimu sendiri agar kamu merasa tenteram kepadanya. Dia menjadikan di antaramu rasa cinta dan kasih sayang. Sesungguhnya pada yang demikian itu benar-benar terdapat tanda-tanda (kebesaran Allah) bagi kaum yang berpikir.", "verifiedSource": "https://quran.nu.or.id/ar-rum/21", "translationSource": "https://quran.kemenag.go.id/quran/per-ayat/surah/30?from=21&to=21"},
  openingText: 'Dengan memohon rahmat dan rida Allah SWT, kami bermaksud menyelenggarakan pernikahan putra-putri kami:',
  closingText: 'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir serta memberikan doa restu bagi pernikahan kami.',
  countdown: { enabled: true },
  // Dress code di bagian Acara. colors: nama + kode warna (diambil dari palet undangan).
  // extra: catatan tambahan (opsional). Disembunyikan otomatis setelah acara selesai.
  dressCode: {
    enabled: true,
    title: 'Dress Code',
    note: 'Kami akan sangat senang apabila Bapak/Ibu/Saudara/i berkenan mengenakan busana bernuansa warna berikut:',
    colors: [
      { name: 'Burgundy', hex: '#5a1f36' },
      { name: 'Dusty Rose', hex: '#c58a98' },
      { name: 'Champagne', hex: '#d9bf8c' },
      { name: 'Ivory', hex: '#f3e8d8' },
      { name: 'Olive', hex: '#5d6b45' }
    ],
    extra: ''
  },
  // Undangan berubah sendiri sesuai tanggal (zona waktu di atas): H-1, hari H, lalu mode
  // terima kasih setelah acara (setelah jam selesai akad/resepsi, atau pukul 00.00 esoknya).
  // Pratinjau kapan saja: tambahkan ?fase=h-1, ?fase=hari-h, atau ?fase=selesai di link.
  // live.url: link siaran langsung (YouTube, Instagram, Zoom). recordingUrl: rekaman untuk
  // setelah acara. Kosongkan untuk menyembunyikan bagian siaran.
  live: { url: '', platform: 'YouTube', recordingUrl: '' },
  after: {
    openingText: 'Dengan memohon rahmat dan rida Allah SWT, kami telah melangsungkan pernikahan putra-putri kami:',
    closingText: 'Terima kasih atas doa restu dan kehadiran Bapak/Ibu/Saudara/i di hari bahagia kami. Semoga Allah SWT membalas segala kebaikan yang telah diberikan.',
    // Foto hari H untuk galeri setelah acara (format sama dengan gallery.photos). Kosong = galeri tetap.
    photos: []
  },
  autoScroll: {
    enabled: true,
    transitionMs: 1500,
    pixelsPerSecond: 110,
    pauses: { names: 1800, verse: 4000, couple: 3500, date: 2000, celebration: 4000, gallery: 3000, gift: 3500, forever: 2500, credits: 4000 }
  },
  // Satu strip; order adalah urutan KELUAR dari printer (1, 2, 3, ...).
  // Jumlah lembar mengikuti jumlah foto di sini, maksimal 9; tambah foto ke-9 cukup di daftar ini.
  // src kosong = placeholder. fit 'contain' mempertahankan seluruh foto.
  // focus: [xPersen,yPersen] dipakai jika fit diganti menjadi 'cover'.
  gallery: {
    enabled: true,
    durationMs: 28000,
    photos: [
      {
            "order": 1,
            "src": "assets/photos/MASPIC-290.webp",
            "alt": "Pasangan duduk berdampingan di antara dekorasi bunga pink dan putih.",
            "fit": "contain",
            "focus": [
                  50,
                  50
            ],
            "width": 1440,
            "height": 961
      },
      {
            "order": 2,
            "src": "assets/photos/MASPIC-297.webp",
            "alt": "Mempelai wanita duduk dan mempelai pria berdiri di sampingnya.",
            "fit": "contain",
            "focus": [
                  50,
                  50
            ],
            "width": 1440,
            "height": 961
      },
      {
            "order": 3,
            "src": "assets/photos/MASPIC-305.webp",
            "alt": "Mempelai pria duduk dengan buket, mempelai wanita berdiri di sampingnya.",
            "fit": "contain",
            "focus": [
                  50,
                  50
            ],
            "width": 1440,
            "height": 961
      },
      {
            "order": 4,
            "src": "assets/photos/MASPIC-203.webp",
            "alt": "Pasangan saling memandang sambil membawa buket bunga di taman.",
            "fit": "contain",
            "focus": [
                  50,
                  50
            ],
            "width": 1440,
            "height": 961
      },
      {
            "order": 5,
            "src": "assets/photos/MASPIC-188.webp",
            "alt": "Mempelai wanita membawa buket dengan mempelai pria berdiri di belakangnya di taman.",
            "fit": "contain",
            "focus": [
                  50,
                  50
            ],
            "width": 1440,
            "height": 961
      },
      {
            "order": 6,
            "src": "assets/photos/MASPIC-235.webp",
            "alt": "Pasangan berpose di samping dinding batu dan tanaman hijau.",
            "fit": "contain",
            "focus": [
                  50,
                  50
            ],
            "width": 1440,
            "height": 961
      },
      {
            "order": 7,
            "src": "assets/photos/MASPIC-194.webp",
            "alt": "Pasangan berpelukan dengan buket bunga di taman.",
            "fit": "contain",
            "focus": [
                  50,
                  50
            ],
            "width": 1440,
            "height": 961
      },
      {
            "order": 8,
            "src": "assets/photos/MASPIC-189.webp",
            "alt": "Pasangan berdiri berdekatan membawa buket di halaman taman.",
            "fit": "contain",
            "focus": [
                  50,
                  50
            ],
            "width": 1440,
            "height": 961
      }
]
  },
  // Credit penutup ala film setelah salam penutup. Nama mempelai dan orang tua diambil dari
  // atas. inviters: daftar "Turut Mengundang". thanks: ucapan terima kasih (vendor, panitia);
  // hapus baris yang tidak dipakai. Setelah credit selesai, tirai menutup dengan ucapan terima kasih.
  credits: {
    enabled: true,
    inviters: ['[Keluarga Besar ...]', '[Keluarga Besar ...]', '[Keluarga Besar ...]'],
    thanks: [
      { role: 'Fotografi', name: '[Nama Vendor]' },
      { role: 'Busana & Rias', name: '[Nama Vendor]' },
      { role: 'Dekorasi', name: '[Nama Vendor]' }
    ]
  },
  // endpoint: URL aplikasi web Google Apps Script (berakhiran /exec). Cara pasang ada di
  // apps-script/rsvp.gs. Selama endpoint kosong, form tampil dengan tombol nonaktif.
  // showWishes: tampilkan ucapan tamu di bawah form (bisa disembunyikan per baris di Sheet).
  rsvp: { enabled: true, endpoint: 'https://script.google.com/macros/s/AKfycbwwp8rIXTyfn6B5VK83NaPTW8-BApSwExFNsZ83EzaHEEVfs3D-j31frmkYSmTXtysjyQ/exec', whatsapp: '', maxGuests: 4, showWishes: true },
  // Amplop digital. bank boleh diisi nama e-wallet (GoPay, DANA, OVO); tombol salin hanya
  // menyalin angka. Hapus satu baris accounts jika tidak dipakai; kosongkan address.text
  // untuk menyembunyikan bagian kirim kado. text: kalimat pengantar (opsional).
  gift: {
    enabled: true,
    accounts: [
      { bank: '[Nama Bank]', number: '[Nomor Rekening]', holder: '[Atas Nama]' },
      { bank: '[Nama Bank/E-wallet]', number: '[Nomor Rekening/HP]', holder: '[Atas Nama]' }
    ],
    address: { recipient: '[Nama Penerima]', phone: '', text: '[Alamat Lengkap Pengiriman Kado]' }
  }
};
