import { z } from "zod";

export const RADIO_MODES = ["AM", "USB", "LSB", "SYNC", "CW", "FM"] as const;
export const RadioModeSchema = z.enum(RADIO_MODES);
export type RadioMode = z.infer<typeof RadioModeSchema>;

export const LocationSchema = z.object({
  name: z.string().trim().max(100).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const LocalStationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  frequencyKHz: z.number().min(65000).max(300000),
  mode: z.literal("FM"),
  city: z.string().trim().max(100).default(""),
  state: z.string().trim().max(40).default(""),
  country: z.string().trim().max(80).default("Brasil"),
  website: z.string().url().optional(),
  source: z.string().url().optional(),
  sourceLabel: z.string().trim().max(100).default("catálogo local"),
  notes: z.string().trim().max(1000).default(""),
  builtIn: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type LocalStation = z.infer<typeof LocalStationSchema>;

export const SearchSchema = z.object({
  frequencyKHz: z.coerce.number().min(10).max(30000),
  dateTimeUtc: z.string().datetime(),
  toleranceKHz: z.coerce.number().min(0).max(100).default(5),
  mode: RadioModeSchema.default("AM"),
  language: z.string().trim().max(12).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
});
export type SearchInput = z.infer<typeof SearchSchema>;

export const SinpoSchema = z
  .string()
  .regex(/^[1-5]{5}$/, "SINPO deve conter cinco números de 1 a 5")
  .or(z.literal(""));

export const LogEntrySchema = z.object({
  id: z.string().uuid(),
  listenedAtUtc: z.string().datetime(),
  localDateTime: z.string(),
  frequencyKHz: z.number().positive().max(300000),
  mode: RadioModeSchema,
  bandwidth: z.string().max(30).optional(),
  stationId: z.string().optional(),
  stationName: z.string().trim().max(160).default(""),
  country: z.string().trim().max(80).default(""),
  language: z.string().trim().max(80).default(""),
  transmitter: z.string().trim().max(160).default(""),
  sinpo: SinpoSchema.default(""),
  signalStrength: z.number().optional(),
  snr: z.number().optional(),
  antenna: z.string().trim().max(120).default(""),
  receptionLocation: z.string().trim().max(120).default(""),
  content: z.string().trim().max(2000).default(""),
  notes: z.string().trim().max(5000).default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
  favorite: z.boolean().default(false),
  identificationSource: z.string().max(120).default("manual"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type LogEntry = z.infer<typeof LogEntrySchema>;

export const BackupSchema = z.object({
  format: z.literal("pl330-companion-backup"),
  version: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  exportedAt: z.string().datetime(),
  entries: z.array(LogEntrySchema).max(100000),
  preferences: z.record(z.unknown()).optional(),
  localStations: z.array(LocalStationSchema).max(10000).optional(),
});
export type Backup = z.infer<typeof BackupSchema>;

export type Broadcast = {
  id: string;
  season: string;
  frequencyKHz: number;
  startUtcMinutes: number;
  endUtcMinutes: number;
  days: number[];
  dayExpressionOriginal: string;
  stationName: string;
  countryCode: string;
  languageCode: string;
  targetCode: string;
  transmitterCode: string;
  transmitterName?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  source: string;
  updatedAt: string;
};

export const SHORTWAVE_BANDS = [
  {
    name: "120 m",
    minKHz: 2300,
    maxKHz: 2495,
    affinity: "night",
    solarTarget: -24,
    solarWidth: 25,
    base: 21,
  },
  {
    name: "90 m",
    minKHz: 3200,
    maxKHz: 3400,
    affinity: "night",
    solarTarget: -22,
    solarWidth: 27,
    base: 25,
  },
  {
    name: "75 m",
    minKHz: 3900,
    maxKHz: 4000,
    affinity: "night",
    solarTarget: -20,
    solarWidth: 29,
    base: 27,
  },
  {
    name: "60 m",
    minKHz: 4750,
    maxKHz: 5060,
    affinity: "night",
    solarTarget: -18,
    solarWidth: 31,
    base: 31,
  },
  {
    name: "49 m",
    minKHz: 5900,
    maxKHz: 6200,
    affinity: "night",
    solarTarget: -16,
    solarWidth: 34,
    base: 35,
  },
  {
    name: "41 m",
    minKHz: 7200,
    maxKHz: 7600,
    affinity: "night",
    solarTarget: -12,
    solarWidth: 37,
    base: 36,
  },
  {
    name: "31 m",
    minKHz: 9400,
    maxKHz: 9900,
    affinity: "both",
    solarTarget: -5,
    solarWidth: 43,
    base: 39,
  },
  {
    name: "25 m",
    minKHz: 11600,
    maxKHz: 12100,
    affinity: "both",
    solarTarget: 3,
    solarWidth: 45,
    base: 37,
  },
  {
    name: "22 m",
    minKHz: 13570,
    maxKHz: 13870,
    affinity: "day",
    solarTarget: 12,
    solarWidth: 41,
    base: 33,
  },
  {
    name: "19 m",
    minKHz: 15100,
    maxKHz: 15830,
    affinity: "day",
    solarTarget: 19,
    solarWidth: 39,
    base: 32,
  },
  {
    name: "16 m",
    minKHz: 17480,
    maxKHz: 17900,
    affinity: "day",
    solarTarget: 27,
    solarWidth: 36,
    base: 29,
  },
  {
    name: "15 m",
    minKHz: 18900,
    maxKHz: 19020,
    affinity: "day",
    solarTarget: 32,
    solarWidth: 34,
    base: 26,
  },
  {
    name: "13 m",
    minKHz: 21450,
    maxKHz: 21850,
    affinity: "day",
    solarTarget: 38,
    solarWidth: 31,
    base: 23,
  },
  {
    name: "11 m",
    minKHz: 25670,
    maxKHz: 26100,
    affinity: "day",
    solarTarget: 45,
    solarWidth: 28,
    base: 18,
  },
] as const;

export function parseUtcTime(value: string): number {
  if (!/^([01]\d|2[0-3])([0-5]\d)$|^2400$/.test(value))
    throw new Error("Horário UTC inválido");
  return value === "2400"
    ? 1440
    : Number(value.slice(0, 2)) * 60 + Number(value.slice(2));
}

const dayMap: Record<string, number> = {
  Su: 0,
  Mo: 1,
  Tu: 2,
  We: 3,
  Th: 4,
  Fr: 5,
  Sa: 6,
};
export function parseDays(expression = ""): number[] {
  const clean = expression.trim();
  if (!clean) return [0, 1, 2, 3, 4, 5, 6];
  const numeric = clean.match(/^[1-7]+$/)?.[0];
  if (numeric) return [...new Set([...numeric].map(Number).map((n) => n % 7))];
  const range = clean.match(/^(Su|Mo|Tu|We|Th|Fr|Sa)-(Su|Mo|Tu|We|Th|Fr|Sa)$/);
  if (range) {
    const result: number[] = [];
    let day = dayMap[range[1]];
    while (true) {
      result.push(day);
      if (day === dayMap[range[2]]) break;
      day = (day + 1) % 7;
    }
    return result;
  }
  const named = Object.entries(dayMap)
    .filter(([name]) => clean.includes(name))
    .map(([, day]) => day);
  return named.length ? [...new Set(named)] : [0, 1, 2, 3, 4, 5, 6];
}

export function isBroadcastActive(
  b: Pick<Broadcast, "startUtcMinutes" | "endUtcMinutes" | "days">,
  date: Date,
): boolean {
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const day = date.getUTCDay();
  if (b.startUtcMinutes < b.endUtcMinutes)
    return (
      b.days.includes(day) &&
      minutes >= b.startUtcMinutes &&
      minutes < b.endUtcMinutes
    );
  if (b.startUtcMinutes === b.endUtcMinutes || b.endUtcMinutes === 1440)
    return b.days.includes(day) && minutes >= b.startUtcMinutes;
  return (
    (b.days.includes(day) && minutes >= b.startUtcMinutes) ||
    (b.days.includes((day + 6) % 7) && minutes < b.endUtcMinutes)
  );
}

export function distanceAndBearing(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const rad = (n: number) => (n * Math.PI) / 180;
  const deg = (n: number) => (n * 180) / Math.PI;
  const p1 = rad(a.latitude),
    p2 = rad(b.latitude),
    dl = rad(b.longitude - a.longitude);
  const d =
    2 *
    6371 *
    Math.asin(
      Math.sqrt(
        Math.sin((p2 - p1) / 2) ** 2 +
          Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2,
      ),
    );
  const y = Math.sin(dl) * Math.cos(p2);
  const x =
    Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return {
    distanceKm: Math.round(d),
    bearing: Math.round((deg(Math.atan2(y, x)) + 360) % 360),
  };
}

export function formatFrequency(kHz: number): string {
  if (kHz >= 30000)
    return `${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 3 }).format(kHz / 1000)} MHz`;
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(kHz)} kHz`;
}

export function scoreBroadcast(b: Broadcast, input: SearchInput) {
  const reasons: string[] = [];
  let score = 0;
  const when = new Date(input.dateTimeUtc);
  if (isBroadcastActive(b, when)) {
    score += 45;
    reasons.push("a transmissão está programada para este horário");
  }
  const delta = Math.abs(b.frequencyKHz - input.frequencyKHz);
  if (delta === 0) {
    score += 30;
    reasons.push("a frequência é uma correspondência exata");
  } else if (delta <= input.toleranceKHz) {
    score += Math.max(
      5,
      25 * (1 - delta / Math.max(input.toleranceKHz, 0.001)),
    );
    reasons.push(`a diferença é de apenas ${delta.toFixed(2)} kHz`);
  }
  if (
    input.language &&
    b.languageCode.toLowerCase() === input.language.toLowerCase()
  ) {
    score += 12;
    reasons.push("o idioma corresponde à sua preferência");
  }
  let geo: ReturnType<typeof distanceAndBearing> | undefined;
  if (
    input.latitude != null &&
    input.longitude != null &&
    b.latitude != null &&
    b.longitude != null
  ) {
    geo = distanceAndBearing(
      { latitude: input.latitude, longitude: input.longitude },
      { latitude: b.latitude, longitude: b.longitude },
    );
    score += Math.max(0, 8 - geo.distanceKm / 2000);
    reasons.push("há coordenadas confiáveis para estimar o trajeto");
  }
  score += [
    b.countryCode,
    b.languageCode,
    b.targetCode,
    b.transmitterName,
  ].filter(Boolean).length;
  return {
    score: Math.min(100, Math.round(score)),
    confidence: score >= 78 ? "alta" : score >= 50 ? "média" : "baixa",
    reasons,
    deltaKHz: delta,
    ...geo,
  };
}

export function recommendBands(input: {
  isNight: boolean;
  solarElevationDeg?: number;
  kp?: number;
  kpTrend?: number;
  f107?: number;
  alerts?: number;
}) {
  const solar = input.solarElevationDeg ?? (input.isNight ? -18 : 25);
  return SHORTWAVE_BANDS.map((band) => {
    const fit = Math.max(
      0,
      1 - Math.abs(solar - band.solarTarget) / band.solarWidth,
    );
    let score = band.base + fit * 43;
    const reasons: string[] = [];
    if (fit >= 0.72)
      reasons.push(
        `a altura do Sol (${solar.toFixed(0)}°) combina bem com esta banda`,
      );
    else if (fit >= 0.38)
      reasons.push("a condição de luz é intermediária para esta faixa");
    else
      reasons.push("esta banda não é a mais favorecida pela iluminação atual");

    if (input.kp == null) {
      score -= 8;
      reasons.push("Kp ausente: confiança reduzida");
    } else if (input.kp <= 2.5) {
      score += 9;
      reasons.push(`Kp ${input.kp.toFixed(1)} indica campo geomagnético calmo`);
    } else if (input.kp <= 4) {
      score += 2;
      reasons.push(`Kp ${input.kp.toFixed(1)} está moderado`);
    } else {
      score -= 15 + (input.kp - 4) * 4;
      reasons.push(`Kp ${input.kp.toFixed(1)} está elevado`);
    }

    if ((input.kpTrend ?? 0) > 0.5) {
      score -= 7;
      reasons.push("o Kp subiu recentemente");
    }
    if ((input.kpTrend ?? 0) < -0.5) {
      score += 4;
      reasons.push("o Kp recuou recentemente");
    }

    const highBand = band.minKHz >= 13570;
    if (input.f107 == null) {
      score -= 5;
      reasons.push("F10.7 ausente: avaliação parcial");
    } else if (highBand && input.f107 >= 135) {
      score += 10;
      reasons.push(
        `F10.7 em ${input.f107.toFixed(0)} favorece frequências mais altas`,
      );
    } else if (highBand && input.f107 < 95) {
      score -= 10;
      reasons.push("F10.7 baixo reduz a expectativa nas bandas altas");
    } else if (!highBand && input.f107 >= 95) score += 3;

    if ((input.alerts ?? 0) > 0) {
      score -= Math.min(18, (input.alerts ?? 0) * 4);
      reasons.push(`${input.alerts} alerta(s) ativo(s) reduzem a confiança`);
    } else reasons.push("nenhum alerta NOAA ativo foi detectado");

    const rounded = Math.max(0, Math.min(100, Math.round(score)));
    const verdict =
      rounded >= 76
        ? "boa aposta"
        : rounded >= 58
          ? "vale experimentar"
          : rounded >= 40
            ? "experimental"
            : "pouco favorável";
    return { ...band, score: rounded, verdict, reasons };
  }).sort((a, b) => b.score - a.score);
}
