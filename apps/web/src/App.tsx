import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Activity,
  Antenna,
  BarChart3,
  BookOpen,
  Clock3,
  CloudSun,
  Download,
  Gauge,
  Heart,
  Info,
  Menu,
  Moon,
  Radio,
  Search,
  Settings,
  Sun,
  Upload,
  WifiOff,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SunCalc from "suncalc";
import {
  LogEntrySchema,
  RADIO_MODES,
  SearchSchema,
  SHORTWAVE_BANDS,
  formatFrequency,
  recommendBands,
  scoreBroadcast,
  type Broadcast,
  type LogEntry,
  type SearchInput,
} from "@pl330/shared";
import { api, searchSchedules } from "./api";
import { db, download, exportBackup, importBackup, toCsv } from "./db";

const nav = [
  ["/", "Visão geral", Gauge],
  ["/identificar", "Identificar estação", Search],
  ["/no-ar", "No ar agora", Radio],
  ["/diario", "Diário de escuta", BookOpen],
  ["/estatisticas", "Estatísticas", BarChart3],
  ["/propagacao", "Propagação", CloudSun],
  ["/configuracoes", "Configurações", Settings],
  ["/sobre", "Sobre e fontes", Info],
] as const;

export default function App() {
  const [menu, setMenu] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [light, setLight] = useState(localStorage.theme === "light");
  const location = useLocation();
  useEffect(() => {
    const online = () => setOffline(false),
      off = () => setOffline(true);
    addEventListener("online", online);
    addEventListener("offline", off);
    return () => {
      removeEventListener("online", online);
      removeEventListener("offline", off);
    };
  }, []);
  useEffect(() => setMenu(false), [location.pathname]);
  useEffect(() => {
    document.documentElement.classList.toggle("light", light);
    document.documentElement.classList.toggle("dark", !light);
    localStorage.theme = light ? "light" : "dark";
  }, [light]);
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside
        className={`${menu ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-40 w-[280px] border-r border-white/10 bg-ink p-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0`}
      >
        <div className="mb-7 flex items-center justify-between px-2 pt-2">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-mint text-ink">
              <Antenna />
            </div>
            <div>
              <b>PL-330</b>
              <div className="text-xs uppercase tracking-[.2em] text-mint">
                Companion
              </div>
            </div>
          </div>
          <button
            className="lg:hidden"
            onClick={() => setMenu(false)}
            aria-label="Fechar menu"
          >
            <X />
          </button>
        </div>
        <nav className="space-y-1">
          {nav.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${isActive ? "bg-mint text-ink" : "text-emerald-50/65 hover:bg-white/5 hover:text-white"}`
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-xl border border-white/10 p-3 text-xs">
          <span className="flex items-center gap-2">
            {offline ? (
              <>
                <WifiOff size={15} /> Offline
              </>
            ) : (
              <>
                <span className="status-dot" /> Online
              </>
            )}
          </span>
          <button onClick={() => setLight(!light)} aria-label="Alternar tema">
            {light ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </aside>
      {menu && (
        <button
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMenu(false)}
          aria-label="Fechar navegação"
        />
      )}
      <main className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/10 bg-ink/85 px-4 backdrop-blur lg:px-8">
          <button
            className="lg:hidden"
            onClick={() => setMenu(true)}
            aria-label="Abrir menu"
          >
            <Menu />
          </button>
          <UtcClock />
          <span className="hidden text-xs muted sm:block">
            Dados em UTC · diário neste dispositivo
          </span>
        </header>
        <div className="mx-auto max-w-7xl p-4 pb-24 lg:p-8">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/identificar" element={<Identify />} />
            <Route path="/no-ar" element={<OnAir />} />
            <Route path="/diario" element={<Logbook />} />
            <Route path="/estatisticas" element={<Stats />} />
            <Route path="/propagacao" element={<Propagation />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
            <Route path="/sobre" element={<About />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function UtcClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-2 font-mono text-sm">
      <Clock3 size={16} className="text-mint" />
      <b>
        {now.toLocaleTimeString("pt-BR", { timeZone: "UTC", hour12: false })}
      </b>
      <span className="text-xs text-mint">UTC</span>
      <span className="hidden muted md:inline">
        · {now.toLocaleTimeString("pt-BR", { hour12: false })} local
      </span>
    </div>
  );
}
function Title({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[.2em] text-mint">
        {eyebrow}
      </p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl font-bold md:text-4xl">{title}</h1>
        {children}
      </div>
    </div>
  );
}
function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`panel p-5 ${className}`}>{children}</section>;
}
function State({ error, empty = false }: { error?: unknown; empty?: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 p-8 text-center muted">
      {error
        ? "Fonte indisponível agora. O último dado salvo será usado quando houver."
        : empty
          ? "Ainda não há dados para mostrar."
          : "Carregando…"}
    </div>
  );
}

function Overview() {
  const logs = useLiveQuery(
    () => db.logs.orderBy("listenedAtUtc").reverse().limit(4).toArray(),
    [],
    [],
  );
  const weather = useQuery({
    queryKey: ["weather-current"],
    queryFn: () => api<any>("/api/space-weather/current"),
  });
  const kp = latest(weather.data?.data?.kpMinute, "estimated_kp");
  const recs = recommendBands({
    isNight: new Date().getHours() < 7 || new Date().getHours() >= 18,
    kp,
  });
  const navigate = useNavigate();
  const [freq, setFreq] = useState("11780");
  return (
    <>
      <Title eyebrow="Central de escuta" title="O que vale sintonizar agora" />
      <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
        <Card className="bg-gradient-to-br from-panel to-emerald-950/60">
          <p className="label">Busca rápida</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="input frequency text-3xl"
              value={freq}
              onChange={(e) => setFreq(e.target.value)}
              inputMode="decimal"
              aria-label="Frequência em kHz"
            />
            <button
              className="btn-primary"
              onClick={() =>
                navigate(`/identificar?frequency=${encodeURIComponent(freq)}`)
              }
            >
              <Search size={18} />
              Identificar
            </button>
          </div>
          <p className="mt-3 text-sm muted">
            Digite a frequência do visor do rádio em kHz. Os resultados são
            possibilidades, não identificações confirmadas.
          </p>
        </Card>
        <Card>
          <p className="label">Propagação resumida</p>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-bold">{kp ?? "—"}</span>
            <span className="mb-1 text-mint">Kp atual</span>
          </div>
          <p className="mt-3 text-sm muted">
            {weather.isError
              ? "Fonte indisponível; consulte o último cache offline."
              : kp != null && kp <= 3
                ? "Atividade geomagnética relativamente baixa."
                : "Atividade elevada; trajetos podem variar."}
          </p>
        </Card>
      </div>
      <h2 className="mb-3 mt-8 text-xl font-bold">Bandas para experimentar</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {recs.slice(0, 3).map((b) => (
          <Card key={b.name}>
            <span className="frequency text-2xl">{b.name}</span>
            <div className="mt-2 text-sm font-semibold">
              {b.score}/100 · heurística
            </div>
            <p className="mt-2 text-sm muted">
              {b.reasons[0]}; {b.reasons[1]}.
            </p>
          </Card>
        ))}
      </div>
      <h2 className="mb-3 mt-8 text-xl font-bold">Últimas escutas</h2>
      {logs.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {logs.map((l) => (
            <LogCard key={l.id} entry={l} />
          ))}
        </div>
      ) : (
        <State empty />
      )}
    </>
  );
}

function Identify() {
  const params = new URLSearchParams(location.search);
  const form = useForm<SearchInput>({
    resolver: zodResolver(SearchSchema) as any,
    defaultValues: {
      frequencyKHz: Number(params.get("frequency") || 11780),
      dateTimeUtc: new Date().toISOString(),
      toleranceKHz: 5,
      mode: "AM",
      limit: 30,
      offset: 0,
    },
  });
  const mutation = useMutation({ mutationFn: searchSchedules });
  const [geo, setGeo] = useState<{ latitude: number; longitude: number }>();
  const submit = (v: SearchInput) => {
    const input = { ...v, ...geo };
    db.recentSearches.put({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      frequencyKHz: v.frequencyKHz,
      payload: input,
    });
    mutation.mutate(input);
  };
  return (
    <>
      <Title
        eyebrow="EiBi · correspondência explicável"
        title="Identificar estação"
      >
        <button
          className="btn-secondary"
          onClick={() => {
            form.reset();
            mutation.reset();
          }}
        >
          Limpar
        </button>
      </Title>
      <Card>
        <form
          onSubmit={form.handleSubmit(submit)}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-6"
        >
          <Field
            label="Frequência kHz"
            error={form.formState.errors.frequencyKHz?.message}
          >
            <input
              className="input frequency text-xl"
              type="number"
              step="0.001"
              {...form.register("frequencyKHz")}
            />
          </Field>
          <Field
            label="Data e hora UTC"
            error={form.formState.errors.dateTimeUtc?.message}
          >
            <input
              className="input"
              type="datetime-local"
              value={form.watch("dateTimeUtc").slice(0, 16)}
              onChange={(e) =>
                form.setValue(
                  "dateTimeUtc",
                  new Date(`${e.target.value}Z`).toISOString(),
                )
              }
            />
          </Field>
          <Field label="Modo">
            <select className="input" {...form.register("mode")}>
              {RADIO_MODES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Tolerância kHz">
            <input
              className="input"
              type="number"
              step="0.1"
              {...form.register("toleranceKHz")}
            />
          </Field>
          <Field label="Idioma (código)">
            <input
              className="input"
              placeholder="P, E, S…"
              {...form.register("language")}
            />
          </Field>
          <div className="flex items-end">
            <button
              className="btn-primary w-full"
              disabled={mutation.isPending}
            >
              <Search size={18} />
              Buscar possibilidades
            </button>
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2 lg:col-span-6">
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                form.setValue("dateTimeUtc", new Date().toISOString())
              }
            >
              Agora em UTC
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() =>
                navigator.geolocation.getCurrentPosition((p) =>
                  setGeo({
                    latitude: p.coords.latitude,
                    longitude: p.coords.longitude,
                  }),
                )
              }
            >
              Usar minha localização
            </button>
            {geo && (
              <span className="chip">
                Localização ativa · {geo.latitude.toFixed(2)},{" "}
                {geo.longitude.toFixed(2)}
              </span>
            )}
          </div>
        </form>
      </Card>
      <div className="mt-6 space-y-3">
        {mutation.isError ? (
          <State error={mutation.error} />
        ) : mutation.data?.data.length === 0 ? (
          <State empty />
        ) : (
          mutation.data?.data.map((b) => (
            <BroadcastCard
              key={b.id}
              broadcast={b}
              input={mutation.variables!}
            />
          ))
        )}
      </div>
    </>
  );
}
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-amber">{error}</span>}
    </label>
  );
}
function BroadcastCard({
  broadcast,
  input,
}: {
  broadcast: Broadcast;
  input: SearchInput;
}) {
  const result = scoreBroadcast(broadcast, input);
  const navigate = useNavigate();
  return (
    <Card>
      <div className="flex flex-col justify-between gap-4 md:flex-row">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="frequency text-2xl">
              {formatFrequency(broadcast.frequencyKHz)}
            </span>
            <span className="chip">
              confiança {result.confidence} · {result.score}/100
            </span>
          </div>
          <h3 className="mt-2 text-xl font-bold">{broadcast.stationName}</h3>
          <p className="mt-1 text-sm muted">
            {broadcast.countryCode} · idioma {broadcast.languageCode} · alvo{" "}
            {broadcast.targetCode} · {minutes(broadcast.startUtcMinutes)}–
            {minutes(broadcast.endUtcMinutes)} UTC
          </p>
          {result.distanceKm != null && (
            <p className="mt-1 text-sm muted">
              ≈ {result.distanceKm.toLocaleString("pt-BR")} km · azimute{" "}
              {result.bearing}°
            </p>
          )}
          <div className="mt-3">
            <b className="text-sm">Pontuação {result.confidence} porque:</b>
            <ul className="mt-1 list-inside list-disc text-sm muted">
              {result.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-xs muted">
            Fonte: {broadcast.source} · atualização{" "}
            {new Date(broadcast.updatedAt).toLocaleString("pt-BR")}
          </p>
        </div>
        <button
          className="btn-primary self-start"
          onClick={() =>
            navigate("/diario", {
              state: { broadcast, frequencyKHz: input.frequencyKHz },
            })
          }
        >
          <BookOpen size={18} />
          Registrar no diário
        </button>
      </div>
    </Card>
  );
}

function OnAir() {
  const [offset, setOffset] = useState(0);
  const minute =
    (new Date().getUTCHours() * 60 +
      new Date().getUTCMinutes() +
      offset +
      1440) %
    1440;
  const q = useQuery({
    queryKey: ["on-air", minute],
    queryFn: () =>
      api<{ data: Broadcast[] }>(
        `/api/schedules/on-air?minute=${minute}&limit=100`,
      ),
  });
  return (
    <>
      <Title eyebrow="Programação EiBi" title="No ar agora">
        <span className="frequency text-xl">{minutes(minute)} UTC</span>
      </Title>
      <div className="mb-5 flex flex-wrap gap-2">
        {[-60, -30, -15, 15, 30, 60].map((v) => (
          <button
            key={v}
            className="btn-secondary"
            onClick={() => setOffset((o) => o + v)}
          >
            {v > 0 ? "+" : ""}
            {v} min
          </button>
        ))}
        <button className="btn-secondary" onClick={() => setOffset(0)}>
          Agora
        </button>
      </div>
      {q.isLoading ? (
        <State />
      ) : q.isError ? (
        <State error={q.error} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {q.data?.data.map((b) => (
            <Card key={b.id}>
              <div className="frequency text-xl">
                {formatFrequency(b.frequencyKHz)}
              </div>
              <b>{b.stationName}</b>
              <p className="text-sm muted">
                {minutes(b.startUtcMinutes)}–{minutes(b.endUtcMinutes)} UTC ·{" "}
                {b.languageCode} · {b.targetCode}
              </p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function Logbook() {
  const route = useLocation();
  const all = useLiveQuery(
    () => db.logs.orderBy("listenedAtUtc").reverse().toArray(),
    [],
    [],
  );
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<LogEntry>();
  const [view, setView] = useState<"cards" | "table">("cards");
  useEffect(() => {
    const state = route.state as { broadcast?: Broadcast; frequencyKHz?: number } | null;
    if (!state?.broadcast) return;
    setEditing({
      ...blankLog(),
      frequencyKHz: state.frequencyKHz ?? state.broadcast.frequencyKHz,
      stationId: state.broadcast.id,
      stationName: state.broadcast.stationName,
      country: state.broadcast.countryCode,
      language: state.broadcast.languageCode,
      transmitter: state.broadcast.transmitterName ?? state.broadcast.transmitterCode,
      identificationSource: `EiBi ${state.broadcast.season}`,
    });
  }, [route.key]);
  const shown = all.filter((e) =>
    JSON.stringify(e).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <Title
        eyebrow="Armazenado somente neste dispositivo"
        title="Diário de escuta"
      >
        <button className="btn-primary" onClick={() => setEditing(blankLog())}>
          Nova escuta
        </button>
      </Title>
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="input"
            placeholder="Buscar emissora, país, tag, conteúdo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="btn-secondary"
            onClick={() => setView(view === "cards" ? "table" : "cards")}
          >
            {view === "cards" ? "Tabela" : "Cartões"}
          </button>
          <button
            className="btn-secondary"
            onClick={async () =>
              download("pl330-diario.csv", toCsv(all), "text/csv;charset=utf-8")
            }
          >
            <Download size={17} />
            CSV
          </button>
          <button
            className="btn-secondary"
            onClick={async () =>
              download(
                "pl330-backup.json",
                JSON.stringify(await exportBackup(), null, 2),
              )
            }
          >
            <Download size={17} />
            Backup
          </button>
          <label className="btn-secondary cursor-pointer">
            <Upload size={17} />
            Restaurar
            <input
              className="hidden"
              type="file"
              accept="application/json"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (
                  f &&
                  confirm(
                    "Adicionar os registros validados deste backup ao diário?",
                  )
                )
                  try {
                    alert(
                      `${await importBackup(JSON.parse(await f.text()))} registros restaurados.`,
                    );
                  } catch {
                    alert("Backup inválido ou incompatível.");
                  }
              }}
            />
          </label>
        </div>
      </Card>
      {editing && (
        <LogEditor initial={editing} onClose={() => setEditing(undefined)} />
      )}
      <div className="mt-5">
        {!shown.length ? (
          <State empty />
        ) : view === "cards" ? (
          <div className="grid gap-3 md:grid-cols-2">
            {shown.map((e) => (
              <LogCard
                key={e.id}
                entry={e}
                actions
                onEdit={() => setEditing(e)}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto panel">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  {["UTC", "Frequência", "Emissora", "Modo", "SINPO", ""].map(
                    (x) => (
                      <th className="p-3" key={x}>
                        {x}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {shown.map((e) => (
                  <tr className="border-t border-white/10" key={e.id}>
                    <td className="p-3">
                      {new Date(e.listenedAtUtc).toLocaleString("pt-BR", {
                        timeZone: "UTC",
                      })}
                    </td>
                    <td className="p-3 frequency">
                      {formatFrequency(e.frequencyKHz)}
                    </td>
                    <td className="p-3">{e.stationName || "—"}</td>
                    <td className="p-3">{e.mode}</td>
                    <td className="p-3">{e.sinpo || "—"}</td>
                    <td>
                      <button onClick={() => setEditing(e)}>Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
function blankLog(): LogEntry {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    listenedAtUtc: now.toISOString(),
    localDateTime: now.toISOString().slice(0, 16),
    frequencyKHz: 11780,
    mode: "AM",
    stationName: "",
    country: "",
    language: "",
    transmitter: "",
    sinpo: "",
    antenna: "",
    receptionLocation: "",
    content: "",
    notes: "",
    tags: [],
    favorite: false,
    identificationSource: "manual",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
function LogEditor({
  initial,
  onClose,
}: {
  initial: LogEntry;
  onClose: () => void;
}) {
  const form = useForm<LogEntry>({
    resolver: zodResolver(LogEntrySchema) as any,
    defaultValues: initial,
  });
  const save = async (v: LogEntry) => {
    await db.logs.put({
      ...v,
      updatedAt: new Date().toISOString(),
      tags:
        typeof v.tags === "string"
          ? (v.tags as string)
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean)
          : v.tags,
    });
    onClose();
  };
  return (
    <Card className="my-5 border-mint/30">
      <div className="mb-4 flex justify-between">
        <h2 className="text-xl font-bold">Registro de escuta</h2>
        <button onClick={onClose}>
          <X />
        </button>
      </div>
      <form
        onSubmit={form.handleSubmit(save)}
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <Field label="Data e hora UTC">
          <input
            className="input"
            type="datetime-local"
            value={form.watch("listenedAtUtc").slice(0, 16)}
            onChange={(e) =>
              form.setValue(
                "listenedAtUtc",
                new Date(`${e.target.value}Z`).toISOString(),
              )
            }
          />
        </Field>
        <Field label="Frequência kHz">
          <input
            className="input frequency"
            type="number"
            step="0.001"
            {...form.register("frequencyKHz", { valueAsNumber: true })}
          />
        </Field>
        <Field label="Modo">
          <select className="input" {...form.register("mode")}>
            {RADIO_MODES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Sinpo
          value={form.watch("sinpo")}
          onChange={(v) => form.setValue("sinpo", v, { shouldValidate: true })}
        />
        {[
          ["Emissora", "stationName"],
          ["País", "country"],
          ["Idioma", "language"],
          ["Transmissor", "transmitter"],
          ["Antena", "antenna"],
          ["Local da recepção", "receptionLocation"],
        ].map(([label, key]) => (
          <Field key={key} label={label}>
            <input
              className="input"
              {...form.register(key as keyof LogEntry)}
            />
          </Field>
        ))}
        <Field label="Tags, separadas por vírgula">
          <input
            className="input"
            defaultValue={initial.tags.join(", ")}
            onChange={(e) => form.setValue("tags", e.target.value as any)}
          />
        </Field>
        <label className="flex items-center gap-2 self-end pb-3">
          <input type="checkbox" {...form.register("favorite")} /> Favorito
        </label>
        <label className="md:col-span-2 lg:col-span-4">
          <span className="label">Conteúdo ouvido</span>
          <textarea className="input min-h-24" {...form.register("content")} />
        </label>
        <label className="md:col-span-2 lg:col-span-4">
          <span className="label">Observações</span>
          <textarea className="input min-h-24" {...form.register("notes")} />
        </label>
        <div className="flex gap-2 md:col-span-2 lg:col-span-4">
          <button className="btn-primary">Salvar no dispositivo</button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </Card>
  );
}
function Sinpo({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label="SINPO (1–5 ou vazio)">
      <input
        className="input font-mono tracking-[.35em]"
        inputMode="numeric"
        maxLength={5}
        value={value}
        onChange={(e) =>
          onChange(e.target.value.replace(/[^1-5]/g, "").slice(0, 5))
        }
        placeholder="45444"
      />
      <span className="mt-1 block text-[10px] muted">
        S sinal · I interferência · N ruído · P propagação · O geral
      </span>
    </Field>
  );
}
function LogCard({
  entry,
  actions,
  onEdit,
}: {
  entry: LogEntry;
  actions?: boolean;
  onEdit?: () => void;
}) {
  return (
    <Card>
      <div className="flex justify-between gap-3">
        <div>
          <div className="frequency text-xl">
            {formatFrequency(entry.frequencyKHz)}
          </div>
          <h3 className="font-bold">
            {entry.stationName || "Emissora não informada"}
          </h3>
          <p className="mt-1 text-sm muted">
            {new Date(entry.listenedAtUtc).toLocaleString("pt-BR", {
              timeZone: "UTC",
            })}{" "}
            UTC · {entry.mode} {entry.sinpo && `· SINPO ${entry.sinpo}`}
          </p>
        </div>
        <button
          onClick={() =>
            db.logs.update(entry.id, { favorite: !entry.favorite })
          }
          aria-label="Favorito"
        >
          <Heart
            className={entry.favorite ? "fill-amber text-amber" : "muted"}
          />
        </button>
      </div>
      {actions && (
        <div className="mt-4 flex gap-2">
          <button className="btn-secondary" onClick={onEdit}>
            Editar
          </button>
          <button
            className="btn-secondary"
            onClick={() =>
              db.logs.add({
                ...entry,
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })
            }
          >
            Duplicar
          </button>
          <button
            className="btn-secondary"
            onClick={() =>
              confirm("Apagar este registro?") && db.logs.delete(entry.id)
            }
          >
            Excluir
          </button>
        </div>
      )}
    </Card>
  );
}

function Stats() {
  const logs = useLiveQuery(() => db.logs.toArray(), [], []);
  const monthly = Object.entries(
    logs.reduce<Record<string, number>>((a, e) => {
      const k = e.listenedAtUtc.slice(0, 7);
      a[k] = (a[k] || 0) + 1;
      return a;
    }, {}),
  ).map(([month, total]) => ({ month, total }));
  const modes = Object.entries(
    logs.reduce<Record<string, number>>((a, e) => {
      a[e.mode] = (a[e.mode] || 0) + 1;
      return a;
    }, {}),
  ).map(([mode, total]) => ({ mode, total }));
  return (
    <>
      <Title eyebrow="Seu histórico, sem competição" title="Estatísticas" />
      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Escutas" value={logs.length} />
        <Metric
          label="Emissoras únicas"
          value={new Set(logs.map((x) => x.stationName).filter(Boolean)).size}
        />
        <Metric
          label="Países"
          value={new Set(logs.map((x) => x.country).filter(Boolean)).size}
        />
        <Metric
          label="SINPO médio"
          value={average(
            logs.map((x) => Number(x.sinpo?.[4])).filter(Boolean),
          ).toFixed(1)}
        />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-bold">Escutas por mês</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={monthly}>
                <CartesianGrid stroke="#ffffff12" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area dataKey="total" stroke="#6ee7b7" fill="#6ee7b733" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 font-bold">Modos usados</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={modes}>
                <CartesianGrid stroke="#ffffff12" />
                <XAxis dataKey="mode" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" fill="#fbbf24" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </>
  );
}
function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <div className="text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm muted">{label}</div>
    </Card>
  );
}

function Propagation() {
  const [loc, setLoc] = useState({ latitude: -27.59, longitude: -48.55 });
  const q = useQuery({
    queryKey: ["weather-all"],
    queryFn: () => api<any>("/api/space-weather/current"),
  });
  const kp = latest(q.data?.data?.kpMinute, "estimated_kp");
  const f107 = latest(q.data?.data?.f107Detail, "flux");
  const alerts = (q.data?.data?.alerts || []).filter(
    (a: any) => !a.message.startsWith("CANCEL"),
  ).length;
  const pos = SunCalc.getPosition(new Date(), loc.latitude, loc.longitude);
  const isNight = pos.altitude < -0.1047;
  const recs = recommendBands({ isNight, kp, f107, alerts });
  const kpData = (q.data?.data?.kpMinute || [])
    .slice(-60)
    .map((x: any) => ({ time: x.time_tag.slice(11, 16), kp: x.estimated_kp }));
  return (
    <>
      <Title eyebrow="NOAA SWPC · último snapshot válido" title="Propagação">
        <button
          className="btn-secondary"
          onClick={() =>
            navigator.geolocation.getCurrentPosition((p) =>
              setLoc({
                latitude: p.coords.latitude,
                longitude: p.coords.longitude,
              }),
            )
          }
        >
          Usar minha localização
        </button>
      </Title>
      {q.isError && <State error={q.error} />}
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Kp atual" value={kp ?? "—"} />
        <Metric label="Fluxo F10.7 sfu" value={f107 ?? "—"} />
        <Metric label="Alertas ativos" value={alerts} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <Card>
          <div className="flex justify-between">
            <h2 className="font-bold">Kp recente</h2>
            <span className="chip">
              {isNight ? "Noite" : "Dia"} no local · Sol{" "}
              {((pos.altitude * 180) / Math.PI).toFixed(1)}°
            </span>
          </div>
          <div className="mt-4 h-64">
            {kpData.length ? (
              <ResponsiveContainer>
                <AreaChart data={kpData}>
                  <CartesianGrid stroke="#ffffff12" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[0, 9]} />
                  <Tooltip />
                  <Area dataKey="kp" stroke="#6ee7b7" fill="#6ee7b733" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <State empty />
            )}
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 font-bold">Estado da fonte</h2>
          <p className="text-sm muted">
            {q.data?.snapshots?.[0]?.collected_at
              ? `Coletado em ${new Date(q.data.snapshots[0].collected_at).toLocaleString("pt-BR")}.`
              : "Ainda sem snapshot local."}
          </p>
          <p className="mt-3 text-sm muted">
            Observação e coleta são horários distintos. Em falhas, o painel usa
            o último dado conhecido e marca a idade.
          </p>
        </Card>
      </div>
      <h2 className="mb-3 mt-8 text-xl font-bold">
        Bandas para experimentar agora
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recs.slice(0, 6).map((b) => (
          <Card key={b.name}>
            <div className="flex justify-between">
              <span className="frequency text-2xl">{b.name}</span>
              <b>{b.score}/100</b>
            </div>
            <p className="mt-2 text-sm muted">{b.reasons.join("; ")}.</p>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-xs muted">
        Heurísticas experimentais, não previsão garantida. A recepção real
        depende de potência, antena, ruído, trajetória, estação, horário e
        ionosfera.
      </p>
    </>
  );
}

function SettingsPage() {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  return (
    <>
      <Title eyebrow="Preferências locais" title="Configurações" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-bold">Localização padrão</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Latitude">
              <input
                className="input"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </Field>
            <Field label="Longitude">
              <input
                className="input"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
              />
            </Field>
          </div>
          <button
            className="btn-primary mt-4"
            onClick={() =>
              db.preferences.bulkPut([
                { key: "latitude", value: Number(lat) },
                { key: "longitude", value: Number(lon) },
              ])
            }
          >
            Salvar neste dispositivo
          </button>
        </Card>
        <Card>
          <h2 className="font-bold">Privacidade</h2>
          <p className="mt-3 text-sm muted">
            O diário, a localização e as preferências permanecem no IndexedDB
            deste navegador. O MVP não possui conta, telemetria, anúncios nem
            cookies de rastreamento.
          </p>
          <button
            className="btn-secondary mt-4"
            onClick={() =>
              confirm(
                "Apagar todo o diário e preferências deste dispositivo?",
              ) && db.delete().then(() => location.reload())
            }
          >
            Apagar todos os dados locais
          </button>
        </Card>
      </div>
    </>
  );
}
function About() {
  return (
    <>
      <Title eyebrow="Transparência" title="Sobre e fontes" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="font-bold">Programação</h2>
          <p className="mt-3 text-sm muted">
            A programação é fornecida pela EiBi e pode conter erros, mudanças ou
            emissoras fora do ar. Uma correspondência é apenas uma
            possibilidade; a identificação confiável depende do que você
            realmente ouviu.
          </p>
          <a
            className="mt-4 inline-block text-mint underline"
            href="https://www.eibispace.de/"
            target="_blank"
            rel="noreferrer"
          >
            EiBi shortwave schedules
          </a>
        </Card>
        <Card>
          <h2 className="font-bold">Clima espacial</h2>
          <p className="mt-3 text-sm muted">
            Kp, F10.7, escalas e alertas vêm do NOAA Space Weather Prediction
            Center. Mostramos coleta, observação, idade e fallback
            separadamente.
          </p>
          <a
            className="mt-4 inline-block text-mint underline"
            href="https://www.swpc.noaa.gov/"
            target="_blank"
            rel="noreferrer"
          >
            NOAA SWPC
          </a>
        </Card>
        <Card>
          <h2 className="font-bold">Software livre e gratuito</h2>
          <p className="mt-3 text-sm muted">
            React, Hono, Cloudflare Workers/D1 e IndexedDB. Sem IA, APIs pagas,
            domínio próprio ou VPS. Licença MIT.
          </p>
        </Card>
        <Card>
          <h2 className="font-bold">Limitações do MVP</h2>
          <p className="mt-3 text-sm muted">
            Sem controle CAT do rádio, contas ou sincronização. Coordenadas só
            aparecem quando a fonte as oferece; nunca são inventadas.
          </p>
        </Card>
      </div>
    </>
  );
}

function minutes(v: number) {
  return `${String(Math.floor(v / 60) % 24).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
}
function latest(data: any[], key: string) {
  return Array.isArray(data) && data.length
    ? Number(data[data.length - 1]?.[key])
    : undefined;
}
function average(v: number[]) {
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}
