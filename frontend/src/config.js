// Gambar bawaan untuk gedung yang belum punya foto.
// Disarankan: unduh gambar, simpan di frontend/public/img/gedung.jpg,
// lalu ganti nilai di bawah menjadi "/img/gedung.jpg".
export const DEFAULT_IMG =
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR7qfCj2Za-P7oIH_K_74_3ENZD-fQrjPRxQZWIgL8xkQ&s=10";

export const TABS = [
  {
    id: "pernikahan", label: "Pernikahan", icon: "💍",
    desc: "Gedung resepsi dengan pelaminan, ruang rias pengantin, dan parkir luas untuk akad maupun pesta pernikahan.",
    acara: ["Akad nikah", "Resepsi pernikahan", "Pesta pernikahan"],
  },
  {
    id: "adat", label: "Adat & Duka", icon: "🏛️",
    desc: "Balai adat dan gedung serbaguna berkapasitas besar untuk upacara adat serta acara duka, dengan ruang keluarga dan area tenda.",
    acara: ["Upacara adat", "Acara duka", "Acara adat lainnya"],
  },
  {
    id: "ulang_tahun", label: "Ulang Tahun", icon: "🎂",
    desc: "Ruang pesta yang hangat dengan panggung kecil, sound system, dan area dekorasi untuk ulang tahun dan syukuran.",
    acara: ["Ulang tahun anak", "Ulang tahun dewasa", "Syukuran"],
  },
];
