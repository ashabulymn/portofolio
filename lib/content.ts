export type Language = 'id' | 'en';
export type Entry = { groupId?: string; url?: string; mediaId?: string; id: string; category: string; title: string; subtitle: string; body: string; order: number; visible: boolean; featured: boolean };
export type AIOptions = { temperature: number; maxTokens: number; timeoutMs: number; welcome: string; suggestions: string[] };
export const defaultAIOptions: AIOptions = { temperature: 0.2, maxTokens: 400, timeoutMs: 15000, welcome: '', suggestions: [] };
export type Content = { appearance?: { font: 'sans' | 'serif'; spacing: 'compact' | 'relaxed' }; aiOptions?: AIOptions; name: string; role: string; intro: string; email: string; whatsapp: string; location: string; headline: string; entries: Entry[]; seo: { title: string; description: string; noindex?: boolean; imageId?: string }; settings: { motion: boolean; ai: boolean; maintenance: boolean; theme: 'light' | 'dark'; aiModel: string; aiBaseUrl: string; aiPrompt: string; whatsappMessage: string } };
const services = [
  ['computer', 'Komputer & laptop', 'Computers & laptops', 'Perbaikan, instalasi, perawatan, dan troubleshooting.', 'Repair, installation, maintenance, and troubleshooting.'],
  ['network', 'Instalasi jaringan', 'Network installation', 'Koneksi LAN/FO, pemasangan perangkat, dan penanganan gangguan.', 'LAN/fiber connections, device installation, and troubleshooting.'],
  ['web', 'Website & aplikasi', 'Websites & applications', 'Pengembangan perangkat lunak untuk kebutuhan digital.', 'Software development for digital needs.'],
  ['cloud', 'Cloud computing', 'Cloud computing', 'Virtualisasi dan infrastruktur komputasi.', 'Virtualization and computing infrastructure.'],
  ['automation', 'Otomasi komputer', 'Computer automation', 'Membantu menyederhanakan pekerjaan berulang.', 'Helping simplify repetitive work.'],
  ['cctv', 'CCTV', 'CCTV', 'Perbaikan dan instalasi CCTV.', 'CCTV repair and installation.'],
  ['email', 'Email bisnis', 'Business email', 'Dukungan kebutuhan email bisnis.', 'Support for business email needs.'],
  ['maps', 'Peta & lokasi digital', 'Digital maps & locations', 'Dukungan informasi lokasi digital.', 'Support for digital location information.'],
  ['ac', 'Service AC', 'Air conditioning', 'Perbaikan dan perawatan AC.', 'Air-conditioning repair and maintenance.'],
];
const jobs = [
  ['2025-08 — CV 2025', 'PT. Lintas Jaringan Nusantara', 'Teknisi Jaringan', 'Network Technician', 'Survei, instalasi LAN/FO, troubleshooting onsite/remote, dan koordinasi NOC.', 'Site surveys, LAN/fiber installation, onsite/remote troubleshooting, and NOC coordination.'],
  ['2025-06 — 2025-07', 'Sumayyah Teknik', 'Teknisi AC', 'AC Technician', 'Perawatan sistem AC dan komunikasi teknis dengan pelanggan.', 'Air-conditioning maintenance and technical communication with customers.'],
  ['2025-01 — 2025-05', 'SMK Muhammadiyah 1 Weleri', 'Teknisi IT dan Guru Informatika', 'IT Technician & Informatics Teacher', 'Pemeliharaan komputer, jaringan, perangkat mobile, dan troubleshooting.', 'Computer, network, and mobile-device maintenance and troubleshooting.'],
  ['2024-01 — 2024-08', 'Kadeco Indonesia', 'UI/UX Designer', 'UI/UX Designer', 'Kolaborasi tim untuk menyelaraskan elemen desain UI/UX.', 'Team collaboration to align UI/UX design elements.'],
  ['2023-07 — 2023-12', 'Yayasan Kuntum Indonesia', 'Staf IT dan Leader Pondok', 'IT Staff & Boarding Facility Lead', 'Dukungan IT, perawatan perangkat, dan koordinasi lingkungan pondok.', 'IT support, hardware/software maintenance, and boarding-facility coordination.'],
  ['2021-08 — 2022-02', 'PT. Pyridam Farma, Tbk.', 'Medical Representative', 'Medical Representative', 'Relasi tenaga kesehatan, koordinasi penjualan, dan pengelolaan wilayah.', 'Healthcare professional relations, sales coordination, and territory management.'],
  ['2017-02 — 2021-07', 'SMK Muhammadiyah 1 Weleri', 'Pengembangan IT', 'IT Development', 'Pengembangan perangkat lunak, Git, perawatan perangkat, dan fasilitas IT.', 'Software development, Git version control, device maintenance, and IT facilities.'],
  ['2014-08 — 2016-02', 'PT. Gemanusa Sentra Teknologi', 'IT Support dan Customer Service', 'IT Support & Customer Service', 'Instalasi sistem, pemeliharaan, diagnosis masalah, dan penyelesaian tiket bantuan.', 'System installation, maintenance, troubleshooting, and support-ticket resolution.'],
];
export function initialContent(lang: Language): Content {
  const en = lang === 'en';
  return {
    name: 'Ashabul Yamin', role: 'IT Technical Support', location: 'Pelalawan, Indonesia', email: 'ashabulymn@gmail.com', whatsapp: '6285291916565',
    headline: en ? 'Technology that works.\nFor the people behind it.' : 'Teknologi yang bekerja.\nUntuk manusia di baliknya.',
    intro: en ? 'From everyday troubleshooting to connected infrastructure. Practical technical support, with clear communication at every step.' : 'Dari kendala sehari-hari hingga infrastruktur yang terhubung. Dukungan teknis yang praktis, dengan komunikasi yang jelas di setiap langkah.',
    seo: { title: 'Ashabul Yamin — IT Technical Support', description: en ? 'IT support, networks, websites, and technical services in Pelalawan, Indonesia.' : 'Dukungan IT, jaringan, website, dan layanan teknis di Pelalawan, Indonesia.' },
    settings: { motion: true, ai: false, maintenance: false, theme: 'light', aiModel: '', aiBaseUrl: 'https://api.openai.com/v1', aiPrompt: en ? 'You are a portfolio assistant, not Ashabul Yamin. Answer only from approved knowledge. If unknown, say so. Never invent prices, projects or professional facts.' : 'Anda asisten portofolio, bukan Ashabul Yamin. Jawab hanya berdasarkan pengetahuan yang disetujui. Jika tidak diketahui, katakan demikian. Jangan mengarang harga, proyek atau fakta profesional.', whatsappMessage: en ? 'Hello Ashabul, I would like to discuss a technical need.' : 'Halo Ashabul, saya ingin berdiskusi mengenai kebutuhan teknis.' },
    entries: [
      ...services.map((s, i) => ({ id: s[0], category: 'services', title: s[en ? 2 : 1], subtitle: '', body: s[en ? 4 : 3], order: i, visible: true, featured: i < 4 })),
      ...jobs.map((j, i) => ({ id: `job-${i}`, category: 'experience', title: j[en ? 3 : 2], subtitle: `${j[1]} · ${j[0]}`, body: j[en ? 5 : 4], order: i, visible: true, featured: false })),
      { id: 'education', category: 'education', title: en ? 'Informatics Engineering' : 'Teknik Informatika', subtitle: 'Universitas Selamat Sri · Kendal · 2022-08 (CV)', body: en ? 'Final assignment: building cloud computing based on Proxmox Virtual Environment at SMK Muhammadiyah 1 Weleri. Degree wording in the source requires owner confirmation.' : 'Tugas akhir: Membangun Cloud Computing Berbasis Proxmox Virtual Environment pada SMK Muhammadiyah 1 Weleri.', order: 0, visible: true, featured: false },
      ...(en ? ['IT troubleshooting', 'Virtualization', 'System administration', 'Networking', 'Software development', 'Hardware & software maintenance'] : ['Pemecahan masalah TI', 'Virtualisasi', 'Administrasi sistem', 'Jaringan komputer', 'Pengembangan perangkat lunak', 'Pemeliharaan perangkat keras & perangkat lunak']).map((title, i) => ({ id: `skill-${i}`, category: 'skills', title, subtitle: '', body: '', order: i, visible: true, featured: false })),
    ],
  };
}
export const categories = ['services', 'experience', 'education', 'skills', 'skill-categories', 'projects', 'faq', 'social', 'navigation', 'ai-knowledge'];
