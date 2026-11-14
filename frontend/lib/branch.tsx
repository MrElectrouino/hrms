import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './auth';
import { BranchOption, getMyBranches, getSelectedBranchId, setSelectedBranchId } from './api';

interface BranchContextValue {
  branches: BranchOption[];
  /** true when the account is limited to certain branches. */
  restricted: boolean;
  /** null = all (of the branches the account may use). */
  selectedId: number | null;
  select: (id: number | null) => void;
  /** Changes on every switch; pages keyed by it reload their data. */
  version: number;
}

const BranchContext = createContext<BranchContextValue>({
  branches: [],
  restricted: false,
  selectedId: null,
  select: () => {},
  version: 0,
});

export const useBranch = () => useContext(BranchContext);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [restricted, setRestricted] = useState(false);
  const [selectedId, setSelectedIdState] = useState<number | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setBranches([]);
      setSelectedIdState(null);
      return;
    }
    let cancelled = false;
    getMyBranches()
      .then((res) => {
        if (cancelled) return;
        setBranches(res.data.branches);
        setRestricted(res.data.restricted);
        // Drop a stored choice the account can no longer use.
        const stored = getSelectedBranchId();
        const valid = stored !== null && res.data.branches.some((b) => b.id === stored);
        if (stored !== null && !valid) setSelectedBranchId(null);
        setSelectedIdState(valid ? stored : null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // user?.id: a different person signing in on the same browser starts clean.
  }, [isAuthenticated, user?.id]);

  const select = useCallback((id: number | null) => {
    setSelectedBranchId(id);
    setSelectedIdState(id);
    setVersion((v) => v + 1);
  }, []);

  const value = useMemo(() => ({ branches, restricted, selectedId, select, version }), [branches, restricted, selectedId, select, version]);
  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}
