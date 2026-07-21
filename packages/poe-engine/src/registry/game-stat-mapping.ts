export interface GameStatMapping {
  readonly gameStatId: number;
  readonly transform: StatTransform;
  readonly scope?: 'local' | 'global' | 'enemy';
}

export type StatTransform =
  | { readonly kind: 'identity' }
  | { readonly kind: 'percent' }
  | { readonly kind: 'percentOfStat'; readonly statKey: string }
  | { readonly kind: 'perStat'; readonly statKey: string; readonly per: number }
  | { readonly kind: 'inverse' }
  | { readonly kind: 'scale'; readonly factor: number };
