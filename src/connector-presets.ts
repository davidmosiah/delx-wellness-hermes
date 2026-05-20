export type ConnectorId =
  | "whoop"
  | "garmin"
  | "oura"
  | "strava"
  | "fitbit"
  | "google_health"
  | "withings"
  | "apple_health"
  | "samsung_health"
  | "polar"
  | "eight_sleep"
  | "nourish"
  | "wellness_air"
  | "wellness_cycle_coach"
  | "wellness_cgm"
  | "exercise_catalog";

export type ConnectorPreset = {
  id: ConnectorId;
  displayName: string;
  packageName?: string | undefined;
  binaryName?: string | undefined;
  enabledByDefault: boolean;
  category: "physiology" | "activity" | "nutrition" | "exercise";
  privacy: "local-first" | "oauth-local-token" | "private-catalog";
  notes: string;
};

export type HermesMcpServerConfig = {
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
};

export const CONNECTOR_PRESETS = [
  {
    id: "whoop",
    displayName: "WHOOP",
    packageName: "whoop-mcp-unofficial",
    binaryName: "whoop-mcp-unofficial",
    enabledByDefault: true,
    category: "physiology",
    privacy: "oauth-local-token",
    notes: "Recovery, strain, sleep, HRV, resting heart rate, and workouts."
  },
  {
    id: "garmin",
    displayName: "Garmin",
    packageName: "garmin-mcp-unofficial",
    binaryName: "garmin-mcp-unofficial",
    enabledByDefault: true,
    category: "physiology",
    privacy: "oauth-local-token",
    notes: "Training load, activities, readiness-style context, sleep, and wellness signals."
  },
  {
    id: "oura",
    displayName: "Oura",
    packageName: "oura-mcp-unofficial",
    binaryName: "oura-mcp-unofficial",
    enabledByDefault: true,
    category: "physiology",
    privacy: "oauth-local-token",
    notes: "Readiness, sleep, activity, HRV, and recovery context."
  },
  {
    id: "strava",
    displayName: "Strava",
    packageName: "strava-mcp-unofficial",
    binaryName: "strava-mcp-unofficial",
    enabledByDefault: true,
    category: "activity",
    privacy: "oauth-local-token",
    notes: "Training history, workouts, load proxies, activities, and effort context."
  },
  {
    id: "fitbit",
    displayName: "Fitbit",
    packageName: "fitbit-mcp-unofficial",
    binaryName: "fitbit-mcp-unofficial",
    enabledByDefault: true,
    category: "physiology",
    privacy: "oauth-local-token",
    notes: "Activity, sleep, heart rate, steps, and calorie context."
  },
  {
    id: "google_health",
    displayName: "Google Health",
    packageName: "google-health-mcp-unofficial",
    binaryName: "google-health-mcp-unofficial",
    enabledByDefault: true,
    category: "physiology",
    privacy: "oauth-local-token",
    notes: "Google Health API v4 beta identity, profile, settings, data points, reconcile, rollups, and Fitbit migration context."
  },
  {
    id: "withings",
    displayName: "Withings",
    packageName: "withings-mcp-unofficial",
    binaryName: "withings-mcp-unofficial",
    enabledByDefault: true,
    category: "physiology",
    privacy: "oauth-local-token",
    notes: "Body composition, measurements, sleep, and health-device context."
  },
  {
    id: "apple_health",
    displayName: "Apple Health",
    packageName: "apple-health-mcp-unofficial",
    binaryName: "apple-health-mcp-unofficial",
    enabledByDefault: true,
    category: "physiology",
    privacy: "local-first",
    notes: "Local Apple Health exports and aggregated wellness records."
  },
  {
    id: "samsung_health",
    displayName: "Samsung Health",
    packageName: "samsung-health-mcp-unofficial",
    binaryName: "samsung-health-mcp-unofficial",
    enabledByDefault: true,
    category: "physiology",
    privacy: "local-first",
    notes: "Local Samsung Health CSV/ZIP exports, Galaxy Watch sleep/activity, HRV, heart, and workout records."
  },
  {
    id: "polar",
    displayName: "Polar",
    packageName: "polar-mcp-unofficial",
    binaryName: "polar-mcp-unofficial",
    enabledByDefault: true,
    category: "physiology",
    privacy: "oauth-local-token",
    notes: "Training, recovery-adjacent, heart rate, and activity context."
  },
  {
    id: "eight_sleep",
    displayName: "Eight Sleep",
    packageName: "eight-sleep-mcp-unofficial",
    binaryName: "eight-sleep-mcp-unofficial",
    enabledByDefault: false,
    category: "physiology",
    privacy: "oauth-local-token",
    notes: "Smart-mattress sleep trends, smart-temperature schedule, alarms, and adjustable base. Mutations gated by EIGHT_SLEEP_ALLOW_MUTATIONS."
  },
  {
    id: "nourish",
    displayName: "Nourish",
    packageName: "wellness-nourish",
    binaryName: "wellness-nourish",
    enabledByDefault: true,
    category: "nutrition",
    privacy: "local-first",
    notes: "Food search, meal parsing, local nutrition logging, barcode, and pt-BR input."
  },
  {
    id: "wellness_air",
    displayName: "Wellness Air",
    packageName: "wellness-air",
    binaryName: "wellness-air",
    enabledByDefault: false,
    category: "physiology",
    privacy: "local-first",
    notes: "Indoor air quality (PM2.5, CO2, VOC) via AirGradient API key or local IP. Pair with sleep/recovery to correlate environment with rest."
  },
  {
    id: "wellness_cycle_coach",
    displayName: "Wellness Cycle Coach",
    packageName: "wellness-cycle-coach",
    binaryName: "wellness-cycle-coach",
    enabledByDefault: false,
    category: "physiology",
    privacy: "local-first",
    notes: "Stateless menstrual-cycle coach (phase detection, nutrition + training guidance). Not medical advice. Off by default — opt-in based on user need."
  },
  {
    id: "wellness_cgm",
    displayName: "Wellness CGM",
    packageName: "wellness-cgm-mcp",
    binaryName: "wellness-cgm-mcp",
    enabledByDefault: false,
    category: "physiology",
    privacy: "oauth-local-token",
    notes: "Dexcom CGM with TIR/GMI/meal-response. NOT medical advice; do not use for emergency hypo/hyper detection. Sandbox mode works without real Dexcom credentials."
  },
  {
    id: "exercise_catalog",
    displayName: "Exercise Catalog",
    binaryName: "exercise-catalog-mcp-server",
    enabledByDefault: false,
    category: "exercise",
    privacy: "private-catalog",
    notes: "Private exercise catalog for workout building with instructions and media."
  }
] as const satisfies readonly ConnectorPreset[];

export function getConnectorPreset(id: ConnectorId): ConnectorPreset {
  const preset = CONNECTOR_PRESETS.find((candidate) => candidate.id === id);
  if (!preset) throw new Error(`Unknown connector preset: ${id}`);
  return preset;
}

export function defaultConnectorIds(): ConnectorId[] {
  return CONNECTOR_PRESETS
    .filter((preset) => preset.enabledByDefault)
    .map((preset) => preset.id);
}

export function liteConnectorIds(): ConnectorId[] {
  return ["garmin", "nourish"];
}

export function buildLocalMcpServerConfig(preset: ConnectorPreset): HermesMcpServerConfig | undefined {
  if (!preset.packageName) return undefined;
  return {
    command: "npx",
    args: ["-y", preset.packageName]
  };
}
