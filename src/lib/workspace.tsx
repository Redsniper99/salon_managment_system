'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { useAuth } from '@/lib/auth';
import { branchesService } from '@/services/branches';
import type { Branch } from '@/lib/types';
import { dedupeBranchesById } from '@/lib/branch-display';

export type BranchScope = 'all' | string;

const STORAGE_KEY = 'salonflow_branch_scope';

interface WorkspaceContextType {
    branches: Branch[];
    branchScope: BranchScope;
    setBranchScope: (id: BranchScope) => void;
    /** When set, dashboard queries should filter by this branch; stylists/receptionists use profile branch only. */
    effectiveBranchId: string | undefined;
    refreshBranches: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [branchScope, setBranchScopeState] = useState<BranchScope>('all');

    const refreshBranches = useCallback(async () => {
        if (!user?.organizationId) {
            setBranches([]);
            return;
        }
        try {
            const list = await branchesService.getBranches(user.organizationId);
            setBranches(dedupeBranchesById(list));
        } catch {
            setBranches([]);
        }
    }, [user?.organizationId]);

    useEffect(() => {
        void refreshBranches();
    }, [refreshBranches]);

    useEffect(() => {
        if (!user) return;
        // Non-owners are locked to their profile branch_id and must not use org-wide branch switching.
        if (user.role === 'Receptionist' || user.role === 'Stylist' || user.role === 'Manager') {
            setBranchScopeState(user.branchId || 'all');
            return;
        }
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved === 'all' || (saved && saved.length > 0)) {
                setBranchScopeState(saved as BranchScope);
            } else {
                setBranchScopeState('all');
            }
        } catch {
            setBranchScopeState('all');
        }
    }, [user?.id, user?.branchId, user?.role]);

    const setBranchScope = useCallback(
        (id: BranchScope) => {
            setBranchScopeState(id);
            if (user?.role === 'Owner' || user?.role === 'Manager') {
                try {
                    localStorage.setItem(STORAGE_KEY, id);
                } catch {
                    /* ignore */
                }
            }
        },
        [user?.role]
    );

    // Drop stale localStorage branch id (e.g. after rename / migration) so the select matches real rows.
    useEffect(() => {
        if (!user || user.role === 'Receptionist' || user.role === 'Stylist' || user.role === 'Manager') return;
        if (branchScope === 'all' || branches.length === 0) return;
        const valid = branches.some(b => b.id === branchScope);
        if (!valid) {
            setBranchScope('all');
        }
    }, [branches, branchScope, user, setBranchScope]);

    const effectiveBranchId = useMemo(() => {
        if (!user) return undefined;
        if (user.role === 'Receptionist' || user.role === 'Stylist' || user.role === 'Manager') {
            return user.branchId;
        }
        if (branchScope === 'all') return undefined;
        return branchScope;
    }, [user, branchScope]);

    const value = useMemo(
        () => ({
            branches,
            branchScope,
            setBranchScope,
            effectiveBranchId,
            refreshBranches,
        }),
        [branches, branchScope, setBranchScope, effectiveBranchId, refreshBranches]
    );

    return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
    const ctx = useContext(WorkspaceContext);
    if (!ctx) {
        throw new Error('useWorkspace must be used within WorkspaceProvider');
    }
    return ctx;
}
