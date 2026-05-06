import { parse, stringify } from "yaml";
import {
  CONNECTOR_PRESETS,
  ConnectorId,
  HermesMcpServerConfig,
  buildLocalMcpServerConfig,
  defaultConnectorIds
} from "./connector-presets.js";
import { DEFAULT_PROFILE_NAME } from "./paths.js";

export type PlainConfig = Record<string, unknown>;

export type ConnectorMode = "local" | "hosted";

export type BuildHermesProfileConfigOptions = {
  profileName?: string;
  skillsDir: string;
  mode?: ConnectorMode;
  connectorIds?: ConnectorId[];
  hubUrl?: string | undefined;
};

export function buildHermesProfileConfig(options: BuildHermesProfileConfigOptions): PlainConfig {
  const profileName = options.profileName ?? DEFAULT_PROFILE_NAME;
  const mode = options.mode ?? "local";
  const connectorIds = options.connectorIds ?? defaultConnectorIds();
  const mcpServers: Record<string, HermesMcpServerConfig> = {};

  if (mode === "hosted") {
    if (!options.hubUrl) {
      throw new Error("Hosted mode requires --hub-url. Do not point hosted mode at the public marketing site by default.");
    }
    mcpServers.delx_wellness_hub = {
      url: options.hubUrl,
      headers: {
        Authorization: "Bearer ${WELLNESS_MCP_API_KEY}"
      }
    };
  } else {
    for (const connectorId of connectorIds) {
      const preset = CONNECTOR_PRESETS.find((candidate) => candidate.id === connectorId);
      if (!preset) throw new Error(`Unknown connector id: ${connectorId}`);
      const serverConfig = buildLocalMcpServerConfig(preset);
      if (serverConfig) mcpServers[connectorId] = serverConfig;
    }
  }

  return {
    skills: {
      external_dirs: [options.skillsDir]
    },
    mcp_servers: mcpServers,
    delx_wellness: {
      profile_name: profileName,
      mode,
      generated_by: "delx-wellness-hermes",
      onboarding: {
        required: true,
        template: "ONBOARDING.md",
        next_step: "Run `delx-wellness-hermes onboarding --profile delx-wellness` or ask Hermes to use the delx-wellness-onboarding skill."
      },
      connectors: CONNECTOR_PRESETS.map((preset) => ({
        id: preset.id,
        display_name: preset.displayName,
        enabled: mode === "hosted" ? preset.enabledByDefault : Object.hasOwn(mcpServers, preset.id),
        category: preset.category,
        privacy: preset.privacy,
        notes: preset.notes
      }))
    }
  };
}

export function parseHermesConfig(source: string): PlainConfig {
  if (!source.trim()) return {};
  const parsed = parse(source);
  if (!isPlainObject(parsed)) throw new Error("Hermes config must be a YAML mapping");
  return parsed as PlainConfig;
}

export function stringifyHermesConfig(config: PlainConfig): string {
  return stringify(config, {
    lineWidth: 0,
    singleQuote: false
  });
}

export function mergeHermesConfig(existing: PlainConfig, generated: PlainConfig): PlainConfig {
  return {
    ...existing,
    skills: mergeSkillsConfig(asPlainObject(existing.skills), asPlainObject(generated.skills)),
    mcp_servers: {
      ...asPlainObject(existing.mcp_servers),
      ...asPlainObject(generated.mcp_servers)
    },
    delx_wellness: generated.delx_wellness
  };
}

export function renderDryRunConfig(config: PlainConfig): string {
  return stringifyHermesConfig(redactSecrets(config));
}

export function redactSecrets<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => redactSecrets(item)) as T;
  if (!isPlainObject(value)) return value;

  const redacted: PlainConfig = {};
  for (const [key, child] of Object.entries(value)) {
    if (isSecretLikeKey(key)) {
      redacted[key] = "[redacted]";
    } else {
      redacted[key] = redactSecrets(child);
    }
  }
  return redacted as T;
}

function mergeSkillsConfig(existing: PlainConfig, generated: PlainConfig): PlainConfig {
  const existingDirs = asStringArray(existing.external_dirs);
  const generatedDirs = asStringArray(generated.external_dirs);
  return {
    ...existing,
    ...generated,
    external_dirs: unique([...existingDirs, ...generatedDirs])
  };
}

function asPlainObject(value: unknown): PlainConfig {
  return isPlainObject(value) ? value as PlainConfig : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSecretLikeKey(key: string): boolean {
  return /authorization|token|secret|password|api[_-]?key|bearer/i.test(key);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
