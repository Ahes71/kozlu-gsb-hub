"use client";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Download,
  ChartNoAxesCombined,
  TrendingUp,
  Lightbulb,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rpc, explain } from "@/lib/db";
import { localDate } from "@/lib/model";
const metrics: Record<string, string> = {
  events: "Gerçekleşen faaliyet",
  attendance: "Toplam katılım",
  average_attendance: "Ortalama katılım",
  facility_hours: "Tesis kullanım saati",
  volunteering: "Gönüllülük faaliyeti",
  collaborations: "Ortak faaliyet",
  tasks_opened: "Açılan görev",
  tasks_completed: "Tamamlanan görev",
  issues_opened: "Açılan tesis sorunu",
  issues_resolved: "Çözülen sorun",
  resolution_days: "Ortalama çözüm (gün)",
  satisfaction: "Memnuniyet / 5",
  feedback_count: "Anonim değerlendirme",
};
export default function Reports({
  db,
  org,
  insights,
}: {
  db: SupabaseClient | null;
  org?: string;
  insights: boolean;
}) {
  const [month, setMonth] = useState(localDate().slice(0, 7)),
    [report, setReport] = useState<any>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!db || !org) {
      setReport(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setError("");
    rpc(
      db,
      insights ? "insights" : "monthly_report",
      insights ? { p_org: org } : { p_org: org, p_month: month + "-01" },
    )
      .then((r) => {
        if (alive) setReport(r);
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
  }, [db, org, month, insights]);
  return (
    <section className="panel reports">
      <div className="panel-heading">
        <div>
          <h2>{insights ? "Kozlu Gençlik Nabzı" : "Aylık faaliyet raporu"}</h2>
          <p>
            {insights
              ? "Son 30 gün · Toplu operasyon verilerinden"
              : "Tamamlanan faaliyetler · Türkiye saat dilimi"}
          </p>
        </div>
        {!insights && (
          <div className="report-controls">
            <Input
              type="month"
              aria-label="Rapor ayı"
              value={month}
              onChange={(e) => {
                if (e.target.value) setMonth(e.target.value);
              }}
            />
            <Button
              disabled={!report || !db || !org || loading || !!error}
              onClick={() => window.print()}
            >
              <Download size={16} /> PDF / Yazdır
            </Button>
          </div>
        )}
      </div>
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="loading">Rapor hesaplanıyor…</p>
      ) : !report || !db || !org ? (
        <div className="empty">
          <ChartNoAxesCombined size={36} />
          <h3>Her faaliyet, görünür bir katkı.</h3>
          <p>Veritabanı bağlandığında raporlar kayıtlarınızdan hesaplanacak.</p>
        </div>
      ) : insights ? (
        <div className="padded">
          <div className="decision-alerts">
            {report.high_demand?.map((d: any, i: number) => (
              <div className="notice" key={"high" + i}>
                <strong>
                  {d.facility} · {d.category}
                </strong>
                <p>
                  Son dört tamamlanmış haftanın her birinde kapasite en az %90.
                  Ortalama %{d.occupancy}. Ek seans değerlendirilebilir.
                </p>
              </div>
            ))}
            {report.low_demand?.map((d: any, i: number) => (
              <div className="notice" key={"low" + i}>
                <strong>
                  {d.name} · {d.facility}
                </strong>
                <p>
                  Son üç faaliyetin her birinde katılım kapasitenin %35 altında.
                  Saat ve içeriği gözden geçirin.
                </p>
              </div>
            ))}
            {!report.high_demand?.length && !report.low_demand?.length && (
              <p className="muted">
                Dört haftalık yüksek doluluk veya son üç oturumda düşük katılım
                uyarısı bulunmuyor. Bunun nedeni yeterli kayıt olmaması da
                olabilir.
              </p>
            )}
          </div>
          <div className="insight-grid">
            <article className="insight-card">
              <Activity />
              <h3>Katılım / kapasite</h3>
              <p>Son 28 günde tamamlanan faaliyetler</p>
              {report.capacity.length ? (
                report.capacity.map((c: any) => (
                  <div className="insight-row" key={c.category}>
                    <strong>{c.category}</strong>
                    <span>
                      %{c.occupancy} · {c.events} faaliyet
                    </span>
                    {c.events >= 3 && Number(c.occupancy) >= 90 && (
                      <small>Ek seans ihtiyacını değerlendirin.</small>
                    )}
                    {c.events >= 3 && Number(c.occupancy) < 35 && (
                      <small>
                        Program saatini ve içeriğini gözden geçirin.
                      </small>
                    )}
                  </div>
                ))
              ) : (
                <p>Yeterli faaliyet verisi yok.</p>
              )}
            </article>
            <article className="insight-card">
              <Lightbulb />
              <h3>En çok konuşulan fikirler</h3>
              <p>Son 30 gün / önceki 30 gün</p>
              {report.ideas.length ? (
                report.ideas.map((c: any) => (
                  <div className="insight-row" key={c.category}>
                    <strong>{c.category}</strong>
                    <span>{c.recent} fikir</span>
                    <small>
                      {c.previous > 0
                        ? `Önceki döneme göre %${Math.round(((c.recent - c.previous) / c.previous) * 100)}`
                        : "Karşılaştırma için önceki dönem verisi yok"}
                    </small>
                  </div>
                ))
              ) : (
                <p>Henüz fikir gönderilmedi.</p>
              )}
            </article>
            <article className="insight-card">
              <TrendingUp />
              <h3>Hareketli zamanlar</h3>
              <p>Gerçekleşen faaliyetlerin başlangıçları</p>
              {report.busy_times.map((t: any, i: number) => (
                <div className="insight-row" key={i}>
                  <strong>
                    {
                      [
                        "",
                        "Pazartesi",
                        "Salı",
                        "Çarşamba",
                        "Perşembe",
                        "Cuma",
                        "Cumartesi",
                        "Pazar",
                      ][t.day_number]
                    }{" "}
                    {String(t.hour_number).padStart(2, "0")}:00
                  </strong>
                  <span>{t.events} faaliyet</span>
                </div>
              ))}
              <div className="insight-row">
                <strong>Memnuniyet</strong>
                <span>{report.satisfaction ?? "—"} / 5</span>
              </div>
            </article>
          </div>
          <p className="report-note">
            Göstergeler öneridir. Yaş dağılımı katılımcı profili değil,
            etkinliğin hedef yaş grubudur. Kapasite ölçümü kategori toplamıdır;
            dört hafta kesintisiz doluluk iddiası taşımaz.
          </p>
        </div>
      ) : (
        <div className="report-body">
          <div className="print-title">
            <h1>KOZLU GSB HUB</h1>
            <h2>{month} Faaliyet Raporu</h2>
            <p>Oluşturulma: {new Date().toLocaleString("tr-TR")}</p>
          </div>
          <div className="report-metrics">
            {Object.entries(metrics).map(([key, label]) => (
              <article key={key}>
                <small>{label}</small>
                <strong>
                  {report[key] === null
                    ? "—"
                    : Number(report[key]).toLocaleString("tr-TR")}
                </strong>
              </article>
            ))}
          </div>
          <h3>Kategoriye göre katılım</h3>
          {report.categories.length ? (
            <div className="report-chart">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={report.categories}>
                  <CartesianGrid vertical={false} stroke="#e5eae8" />
                  <XAxis dataKey="category" tick={{ fontSize: 13 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    name="Katılım"
                    dataKey="attendance"
                    fill="#176b59"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="muted">Bu ay tamamlanmış faaliyet yok.</p>
          )}
          <table className="report-table">
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Faaliyet</th>
                <th>Katılım</th>
              </tr>
            </thead>
            <tbody>
              {report.categories.map((c: any) => (
                <tr key={c.category}>
                  <td>{c.category}</td>
                  <td>{c.events}</td>
                  <td>{c.attendance}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>Etkinliklerin hedef yaş grubu</h3>
          <table className="report-table">
            <thead>
              <tr>
                <th>Hedef yaş grubu</th>
                <th>Faaliyetlere toplam katılım</th>
              </tr>
            </thead>
            <tbody>
              {report.age_groups.map((a: any) => (
                <tr key={a.age_group}>
                  <td>{a.age_group}</td>
                  <td>{a.attendance}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="report-note">
            {report.attendance_source} Görev ve sorun sayıları, seçilen ay
            açılan kayıtların rapor anındaki durumudur. Tesis saati, tamamlanan
            etkinliklerin planlanan süresidir. Hedef yaş grubu katılımcıların
            ölçülmüş yaşı değildir. Memnuniyet yalnız yanıt verenlerin
            ortalamasıdır.
          </p>
          <p className="muted no-print">
            PDF / Yazdır düğmesinden tarayıcının “PDF olarak kaydet” seçeneğini
            kullanabilirsiniz.
          </p>
        </div>
      )}
    </section>
  );
}
