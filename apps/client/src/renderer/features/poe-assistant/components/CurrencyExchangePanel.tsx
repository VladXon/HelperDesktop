import type * as React from 'react';
import { useState, useMemo } from 'react';
import { ArrowsClockwise, WarningCircle } from '@phosphor-icons/react';
import { Button } from '../../../components/ui/button';
import { Select } from '../../../components/ui/select';
import { useLeagues, useExchangeRate } from '../hooks/usePoeQueries';
import { TOP_CURRENCIES, type ExchangeListing } from '../types';

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

interface CurrencyRowProps {
  currency: (typeof TOP_CURRENCIES)[number];
  league: string;
  divinePerChaos: number;
}

function CurrencyRow({ currency, league, divinePerChaos }: CurrencyRowProps): React.JSX.Element {
  const { data: wantRate, isFetching: loadingBuy, isError: errorBuy } = useExchangeRate(league, 'chaos', currency.id);
  const { data: haveRate, isFetching: loadingSell, isError: errorSell } = useExchangeRate(league, currency.id, 'chaos');

  const buyPrice = useMemo(() => {
    const prices = (wantRate?.listings ?? []).map((l: ExchangeListing) => l.price);
    return median(prices);
  }, [wantRate]);

  const sellPrice = useMemo(() => {
    const prices = (haveRate?.listings ?? []).map((l: ExchangeListing) => l.price);
    return median(prices);
  }, [haveRate]);

  const divineValue = divinePerChaos > 0 ? buyPrice / divinePerChaos : 0;
  const totalListings = (wantRate?.total ?? 0) + (haveRate?.total ?? 0);

  const loading = loadingBuy || loadingSell;
  const hasError = errorBuy || errorSell;

  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      <td className="py-3 px-4 text-body-md text-text-primary">{currency.name}</td>
      <td className="py-3 px-4 text-body-md text-text-primary font-mono text-right">
        {hasError ? <WarningCircle size={16} className="text-red-400/60 mx-auto" /> : loading ? <span className="text-text-muted animate-pulse">...</span> : buyPrice > 0 ? buyPrice.toFixed(1) : <span className="text-text-muted">—</span>}
      </td>
      <td className="py-3 px-4 text-body-md text-text-primary font-mono text-right">
        {hasError ? <WarningCircle size={16} className="text-red-400/60 mx-auto" /> : loading ? <span className="text-text-muted animate-pulse">...</span> : sellPrice > 0 ? sellPrice.toFixed(1) : <span className="text-text-muted">—</span>}
      </td>
      <td className="py-3 px-4 text-body-md text-text-primary font-mono text-right">
        {hasError ? <WarningCircle size={16} className="text-red-400/60 mx-auto" /> : divineValue > 0 ? divineValue.toFixed(2) : <span className="text-text-muted">—</span>}
      </td>
      <td className="py-3 px-4 text-body-md text-text-muted font-mono text-right">
        {hasError ? <span className="text-red-400/60">err</span> : totalListings}
      </td>
    </tr>
  );
}

export function CurrencyExchangePanel(): React.JSX.Element {
  const { data: leagues = [], isError: leaguesError } = useLeagues();
  const [selectedLeague, setSelectedLeague] = useState<string>('Standard');

  const league = useMemo(() => {
    if (leagues.some((l) => l.id === selectedLeague)) return selectedLeague;
    return leagues[0]?.id ?? 'Standard';
  }, [leagues, selectedLeague]);

  const { data: divineRate, refetch: refetchDivine, isError: divineError } = useExchangeRate(league, 'chaos', 'divine');

  const divinePerChaos = useMemo(() => {
    const prices = (divineRate?.listings ?? []).map((l: ExchangeListing) => l.price);
    return median(prices);
  }, [divineRate]);

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 px-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-label-sm text-text-muted">League:</span>
            <Select
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
            >
            {leagues.map((l) => (
              <option key={l.id} value={l.id} className="bg-bg-primary text-text-primary">{l.text}</option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-label-sm text-text-primary font-mono">
            Divine: {divineError ? <span className="text-red-400/60">err</span> : divinePerChaos > 0 ? <span className="text-accent">{`${divinePerChaos.toFixed(1)}c`}</span> : '...'}
          </span>
          <Button variant="ghost" size="sm" onClick={() => refetchDivine()} className="h-8 w-8 p-0">
            <ArrowsClockwise size={16} />
          </Button>
        </div>
      </div>

      {leaguesError ? (
        <div className="px-6 py-2 border-b border-white/5 flex items-center gap-2 text-label-sm text-red-400/80">
          <WarningCircle size={14} /> Failed to load leagues — GGG API may be unavailable
        </div>
      ) : null}

      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-bg-primary/95 backdrop-blur-sm">
            <tr className="text-label-sm text-text-muted border-b border-white/10">
              <th className="text-left py-3 px-4 font-medium">Currency</th>
              <th className="text-right py-3 px-4 font-medium">Buy (chaos)</th>
              <th className="text-right py-3 px-4 font-medium">Sell (chaos)</th>
              <th className="text-right py-3 px-4 font-medium">Divine</th>
              <th className="text-right py-3 px-4 font-medium">Listings</th>
            </tr>
          </thead>
          <tbody>
            {TOP_CURRENCIES.map((c) => (
              <CurrencyRow key={c.id} currency={c} league={league} divinePerChaos={divinePerChaos} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
