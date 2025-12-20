'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/shared/Modal';
import Input from '@/components/shared/Input';
import Button from '@/components/shared/Button';
import { promosService, PromoCode, PromoCodeInput } from '@/services/promos';
import { useToast } from '@/context/ToastContext';
import { getLocalDateString } from '@/lib/utils';

interface PromoCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    promoToEdit?: PromoCode | null;
}

interface FormData {
    code: string;
    type: 'percentage' | 'fixed';
    value: string;
    min_spend: string;
    start_date: string;
    end_date: string;
    usage_limit: string;
    description: string;
    is_active: boolean;
}

const initialFormData: FormData = {
    code: '',
    type: 'percentage',
    value: '',
    min_spend: '0',
    start_date: '',
    end_date: '',
    usage_limit: '',
    description: '',
    is_active: true
};

export default function PromoCodeModal({ isOpen, onClose, onSuccess, promoToEdit }: PromoCodeModalProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<FormData>(initialFormData);

    useEffect(() => {
        if (promoToEdit) {
            setFormData({
                code: promoToEdit.code,
                type: promoToEdit.type,
                value: promoToEdit.value.toString(),
                min_spend: promoToEdit.min_spend.toString(),
                start_date: promoToEdit.start_date,
                end_date: promoToEdit.end_date,
                usage_limit: promoToEdit.usage_limit?.toString() || '',
                description: promoToEdit.description || '',
                is_active: promoToEdit.is_active
            });
        } else {
            // Set default dates for new promo - use local timezone
            const today = getLocalDateString();
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            const nextMonthStr = getLocalDateString(nextMonth);

            setFormData({
                ...initialFormData,
                start_date: today,
                end_date: nextMonthStr
            });
        }
    }, [promoToEdit, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!formData.code.trim()) {
            showToast('Please enter a promo code', 'error');
            return;
        }
        if (!formData.value || parseFloat(formData.value) <= 0) {
            showToast('Please enter a valid discount value', 'error');
            return;
        }
        if (formData.type === 'percentage' && parseFloat(formData.value) > 100) {
            showToast('Percentage discount cannot exceed 100%', 'error');
            return;
        }
        if (!formData.start_date || !formData.end_date) {
            showToast('Please select start and end dates', 'error');
            return;
        }
        if (new Date(formData.end_date) < new Date(formData.start_date)) {
            showToast('End date must be after start date', 'error');
            return;
        }

        setLoading(true);

        try {
            const promoData: PromoCodeInput = {
                code: formData.code.toUpperCase(),
                type: formData.type,
                value: parseFloat(formData.value),
                min_spend: parseFloat(formData.min_spend) || 0,
                start_date: formData.start_date,
                end_date: formData.end_date,
                usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : undefined,
                description: formData.description || undefined,
                is_active: formData.is_active
            };

            if (promoToEdit) {
                await promosService.updatePromoCode(promoToEdit.id, promoData);
                showToast('Promo code updated successfully', 'success');
            } else {
                await promosService.createPromoCode(promoData);
                showToast('Promo code created successfully', 'success');
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving promo code:', error);
            if (error.message?.includes('duplicate') || error.code === '23505') {
                showToast('A promo code with this code already exists', 'error');
            } else {
                showToast(error.message || 'Failed to save promo code', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={promoToEdit ? 'Edit Promo Code' : 'Create Promo Code'}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Code */}
                <Input
                    label="Promo Code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required
                    placeholder="e.g. WELCOME20"
                    className="font-mono uppercase"
                />

                {/* Type and Value */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Discount Type
                        </label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'percentage' | 'fixed' })}
                            className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed">Fixed Amount (Rs)</option>
                        </select>
                    </div>
                    <Input
                        label={formData.type === 'percentage' ? 'Discount (%)' : 'Discount Amount (Rs)'}
                        type="number"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                        required
                        min="0"
                        max={formData.type === 'percentage' ? '100' : undefined}
                        step={formData.type === 'percentage' ? '1' : '0.01'}
                    />
                </div>

                {/* Min Spend and Usage Limit */}
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Minimum Spend (Rs)"
                        type="number"
                        value={formData.min_spend}
                        onChange={(e) => setFormData({ ...formData, min_spend: e.target.value })}
                        min="0"
                        placeholder="0"
                    />
                    <Input
                        label="Usage Limit (optional)"
                        type="number"
                        value={formData.usage_limit}
                        onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                        min="1"
                        placeholder="Unlimited"
                    />
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Start Date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        required
                    />
                    <Input
                        label="End Date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        required
                        min={formData.start_date}
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description (optional)
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                        placeholder="Describe the promotion..."
                    />
                </div>

                {/* Active Toggle */}
                <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                    </label>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formData.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" isLoading={loading}>
                        {promoToEdit ? 'Update Promo Code' : 'Create Promo Code'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
