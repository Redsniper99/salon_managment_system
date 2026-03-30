'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin, Plus, Pencil, Trash2, Loader } from 'lucide-react';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import ConfirmationDialog from '@/components/shared/ConfirmationDialog';
import { branchesService } from '@/services/branches';
import type { Branch } from '@/lib/types';
import { useWorkspace } from '@/lib/workspace';
import { useAuth } from '@/lib/auth';

interface BranchesSettingsProps {
    showMessage: (type: 'success' | 'error', text: string) => void;
}

export default function BranchesSettings({ showMessage }: BranchesSettingsProps) {
    const { user } = useAuth();
    const { refreshBranches } = useWorkspace();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', address: '', phone: '' });
    const [formBaseline, setFormBaseline] = useState({ name: '', address: '', phone: '' });
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

    const formDirty = useMemo(() => {
        const t = (s: string) => s.trim();
        return (
            t(form.name) !== t(formBaseline.name) ||
            t(form.address) !== t(formBaseline.address) ||
            t(form.phone) !== t(formBaseline.phone)
        );
    }, [form, formBaseline]);

    const load = async () => {
        try {
            setLoading(true);
            const data = await branchesService.getBranches(user?.organizationId);
            setBranches(data || []);
        } catch (e) {
            console.error(e);
            showMessage('error', 'Failed to load branches');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, [user?.organizationId]);

    const resetForm = () => {
        setForm({ name: '', address: '', phone: '' });
        setFormBaseline({ name: '', address: '', phone: '' });
        setEditingId(null);
        setShowForm(false);
    };

    const startEdit = (b: Branch) => {
        const next = { name: b.name, address: b.address, phone: b.phone };
        setEditingId(b.id);
        setForm(next);
        setFormBaseline(next);
        setShowForm(true);
    };

    const openNewBranchForm = () => {
        const empty = { name: '', address: '', phone: '' };
        setEditingId(null);
        setForm(empty);
        setFormBaseline(empty);
        setShowForm(true);
    };

    const requestCancelForm = () => {
        if (formDirty) {
            setShowDiscardDialog(true);
            return;
        }
        resetForm();
    };

    const confirmDiscardForm = () => {
        setShowDiscardDialog(false);
        resetForm();
    };

    const openDeleteDialog = (b: Branch) => {
        setBranchToDelete(b);
        setShowDeleteDialog(true);
    };

    const confirmDeleteBranch = async () => {
        if (!branchToDelete) return;
        try {
            setDeleteLoading(true);
            await branchesService.deleteBranch(branchToDelete.id);
            showMessage('success', 'Branch deleted');
            setShowDeleteDialog(false);
            setBranchToDelete(null);
            await load();
            await refreshBranches();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Delete failed';
            showMessage('error', msg);
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.address.trim() || !form.phone.trim()) {
            showMessage('error', 'Name, address, and phone are required');
            return;
        }
        try {
            setSaving(true);
            if (editingId) {
                await branchesService.updateBranch(editingId, {
                    name: form.name.trim(),
                    address: form.address.trim(),
                    phone: form.phone.trim(),
                });
                showMessage('success', 'Branch updated');
            } else {
                await branchesService.createBranch({
                    name: form.name.trim(),
                    address: form.address.trim(),
                    phone: form.phone.trim(),
                });
                showMessage('success', 'Branch created');
            }
            resetForm();
            await load();
            await refreshBranches();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Save failed';
            showMessage('error', msg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <MapPin className="h-6 w-6 text-primary-600" />
                        Branches
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Locations for your salon. New appointments and POS use these branches.
                    </p>
                </div>
                <Button
                    type="button"
                    variant="primary"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={openNewBranchForm}
                >
                    Add branch
                </Button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-gray-200 dark:border-gray-600 space-y-3 bg-gray-50 dark:bg-gray-900/40">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                        {editingId ? 'Edit branch' : 'New branch'}
                    </h4>
                    <Input
                        label="Name"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        required
                    />
                    <Input
                        label="Address"
                        value={form.address}
                        onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                        required
                    />
                    <Input
                        label="Phone"
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        required
                    />
                    <div className="flex gap-2 pt-2">
                        <Button type="submit" variant="primary" isLoading={saving} disabled={saving}>
                            {editingId ? 'Save changes' : 'Create branch'}
                        </Button>
                        <Button type="button" variant="outline" onClick={requestCancelForm}>
                            Cancel
                        </Button>
                    </div>
                </form>
            )}

            <ul className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                {branches.length === 0 && (
                    <li className="p-6 text-center text-gray-500 dark:text-gray-400">No branches yet.</li>
                )}
                {branches.map(b => (
                    <li key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-gray-800">
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{b.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{b.address}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{b.phone}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => startEdit(b)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => openDeleteDialog(b)}>
                                <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                        </div>
                    </li>
                ))}
            </ul>

            <ConfirmationDialog
                isOpen={showDeleteDialog}
                onClose={() => {
                    if (!deleteLoading) {
                        setShowDeleteDialog(false);
                        setBranchToDelete(null);
                    }
                }}
                onConfirm={() => void confirmDeleteBranch()}
                title="Delete branch?"
                message={
                    branchToDelete
                        ? `Delete "${branchToDelete.name}"? This cannot be undone if appointments, staff, or invoices still reference this branch.`
                        : ''
                }
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                loading={deleteLoading}
            />

            <ConfirmationDialog
                isOpen={showDiscardDialog}
                onClose={() => setShowDiscardDialog(false)}
                onConfirm={confirmDiscardForm}
                title="Discard changes?"
                message="You have unsaved changes. Discard them and close the form?"
                confirmText="Discard"
                cancelText="Keep editing"
                variant="warning"
            />
        </div>
    );
}
