import { SEED_STATS } from '../../seeds/domain-stats.js';

interface ValidationError {
  statId: string;
  message: string;
}

function validateRegistry(): ValidationError[] {
  const errors: ValidationError[] = [];
  const ids = new Set<string>();

  for (const stat of SEED_STATS) {
    if (ids.has(stat.id)) {
      errors.push({ statId: stat.id, message: `Duplicate stat ID` });
    }
    ids.add(stat.id);

    if (!stat.id.includes('.')) {
      errors.push({
        statId: stat.id,
        message: `Stat ID must be namespaced (category.name)`,
      });
    }

    if (!stat.displayName || stat.displayName.trim().length === 0) {
      errors.push({ statId: stat.id, message: `Missing displayName` });
    }

    if (!stat.category) {
      errors.push({ statId: stat.id, message: `Missing category` });
    } else {
      const validCategories = [
        'defense',
        'resistance',
        'offense',
        'attribute',
        'resource',
        'skill',
        'ailment',
        'conversion',
        'enemy',
        'mechanic',
      ];
      if (!validCategories.includes(stat.category)) {
        errors.push({
          statId: stat.id,
          message: `Invalid category "${stat.category}". Must be one of: ${validCategories.join(', ')}`,
        });
      }
    }

    if (!stat.aggregation) {
      errors.push({ statId: stat.id, message: `Missing aggregation` });
    } else {
      const validAggregations = ['sum', 'product', 'maximum', 'override', 'flag'];
      if (!validAggregations.includes(stat.aggregation.kind)) {
        errors.push({
          statId: stat.id,
          message: `Invalid aggregation kind "${stat.aggregation.kind}"`,
        });
      }
    }

    if (stat.aggregation.kind === 'flag' && stat.defaultBase !== undefined) {
      errors.push({
        statId: stat.id,
        message: `Flag aggregation stats should not have defaultBase`,
      });
    }
  }

  return errors;
}

function main(): void {
  const errors = validateRegistry();

  const categories = [...new Set(SEED_STATS.map((s) => s.category))];
  const aggregationCounts = Object.fromEntries(
    [...new Set(SEED_STATS.map((s) => s.aggregation.kind))].map((k) => [k, 0]),
  );
  for (const s of SEED_STATS) {
    aggregationCounts[s.aggregation.kind] =
      (aggregationCounts[s.aggregation.kind] ?? 0) + 1;
  }

  console.log(`StatRegistry validation: ${SEED_STATS.length} stats defined.`);
  console.log(`  Categories: ${categories.join(', ')}`);
  console.log(
    `  Aggregations: ${Object.entries(aggregationCounts)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}`,
  );

  if (errors.length > 0) {
    console.error(`\n${errors.length} validation error(s):`);
    for (const err of errors) {
      console.error(`  - [${err.statId}] ${err.message}`);
    }
    process.exit(1);
  }

  console.log('✓ All stat definitions valid.');
}

main();
