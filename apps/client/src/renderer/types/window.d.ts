import type {
  Note,
  Preset,
  PresetApp,
  TelegramStatus,
  LinkCodeResponse,
  LinkStatus,
  QrLoginRequestResponse,
  QrLoginStatus,
  User,
  AccountInfo,
} from '@helper/shared';

export interface PoeCharacterSummary {
  id: number;
  name: string;
  level: number;
  class: string;
  ascendancy: string | null;
  league: string;
  lastSync: string;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  version: string;
  db: string;
}

export interface DevServerInfo {
  uptime: number;
  memory: { rss: number; heapTotal: number; heapUsed: number; external: number };
  version: string;
  nodeEnv: string;
  users_count: number;
  sessions_count: number;
  notes_count: number;
  presets_count: number;
  telegram_links_count: number;
}

export interface NoteCreateInput {
  title: string;
  body: string;
  tags: string[];
  reminderAt: number | null;
  notifyTelegram: boolean;
}

export interface NoteUpdateInput {
  title?: string;
  body?: string;
  tags?: string[];
  reminderAt?: number | null;
  notifyTelegram?: boolean;
  pinned?: boolean;
  completed?: boolean;
}

export interface PresetCreateInput {
  name: string;
  icon: string;
  apps: PresetApp[];
}

export interface PresetUpdateInput {
  name?: string;
  icon?: string;
  apps?: PresetApp[];
  pinned?: boolean;
}

export interface ElectronApi {
  auth: {
    login: (login: string, password: string) => Promise<{ token: string; refreshToken: string; expiresIn: number; user: User }>;
    register: (login: string, password: string, name?: string) => Promise<{ user: User }>;
    saveToken: (login: string, tokenData: { token: string; refreshToken: string; expiresIn: number; user: User }) => Promise<void>;
    logout: () => Promise<void>;
    listAccounts: () => Promise<AccountInfo[]>;
    switchAccount: (login: string) => Promise<{ token: string; refreshToken: string; expiresIn: number; user: User } | null>;
    removeAccount: (login: string) => Promise<void>;
    changePassword: (current: string, next: string) => Promise<{ token: string; refreshToken: string; expiresIn: number }>;
    setEmail: (email: string, currentPassword: string) => Promise<{ user: User }>;
    getMe: () => Promise<User | null>;
  };
  notes: {
    getAll: () => Promise<Note[]>;
    create: (input: NoteCreateInput) => Promise<Note>;
    update: (id: number, input: NoteUpdateInput) => Promise<Note>;
    remove: (id: number) => Promise<void>;
    toggle: (id: number, field: 'pinned' | 'completed') => Promise<Note>;
  };
  presets: {
    getAll: () => Promise<Preset[]>;
    save: (preset: PresetCreateInput) => Promise<Preset>;
    update: (id: number, preset: PresetUpdateInput) => Promise<Preset>;
    delete: (id: number) => Promise<void>;
    launch: (id: number) => Promise<void>;
    togglePin: (id: number) => Promise<Preset>;
  };
  settings: {
    getAll: () => Promise<Record<string, unknown>>;
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<void>;
    setMany: (data: Record<string, unknown>) => Promise<void>;
  };
  telegram: {
    status: () => Promise<TelegramStatus>;
    linkCode: () => Promise<LinkCodeResponse>;
    linkCheck: (code: string) => Promise<LinkStatus>;
    qrLoginRequest: () => Promise<QrLoginRequestResponse>;
    qrLoginCheck: (token: string) => Promise<QrLoginStatus>;
    unlink: () => Promise<void>;
  };
  server: {
    getUrl: () => Promise<string>;
    setUrl: (url: string) => Promise<void>;
    test: () => Promise<HealthStatus>;
    checkUrl: (url: string) => Promise<{ status: 'online' | 'offline' }>;
    onHealth: (callback: (status: HealthStatus) => void) => () => void;
    devServerInfo: () => Promise<DevServerInfo>;
    devRestart: () => Promise<void>;
    devOp: (login: string) => Promise<void>;
  };
  dialog: {
    openFile: (filters: { name: string; extensions: string[] }[]) => Promise<string | null>;
  };
  window: {
    minimize: () => void;
    maximizeToggle: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    onMaximizedChanged: (callback: (maximized: boolean) => void) => () => void;
  };
  deepLink: {
    onNote: (callback: (id: number) => void) => () => void;
  };
  shell: {
    openExternal: (url: string) => Promise<boolean>;
  };
  push: {
    show: (title: string, body: string) => Promise<void>;
  };
  poe: {
    setSession: (poesessid: string) => Promise<{ valid: boolean; accountName?: string }>;
    getSession: () => Promise<{ configured: boolean; valid: boolean; accountName: string | null }>;
    clearSession: () => Promise<void>;
    getLeagues: () => Promise<{ id: string; text: string }[]>;
    fetchExchangeRate: (league: string, have: string, want: string) => Promise<{ listings: unknown[]; total: number }>;
    searchItems: (league: string, query: Record<string, unknown>) => Promise<{ id: string; items: unknown[]; total: number }>;
    fetchCharacters: () => Promise<unknown[]>;
    fetchStashItems: (league: string, tabIndex: number) => Promise<unknown>;
    fetchExchangeHistory: () => Promise<unknown>;
    importUrl: (url: string) => Promise<unknown>;
    importXml: (xml: string) => Promise<unknown>;
    analyze: (urlOrXml: string, isUrl?: boolean) => Promise<unknown>;

    saveBuild: (data: {
      pobUrl: string;
      rawPobXml: string;
      buildName: string;
      characterClass: string;
      ascendancy: string | null;
      level: number;
      game: string;
      source: string;
      analysis?: unknown;
    }) => Promise<{ id: number; buildHash: string }>;
    listBuilds: () => Promise<Array<{
      id: number;
      buildHash: string;
      name: string | null;
      characterClass: string | null;
      ascendancy: string | null;
      level: number | null;
      pobUrl: string | null;
      game: string;
      overallScore: number | null;
      lastAnalyzedAt: string | null;
      createdAt: string;
    }>>;
    deleteBuild: (buildHash: string) => Promise<void>;
    compareBuilds: (hashA: string, hashB: string) => Promise<unknown>;
    getAccounts: () => Promise<Array<{ id: number; accountName: string; connected: boolean }>>;
    disconnectAccount: (id: number) => Promise<void>;
    connectAccount: () => Promise<{ authUrl: string; state: string }>;
    completeOAuth: (code: string, state: string) => Promise<{ connected: boolean; accountName: string }>;
    getOAuthStatus: () => Promise<{ connected: boolean; accountName: string | null; tokenValid: boolean; expiresAt: string | null; scopes: string | null }>;
    fetchOAuthCharacters: () => Promise<{ characters: Array<{ name: string; league: string; class: string; level: number }> }>;
    fetchCharacterDetail: (name: string) => Promise<Record<string, unknown>>;
    analyzeCharacter: (name: string) => Promise<unknown>;
    connectSession: (poeSessionId: string) => Promise<{ connected: boolean; accountName: string; mode: string }>;

    listCharacters: () => Promise<PoeCharacterSummary[]>;
    syncCharacters: () => Promise<PoeCharacterSummary[]>;
    getCharacter: (id: number) => Promise<Record<string, unknown>>;
    refreshCharacter: (id: number) => Promise<Record<string, unknown>>;
  };
}

declare global {
  interface Window {
    api: ElectronApi;
  }
}
