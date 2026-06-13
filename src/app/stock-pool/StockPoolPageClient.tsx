'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import StockPoolClient from './StockPoolClient';
import PoolList from './PoolList';
import type { PoolEntry } from './types';

export default function StockPoolPageClient() {
  const [items, setItems] = useState<PoolEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stock-pool')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setItems(data.items as PoolEntry[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addStock = useCallback(async (entry: PoolEntry) => {
    const res = await fetch('/api/stock-pool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    const data = await res.json();
    if (data.success) setItems(data.items as PoolEntry[]);
  }, []);

  const removeStock = useCallback(async (code: string) => {
    const res = await fetch(`/api/stock-pool?code=${code}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) setItems(data.items as PoolEntry[]);
  }, []);

  const pooledCodes = useMemo(() => new Set(items.map((i) => i.code)), [items]);

  return (
    <>
      <StockPoolClient pooledCodes={pooledCodes} onAdd={addStock} />
      <PoolList items={items} loading={loading} onRemove={removeStock} />
    </>
  );
}
