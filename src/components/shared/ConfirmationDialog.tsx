'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import Button from '@/components/shared/Button';

interface ConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    loading?: boolean;
}

export default function ConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'warning',
    loading = false
}: ConfirmationDialogProps) {
    const variantColors = {
        danger: 'text-red-600 dark:text-red-400',
        warning: 'text-yellow-600 dark:text-yellow-400',
        info: 'text-blue-600 dark:text-blue-400'
    };

    const variantBg = {
        danger: 'bg-red-50 dark:bg-red-900/20',
        warning: 'bg-yellow-50 dark:bg-yellow-900/20',
        info: 'bg-blue-50 dark:bg-blue-900/20'
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* Dialog */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 relative"
                        >
                            {/* Close button */}
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            {/* Icon */}
                            <div className={`w-12 h-12 rounded-full ${variantBg[variant]} flex items-center justify-center mb-4`}>
                                <AlertTriangle className={`h-6 w-6 ${variantColors[variant]}`} />
                            </div>

                            {/* Content */}
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {title}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                {message}
                            </p>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    disabled={loading}
                                    className="flex-1"
                                >
                                    {cancelText}
                                </Button>
                                <Button
                                    variant={variant === 'danger' ? 'danger' : 'primary'}
                                    onClick={onConfirm}
                                    disabled={loading}
                                    className="flex-1"
                                >
                                    {loading ? 'Processing...' : confirmText}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
