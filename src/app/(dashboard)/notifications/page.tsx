'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Plus, Edit2, Trash2, Eye, Save, X } from 'lucide-react';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import { useAuth } from '@/lib/auth';
import { notificationsService } from '@/services/notifications';

export default function NotificationsPage() {
    const { hasRole } = useAuth();
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState<any[]>([]);
    const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [previewVariables] = useState({
        customer_name: 'John Doe',
        date: new Date().toLocaleDateString(),
        time: '10:00 AM',
        service: 'Haircut',
        stylist: 'Jane Smith'
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const data = await notificationsService.getTemplates();
            setTemplates(data || []);
        } catch (error) {
            console.error('Error fetching templates:', error);
            showMessage('error', 'Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            if (isCreating) {
                await notificationsService.createTemplate(editingTemplate);
                showMessage('success', 'Template created successfully');
            } else {
                await notificationsService.updateTemplate(editingTemplate.id, editingTemplate);
                showMessage('success', 'Template updated successfully');
            }
            setEditingTemplate(null);
            setIsCreating(false);
            await fetchTemplates();
        } catch (error) {
            console.error('Error saving template:', error);
            showMessage('error', 'Failed to save template');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this template?')) return;

        try {
            setLoading(true);
            await notificationsService.deleteTemplate(id);
            showMessage('success', 'Template deleted successfully');
            await fetchTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
            showMessage('error', 'Failed to delete template');
        } finally {
            setLoading(false);
        }
    };

    const getPreviewMessage = () => {
        if (!editingTemplate?.message) return '';
        return notificationsService.replaceVariables(editingTemplate.message, previewVariables);
    };

    if (!hasRole(['Owner', 'Manager'])) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Access Restricted
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        Only owners and managers can manage notification templates
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notification Templates</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Create and manage customizable notification messages</p>
                </div>
                <Button
                    variant="primary"
                    leftIcon={<Plus className="h-5 w-5" />}
                    onClick={() => {
                        setEditingTemplate({
                            name: '',
                            type: 'appointment_confirmation',
                            channel: 'email',
                            subject: '',
                            message: '',
                            is_active: true
                        });
                        setIsCreating(true);
                    }}
                >
                    New Template
                </Button>
            </div>

            {/* Message */}
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl ${message.type === 'success'
                        ? 'bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 text-success-700 dark:text-success-300'
                        : 'bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 text-danger-700 dark:text-danger-300'
                        }`}
                >
                    {message.text}
                </motion.div>
            )}

            {/* Templates List */}
            {!editingTemplate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.length === 0 && !loading && (
                        <div className="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400">
                            No templates yet. Click "New Template" to create one!
                        </div>
                    )}
                    {templates.map((template) => (
                        <motion.div
                            key={template.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                                    <div className="flex gap-2 mt-2">
                                        <span className="text-xs px-2 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                                            {template.type.replace(/_/g, ' ')}
                                        </span>
                                        <span className="text-xs px-2 py-1 rounded-full bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300">
                                            {template.channel}
                                        </span>
                                        {template.is_active && (
                                            <span className="text-xs px-2 py-1 rounded-full bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                                {template.message}
                            </p>

                            <div className="flex items-center justify-between">
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        leftIcon={<Edit2 className="h-4 w-4" />}
                                        onClick={() => {
                                            setEditingTemplate(template);
                                            setIsCreating(false);
                                        }}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        leftIcon={<Trash2 className="h-4 w-4" />}
                                        onClick={() => handleDelete(template.id)}
                                    >
                                        Delete
                                    </Button>
                                </div>

                                {/* Toggle Active/Inactive */}
                                <button
                                    onClick={async () => {
                                        try {
                                            await notificationsService.updateTemplate(template.id, {
                                                is_active: !template.is_active
                                            });
                                            await fetchTemplates();
                                        } catch (error) {
                                            console.error('Error toggling template:', error);
                                        }
                                    }}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${template.is_active ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                                        }`}
                                    title={template.is_active ? 'Active - Click to disable' : 'Inactive - Click to enable'}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${template.is_active ? 'translate-x-6' : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Editor */}
            {editingTemplate && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {isCreating ? 'Create New Template' : 'Edit Template'}
                        </h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setEditingTemplate(null);
                                setIsCreating(false);
                            }}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <Input
                            label="Template Name"
                            value={editingTemplate.name}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                            placeholder="e.g., Weekend Special Offer"
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Type
                            </label>
                            <select
                                value={editingTemplate.type}
                                onChange={(e) => setEditingTemplate({ ...editingTemplate, type: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-gray-900 dark:text-white"
                            >
                                <option value="appointment_confirmation">Appointment Confirmation</option>
                                <option value="appointment_reminder">Appointment Reminder</option>
                                <option value="appointment_cancellation">Appointment Cancellation</option>
                                <option value="promotional">Promotional / Custom</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                Channel
                            </label>
                            <select
                                value={editingTemplate.channel}
                                onChange={(e) => setEditingTemplate({ ...editingTemplate, channel: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-gray-900 dark:text-white"
                            >
                                <option value="email">Email Only</option>
                                <option value="sms">SMS Only</option>
                                <option value="both">Both (Email & SMS)</option>
                            </select>
                        </div>

                        <div className="flex items-center pt-6">
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editingTemplate.is_active}
                                    onChange={(e) => setEditingTemplate({ ...editingTemplate, is_active: e.target.checked })}
                                    className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                                />
                                <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Active Template</span>
                            </label>
                        </div>
                    </div>

                    {editingTemplate.channel !== 'sms' && (
                        <div className="mb-6">
                            <Input
                                label="Email Subject"
                                value={editingTemplate.subject || ''}
                                onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                                placeholder="e.g., Your Appointment is Confirmed!"
                            />
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Message Template
                        </label>
                        <textarea
                            value={editingTemplate.message}
                            onChange={(e) => setEditingTemplate({ ...editingTemplate, message: e.target.value })}
                            rows={6}
                            className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none text-gray-900 dark:text-white"
                            placeholder="Hi {customer_name}, your appointment for {service} is confirmed on {date} at {time} with {stylist}. See you soon!"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            <strong>Available variables:</strong> {'{customer_name}'}, {'{date}'}, {'{time}'}, {'{service}'}, {'{stylist}'}
                        </p>
                    </div>

                    {/* Preview */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Live Preview</h4>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                            {getPreviewMessage() || 'Enter a message to see preview...'}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="primary"
                            leftIcon={<Save className="h-5 w-5" />}
                            onClick={handleSave}
                            disabled={loading || !editingTemplate.name || !editingTemplate.message}
                        >
                            {loading ? 'Saving...' : 'Save Template'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setEditingTemplate(null);
                                setIsCreating(false);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
