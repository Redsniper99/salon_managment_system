'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { inventoryService } from '@/services/inventory';
import type { InventoryProduct, InventoryCategory } from '@/lib/types';
import Input from '@/components/shared/Input';
import Button from '@/components/shared/Button';

interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    product?: InventoryProduct | null;
    onSuccess: () => void;
}

export default function ProductFormModal({ isOpen, onClose, product, onSuccess }: ProductFormModalProps) {
    const [formData, setFormData] = useState({
        name: '',
        category: 'Supplies' as InventoryCategory,
        description: '',
        sku: '',
        current_stock: 0,
        min_stock_level: 10,
        unit: 'units',
        cost_per_unit: 0,
        selling_price: 0,
        supplier: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const categories: InventoryCategory[] = ['Hair Care', 'Skin Care', 'Tools', 'Supplies', 'Other'];
    const units = ['units', 'ml', 'bottles', 'pieces', 'boxes', 'kg', 'liters'];

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name,
                category: product.category,
                description: product.description || '',
                sku: product.sku || '',
                current_stock: product.current_stock,
                min_stock_level: product.min_stock_level,
                unit: product.unit,
                cost_per_unit: product.cost_per_unit,
                selling_price: product.selling_price,
                supplier: product.supplier || ''
            });
        } else {
            // Reset for new product
            setFormData({
                name: '',
                category: 'Supplies',
                description: '',
                sku: '',
                current_stock: 0,
                min_stock_level: 10,
                unit: 'units',
                cost_per_unit: 0,
                selling_price: 0,
                supplier: ''
            });
        }
        setError('');
    }, [product, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            if (product) {
                // Update existing product
                await inventoryService.updateProduct(product.id, formData);
            } else {
                // Create new product
                await inventoryService.createProduct(formData);
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save product');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {product ? 'Edit Product' : 'Add New Product'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-red-800 dark:text-red-200">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Product Name */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Product Name *
                            </label>
                            <Input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="e.g., Shampoo, Hair Dryer"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Category *
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value as InventoryCategory })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* SKU */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                SKU (Optional)
                            </label>
                            <Input
                                type="text"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                placeholder="e.g., SH-001"
                            />
                        </div>

                        {/* Description */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                                placeholder="Product details..."
                            />
                        </div>

                        {/* Current Stock */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Current Stock *
                            </label>
                            <Input
                                type="number"
                                value={formData.current_stock}
                                onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                                min="0"
                                required
                            />
                        </div>

                        {/* Min Stock Level */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Minimum Stock Level *
                            </label>
                            <Input
                                type="number"
                                value={formData.min_stock_level}
                                onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) || 0 })}
                                min="0"
                                required
                            />
                        </div>

                        {/* Unit */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Unit *
                            </label>
                            <select
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                            >
                                {units.map(unit => (
                                    <option key={unit} value={unit}>{unit}</option>
                                ))}
                            </select>
                        </div>

                        {/* Cost per Unit */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Cost per Unit (LKR) *
                            </label>
                            <Input
                                type="number"
                                value={formData.cost_per_unit}
                                onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })}
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>

                        {/* Selling Price */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Selling Price (LKR) *
                            </label>
                            <Input
                                type="number"
                                value={formData.selling_price}
                                onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>

                        {/* Supplier */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Supplier (Optional)
                            </label>
                            <Input
                                type="text"
                                value={formData.supplier}
                                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                                placeholder="Supplier name"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Saving...' : product ? 'Update Product' : 'Add Product'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
