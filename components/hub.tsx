"use client";
import { useCallback, useEffect, useState, lazy, Suspense } from "react";
import type { SupabaseClient, Session } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarCheck,
  ClipboardList,
  Building2,
  Wrench,
  Package,
  Inbox,
  Handshake,
  Megaphone,
  Lightbulb,
  ChartNoAxesCombined,
  Activity,
  History,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  Menu,
  LogOut,
  ShieldCheck,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Globe,
  CheckCircle2,
  Clock3,
  MapPin,
  Download,
  Settings2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Toaster, toast } from "sonner";
import { client, explain, rows, rpc, type Config } from "@/lib/db";
import {
  modules,
  labels,
  roles,
  localDate,
  dateText,
  type Row,
  type Module,
} from "@/lib/model";
import AuthPanel from "./auth-panel";
import PublicSite from "./public-site";
import ResourceDetail from "./resource-detail";
const Reports = lazy(() => import("./reports"));
const icons: Record<string, any> = {
  dashboard: LayoutDashboard,
  calendar: CalendarDays,
  events: CalendarCheck,
  tasks: ClipboardList,
  facilities: Building2,
  maintenance_tickets: Wrench,
  inventory_items: Package,
  requests: Inbox,
  institution_partners: Handshake,
  collaborations: Handshake,
  announcements: Megaphone,
  anonymous_ideas: Lightbulb,
  anonymous_feedback: Activity,
  reports: ChartNoAxesCombined,
  insights: Activity,
  audit_logs: History,
  team: Users,
};
const nav = [
  ["dashboard", "Genel bakış"],
  ["calendar", "Haftalık takvim"],
  ...modules.slice(0, 6).map((m) => [m.key, m.title]),
  ["institution_partners", "İşbirlikleri"],
  ["collaborations", "Ortak faaliyetler"],
  ["announcements", "Duyurular"],
  ["anonymous_ideas", "Fikir havuzu"],
  ["anonymous_feedback", "Değerlendirmeler"],
  ["reports", "Raporlar"],
  ["insights", "Gençlik nabzı"],
  ["team", "Ekip & yetkiler"],
  ["audit_logs", "İşlem geçmişi"],
];
const staffHidden = [
  "reports",
  "insights",
  "audit_logs",
  "team",
  "anonymous_ideas",
  "anonymous_feedback",
];
function Empty({
  title = "Henüz kayıt yok",
  text = "İlk kaydı oluşturduğunuzda burada görünecek.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <div className="empty">
      <CalendarDays size={32} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
function Choice({
  value,
  onChange,
  options,
  placeholder = "Seçin",
}: {
  value: string;
  onChange: (s: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <Select
      value={value || "__empty"}
      onValueChange={(v) => onChange(v === "__empty" ? "" : v)}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__empty">{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export default function Hub() {
  const [config, setConfig] = useState<Config | null>(null),
    [db, setDb] = useState<SupabaseClient | null>(null),
    [session, setSession] = useState<Session | null>(null),
    [members, setMembers] = useState<Row[]>([]),
    [member, setMember] = useState<Row | null>(null),
    [orgs, setOrgs] = useState<Row[]>([]),
    [view, setView] = useState("dashboard"),
    [mobile, setMobile] = useState(false),
    [login, setLogin] = useState(false),
    [mfa, setMfa] = useState(false),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [dash, setDash] = useState<any>(null),
    [data, setData] = useState<Row[]>([]),
    [lookup, setLookup] = useState<Record<string, Row[]>>({}),
    [page, setPage] = useState(0),
    [count, setCount] = useState(0),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [editor, setEditor] = useState<{ module: Module; row?: Row } | null>(null),
    [detail, setDetail] = useState<Row | null>(null),
    [revision, setRevision] = useState(0),
    [week, setWeek] = useState(0),
    [publicMode, setPublicMode] = useState(false),
    [token, setToken] = useState<string | null>(null),
    [reset, setReset] = useState(false);
  const org = member?.organization_id,
    manager = member?.role === "director" || member?.role === "manager";
  const activeModule = modules.find((m) => m.key === view);
  const reload = () => setRevision((v) => v + 1);
  const refreshAuth = useCallback(async () => {
    if (!db) return;
    const {
      data: { session: s },
    } = await db.auth.getSession();
    setSession(s);
    if (!s) {
      setMember(null);
      setMembers([]);
      setMfa(false);
      return;
    }
    const { data: ms, error } = await db
      .from("memberships")
      .select("*")
      .eq("user_id", s.user.id)
      .eq("active", true);
    if (error) throw error;
    setMembers(ms || []);
    const current =
      ms?.find((m) => m.organization_id === org) || ms?.[0] || null;
    setMember(current);
    const { data: os, error: oe } = await db.from("organizations").select("*");
    if (oe) throw oe;
    setOrgs(os || []);
    const { data: aal, error: ae } =
      await db.auth.mfa.getAuthenticatorAssuranceLevel();
    if (ae) throw ae;
    setMfa(
      Boolean(
        current && current.role !== "staff" && aal?.currentLevel !== "aal2",
      ),
    );
  }, [db, org]);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setPublicMode(p.has("public") || p.has("katilim"));
    setToken(p.get("katilim"));
    setReset(
      p.has("reset") ||
        new URLSearchParams(location.hash.slice(1)).get("type") === "invite",
    );
    if (p.get("view") && nav.some((n) => n[0] === p.get("view")))
      setView(p.get("view")!);
    fetch("/api/config")
      .then((r) => {
        if (!r.ok) throw new Error("Yapılandırma okunamadı");
        return r.json() as Promise<Config>;
      })
      .then((c: Config) => {
        setConfig(c);
        if (c.url && c.key) setDb(client(c));
        else setBusy(false);
      })
      .catch((e) => {
        setError(explain(e));
        setBusy(false);
      });
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => {
    if (!db) return;
    refreshAuth()
      .catch((e) => setError(explain(e)))
      .finally(() => setBusy(false));
    const { data } = db.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setReset(true);
      if (event === "SIGNED_OUT") {
        setMember(null);
        setDash(null);
        setData([]);
        setLookup({});
        setDetail(null);
        setEditor(null);
      } else if (event === "SIGNED_IN" || event === "MFA_CHALLENGE_VERIFIED")
        setTimeout(() => refreshAuth().catch((e) => setError(explain(e))), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [db, refreshAuth]);
  useEffect(() => {
    if (!db || !session) return;
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      clearTimeout(timeout);
      timeout = setTimeout(
        () => {
          db.auth.signOut({ scope: "local" });
          toast("30 dakika hareketsizlik nedeniyle oturum kapatıldı.");
        },
        30 * 60 * 1000,
      );
    };
    schedule();
    window.addEventListener("pointerdown", schedule);
    window.addEventListener("keydown", schedule);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("pointerdown", schedule);
      window.removeEventListener("keydown", schedule);
    };
  }, [db, session]);
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(0);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => {
    if (!db || !org || mfa) return;
    let alive = true;
    Promise.all(
      ["facilities", "memberships", "events", "institution_partners"].map(
        async (table) => [table, await rows(db, table, org)] as const,
      ),
    )
      .then((entries) => {
        if (alive) setLookup(Object.fromEntries(entries));
      })
      .catch((e) => setError(explain(e)));
    return () => {
      alive = false;
    };
  }, [db, org, mfa, revision]);
  useEffect(() => {
    if (!db || !org || mfa) return;
    let alive = true;
    setBusy(true);
    setError("");
    (async () => {
      if (view === "dashboard") {
        const d = await rpc(db, "dashboard", { p_org: org });
        if (alive) setDash(d);
      } else if (view === "calendar") {
        const monday = weekStart(week);
        const end = new Date(monday);
        end.setDate(end.getDate() + 7);
        const { data, error } = await db
          .from("events")
          .select("*")
          .eq("organization_id", org)
          .gte("starts_at", monday.toISOString())
          .lt("starts_at", end.toISOString())
          .order("starts_at");
        if (error) throw error;
        if (alive) setData(data || []);
      } else if (activeModule) {
        let q = db
          .from(activeModule.key)
          .select("*", { count: "exact" })
          .eq("organization_id", org)
          .order("created_at", { ascending: false });
        if (query) {
          const column = activeModule.fields.some((f) => f.key === "name")
            ? "name"
            : activeModule.columns.includes("body")
              ? "body"
              : null;
          if (column) q = q.ilike(column, `%${query.replace(/[%_\\]/g, "")}%`);
        }
        const { data, error, count } = await q.range(page * 25, page * 25 + 24);
        if (error) throw error;
        if (alive) {
          setData(data || []);
          setCount(count || 0);
        }
      }
    })()
      .catch((e) => {
        if (alive) setError(explain(e));
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [db, org, mfa, view, revision, page, query, week, activeModule]);
  function navigate(next: string) {
    setView(next);
    setPage(0);
    setSearch("");
    setMobile(false);
    setDetail(null);
    history.replaceState(null, "", "?view=" + next);
  }
  function name(table: string, id: string) {
    return lookup[table]?.find((r) => r.id === id)?.name || "—";
  }
  function display(key: string, v: any) {
    if (v === null || v === undefined || v === "") return "—";
    if (key.endsWith("_at")) return dateText(v);
    const rel: Record<string, string> = {
      facility_id: "facilities",
      assigned_to: "memberships",
      responsible_id: "memberships",
      event_id: "events",
      partner_id: "institution_partners",
    };
    if (rel[key]) return name(rel[key], v);
    if (typeof v === "boolean") return v ? "Evet" : "Hayır";
    return labels[v] || String(v);
  }
  const newEvent = () => {
    if (!db) {
      toast("Önce Supabase bağlantısını tamamlayın.");
      return;
    }
    if (!member) {
      setLogin(true);
      return;
    }
    setEditor({ module: modules[0] });
  };
  if (publicMode)
    return (
      <PublicSite
        db={db}
        config={config}
        token={token}
        onStaff={() => {
          setPublicMode(false);
          setToken(null);
          history.replaceState(null, "", "/");
          setLogin(true);
        }}
      />
    );
  return (
    <div className="app-shell">
      <Toaster richColors position="top-right" />
      <aside className={"sidebar " + (mobile ? "is-open" : "")}>
        <a className="brand" href="/">
          <span className="brand-mark">
            K<span>↗</span>
          </span>
          <span>
            KOZLU<span className="brand-sub">GSB HUB</span>
          </span>
        </a>
        <div className="workspace-label">ORTAK ÇALIŞMA ALANI</div>
        <nav>
          {nav
            .filter(
              ([key]) => member?.role !== "staff" || !staffHidden.includes(key),
            )
            .map(([key, title], i) => {
              const Icon = icons[key];
              return (
                <button
                  key={key}
                  onClick={() => navigate(key)}
                  className={
                    "nav-item " +
                    (view === key ? "selected" : "") +
                    (i === 2 || key === "reports" ? " group-start" : "")
                  }
                >
                  <Icon size={19} />
                  <span>{title}</span>
                  {key === "tasks" && dash?.tasks > 0 && (
                    <small>{dash.tasks}</small>
                  )}
                </button>
              );
            })}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="public-link"
            onClick={() => {
              setPublicMode(true);
              history.replaceState(null, "", "?public=1");
            }}
          >
            <Globe size={17} /> Kamuya açık site <ArrowUpRight size={16} />
          </button>
          <div className="org-sign">
            <span className="org-avatar">KG</span>
            <span>
              Kozlu İlçe Müdürlüğü<small>Gençlik ve Spor</small>
            </span>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          aria-label="Menüyü kapat"
          className="scrim"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-toggle"
              onClick={() => setMobile(!mobile)}
              aria-label="Menü"
            >
              <Menu />
            </button>
            <span>Çalışma alanı</span>
            <ChevronRight size={14} />
            <strong>{nav.find((n) => n[0] === view)?.[1]}</strong>
          </div>
          <div className="top-actions">
            <span className="today-label">
              {new Date().toLocaleDateString("tr-TR", {
                timeZone: "Europe/Istanbul",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span
              className={
                "connection " + (db && member && !mfa ? "connected" : "")
              }
            >
              {db
                ? member && !mfa
                  ? "Bağlı"
                  : "Giriş gerekli"
                : "Kurulum bekliyor"}
            </span>
            {session ? (
              <>
                <button
                  className="user-avatar"
                  title={member?.name || "Personel"}
                  onClick={() => navigate("team")}
                >
                  {member?.name?.slice(0, 1) || "P"}
                </button>
                <button
                  aria-label="Çıkış yap"
                  onClick={() => db?.auth.signOut()}
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setLogin(true)}>
                Personel girişi
              </Button>
            )}
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <p className="eyebrow">KOZLU · GENÇLİK VE SPOR</p>
              <h1>
                {view === "dashboard"
                  ? `Merhaba${member ? ", " + member.name.split(" ")[0] : ", Kozlu"}.`
                  : nav.find((n) => n[0] === view)?.[1]}
              </h1>
              <p className="muted">
                {view === "dashboard"
                  ? "Bugünün planı, ekibiniz ve ihtiyaçlarınız. Hepsi bir arada."
                  : activeModule?.description ||
                    "Birlikte planlayın, gelişimi birlikte görün."}
              </p>
            </div>
            {view === "dashboard" || view === "calendar" ? (
              <Button className="primary" onClick={newEvent}>
                <Plus size={18} /> Etkinlik oluştur
              </Button>
            ) : activeModule &&
              activeModule.fields.length > 0 &&
              !["anonymous_ideas"].includes(view) &&
              (manager ||
                ["events", "maintenance_tickets", "requests"].includes(
                  view,
                )) ? (
              <Button
                className="primary"
                onClick={() => setEditor({ module: activeModule })}
              >
                <Plus size={18} /> {activeModule.singular} oluştur
              </Button>
            ) : null}
          </div>
          {!config?.url && !busy && (
            <div className="setup-banner">
              <div className="setup-icon">
                <Settings2 size={23} />
              </div>
              <div>
                <strong>
                  Çalışma alanınız hazır. Sıradaki adım: veritabanını bağlamak.
                </strong>
                <p>
                  Yeni Supabase projenizi bağladıktan sonra etkinlikler,
                  görevler ve raporlar gerçek kayıtlarınızla çalışacak. Burada
                  örnek veri gösterilmiyor.
                </p>
              </div>
              <span className="step-tag">KURULUM · 1 / 3</span>
            </div>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
              <Button variant="outline" onClick={reload}>
                <RefreshCw size={15} /> Tekrar dene
              </Button>
            </div>
          )}
          {session && !member && !busy && (
            <div className="notice">
              Hesabınıza henüz kurum yetkisi verilmemiş. Kurum müdürünüzün
              personel kaydını tanımlaması gerekiyor.
            </div>
          )}
          {mfa && db ? (
            <AuthPanel
              db={db}
              mfa
              onDone={() => {
                refreshAuth();
                reload();
              }}
            />
          ) : busy ? (
            <div className="loading">
              <RefreshCw className="spin" /> Kayıtlar yükleniyor…
            </div>
          ) : (
            <>
              {view === "dashboard" && (
                <>
                  <section className="metrics">
                    {[
                      {
                        label: "Bugünkü etkinlik",
                        v: dash?.events,
                        icon: CalendarDays,
                        note: "Günün programı",
                        color: "teal",
                      },
                      {
                        label: "Toplam katılım",
                        v: dash?.attendance,
                        icon: Users,
                        note: "Bugünkü faaliyetlerde",
                        color: "blue",
                      },
                      {
                        label: "Kullanılan tesis",
                        v: dash?.facilities,
                        icon: Building2,
                        note: "Programda yer alan",
                        color: "amber",
                      },
                      {
                        label: "Görevli personel",
                        v: dash?.staff,
                        icon: ShieldCheck,
                        note: "Etkinlik sorumluları",
                        color: "violet",
                      },
                    ].map((k) => (
                      <div className="metric" key={k.label}>
                        <div className="metric-top">
                          <span>{k.label}</span>
                          <k.icon className={k.color} size={20} />
                        </div>
                        <strong>
                          {k.v === undefined
                            ? "—"
                            : k.v.toLocaleString("tr-TR")}
                        </strong>
                        <small>{k.note}</small>
                      </div>
                    ))}
                  </section>
                  <div className="overview-grid">
                    <section className="panel program">
                      <div className="panel-heading">
                        <div>
                          <h2>Bugünkü program</h2>
                          <p>
                            {new Date().toLocaleDateString("tr-TR", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })}
                          </p>
                        </div>
                        <button onClick={() => navigate("calendar")}>
                          Takvimi aç <ArrowUpRight size={16} />
                        </button>
                      </div>
                      {dash?.program?.length ? (
                        dash.program.map((e: Row) => (
                          <button
                            className="program-event"
                            key={e.id}
                            onClick={() => setDetail(e)}
                          >
                            <time>
                              {new Date(e.starts_at).toLocaleTimeString(
                                "tr-TR",
                                {
                                  timeZone: "Europe/Istanbul",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </time>
                            <span
                              className={"category-line cat-" + e.category}
                            />
                            <span className="event-info">
                              <strong>{e.name}</strong>
                              <span>
                                <MapPin size={13} />
                                {name("facilities", e.facility_id)} ·{" "}
                                {name("memberships", e.responsible_id)}
                              </span>
                            </span>
                            <span className="attendance">
                              <strong>
                                {e.attendance} <small>/ {e.capacity}</small>
                              </strong>
                              <span className="progress-track">
                                <i
                                  style={{
                                    width:
                                      Math.min(
                                        100,
                                        (e.attendance / e.capacity) * 100,
                                      ) + "%",
                                  }}
                                />
                              </span>
                            </span>
                            <ChevronRight size={17} />
                          </button>
                        ))
                      ) : (
                        <Empty
                          title={
                            db && member
                              ? "Bugün için etkinlik yok"
                              : "Programınız burada hayat bulacak"
                          }
                          text="Etkinlik oluşturun, tesis ve sorumluyu seçin. Günlük programınız kendiliğinden oluşsun."
                        />
                      )}
                      <button className="panel-footer" onClick={newEvent}>
                        <Plus size={17} /> Yeni etkinlik planla
                      </button>
                    </section>
                    <section className="panel attention">
                      <div className="panel-heading">
                        <h2>Takip gerektirenler</h2>
                        <span className="tiny-dot" />
                      </div>
                      <button
                        className="attention-row"
                        onClick={() => navigate("tasks")}
                      >
                        <span className="soft-icon amber">
                          <ClipboardList size={20} />
                        </span>
                        <span>
                          <strong>Açık görevler</strong>
                          <small>Tamamlanmayı bekliyor</small>
                        </span>
                        <b>{dash?.tasks ?? "—"}</b>
                        <ChevronRight size={16} />
                      </button>
                      <button
                        className="attention-row"
                        onClick={() => navigate("maintenance_tickets")}
                      >
                        <span className="soft-icon rose">
                          <Wrench size={20} />
                        </span>
                        <span>
                          <strong>Tesis sorunları</strong>
                          <small>Çözüm bekliyor</small>
                        </span>
                        <b>{dash?.issues ?? "—"}</b>
                        <ChevronRight size={16} />
                      </button>
                      <div className="team-note">
                        <span className="note-symbol">↗</span>
                        <h3>
                          İyi bir gün,
                          <br />
                          iyi bir planla başlar.
                        </h3>
                        <p>
                          Ekibinize görev verin,
                          <br />
                          birlikte tamamlayın.
                        </p>
                        <button onClick={() => navigate("tasks")}>
                          Görevlere git <ArrowRight size={16} />
                        </button>
                      </div>
                    </section>
                  </div>
                  <section className="quick-grid">
                    <button onClick={() => navigate("facilities")}>
                      <Building2 />
                      <div>
                        <h3>Tesisleri planla</h3>
                        <p>Alanlar, programlar ve bakım</p>
                      </div>
                      <ArrowUpRight />
                    </button>
                    <button onClick={() => navigate("anonymous_ideas")}>
                      <Lightbulb />
                      <div>
                        <h3>Gençlere kulak ver</h3>
                        <p>Fikirler ve anonim geri bildirimler</p>
                      </div>
                      <ArrowUpRight />
                    </button>
                    <button onClick={() => navigate("reports")}>
                      <ChartNoAxesCombined />
                      <div>
                        <h3>Emeği görünür kıl</h3>
                        <p>Faaliyetlerden aylık rapora</p>
                      </div>
                      <ArrowUpRight />
                    </button>
                  </section>
                  <div className="privacy-note">
                    <ShieldCheck size={16} /> Vatandaş hesabı yok. İhtiyaç kadar
                    veri, birlikte daha iyi hizmet.
                  </div>
                </>
              )}
              {view === "calendar" && (
                <section className="panel">
                  <div className="panel-heading">
                    <Button
                      variant="outline"
                      onClick={() => setWeek((w) => w - 1)}
                      aria-label="Önceki hafta"
                    >
                      <ChevronLeft />
                    </Button>
                    <h2>
                      {dateText(weekStart(week).toISOString()).split(" ")[0]}{" "}
                      {weekStart(week).toLocaleDateString("tr-TR", {
                        month: "long",
                        year: "numeric",
                      })}{" "}
                      · Haftalık program
                    </h2>
                    <div>
                      <Button variant="ghost" onClick={() => setWeek(0)}>
                        Bu hafta
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setWeek((w) => w + 1)}
                        aria-label="Sonraki hafta"
                      >
                        <ChevronRight />
                      </Button>
                    </div>
                  </div>
                  <div className="week-grid">
                    {Array.from({ length: 7 }, (_, i) => {
                      const day = weekStart(week);
                      day.setDate(day.getDate() + i);
                      const events = data.filter(
                        (e) =>
                          localDate(new Date(e.starts_at)) === localDate(day),
                      );
                      return (
                        <div className="day-column" key={i}>
                          <div
                            className={
                              localDate(day) === localDate()
                                ? "day-label current"
                                : "day-label"
                            }
                          >
                            <span>
                              {day.toLocaleDateString("tr-TR", {
                                weekday: "short",
                              })}
                            </span>
                            <strong>{day.getDate()}</strong>
                          </div>
                          {events.length ? (
                            events.map((e) => (
                              <button
                                key={e.id}
                                className={"calendar-event cat-" + e.category}
                                onClick={() => setDetail(e)}
                              >
                                <small>
                                  {new Date(e.starts_at).toLocaleTimeString(
                                    "tr-TR",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      timeZone: "Europe/Istanbul",
                                    },
                                  )}
                                </small>
                                <strong>{e.name}</strong>
                                <span>{name("facilities", e.facility_id)}</span>
                              </button>
                            ))
                          ) : (
                            <p className="day-empty">Program yok</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="legend">
                    {[
                      "Spor",
                      "Eğitim",
                      "Kültür-Sanat",
                      "Gönüllülük",
                      "Toplantı",
                      "Kurum ziyareti",
                    ].map((c) => (
                      <span key={c}>
                        <i className={"cat-" + c} />
                        {c}
                      </span>
                    ))}
                  </div>
                </section>
              )}
              {activeModule && (
                <section className="panel">
                  <div className="table-toolbar">
                    <div className="search">
                      <Search size={18} />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Kayıtlarda ara…"
                        aria-label="Kayıtlarda ara"
                      />
                    </div>
                    <span>{count} kayıt</span>
                    <Button
                      variant="ghost"
                      onClick={reload}
                      aria-label="Yenile"
                    >
                      <RefreshCw size={17} />
                    </Button>
                  </div>
                  {data.length ? (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {activeModule.columns.map((c) => (
                              <TableHead key={c}>{labels[c] || c}</TableHead>
                            ))}
                            <TableHead>İşlem</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.map((row) => (
                            <TableRow key={row.id}>
                              {activeModule.columns.map((c) => (
                                <TableCell key={c}>
                                  {[
                                    "status",
                                    "priority",
                                    "condition",
                                    "category",
                                  ].includes(c) ? (
                                    <span className={"badge badge-" + row[c]}>
                                      {display(c, row[c])}
                                    </span>
                                  ) : (
                                    <span className="cell-text">
                                      {display(c, row[c])}
                                    </span>
                                  )}
                                </TableCell>
                              ))}
                              <TableCell>
                                {view === "events" ? (
                                  <Button
                                    variant="ghost"
                                    onClick={() => setDetail(row)}
                                  >
                                    Aç <ArrowUpRight size={14} />
                                  </Button>
                                ) : view === "tasks" ? (
                                  <Button
                                    variant="ghost"
                                    onClick={() =>
                                      setDetail({ ...row, _task: true })
                                    }
                                  >
                                    Aç
                                  </Button>
                                ) : ["facilities", "inventory_items"].includes(
                                    view,
                                  ) ? (
                                  <Button
                                    variant="ghost"
                                    onClick={() =>
                                      setDetail({
                                        ...row,
                                        _resource: true,
                                        _inventory: view === "inventory_items",
                                      })
                                    }
                                  >
                                    Ayrıntılar
                                  </Button>
                                ) : activeModule.fields.length > 0 &&
                                  manager ? (
                                  <Button
                                    variant="ghost"
                                    onClick={() =>
                                      setEditor({ module: activeModule, row })
                                    }
                                  >
                                    Düzenle
                                  </Button>
                                ) : null}
                                {view === "maintenance_tickets" &&
                                  row.photo_path && (
                                    <Button
                                      variant="ghost"
                                      onClick={async () => {
                                        const { data, error } =
                                          await db!.storage
                                            .from("issue-photos")
                                            .createSignedUrl(
                                              row.photo_path,
                                              60,
                                            );
                                        if (error) toast.error(explain(error));
                                        else
                                          window.open(
                                            data.signedUrl,
                                            "_blank",
                                            "noopener,noreferrer",
                                          );
                                      }}
                                    >
                                      Fotoğraf
                                    </Button>
                                  )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="pagination">
                        <Button
                          variant="outline"
                          disabled={page === 0}
                          onClick={() => setPage((p) => p - 1)}
                        >
                          Önceki
                        </Button>
                        <span>Sayfa {page + 1}</span>
                        <Button
                          variant="outline"
                          disabled={(page + 1) * 25 >= count}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          Sonraki
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Empty
                      text={
                        db && member
                          ? "Henüz kayıt yok. Yeni bir kayıt oluşturarak başlayın."
                          : "Kayıtları görmek için veritabanı bağlantısı ve personel girişi gerekli."
                      }
                    />
                  )}
                </section>
              )}
              {(view === "reports" || view === "insights") && (
                <Suspense
                  fallback={<p className="loading">Raporlar yükleniyor…</p>}
                >
                  <Reports db={db} org={org} insights={view === "insights"} />
                </Suspense>
              )}
              {view === "team" && (
                <section className="panel">
                  <div className="panel-heading">
                    <h2>Ekip ve kurum erişimi</h2>
                  </div>
                  {members.length > 1 && (
                    <div className="padded">
                      <Label>
                        Aktif kurum
                        <Choice
                          value={org || ""}
                          onChange={(v) => {
                            setMember(
                              members.find((m) => m.organization_id === v) ||
                                null,
                            );
                            setLookup({});
                            setData([]);
                            setDash(null);
                            reload();
                          }}
                          options={orgs.map((o) => ({
                            value: o.id,
                            label: o.name,
                          }))}
                        />
                      </Label>
                    </div>
                  )}
                  {lookup.memberships?.map((m) => (
                    <div className="team-row" key={m.id}>
                      <span className="user-avatar">{m.name.slice(0, 1)}</span>
                      <strong>{m.name}</strong>
                      <span>{roles[m.role]}</span>
                      <span className="badge">
                        {m.active ? "Aktif" : "Pasif"}
                      </span>
                    </div>
                  ))}
                  {member?.role === "director" && db && org && (
                    <TeamForm db={db} org={org} onDone={reload} />
                  )}
                  <p className="padded muted">
                    Personel hesapları Supabase Auth üzerinden kurum tarafından
                    davet edilir. Müdür ve yöneticiler için iki adımlı doğrulama
                    zorunludur.
                  </p>
                </section>
              )}
            </>
          )}
          <footer className="main-footer">
            <span>KOZLU GSB HUB</span>
            <span>Planla. Birlikte uygula. Gelişimi gör.</span>
          </footer>
        </main>
      </div>
      <Dialog open={login} onOpenChange={setLogin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Personel girişi</DialogTitle>
            <DialogDescription>Yalnız kurum personeli için.</DialogDescription>
          </DialogHeader>
          {db ? (
            <AuthPanel
              db={db}
              mfa={mfa}
              onDone={() => {
                refreshAuth();
                setLogin(false);
                reload();
              }}
            />
          ) : (
            <div className="notice">
              Giriş için önce Supabase projesinin bağlanması gerekiyor.
              Vatandaşların hesap açmasına gerek yok.
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={reset && !!session} onOpenChange={setReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni parola belirle</DialogTitle>
            <DialogDescription>En az 12 karakter kullanın.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const password = String(
                new FormData(e.currentTarget).get("password"),
              );
              const { error } = await db!.auth.updateUser({ password });
              if (error) toast.error(explain(error));
              else {
                toast.success("Parolanız güncellendi.");
                setReset(false);
                history.replaceState(null, "", "/");
              }
            }}
          >
            <Input
              name="password"
              type="password"
              minLength={12}
              required
              autoComplete="new-password"
            />
            <Button>Parolayı kaydet</Button>
          </form>
        </DialogContent>
      </Dialog>
      {editor && db && org && (
        <RecordEditor
          db={db}
          org={org}
          member={member!}
          editor={editor}
          lookup={lookup}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            reload();
            toast.success("Kayıt kaydedildi.");
          }}
        />
      )}
      {detail && db && detail._resource && (
        <ResourceDetail
          db={db}
          row={detail}
          inventory={detail._inventory}
          editable={manager}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEditor({
              module: modules.find(
                (m) =>
                  m.key ===
                  (detail._inventory ? "inventory_items" : "facilities"),
              )!,
              row: detail,
            });
            setDetail(null);
          }}
        />
      )}
      {detail && db && !detail._resource && (
        <RecordDetail
          db={db}
          row={detail}
          name={name}
          manager={manager}
          member={member!}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEditor({
              module: modules.find(
                (m) => m.key === (detail._task ? "tasks" : "events"),
              )!,
              row: detail,
            });
            setDetail(null);
          }}
          onSaved={reload}
        />
      )}
    </div>
  );
}
function weekStart(offset: number) {
  const today = localDate();
  const d = new Date(today + "T12:00:00+03:00");
  const weekday = new Date(today + "T00:00:00Z").getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((weekday + 6) % 7) + offset * 7);
  return new Date(d.toISOString().slice(0, 10) + "T00:00:00+03:00");
}
function RecordEditor({
  db,
  org,
  member,
  editor,
  lookup,
  onClose,
  onSaved,
}: {
  db: SupabaseClient;
  org: string;
  member: Row;
  editor: { module: Module; row?: Row };
  lookup: Record<string, Row[]>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const mod = editor.module,
    existing = editor.row;
  const [values, setValues] = useState<Record<string, any>>(() =>
      Object.fromEntries(
        mod.fields.map((f) => {
          let v =
            existing?.[f.key] ??
            (f.type === "checkbox"
              ? false
              : (f.options?.[0] ??
                (f.relation === "memberships" && member.role === "staff"
                  ? member.id
                  : f.type === "number"
                    ? 0
                    : "")));
          if (f.type === "datetime-local" && v)
            v = new Date(new Date(v).getTime() + 3 * 3600000)
              .toISOString()
              .slice(0, 16);
          return [f.key, v];
        }),
      ),
    ),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [photo, setPhoto] = useState<File | null>(null);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    let uploaded: string | undefined;
    try {
      const payload: Record<string, any> = { organization_id: org };
      for (const f of mod.fields) {
        if (["photo", "checklist_text"].includes(f.key)) continue;
        const v = values[f.key];
        if (f.required && (v === "" || v === undefined))
          throw new Error(f.label + " gerekli.");
        payload[f.key] =
          f.type === "datetime-local"
            ? v
              ? new Date(v + ":00+03:00").toISOString()
              : null
            : f.type === "number"
              ? v === ""
                ? null
                : Number(v)
              : f.relation
                ? v || null
                : (v ?? "");
      }
      if (
        mod.key === "events" &&
        new Date(payload.ends_at) <= new Date(payload.starts_at)
      )
        throw new Error("Bitiş saati başlangıçtan sonra olmalı.");
      if (photo) {
        if (
          photo.size > 5242880 ||
          !["image/jpeg", "image/png", "image/webp"].includes(photo.type)
        )
          throw new Error(
            "Fotoğraf JPG, PNG veya WebP ve en fazla 5 MB olmalı.",
          );
        const bitmap = await createImageBitmap(photo);
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas
          .getContext("2d")!
          .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("Fotoğraf işlenemedi."))),
            "image/jpeg",
            0.82,
          ),
        );
        const {
          data: { user },
        } = await db.auth.getUser();
        uploaded = `${org}/${user!.id}/${crypto.randomUUID()}.jpg`;
        const { error } = await db.storage
          .from("issue-photos")
          .upload(uploaded, blob, { contentType: "image/jpeg", upsert: false });
        if (error) throw error;
        payload.photo_path = uploaded;
      }
      if (mod.key === "tasks" && !existing) {
        await rpc(db, "save_task", {
          p_data: payload,
          p_items: String(values.checklist_text || "").split("\n"),
        });
      } else {
        if (mod.key === "tasks" && member.role === "staff") {
          for (const k of Object.keys(payload))
            if (k !== "status") delete payload[k];
        }
        const q = existing
          ? db
              .from(mod.key)
              .update(payload)
              .eq("id", existing.id)
              .eq("organization_id", org)
          : db.from(mod.key).insert(payload);
        const { data, error } = await q.select("id").single();
        if (error) throw error;
        if (!data)
          throw new Error("Kayıt kaydedilemedi. Yetkinizi kontrol edin.");
      }
      onSaved();
    } catch (e) {
      if (uploaded) await db.storage.from("issue-photos").remove([uploaded]);
      setError(explain(e));
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog open onOpenChange={(v) => !v && !saving && onClose()}>
      <DialogContent className="editor-dialog">
        <DialogHeader>
          <DialogTitle>
            {mod.singular} {existing ? "düzenle" : "oluştur"}
          </DialogTitle>
          <DialogDescription>
            {mod.description} Saatler Türkiye saatidir.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="editor-form">
          <div className="form-grid">
            {mod.fields
              .filter(
                (f) =>
                  !(existing && f.key === "checklist_text") &&
                  !(
                    member.role === "staff" &&
                    ["requests", "maintenance_tickets"].includes(mod.key) &&
                    f.key === "status"
                  ),
              )
              .map((f) => (
                <Label
                  key={f.key}
                  className={
                    ["textarea", "file"].includes(f.type) ? "full-field" : ""
                  }
                >
                  {f.label}
                  {f.required ? " *" : ""}
                  {f.type === "select" || f.relation ? (
                    <Choice
                      value={String(values[f.key] || "")}
                      onChange={(v) => setValues((x) => ({ ...x, [f.key]: v }))}
                      options={
                        f.options
                          ? f.options.map((o) => ({
                              value: o,
                              label: labels[o] || o,
                            }))
                          : (lookup[f.relation!] || [])
                              .filter(
                                (r) =>
                                  f.relation !== "memberships" ||
                                  (r.active &&
                                    (member.role !== "staff" ||
                                      r.id === member.id)),
                              )
                              .map((r) => ({ value: r.id, label: r.name }))
                      }
                    />
                  ) : f.type === "checkbox" ? (
                    <Checkbox
                      checked={Boolean(values[f.key])}
                      onCheckedChange={(v) =>
                        setValues((x) => ({ ...x, [f.key]: v === true }))
                      }
                    />
                  ) : f.type === "textarea" ? (
                    <Textarea
                      maxLength={f.key === "body" ? 5000 : 3000}
                      required={f.required}
                      rows={4}
                      value={values[f.key]}
                      onChange={(e) =>
                        setValues((x) => ({ ...x, [f.key]: e.target.value }))
                      }
                    />
                  ) : f.type === "file" ? (
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                    />
                  ) : (
                    <Input
                      type={f.type}
                      required={f.required}
                      min={f.key === "capacity" ? 1 : 0}
                      max={f.type === "number" ? 100000 : undefined}
                      maxLength={150}
                      value={values[f.key]}
                      onChange={(e) =>
                        setValues((x) => ({ ...x, [f.key]: e.target.value }))
                      }
                    />
                  )}
                </Label>
              ))}
          </div>
          {mod.key === "maintenance_tickets" && (
            <p className="muted small">
              Fotoğrafta kişi, isim veya kişisel belge bulunmamasına dikkat
              edin.
            </p>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Vazgeç
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Kaydediliyor…"
                : existing
                  ? "Değişiklikleri kaydet"
                  : "Kaydı oluştur"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function RecordDetail({
  db,
  row,
  name,
  manager,
  member,
  onClose,
  onEdit,
  onSaved,
}: {
  db: SupabaseClient;
  row: Row;
  name: (t: string, id: string) => string;
  manager: boolean;
  member: Row;
  onClose: () => void;
  onEdit: () => void;
  onSaved: () => void;
}) {
  const [stats, setStats] = useState<Row | null>(null),
    [items, setItems] = useState<Row[]>([]),
    [qr, setQr] = useState(""),
    [count, setCount] = useState(""),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(row.status);
  const permitted =
    manager ||
    (row._task
      ? row.assigned_to === member.id
      : row.responsible_id === member.id);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (row._task) {
        const { data, error } = await db
          .from("task_items")
          .select("*")
          .eq("task_id", row.id)
          .order("created_at");
        if (error) throw error;
        if (alive) setItems(data || []);
      } else {
        const { data, error } = await db
          .from("event_statistics")
          .select("*")
          .eq("event_id", row.id)
          .single();
        if (error) throw error;
        if (alive) {
          setStats(data);
          setCount(String(data.actual_attendance ?? data.qr_count));
        }
        if (row.is_public) {
          const QR = await import("qrcode");
          const image = await QR.toDataURL(
            location.origin + "/?katilim=" + row.attendance_token,
            { width: 300, margin: 2 },
          );
          if (alive) setQr(image);
        }
      }
    })().catch((e) => toast.error(explain(e)));
    return () => {
      alive = false;
    };
  }, [db, row]);
  async function toggle(item: Row, done: boolean) {
    setBusy(true);
    try {
      await rpc(db, "toggle_task_item", { p_item: item.id, p_done: done });
      setItems((x) => x.map((i) => (i.id === item.id ? { ...i, done } : i)));
      if (!done && status === "done") setStatus("in_progress");
      onSaved();
    } catch (e) {
      toast.error(explain(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="detail-dialog">
        <DialogHeader>
          <DialogTitle>{row.name}</DialogTitle>
          <DialogDescription>
            {row._task ? "Görev ayrıntıları" : "Etkinlik ayrıntıları"}
          </DialogDescription>
        </DialogHeader>
        <span className="badge">{labels[status]}</span>
        <p>{row.description || "Açıklama eklenmemiş."}</p>
        {row._task ? (
          <>
            <p>
              Son tarih: {dateText(row.due_at)} ·{" "}
              {name("memberships", row.assigned_to)}
            </p>
            <div className="progress-track">
              <i
                style={{
                  width: items.length
                    ? `${(items.filter((i) => i.done).length / items.length) * 100}%`
                    : "0%",
                }}
              />
            </div>
            <p>
              {items.length
                ? Math.round(
                    (items.filter((i) => i.done).length / items.length) * 100,
                  )
                : 0}
              % tamamlandı · {items.filter((i) => i.done).length}/{items.length}{" "}
              madde
            </p>
            {items.map((i) => (
              <Label className="check-row" key={i.id}>
                <Checkbox
                  checked={i.done}
                  disabled={!permitted || busy}
                  onCheckedChange={(v) => toggle(i, v === true)}
                />
                {i.name}
              </Label>
            ))}
            {permitted && (
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const next = status === "done" ? "in_progress" : "done";
                  const { error } = await db
                    .from("tasks")
                    .update({ status: next })
                    .eq("id", row.id)
                    .select("id")
                    .single();
                  if (error) toast.error(explain(error));
                  else {
                    setStatus(next);
                    onSaved();
                  }
                  setBusy(false);
                }}
              >
                {status === "done" ? "Yeniden aç" : "Görevi tamamla"}
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="detail-grid">
              <div>
                <small>Zaman</small>
                {dateText(row.starts_at)} –{" "}
                {new Date(row.ends_at).toLocaleTimeString("tr-TR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Europe/Istanbul",
                })}
              </div>
              <div>
                <small>Tesis</small>
                {name("facilities", row.facility_id)}
              </div>
              <div>
                <small>Sorumlu</small>
                {name("memberships", row.responsible_id)}
              </div>
              <div>
                <small>Kapasite / hedef yaş</small>
                {row.capacity} kişi · {row.age_group}
              </div>
            </div>
            <div className="notice">
              QR sayımı: <b>{stats?.qr_count ?? "—"}</b> · Onaylı katılım:{" "}
              <b>{stats?.actual_attendance ?? "Henüz onaylanmadı"}</b>
            </div>
            {permitted && (
              <form
                className="inline-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  try {
                    await rpc(db, "set_attendance", {
                      p_event: row.id,
                      p_count: Number(count),
                    });
                    setStats((s) =>
                      s ? { ...s, actual_attendance: Number(count) } : s,
                    );
                    onSaved();
                    toast.success("Katılım onaylandı.");
                  } catch (e) {
                    toast.error(explain(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Label>
                  Gerçekleşen katılım
                  <Input
                    type="number"
                    min={0}
                    max={100000}
                    required
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                  />
                </Label>
                <Button disabled={busy}>Sayımı onayla</Button>
              </form>
            )}
            {qr ? (
              <div className="qr-card">
                <img
                  src={qr}
                  alt="Anonim katılım QR kodu"
                  width={220}
                  height={220}
                />
                <strong>{row.name}</strong>
                <p>Katılım için okutun. İsim veya telefon istenmez.</p>
                <a
                  className="text-link"
                  href={qr}
                  download={"katilim-" + row.id + ".png"}
                >
                  <Download size={16} /> QR kodunu indir
                </a>
                <a
                  className="text-link"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={"/?katilim=" + row.attendance_token}
                >
                  Katılım ekranını aç <ArrowUpRight size={16} />
                </a>
              </div>
            ) : (
              <p className="muted">
                QR katılımı için etkinliği herkese açık olarak işaretleyin.
              </p>
            )}
          </>
        )}
        {permitted && (!row._task || manager) && (
          <Button variant="outline" onClick={onEdit}>
            Kaydı düzenle
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
function TeamForm({
  db,
  org,
  onDone,
}: {
  db: SupabaseClient;
  org: string;
  onDone: () => void;
}) {
  const [role, setRole] = useState("staff"),
    [active, setActive] = useState(true),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="team-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        setBusy(true);
        try {
          await rpc(db, "manage_member", {
            p_org: org,
            p_email: fd.get("email"),
            p_name: fd.get("name"),
            p_role: role,
            p_active: active,
          });
          toast.success("Personel yetkisi kaydedildi.");
          form.reset();
          onDone();
        } catch (e) {
          toast.error(explain(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Personel yetkisi tanımla / güncelle</h3>
      <p className="muted">
        Önce Supabase Auth üzerinden e-posta daveti gönderin, ardından aynı
        e-posta adresini buraya yazın.
      </p>
      <div className="form-grid">
        <Label>
          Ad soyad
          <Input name="name" required maxLength={100} />
        </Label>
        <Label>
          Personel e-posta
          <Input name="email" type="email" required />
        </Label>
        <Label>
          Rol
          <Choice
            value={role}
            onChange={setRole}
            options={Object.entries(roles).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </Label>
        <Label>
          Erişim aktif
          <Checkbox
            checked={active}
            onCheckedChange={(v) => setActive(v === true)}
          />
        </Label>
      </div>
      <Button disabled={busy}>Yetkiyi kaydet</Button>
    </form>
  );
}
