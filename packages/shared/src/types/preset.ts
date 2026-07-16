export interface PresetApp {
  name: string;
  path: string;
  runAsAdmin: boolean;
}

export interface Preset {
  id: number;
  userId: number;
  name: string;
  icon: string;
  apps: PresetApp[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}
