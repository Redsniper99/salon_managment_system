'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit, Trash2, X, Check, Loader, Copy, AlertCircle } from 'lucide-react';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import { Staff, Branch } from '@/lib/types';
import { staffService } from '@/services/staff';
import { branchesService } from '@/services/branches';
import { useAuth } from '@/lib/auth';

export default function StaffPage() {
    const { hasRole } = useAuth();
    const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');

    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
    const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        role: 'Stylist' as 'Manager' | 'Receptionist' | 'Stylist',
        branch_id: '',
        working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as string[],
        working_hours: { start: '09:00', end: '18:00' },
    });
    const [formLoading, setFormLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const roles = ['All', 'Manager', 'Receptionist', 'Stylist'];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [staffData, branchesData] = await Promise.all([
                staffService.getStaff(),
                branchesService.getBranches()
            ]);

            setBranches(branchesData || []);

            // Auto-select first branch for form if available
            if (branchesData && branchesData.length > 0) {
                setFormData(prev => ({ ...prev, branch_id: branchesData[0].id }));
            }

            const mappedStaff = (staffData || []).map((s: any) => ({
                id: s.id,
                name: s.name,
                email: s.email,
                phone: s.phone || '',
                role: s.role,
                branchId: s.branch_id,
                specializations: s.specializations || [],
                workingDays: s.working_days || [],
                workingHours: s.working_hours || { start: '09:00', end: '18:00' },
                isActive: s.is_active,
                createdAt: s.created_at,
            }));
            setStaffMembers(mappedStaff);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStaff = async () => {
        // Kept for compatibility with existing calls, but fetchData handles everything
        try {
            const data = await staffService.getStaff();
            const mappedStaff = (data || []).map((s: any) => ({
                id: s.id,
                name: s.name,
                email: s.email,
                phone: s.phone || '',
                role: s.role,
                branchId: s.branch_id,
                specializations: s.specializations || [],
                workingDays: s.working_days || [],
                workingHours: s.working_hours || { start: '09:00', end: '18:00' },
                isActive: s.is_active,
                createdAt: s.created_at,
            }));
            setStaffMembers(mappedStaff);
        } catch (error) {
            console.error('Error fetching staff:', error);
        }
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const handleAddStaff = async () => {
        setFormLoading(true);
        const result = await staffService.createStaff({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            role: formData.role,
            branch_id: formData.branch_id || (branches.length > 0 ? branches[0].id : ''),
            working_days: formData.working_days,
            working_hours: formData.working_hours,
        });

        setFormLoading(false);

        if (result.success) {
            setCredentials(result.credentials || null);
            setShowAddModal(false);
            setShowCredentialsModal(true);
            fetchStaff();
            resetForm();
        } else {
            showMessage('error', result.message);
        }
    };

    const handleEditStaff = async () => {
        if (!selectedStaff) return;

        setFormLoading(true);
        const result = await staffService.updateStaff(selectedStaff.id, {
            name: formData.name,
            phone: formData.phone,
            role: formData.role,
            working_days: formData.working_days,
            working_hours: formData.working_hours,
        });

        setFormLoading(false);

        if (result.success) {
            showMessage('success', result.message);
            setShowEditModal(false);
            fetchStaff();
            resetForm();
        } else {
            showMessage('error', result.message);
        }
    };

    const handleDeleteStaff = async () => {
        if (!selectedStaff) return;

        setFormLoading(true);
        const result = await staffService.deleteStaff(selectedStaff.id);
        setFormLoading(false);

        if (result.success) {
            showMessage('success', result.message);
            setShowDeleteModal(false);
            fetchStaff();
        } else {
            showMessage('error', result.message);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            role: 'Stylist',
            branch_id: branches.length > 0 ? branches[0].id : '',
            working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            working_hours: { start: '09:00', end: '18:00' },
        });
        setSelectedStaff(null);
    };

    const openEditModal = (staff: Staff) => {
        setSelectedStaff(staff);
        setFormData({
            name: staff.name,
            email: staff.email,
            phone: staff.phone,
            role: staff.role as any,
            branch_id: staff.branchId || '',
            working_days: staff.workingDays || [],
            working_hours: staff.workingHours || { start: '09:00', end: '18:00' },
        });
        setShowEditModal(true);
    };

    const filteredStaff = staffMembers.filter(staff => {
        const matchesRole = roleFilter === 'All' || staff.role === roleFilter;
        const matchesSearch = searchQuery === '' ||
            staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            staff.email.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesRole && matchesSearch;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Staff</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage salon team members</p>
                </div>
                {hasRole(['Owner']) && (
                    <Button
                        variant="primary"
                        leftIcon={<Plus className="h-5 w-5" />}
                        onClick={() => setShowAddModal(true)}
                    >
                        Add Staff Member
                    </Button>
                )}
            </div>

            {/* Message */}
            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`p-4 rounded-xl ${message.type === 'success'
                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                            }`}
                    >
                        {message.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Filters */}
            <div className="card p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            type="text"
                            placeholder="Search staff..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftIcon={<Search className="h-5 w-5" />}
                        />
                    </div>
                </div>

                <div className="flex gap-2 mt-4 overflow-x-auto">
                    {roles.map((role) => (
                        <button
                            key={role}
                            onClick={() => setRoleFilter(role)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${roleFilter === role
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            {role}
                        </button>
                    ))}
                </div>
            </div>

            {/* Staff List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-12">
                        <Loader className="h-8 w-8 animate-spin mx-auto text-primary-600" />
                    </div>
                ) : filteredStaff.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400">No staff members found</p>
                    </div>
                ) : (
                    filteredStaff.map((staff) => (
                        <motion.div
                            key={staff.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{staff.name}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{staff.role}</p>
                                </div>
                                {hasRole(['Owner']) && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(staff)}
                                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                        >
                                            <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedStaff(staff);
                                                setShowDeleteModal(true);
                                            }}
                                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 text-sm">
                                <p className="text-gray-600 dark:text-gray-400">{staff.email}</p>
                                <p className="text-gray-600 dark:text-gray-400">{staff.phone}</p>
                                {staff.workingDays && staff.workingDays.length > 0 && (
                                    <p className="text-gray-500 dark:text-gray-500 text-xs">
                                        {staff.workingDays.join(', ')}
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Add/Edit Staff Modal */}
            <AnimatePresence>
                {(showAddModal || showEditModal) && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {showAddModal ? 'Add Staff Member' : 'Edit Staff Member'}
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setShowEditModal(false);
                                        resetForm();
                                    }}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <Input
                                    label="Name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter full name"
                                />

                                {showAddModal && (
                                    <Input
                                        label="Email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="email@example.com"
                                    />
                                )}

                                <Input
                                    label="Phone"
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+94 77 123 4567"
                                />

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Role
                                    </label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-gray-900 dark:text-white"
                                    >
                                        <option value="Stylist">Stylist</option>
                                        <option value="Receptionist">Receptionist</option>
                                        <option value="Manager">Manager</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Branch
                                    </label>
                                    <select
                                        value={formData.branch_id}
                                        onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-gray-900 dark:text-white"
                                        required
                                    >
                                        <option value="" disabled>Select a branch</option>
                                        {branches.map((branch) => (
                                            <option key={branch.id} value={branch.id}>
                                                {branch.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Working Days
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {days.map((day) => (
                                            <label key={day} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.working_days.includes(day)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFormData({ ...formData, working_days: [...formData.working_days, day] });
                                                        } else {
                                                            setFormData({ ...formData, working_days: formData.working_days.filter(d => d !== day) });
                                                        }
                                                    }}
                                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{day}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Start Time"
                                        type="time"
                                        value={formData.working_hours.start}
                                        onChange={(e) => setFormData({ ...formData, working_hours: { ...formData.working_hours, start: e.target.value } })}
                                    />
                                    <Input
                                        label="End Time"
                                        type="time"
                                        value={formData.working_hours.end}
                                        onChange={(e) => setFormData({ ...formData, working_hours: { ...formData.working_hours, end: e.target.value } })}
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowAddModal(false);
                                            setShowEditModal(false);
                                            resetForm();
                                        }}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={showAddModal ? handleAddStaff : handleEditStaff}
                                        disabled={formLoading || !formData.name || !formData.email || formData.working_days.length === 0}
                                        leftIcon={formLoading ? <Loader className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                                        className="flex-1"
                                    >
                                        {formLoading ? 'Saving...' : (showAddModal ? 'Create Staff' : 'Update Staff')}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Credentials Modal */}
            <AnimatePresence>
                {showCredentialsModal && credentials && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full"
                        >
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    Staff Account Created!
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Save these credentials. Staff will also receive them via email.
                                </p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3 mb-6">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Email</p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-gray-900 dark:text-white font-mono text-sm bg-white dark:bg-gray-700 px-3 py-2 rounded-lg">
                                            {credentials.email}
                                        </code>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(credentials.email)}
                                            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Temporary Password</p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-gray-900 dark:text-white font-mono text-sm bg-white dark:bg-gray-700 px-3 py-2 rounded-lg">
                                            {credentials.password}
                                        </code>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(credentials.password)}
                                            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg mb-6">
                                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-amber-800 dark:text-amber-200">
                                    Staff should change their password after first login for security.
                                </p>
                            </div>

                            <Button
                                variant="primary"
                                onClick={() => {
                                    setShowCredentialsModal(false);
                                    setCredentials(null);
                                }}
                                className="w-full"
                            >
                                Done
                            </Button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && selectedStaff && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full"
                        >
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                                Delete Staff Member?
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Are you sure you want to delete <strong>{selectedStaff.name}</strong>? This will permanently remove their account and cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setSelectedStaff(null);
                                    }}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={handleDeleteStaff}
                                    disabled={formLoading}
                                    leftIcon={formLoading ? <Loader className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                                    className="flex-1"
                                >
                                    {formLoading ? 'Deleting...' : 'Delete'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
