import type * as React from 'react';
import { useState, useMemo } from 'react';
import { MagnifyingGlass, ArrowsClockwise, WarningCircle } from '@phosphor-icons/react';
import { Button } from '../../../components/ui/button';
import { Select } from '../../../components/ui/select';
import { useLeagues, useItemSearch } from '../hooks/usePoeQueries';
import { ITEM_CATEGORIES } from '../types';

interface ItemListingRaw {
  listing?: {
    price?: { exchange?: { amount: number }; item?: { currency: string }; amount?: number };
    account?: { name?: string };
    indexed?: string;
  };
  item?: {
    name?: string;
    typeLine?: string;
    icon?: string;
  };
}

function formatAge(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function ItemPriceChecker(): React.JSX.Element {
  const { data: leagues = [] } = useLeagues();
  const [selectedLeague, setSelectedLeague] = useState<string>('Standard');
  const [searchName, setSearchName] = useState<string>('');
  const [category, setCategory] = useState<string>('Currency');
  const [activeQuery, setActiveQuery] = useState<Record<string, unknown> | null>(null);

  const league = useMemo(() => {
    if (leagues.some((l) => l.id === selectedLeague)) return selectedLeague;
    return leagues[0]?.id ?? 'Standard';
  }, [leagues, selectedLeague]);

  const { data: results, isFetching, refetch, isError } = useItemSearch(league, activeQuery);

  const prices = useMemo(() => {
    if (!results?.items) return { min: 0, max: 0, median: 0, count: 0 };
    const items = results.items as ItemListingRaw[];
    const priceList = items.map((i) => i.listing?.price?.exchange?.amount ?? i.listing?.price?.amount ?? 0).filter((p) => p > 0);
    return {
      min: priceList.length > 0 ? Math.min(...priceList) : 0,
      max: priceList.length > 0 ? Math.max(...priceList) : 0,
      median: median(priceList),
      count: priceList.length,
    };
  }, [results]);

  const handleSearch = (): void => {
    if (!searchName.trim()) return;
    const query: Record<string, unknown> = {
      query: {
        status: { option: 'online' },
        type: category,
        name: searchName.trim(),
      },
      sort: { price: 'asc' },
    };
    setActiveQuery(query);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 px-6 flex items-center gap-3 border-b border-white/5">
        <Select
          value={selectedLeague}
          onChange={(e) => setSelectedLeague(e.target.value)}
        >
          {leagues.map((l) => (
            <option key={l.id} value={l.id} className="bg-bg-primary text-text-primary">{l.text}</option>
          ))}
        </Select>
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {ITEM_CATEGORIES.map((c) => (
            <option key={c.type} value={c.type} className="bg-bg-primary text-text-primary">{c.label}</option>
          ))}
        </Select>
      </div>

      <div className="px-6 py-4">
        <div className="flex gap-3">
          <div className="glass-input rounded-lg flex items-center h-10 px-4 flex-1 group">
            <MagnifyingGlass size={18} className="text-text-muted mr-3 group-focus-within:text-accent transition-colors shrink-0" />
            <input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
              placeholder="Search item name..."
              className="bg-transparent border-none outline-none text-body-md w-full text-text-primary placeholder:text-text-muted/40"
            />
          </div>
          <Button onClick={handleSearch} disabled={!searchName.trim()} className="gap-2">
            <MagnifyingGlass size={16} /> Search
          </Button>
        </div>
      </div>

      {isError ? (
        <div className="px-6 py-2 border-b border-white/5 flex items-center gap-2 text-label-sm text-red-400/80">
          <WarningCircle size={14} /> Search failed — GGG API may be rate-limiting or unavailable
        </div>
      ) : null}

      {(results || isFetching) ? (
        <>
          {prices.count > 0 ? (
            <div className="px-6 py-3 flex gap-6 border-b border-white/5">
              <div className="flex flex-col items-center">
                <span className="text-label-sm text-text-muted">Min</span>
                <span className="text-body-md text-text-primary font-mono">{prices.min.toFixed(1)}c</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-label-sm text-text-muted">Median</span>
                <span className="text-body-md text-accent font-mono">{prices.median.toFixed(1)}c</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-label-sm text-text-muted">Max</span>
                <span className="text-body-md text-text-primary font-mono">{prices.max.toFixed(1)}c</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-label-sm text-text-muted">Total</span>
                <span className="text-body-md text-text-primary font-mono">{results?.total ?? '...'}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="ml-auto h-8 w-8 p-0">
                <ArrowsClockwise size={16} />
              </Button>
            </div>
          ) : null}

          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-bg-primary/95 backdrop-blur-sm">
                <tr className="text-label-sm text-text-muted border-b border-white/10">
                  <th className="text-left py-3 px-4 font-medium">Item</th>
                  <th className="text-right py-3 px-4 font-medium">Price</th>
                  <th className="text-right py-3 px-4 font-medium">Seller</th>
                  <th className="text-right py-3 px-4 font-medium">Age</th>
                </tr>
              </thead>
              <tbody>
                {isFetching ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-text-muted">Loading...</td>
                  </tr>
                ) : (results?.items ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-text-muted">No results</td>
                  </tr>
                ) : (
                  ([...(results?.items ?? [])] as ItemListingRaw[]).slice(0, 20).map((item, i) => {
                    const price = item.listing?.price?.exchange?.amount ?? item.listing?.price?.amount ?? 0;
                    const currency = item.listing?.price?.item?.currency ?? 'chaos';
                    const seller = item.listing?.account?.name ?? '?';
                    const age = item.listing?.indexed ? formatAge(item.listing.indexed) : '?';
                    const itemName = item.item?.name ?? item.item?.typeLine ?? '?';
                    return (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 text-body-md text-text-primary">{itemName}</td>
                        <td className="py-3 px-4 text-body-md text-text-primary font-mono text-right whitespace-nowrap">
                          {price > 0 ? (
                            <>
                              {currency === 'divine' ? (
                                <span className="text-accent">{price.toFixed(1)} div</span>
                              ) : (
                                <span>{price.toFixed(1)}c</span>
                              )}
                            </>
                          ) : (
                            <span className="text-text-muted">?</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-body-md text-text-muted text-right max-w-[150px] truncate">{seller}</td>
                        <td className="py-3 px-4 text-body-md text-text-muted text-right">{age}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-muted">
          Search for items to see prices
        </div>
      )}
    </div>
  );
}
