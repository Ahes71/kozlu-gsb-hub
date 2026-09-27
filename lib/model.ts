export type Row = { id: string; organization_id?: string; [key: string]: any };
export type Field = {
  key: string;
  label: string;
  type: string;
  options?: string[];
  relation?: string;
  required?: boolean;
};
export type Module = {
  key: string;
  title: string;
  singular: string;
  description: string;
  fields: Field[];
  columns: string[];
};
const f = (
  key: string,
  label: string,
  type = "text",
  required = false,
): Field => ({ key, label, type, required });
const s = (key: string, label: string, options: string[]): Field => ({
  ...f(key, label, "select"),
  options,
});
const r = (
  key: string,
  label: string,
  relation: string,
  required = false,
): Field => ({ ...f(key, label, "relation", required), relation });
export const categories = [
  "Spor",
  "Eğitim",
  "Kültür-Sanat",
  "Gönüllülük",
  "Toplantı",
  "Kurum ziyareti",
];
export const roles: Record<string, string> = {
  director: "Müdür",
  manager: "Yönetici",
  staff: "Personel",
};
export const modules: Module[] = [
  {
    key: "events",
    title: "Etkinlikler",
    singular: "Etkinlik",
    description: "Bir fikirden gerçekleşen faaliyete. Tüm program tek yerde.",
    columns: ["name", "category", "starts_at", "facility_id", "status"],
    fields: [
      f("name", "Etkinlik adı", "text", true),
      s("category", "Kategori", categories),
      f("starts_at", "Başlangıç", "datetime-local", true),
      f("ends_at", "Bitiş", "datetime-local", true),
      r("facility_id", "Tesis / alan", "facilities", true),
      r("responsible_id", "Sorumlu personel", "memberships", true),
      f("capacity", "Kapasite", "number", true),
      f("expected_attendance", "Tahmini katılım", "number"),
      s("age_group", "Hedef yaş grubu", [
        "Tümü",
        "7–12",
        "13–14",
        "15–18",
        "19–25",
        "26+",
      ]),
      s("status", "Durum", ["planned", "completed", "cancelled"]),
      f("is_public", "Herkese açık", "checkbox"),
      f("description", "Açıklama", "textarea"),
    ],
  },
  {
    key: "tasks",
    title: "Görevler",
    singular: "Görev",
    description: "Kimin, neyi, ne zamana kadar yapacağı belli olsun.",
    columns: ["name", "assigned_to", "due_at", "priority", "status"],
    fields: [
      f("name", "Görev", "text", true),
      r("assigned_to", "Sorumlu", "memberships", true),
      r("event_id", "İlgili etkinlik", "events"),
      f("due_at", "Son tarih", "datetime-local", true),
      s("priority", "Öncelik", ["normal", "high", "urgent"]),
      s("status", "Durum", ["open", "in_progress", "done"]),
      f("description", "Not", "textarea"),
      f("checklist_text", "Kontrol listesi (her satır bir iş)", "textarea"),
    ],
  },
  {
    key: "facilities",
    title: "Tesisler",
    singular: "Tesis",
    description: "Alanları verimli kullanın, program çakışmalarını önleyin.",
    columns: ["name", "status", "capacity", "description"],
    fields: [
      f("name", "Tesis / alan adı", "text", true),
      s("status", "Durum", ["active", "maintenance", "closed"]),
      f("capacity", "Kapasite", "number"),
      f("description", "Açıklama / konum", "textarea"),
      f("is_public", "Herkese açık", "checkbox"),
    ],
  },
  {
    key: "maintenance_tickets",
    title: "Sorun & bakım",
    singular: "Sorun bildirimi",
    description: "Bildirilen her sorun, çözülene kadar takipte.",
    columns: ["name", "facility_id", "priority", "status", "closed_at"],
    fields: [
      f("name", "Kısa başlık", "text", true),
      r("facility_id", "Tesis", "facilities", true),
      s("category", "Kategori", [
        "Aydınlatma",
        "Zemin",
        "Ekipman",
        "Temizlik",
        "Diğer",
      ]),
      s("priority", "Önem", ["low", "normal", "urgent"]),
      f("description", "Açıklama", "textarea", true),
      f("photo", "Fotoğraf (en fazla 5 MB)", "file"),
      s("status", "Durum", ["open", "in_progress", "resolved"]),
    ],
  },
  {
    key: "inventory_items",
    title: "Envanter",
    singular: "Malzeme",
    description:
      "Günlük malzeme takibi. Resmî demirbaş muhasebesi yerine geçmez.",
    columns: ["name", "quantity", "condition", "facility_id"],
    fields: [
      f("name", "Malzeme adı", "text", true),
      f("quantity", "Adet", "number", true),
      s("condition", "Durum", ["good", "damaged", "repair"]),
      r("facility_id", "Bulunduğu tesis", "facilities"),
      f("description", "Not", "textarea"),
    ],
  },
  {
    key: "requests",
    title: "Talepler",
    singular: "Talep",
    description: "İhtiyaçları görün, kararları ve tamamlanmayı izleyin.",
    columns: ["name", "priority", "status", "created_at"],
    fields: [
      f("name", "İhtiyaç", "text", true),
      f("description", "Gerekçe", "textarea", true),
      s("priority", "Öncelik", ["normal", "high", "urgent"]),
      s("status", "Durum", [
        "pending",
        "reviewing",
        "approved",
        "completed",
        "rejected",
      ]),
    ],
  },
  {
    key: "institution_partners",
    title: "İşbirlikleri",
    singular: "Kurum",
    description: "Okullar, yerel yönetimler ve paydaşlarla ortak üretim.",
    columns: ["name", "kind", "description"],
    fields: [
      f("name", "Kurum adı", "text", true),
      s("kind", "Kurum türü", [
        "Okul",
        "Belediye",
        "Üniversite",
        "Kulüp",
        "Diğer",
      ]),
      f("description", "Not", "textarea"),
    ],
  },
  {
    key: "collaborations",
    title: "Ortak faaliyetler",
    singular: "İşbirliği kaydı",
    description: "Kurum, faaliyet ve elde edilen sonuç.",
    columns: ["partner_id", "event_id", "outcome", "created_at"],
    fields: [
      r("partner_id", "Kurum", "institution_partners", true),
      r("event_id", "Etkinlik", "events", true),
      f("outcome", "Sonuç", "textarea"),
    ],
  },
  {
    key: "announcements",
    title: "Duyurular",
    singular: "Duyuru",
    description: "Kozlu’nun programını herkesle paylaşın.",
    columns: ["name", "published", "created_at"],
    fields: [
      f("name", "Başlık", "text", true),
      f("body", "Duyuru metni", "textarea", true),
      f("published", "Yayımla", "checkbox"),
    ],
  },
  {
    key: "anonymous_ideas",
    title: "Fikir havuzu",
    singular: "Fikir",
    description: "İsim toplamadan, gençlerin sesine kulak verin.",
    columns: ["category", "body", "status", "created_at"],
    fields: [
      s("status", "Değerlendirme", [
        "new",
        "reviewing",
        "accepted",
        "archived",
      ]),
    ],
  },
  {
    key: "anonymous_feedback",
    title: "Değerlendirmeler",
    singular: "Değerlendirme",
    description: "Etkinliklerden gelen anonim geri bildirimler.",
    columns: ["event_id", "rating", "would_return", "suggestion", "created_at"],
    fields: [],
  },
  {
    key: "audit_logs",
    title: "İşlem geçmişi",
    singular: "İşlem",
    description: "Kim, neyi, ne zaman değiştirdi?",
    columns: ["created_at", "actor_id", "table_name", "action", "record_id"],
    fields: [],
  },
];
export const labels: Record<string, string> = {
  planned: "Planlandı",
  completed: "Tamamlandı",
  cancelled: "İptal",
  open: "Açık",
  in_progress: "Devam ediyor",
  done: "Tamamlandı",
  active: "Aktif",
  maintenance: "Bakımda",
  closed: "Kapalı",
  resolved: "Çözüldü",
  good: "Kullanılabilir",
  damaged: "Arızalı",
  repair: "Onarımda",
  pending: "Bekliyor",
  reviewing: "İnceleniyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
  new: "Yeni",
  accepted: "Değerlendirildi",
  archived: "Arşiv",
  normal: "Normal",
  high: "Yüksek",
  urgent: "Acil",
  low: "Düşük",
  name: "Ad",
  category: "Kategori",
  starts_at: "Başlangıç",
  facility_id: "Tesis",
  status: "Durum",
  assigned_to: "Sorumlu",
  due_at: "Son tarih",
  priority: "Öncelik",
  capacity: "Kapasite",
  description: "Açıklama",
  closed_at: "Çözülme",
  quantity: "Adet",
  condition: "Durum",
  created_at: "Tarih",
  kind: "Tür",
  partner_id: "Kurum",
  event_id: "Etkinlik",
  outcome: "Sonuç",
  published: "Yayımlandı",
  body: "İçerik",
  rating: "Puan",
  would_return: "Tekrar katılır",
  suggestion: "Öneri",
  actor_id: "Kullanıcı",
  table_name: "Kayıt türü",
  action: "İşlem",
  record_id: "Kayıt",
};
export function localDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
export function dateText(v: string) {
  return new Date(v).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
