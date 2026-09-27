export interface SelemenePreferences {
  apiKey?: string;
  baseUrl?: string;
  witnessUrl?: string;
  executionRoute?: ExecutionRouteTarget;
  readingHistoryLimit?: string;
  cacheRawPayloads?: boolean;
  pulseMode?: PulseModeKind;
}

export interface SelemeneClientConfig {
  baseUrl: string;
  apiKey: string;
}

export type ExecutionRouteTarget = "selemene" | "witness";

export type ApiKeyStorageMode =
  | "preference"
  | "localStorage"
  | "environment"
  | "none";

export type AccessMode = "admin" | "witness";

export interface AccessContext {
  mode: AccessMode;
  hasAccessKey: boolean;
  apiKeyStorageMode: ApiKeyStorageMode;
  requestedExecutionRoute: ExecutionRouteTarget;
  effectiveExecutionRoute: ExecutionRouteTarget;
  canUseDailyRitual: boolean;
  canUseAmbientCompanion: boolean;
  canUseEngineWorkbench: boolean;
}

export interface ExecutionRouteInfo {
  target: ExecutionRouteTarget;
  label: string;
  baseUrl: string;
}

export interface SyncIssue {
  resource: string;
  message: string;
  target: ExecutionRouteTarget;
}

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  engineCount: number;
  engineIds: string[];
  fetchedAt?: string;
}

export type CapabilityAvailability =
  | "declared"
  | "available"
  | "degraded"
  | "unavailable";
export type RuntimeKind =
  | "native"
  | "typescript"
  | "python"
  | "database-conditional"
  | "composed";

export interface EngineCapability {
  contractVersion: "v1";
  engineId: string;
  displayName: string;
  availability: CapabilityAvailability;
  runtimeKind: RuntimeKind;
  dependencies: string[];
  requiredPhase?: number;
  implementationVersion?: string;
}

export interface EngineProvenance {
  runtime_kind: RuntimeKind;
  implementation_version: string;
  cached: boolean;
  fallback_used: boolean;
  backend_id?: string;
  provider_id?: string;
  confidence?: number;
}

export interface EngineSummary {
  id: string;
  name: string;
  requiredPhase: number;
  availability?: CapabilityAvailability;
  fetchedAt?: string;
}

export interface RateLimitInfo {
  limit?: number;
  remaining?: number;
  reset?: number;
  dailyRemaining?: number;
  dailyReset?: number;
}

export interface HealthSnapshot {
  status: string;
  version: string;
  uptimeSeconds: number;
  enginesLoaded: number;
  workflowsLoaded: number;
  fetchedAt: string;
}

export interface BirthLocation {
  latitude?: number;
  longitude?: number;
  name?: string;
}

export interface UserProfileSnapshot {
  id: string;
  email: string;
  fullName: string;
  tier: string;
  consciousnessLevel: number;
  experiencePoints: number;
  birthDate?: string;
  birthTime?: string;
  birthLocation?: BirthLocation;
  timezone?: string;
  preferences: Record<string, unknown>;
  fetchedAt: string;
}

export interface UserProfileUpdate {
  fullName?: string;
  email?: string;
  birthDate?: string;
  birthTime?: string;
  birthLocation?: BirthLocation;
  timezone?: string;
  preferences?: Record<string, unknown>;
}

export type UserProfileUpdateResult = UserProfileSnapshot;

export interface BirthDataInput {
  name?: string;
  date?: string;
  time?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export type PrecisionLevel = "Standard" | "High" | "Extreme";

export const TAROT_SPREAD_VARIANTS = [
  "single_card",
  "three_card",
  "celtic_cross",
  "horseshoe",
  "relationship",
  "career",
  "yes_no",
] as const;

export type TarotSpreadVariant = (typeof TAROT_SPREAD_VARIANTS)[number];

export interface TarotExecutionOptions {
  question?: string;
  spread?: TarotSpreadVariant;
}

export interface EngineExecutionInput {
  birthData?: BirthDataInput;
  currentTime?: string;
  precision?: PrecisionLevel;
  options?: Record<string, unknown>;
}

export interface EngineExecutionResult {
  engineId: string;
  result: Record<string, unknown>;
  witnessPrompt?: string;
  witnessLayer?: Record<string, unknown>;
  consciousnessLevel?: number;
  metadata: Record<string, unknown>;
  timestamp?: string;
  route?: ExecutionRouteInfo;
  provenance?: EngineProvenance;
  raw: Record<string, unknown>;
}

export interface WorkflowExecutionResult {
  workflowId: string;
  readingId?: string;
  createdAt?: string;
  subject?: unknown;
  evidence?: unknown;
  report?: Record<string, unknown>;
  engineOutputs: Record<string, EngineExecutionResult>;
  synthesis: Record<string, unknown>;
  totalTimeMs?: number;
  timestamp?: string;
  route?: ExecutionRouteInfo;
  raw: Record<string, unknown>;
}

export interface UsageWindowSummary {
  total: number;
  success: number;
  failure: number;
}

export interface UsageEngineEntry {
  engineId: string;
  requestCount: number;
}

export interface UsageSnapshot {
  userId: string;
  daily: UsageWindowSummary;
  monthly: UsageWindowSummary;
  engineBreakdown: UsageEngineEntry[];
  fetchedAt: string;
}

export interface ReadingSummary {
  id: string;
  engineId: string;
  workflowId?: string;
  inputHash: string;
  witnessPrompt?: string;
  consciousnessLevel: number;
  calculationTimeMs?: number;
  createdAt: string;
  payload: Record<string, unknown>;
  fetchedAt: string;
}

export interface ReadingStat {
  engineId: string;
  count: number;
  fetchedAt?: string;
}

export interface ResourceTimestamps {
  service?: string;
  profile?: string;
  usage?: string;
  catalog?: string;
  readings?: string;
  lastSyncAt?: string;
}

export type CacheState = "empty" | "fresh" | "stale" | "cached";
export type SnapshotSource = "empty" | "cache" | "live";

export interface DashboardSnapshot {
  baseUrl: string;
  hasCredentials: boolean;
  access?: AccessContext;
  cacheState: CacheState;
  source: SnapshotSource;
  health?: HealthSnapshot;
  profile?: UserProfileSnapshot;
  usage?: UsageSnapshot;
  workflows: WorkflowSummary[];
  engines: EngineSummary[];
  readings: ReadingSummary[];
  readingStats: ReadingStat[];
  rateLimit: RateLimitInfo;
  timestamps: ResourceTimestamps;
  syncIssues: SyncIssue[];
  syncError?: string;
}

export interface RemoteSnapshot {
  baseUrl: string;
  health?: HealthSnapshot;
  profile?: UserProfileSnapshot;
  usage?: UsageSnapshot;
  workflows?: WorkflowSummary[];
  engines?: EngineSummary[];
  capabilities: EngineCapability[];
  readings?: ReadingSummary[];
  readingStats?: ReadingStat[];
  rateLimit?: RateLimitInfo;
  syncIssues?: SyncIssue[];
  fetchedAt: string;
}

export type PulseModeKind =
  | "nadabrahman"
  | "vedicClock"
  | "biorhythm"
  | "vimshottari";

export type SourcePulseModeKind = Exclude<PulseModeKind, "nadabrahman">;

export type MenuBarInsightKind = PulseModeKind;

export interface MenuBarInsightSnapshot {
  kind: MenuBarInsightKind;
  engineId: string;
  title: string;
  subtitle?: string;
  summary: string;
  payload: Record<string, unknown>;
  fetchedAt: string;
  refreshAfter: string;
}

export interface MenuBarSnapshot {
  dashboard: DashboardSnapshot;
  insights: Partial<Record<MenuBarInsightKind, MenuBarInsightSnapshot>>;
  syncIssues: SyncIssue[];
  syncError?: string;
}
