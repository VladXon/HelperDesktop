export type AggregationKind =
  | SumAggregation
  | ProductAggregation
  | MaximumAggregation
  | OverrideAggregation
  | FlagAggregation;

export interface SumAggregation {
  readonly kind: 'sum';
}

export interface ProductAggregation {
  readonly kind: 'product';
}

export interface MaximumAggregation {
  readonly kind: 'maximum';
}

export interface OverrideAggregation {
  readonly kind: 'override';
}

export interface FlagAggregation {
  readonly kind: 'flag';
}
