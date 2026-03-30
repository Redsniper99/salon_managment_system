import type { Branch } from '@/lib/types';

/** Defensive: same row should not appear twice; keeps list stable for keys and labels. */
export function dedupeBranchesById(branches: Branch[] | null | undefined): Branch[] {
    if (!branches?.length) return [];
    const map = new Map<string, Branch>();
    for (const b of branches) {
        if (b?.id && !map.has(b.id)) map.set(b.id, b);
    }
    return Array.from(map.values());
}

/**
 * When two locations share the same name (e.g. duplicate "Main Branch" rows), show address or id suffix so the header select is usable.
 */
export function branchPickerLabel(b: Branch, all: Branch[]): string {
    const name = (b.name || '').trim() || 'Branch';
    const norm = name.toLowerCase();
    const sameName = all.filter(x => (x.name || '').trim().toLowerCase() === norm);
    if (sameName.length <= 1) return name;

    const addr = (b.address || '').trim();
    if (addr) {
        const sameAddrCount = sameName.filter(x => (x.address || '').trim() === addr).length;
        if (sameAddrCount === 1) {
            const short = addr.length > 36 ? `${addr.slice(0, 36)}…` : addr;
            return `${name} — ${short}`;
        }
    }
    return `${name} · …${b.id.slice(-8)}`;
}
