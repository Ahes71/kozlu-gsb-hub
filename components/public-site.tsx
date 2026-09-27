"use client";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ArrowUpRight,
  CalendarDays,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Lightbulb,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Toaster, toast } from "sonner";
import { rpc, explain, type Config } from "@/lib/db";
import { dateText, localDate, type Row } from "@/lib/model";
export default function PublicSite({
  db,
  config,
  token,
  onStaff,
}: {
  db: SupabaseClient | null;
  config: Config | null;
  token: string | null;
  onStaff: () => void;
}) {
  const [program, setProgram] = useState<any>(null),
    [event, setEvent] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [tab, setTab] = useState("events"),
    [category, setCategory] = useState("Spor"),
    [rating, setRating] = useState(5),
    [returning, setReturning] = useState("yes"),
    [sent, setSent] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    rpc(
      db,
      token ? "public_event" : "public_program",
      token ? { p_token: token } : { p_slug: config?.slug },
    )
      .then((d) => {
        if (alive) {
          if (token) setEvent(d);
          else setProgram(d);
          if (!d) setError("Etkinlik veya kurum bulunamadı.");
        }
      })
      .catch((e) => {
        if (alive) setError(explain(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [db, config, token]);
  async function submit(kind: string, data: Record<string, unknown>) {
    if (!db) {
      toast.error("Veritabanı bağlantısı henüz tamamlanmadı.");
      return;
    }
    setBusy(true);
    try {
      let device = localStorage.getItem("kozlu-anonymous-device");
      if (!device) {
        device = crypto.randomUUID();
        localStorage.setItem("kozlu-anonymous-device", device);
      }
      const result = await rpc(db, "anonymous_submit", {
        p_kind: kind,
        p_slug: config?.slug,
        p_token: token,
        p_device: device,
        p_data: data,
      });
      setSent((s) => ({ ...s, [kind]: true }));
      toast.success(
        result.duplicate
          ? "Bu cihazdan daha önce gönderilmiş."
          : "Teşekkürler, kaydedildi.",
      );
    } catch (e) {
      toast.error(explain(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="public-shell">
      <Toaster richColors />
      <header className="public-header">
        <a className="brand" href="/?public=1">
          <span className="brand-mark">
            K<span>↗</span>
          </span>
          <span>
            KOZLU<span className="brand-sub">GENÇLİK & SPOR</span>
          </span>
        </a>
        <Button variant="outline" onClick={onStaff}>
          Personel girişi <ArrowUpRight size={16} />
        </Button>
      </header>
      <main className="public-main">
        {token ? (
          <>
            <p className="eyebrow">BİRLİKTE DAHA GÜZEL</p>
            <h1>{event?.name || "Etkinlik katılımı"}</h1>
            {event && <p className="muted">{dateText(event.starts_at)}</p>}
            {event && (
              <div className="public-two">
                <section className="panel padded">
                  <ShieldCheck className="teal" size={32} />
                  <h2>İyi ki buradasın.</h2>
                  <p>
                    İsim, telefon veya hesap gerekmiyor. Katılımını tek
                    dokunuşla bildir.
                  </p>
                  {sent.attendance ? (
                    <p className="success">
                      <CheckCircle2 /> Katılımın kaydedildi.
                    </p>
                  ) : (
                    <Button
                      disabled={busy || !event.attendance_open}
                      onClick={() => submit("attendance", {})}
                    >
                      {event.attendance_open
                        ? "Etkinliğe katıldım"
                        : "Katılım sayımı şu an kapalı"}
                    </Button>
                  )}
                  <small className="muted">
                    Aynı tarayıcıdan tekrar gönderimler sayılmaz. Bu sayım tekil
                    kişi doğrulaması değildir.
                  </small>
                </section>
                <section className="panel padded">
                  <h2>Nasıl geçti?</h2>
                  {sent.feedback ? (
                    <p className="success">
                      <CheckCircle2 /> Değerlendirmen kaydedildi.
                    </p>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        submit("feedback", {
                          rating,
                          would_return: returning === "yes",
                          suggestion: fd.get("suggestion"),
                        });
                      }}
                    >
                      <Label>Etkinliği nasıl değerlendirirsin?</Label>
                      <div className="stars" role="group" aria-label="Puan">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            aria-label={n + " yıldız"}
                            aria-pressed={rating === n}
                            onClick={() => setRating(n)}
                          >
                            <Star
                              fill={n <= rating ? "#dba348" : "none"}
                              color="#dba348"
                            />
                          </button>
                        ))}
                      </div>
                      <Label>
                        Tekrar katılır mısın?
                        <Select value={returning} onValueChange={setReturning}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Evet</SelectItem>
                            <SelectItem value="no">Hayır</SelectItem>
                          </SelectContent>
                        </Select>
                      </Label>
                      <Label>
                        Sonraki etkinlik ne olsun?
                        <Textarea
                          name="suggestion"
                          maxLength={2000}
                          placeholder="Kişisel bilgi yazmadan fikrini paylaş."
                        />
                      </Label>
                      <Button disabled={busy || !event.feedback_open}>
                        {event.feedback_open
                          ? "Değerlendirmeyi gönder"
                          : "Değerlendirme şu an kapalı"}
                      </Button>
                    </form>
                  )}
                </section>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="public-hero">
              <p className="eyebrow">KOZLU’DA BİR ARAYA GELİYORUZ</p>
              <h1>
                Bugün ne yapmak
                <br />
                istersiniz?
              </h1>
              <p>
                Spor, yeni fikirler ve birlikte öğrenmek için
                <br />
                Kozlu’nun programına göz atın.
              </p>
              <span className="hero-symbol" aria-hidden>
                ↗
              </span>
            </div>
            <div className="public-tabs">
              {[
                ["events", "Etkinlikler"],
                ["facilities", "Tesisler"],
                ["announcements", "Duyurular"],
                ["idea", "Fikir gönder"],
              ].map(([k, t]) => (
                <Button
                  key={k}
                  variant={tab === k ? "default" : "ghost"}
                  onClick={() => setTab(k)}
                >
                  {t}
                </Button>
              ))}
            </div>
            {tab === "events" && (
              <>
                <h2>Yaklaşan program</h2>
                <div className="public-cards">
                  {program?.events?.length ? (
                    program.events.map((e: Row) => (
                      <article className="panel public-event" key={e.id}>
                        <span className="badge">{e.category}</span>
                        <h3>{e.name}</h3>
                        <p>
                          <CalendarDays size={16} />
                          {dateText(e.starts_at)}
                        </p>
                        <p>
                          <MapPin size={16} />
                          {program.facilities.find(
                            (f: Row) => f.id === e.facility_id,
                          )?.name || "Etkinlik alanı"}
                        </p>
                        <p className="muted">{e.description}</p>
                        <div className="public-event-meta">
                          <span>{e.capacity} kişilik</span>
                          <span>{e.age_group}</span>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="empty">
                      <CalendarDays />
                      <h3>Program yakında burada</h3>
                      <p>Yayımlanan etkinlikler bu alanda listelenecek.</p>
                    </div>
                  )}
                </div>
              </>
            )}
            {tab === "facilities" && (
              <div className="public-cards">
                {program?.facilities?.map((f: Row) => (
                  <article key={f.id} className="panel padded">
                    <h3>{f.name}</h3>
                    <span className="badge">
                      {f.status === "active"
                        ? "Aktif"
                        : f.status === "maintenance"
                          ? "Bakımda"
                          : "Kapalı"}
                    </span>
                    <p>{f.description}</p>
                  </article>
                ))}
                {!program?.facilities?.length && (
                  <p className="empty">Yayımlanmış tesis yok.</p>
                )}
              </div>
            )}
            {tab === "announcements" && (
              <div className="public-cards">
                {program?.announcements?.map((a: Row) => (
                  <article key={a.id} className="panel padded">
                    <small>{dateText(a.created_at)}</small>
                    <h3>{a.name}</h3>
                    <p className="preserve">{a.body}</p>
                  </article>
                ))}
                {!program?.announcements?.length && (
                  <p className="empty">Henüz duyuru yok.</p>
                )}
              </div>
            )}
            {tab === "idea" && (
              <section className="panel idea-form">
                <Lightbulb size={32} className="teal" />
                <h2>Kozlu için bir fikrin var mı?</h2>
                <p>
                  İsim veya telefon istemiyoruz. Sadece fikrini duymak
                  istiyoruz.
                </p>
                {sent.idea ? (
                  <p className="success">
                    <CheckCircle2 /> Fikrin yönetime iletildi. Teşekkürler!
                  </p>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      if (fd.get("website")) return;
                      submit("idea", { category, body: fd.get("body") });
                    }}
                  >
                    <div className="honeypot" aria-hidden>
                      <Input name="website" tabIndex={-1} autoComplete="off" />
                    </div>
                    <Label>
                      Kategori
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "Spor",
                            "Teknoloji",
                            "Kültür",
                            "Sanat",
                            "Eğitim",
                            "Gönüllülük",
                            "Diğer",
                          ].map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Label>
                    <Label>
                      Fikrin
                      <Textarea
                        name="body"
                        required
                        minLength={10}
                        maxLength={2000}
                        rows={5}
                        placeholder="Kozlu’da şöyle bir etkinlik olsa…"
                      />
                    </Label>
                    <p className="muted small">
                      Kendinin veya başkasının isim, telefon, okul numarası ya
                      da sağlık bilgisini yazma.
                    </p>
                    <Button disabled={busy || !db}>
                      Fikrimi gönder <ArrowUpRight size={16} />
                    </Button>
                  </form>
                )}
              </section>
            )}
          </>
        )}
        {loading && <p className="notice">Program yükleniyor…</p>}
        {!db && (
          <p className="notice">
            Kurumun veritabanı bağlantısı hazırlanıyor. Henüz yayımlanmış canlı
            içerik yok.
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </main>
      <footer className="public-footer">
        <ShieldCheck size={17} /> Hesap açmadan keşfet, katıl, fikrini paylaş.
        <span>KOZLU GSB HUB · Pilot</span>
      </footer>
    </div>
  );
}
