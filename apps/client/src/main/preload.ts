import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

const VALID_CHANNEL_RE = /^[a-z]+:[a-z][a-z0-9-]+$/;

const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> => {
  if (!VALID_CHANNEL_RE.test(channel)) {
    return Promise.reject(new Error(`Invalid channel: ${channel}`));
  }
  if (args.length > 10) {
    return Promise.reject(new Error(`Too many arguments for channel: ${channel}`));
  }
  return ipcRenderer.invoke(channel, ...args) as Promise<T>;
};
const on = (channel: string, cb: (...args: unknown[]) => void): (() => void) => {
  const listener = (_e: IpcRendererEvent, ...args: unknown[]): void => cb(...args);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.off(channel, listener);
};

const api = {
  auth: {
    login: (login: string, password: string) => invoke<{ token: string; refreshToken: string; expiresIn: number; user: import('@helper/shared').User }>('auth:login', login, password),
    register: (login: string, password: string, name?: string) => invoke<{ user: import('@helper/shared').User }>('auth:register', login, password, name),
    saveToken: (login: string, tokenData: { token: string; refreshToken: string; expiresIn: number; user: import('@helper/shared').User }) => invoke<void>('auth:save-token', login, tokenData),
    logout: () => invoke<void>('auth:logout'),
    listAccounts: () => invoke<Array<{ login: string; userId: number; isDev: boolean; createdAt: string }>>('auth:list-accounts'),
    switchAccount: (login: string) => invoke<{ token: string; refreshToken: string; expiresIn: number; user: import('@helper/shared').User } | null>('auth:switch-account', login),
    removeAccount: (login: string) => invoke<void>('auth:remove-account', login),
    changePassword: (current: string, next: string) => invoke<{ token: string; refreshToken: string; expiresIn: number }>('auth:change-password', current, next),
    setEmail: (email: string, currentPassword: string) => invoke<{ user: import('@helper/shared').User }>('auth:set-email', email, currentPassword),
    getMe: () => invoke<import('@helper/shared').User | null>('auth:get-me'),
  },
  notes: {
    getAll: () => invoke<import('@helper/shared').Note[]>('notes:get-all'),
    create: (input: { title: string; body: string; tags: string[]; reminderAt: number | null; notifyTelegram: boolean }) => invoke<import('@helper/shared').Note>('notes:create', input),
    update: (id: number, input: { title?: string; body?: string; tags?: string[]; reminderAt?: number | null; notifyTelegram?: boolean; pinned?: boolean; completed?: boolean }) => invoke<import('@helper/shared').Note>('notes:update', id, input),
    remove: (id: number) => invoke<void>('notes:remove', id),
    toggle: (id: number, field: 'pinned' | 'completed') => invoke<import('@helper/shared').Note>('notes:toggle', id, field),
  },
  presets: {
    getAll: () => invoke<import('@helper/shared').Preset[]>('presets:get-all'),
    save: (preset: { name: string; icon: string; apps: import('@helper/shared').PresetApp[] }) => invoke<import('@helper/shared').Preset>('presets:save', preset),
    update: (id: number, preset: { name?: string; icon?: string; apps?: import('@helper/shared').PresetApp[]; pinned?: boolean }) => invoke<import('@helper/shared').Preset>('presets:update', id, preset),
    delete: (id: number) => invoke<void>('presets:delete', id),
    launch: (id: number) => invoke<void>('presets:launch', id),
    togglePin: (id: number) => invoke<import('@helper/shared').Preset>('presets:toggle-pin', id),
  },
  settings: {
    getAll: () => invoke<Record<string, unknown>>('settings:get-all'),
    get: (key: string) => invoke<unknown>('settings:get', key),
    set: (key: string, value: unknown) => invoke<void>('settings:set', key, value),
    setMany: (data: Record<string, unknown>) => invoke<void>('settings:set-many', data),
  },
  telegram: {
    status: () => invoke<import('@helper/shared').TelegramStatus>('telegram:status'),
    linkCode: () => invoke<{ code: string; deepLink: string; expiresIn: number }>('telegram:link-code'),
    linkCheck: (code: string) => invoke<import('@helper/shared').LinkStatus>('telegram:link-check', code),
    qrLoginRequest: () => invoke<{ token: string; deepLink: string; tgDeepLink: string; expiresIn: number }>('telegram:qr-login-request'),
    qrLoginCheck: (token: string) => invoke<import('@helper/shared').QrLoginStatus>('telegram:qr-login-check', token),
    unlink: () => invoke<void>('telegram:unlink'),
  },
  server: {
    getUrl: () => invoke<string>('server:get-url'),
    setUrl: (url: string) => invoke<void>('server:set-url', url),
    test: () => invoke<{ status: string; timestamp: string; version: string; db: string }>('server:test'),
    checkUrl: (url: string) => invoke<{ status: 'online' | 'offline' }>('server:check-url', url),
    onHealth: (cb: (status: unknown) => void) => on('server:health', cb),
    devServerInfo: () => invoke<{ uptime: number; memory: { rss: number; heapTotal: number; heapUsed: number; external: number }; version: string; nodeEnv: string; users_count: number; sessions_count: number; notes_count: number; presets_count: number; telegram_links_count: number }>('server:dev-serverinfo'),
    devRestart: () => invoke<void>('server:dev-restart'),
    devOp: (login: string) => invoke<void>('server:dev-op', login),
  },
  dialog: {
    openFile: (filters: Array<{ name: string; extensions: string[] }>) => invoke<string | null>('dialog:open-file', filters),
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximizeToggle: () => ipcRenderer.send('window:maximize-toggle'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => invoke<boolean>('window:is-maximized'),
    onMaximizedChanged: (cb: (maximized: boolean) => void) => on('window:maximized-changed', (arg) => cb(Boolean(arg))),
  },
  deepLink: {
    onNote: (cb: (id: number) => void) => on('deep-link:note', (id) => cb(id as number)),
  },
  shell: {
    openExternal: (url: string) => invoke<boolean>('shell:open-external', url),
  },
  push: {
    show: (title: string, body: string) => invoke<void>('push:show', title, body),
  },
};

contextBridge.exposeInMainWorld('api', api);
