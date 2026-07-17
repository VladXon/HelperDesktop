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
}

declare global {
  interface Window {
    api: ElectronApi;
  }
}
