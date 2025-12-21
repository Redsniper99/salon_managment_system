'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Share2, Facebook, Instagram, Upload, Plus, X, Clock, Calendar,
    Image as ImageIcon, Loader, Save, Settings, Tag, MessageSquare,
    Trash2, Edit, Check, RefreshCw, AlertCircle
} from 'lucide-react';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import Modal from '@/components/shared/Modal';
import {
    socialMediaService,
    SocialMediaSettings,
    CaptionTemplate,
    StorySchedule,
    PostingSlot,
    StoryImage
} from '@/services/socialMedia';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/context/ToastContext';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const LOGO_POSITIONS = [
    { value: 'top-left', label: 'Top Left' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'bottom-right', label: 'Bottom Right' },
];

export default function SocialMediaPage() {
    const { hasRole } = useAuth();
    const { showToast } = useToast();

    // Loading states
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Data states
    const [settings, setSettings] = useState<SocialMediaSettings | null>(null);
    const [schedule, setSchedule] = useState<StorySchedule | null>(null);
    const [captionTemplates, setCaptionTemplates] = useState<CaptionTemplate[]>([]);
    const [postingSlots, setPostingSlots] = useState<PostingSlot[]>([]);
    const [queuedImages, setQueuedImages] = useState<StoryImage[]>([]);
    const [postingHistory, setPostingHistory] = useState<StoryImage[]>([]);

    // Form states
    const [selectedDays, setSelectedDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    const [logoPosition, setLogoPosition] = useState<string>('bottom-right');
    const [logoSize, setLogoSize] = useState(80);

    // Modal states
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showSlotModal, setShowSlotModal] = useState(false);
    const [showCaptionModal, setShowCaptionModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<CaptionTemplate | null>(null);
    const [editingSlot, setEditingSlot] = useState<PostingSlot | null>(null);
    const [editingImage, setEditingImage] = useState<StoryImage | null>(null);

    // Template form
    const [templateForm, setTemplateForm] = useState({ name: '', caption: '', hashtags: '' });

    // Slot form
    const [slotForm, setSlotForm] = useState({ posting_time: '09:00', caption_template_id: '', custom_caption: '' });

    // Caption form
    const [captionOption, setCaptionOption] = useState<'slot' | 'template' | 'custom'>('slot');
    const [customCaption, setCustomCaption] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    // Fetch all data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [settingsData, scheduleData, templates, slots, images, history] = await Promise.all([
                socialMediaService.getSettings(),
                socialMediaService.getSchedule(),
                socialMediaService.getCaptionTemplates(),
                socialMediaService.getPostingSlots(),
                socialMediaService.getQueuedImages(),
                socialMediaService.getPostingHistory(10)
            ]);

            setSettings(settingsData);
            setSchedule(scheduleData);
            setCaptionTemplates(templates);
            setPostingSlots(slots);
            setQueuedImages(images);
            setPostingHistory(history);

            if (scheduleData) {
                setSelectedDays(scheduleData.posting_days);
            }
            if (settingsData) {
                setLogoPosition(settingsData.logo_position);
                setLogoSize(settingsData.logo_size);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            showToast('Failed to load social media settings', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Save schedule settings
    const handleSaveSchedule = async () => {
        setSaving(true);
        try {
            await socialMediaService.updateSchedule({
                posting_days: selectedDays,
                enabled: true
            });
            await socialMediaService.updateSettings({
                logo_position: logoPosition as any,
                logo_size: logoSize
            });
            showToast('Settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving:', error);
            showToast('Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Logo upload
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const url = await socialMediaService.uploadLogo(file);
            setSettings(prev => prev ? { ...prev, logo_url: url } : null);
            showToast('Logo uploaded successfully', 'success');
        } catch (error) {
            console.error('Error uploading logo:', error);
            showToast('Failed to upload logo', 'error');
        }
    };

    // Image upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const currentCount = queuedImages.length;
        const availableSlots = 9 - currentCount;

        if (files.length > availableSlots) {
            showToast(`You can only add ${availableSlots} more image(s)`, 'warning');
            return;
        }

        for (const file of Array.from(files).slice(0, availableSlots)) {
            try {
                const url = await socialMediaService.uploadStoryImage(file);
                await socialMediaService.addStoryImage({ image_url: url });
            } catch (error) {
                console.error('Error uploading image:', error);
            }
        }

        fetchData();
        showToast('Images uploaded successfully', 'success');
    };

    // Template CRUD
    const handleSaveTemplate = async () => {
        try {
            if (editingTemplate) {
                await socialMediaService.updateCaptionTemplate(editingTemplate.id, templateForm);
            } else {
                await socialMediaService.createCaptionTemplate(templateForm);
            }
            setShowTemplateModal(false);
            setTemplateForm({ name: '', caption: '', hashtags: '' });
            setEditingTemplate(null);
            fetchData();
            showToast('Template saved', 'success');
        } catch (error) {
            showToast('Failed to save template', 'error');
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm('Delete this template?')) return;
        try {
            await socialMediaService.deleteCaptionTemplate(id);
            fetchData();
            showToast('Template deleted', 'success');
        } catch (error) {
            showToast('Failed to delete template', 'error');
        }
    };

    // Slot CRUD
    const handleSaveSlot = async () => {
        try {
            if (editingSlot) {
                await socialMediaService.updatePostingSlot(editingSlot.id, slotForm);
            } else {
                await socialMediaService.createPostingSlot(slotForm);
            }
            setShowSlotModal(false);
            setSlotForm({ posting_time: '09:00', caption_template_id: '', custom_caption: '' });
            setEditingSlot(null);
            fetchData();
            showToast('Slot saved', 'success');
        } catch (error) {
            showToast('Failed to save slot', 'error');
        }
    };

    const handleDeleteSlot = async (id: string) => {
        if (!confirm('Delete this time slot?')) return;
        try {
            await socialMediaService.deletePostingSlot(id);
            fetchData();
            showToast('Slot deleted', 'success');
        } catch (error) {
            showToast('Failed to delete slot', 'error');
        }
    };

    // Image caption
    const handleSaveCaption = async () => {
        if (!editingImage) return;
        try {
            await socialMediaService.updateStoryImage(editingImage.id, {
                caption: captionOption === 'custom' ? customCaption : null,
                caption_template_id: captionOption === 'template' ? selectedTemplateId : null,
                use_slot_caption: captionOption === 'slot'
            });
            setShowCaptionModal(false);
            setEditingImage(null);
            fetchData();
            showToast('Caption updated', 'success');
        } catch (error) {
            showToast('Failed to update caption', 'error');
        }
    };

    const handleDeleteImage = async (id: string) => {
        try {
            await socialMediaService.deleteStoryImage(id);
            fetchData();
            showToast('Image removed', 'success');
        } catch (error) {
            showToast('Failed to remove image', 'error');
        }
    };

    const openCaptionModal = (image: StoryImage) => {
        setEditingImage(image);
        if (image.caption) {
            setCaptionOption('custom');
            setCustomCaption(image.caption);
        } else if (image.caption_template_id) {
            setCaptionOption('template');
            setSelectedTemplateId(image.caption_template_id);
        } else {
            setCaptionOption('slot');
        }
        setShowCaptionModal(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Share2 className="h-8 w-8 text-primary-600" />
                        Social Media Stories
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Automate posting to Facebook & Instagram Stories
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchData} leftIcon={<RefreshCw className="h-4 w-4" />}>
                        Refresh
                    </Button>
                    <Button variant="primary" onClick={handleSaveSchedule} disabled={saving} leftIcon={saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}>
                        Save Settings
                    </Button>
                </div>
            </div>

            {/* Connection Status */}
            <div className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Settings className="h-5 w-5" /> Connection Status
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Facebook className="h-6 w-6 text-blue-600" />
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Facebook</p>
                                <p className="text-sm text-gray-500">
                                    {settings?.is_connected ? '✅ Connected' : '❌ Not connected'}
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm">
                            {settings?.is_connected ? 'Reconnect' : 'Connect'}
                        </Button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Instagram className="h-6 w-6 text-pink-600" />
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Instagram</p>
                                <p className="text-sm text-gray-500">
                                    {settings?.instagram_account_id ? '✅ Connected' : '❌ Not connected'}
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" disabled={!settings?.is_connected}>
                            Connect
                        </Button>
                    </div>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Meta API requires a Facebook Business Page linked to an Instagram Business account.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Logo Settings */}
                <div className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        🎨 Logo Overlay
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            {settings?.logo_url ? (
                                <img src={settings.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded-lg bg-gray-100 dark:bg-gray-700 p-2" />
                            ) : (
                                <div className="h-16 w-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                    <ImageIcon className="h-6 w-6 text-gray-400" />
                                </div>
                            )}
                            <label className="cursor-pointer">
                                <input type="file" accept=".png,.svg" className="hidden" onChange={handleLogoUpload} />
                                <div className="px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors">
                                    Upload Logo (PNG/SVG)
                                </div>
                            </label>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position</label>
                                <select value={logoPosition} onChange={(e) => setLogoPosition(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg">
                                    {LOGO_POSITIONS.map(pos => (
                                        <option key={pos.value} value={pos.value}>{pos.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Size (px)</label>
                                <input type="number" value={logoSize} onChange={(e) => setLogoSize(parseInt(e.target.value))} min={40} max={200} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Caption Templates */}
                <div className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Tag className="h-5 w-5" /> Caption Templates
                        </h2>
                        <Button variant="outline" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditingTemplate(null); setTemplateForm({ name: '', caption: '', hashtags: '' }); setShowTemplateModal(true); }}>
                            Add
                        </Button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {captionTemplates.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No templates yet</p>
                        ) : captionTemplates.map(template => (
                            <div key={template.id} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-gray-900 dark:text-white">{template.name}</p>
                                    <p className="text-xs text-gray-500 truncate">{template.caption}</p>
                                </div>
                                <div className="flex gap-1 ml-2">
                                    <button onClick={() => { setEditingTemplate(template); setTemplateForm({ name: template.name, caption: template.caption, hashtags: template.hashtags || '' }); setShowTemplateModal(true); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDeleteTemplate(template.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Schedule Settings */}
            <div className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5" /> Schedule Settings
                </h2>

                {/* Active Days */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Active Days</label>
                    <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map(day => (
                            <button
                                key={day}
                                onClick={() => setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${selectedDays.includes(day) ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                {day.slice(0, 3)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Time Slots */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Posting Time Slots</label>
                        <Button variant="outline" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditingSlot(null); setSlotForm({ posting_time: '09:00', caption_template_id: '', custom_caption: '' }); setShowSlotModal(true); }}>
                            Add Slot
                        </Button>
                    </div>
                    <div className="space-y-2">
                        {postingSlots.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No time slots configured</p>
                        ) : postingSlots.map((slot, index) => (
                            <div key={slot.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Clock className="h-5 w-5 text-primary-600" />
                                    <span className="font-medium text-gray-900 dark:text-white">Slot {index + 1}: {slot.posting_time}</span>
                                    <span className="text-xs text-gray-500">
                                        Caption: {slot.caption_template?.name || slot.custom_caption?.slice(0, 20) || 'None'}
                                    </span>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => { setEditingSlot(slot); setSlotForm({ posting_time: slot.posting_time, caption_template_id: slot.caption_template_id || '', custom_caption: slot.custom_caption || '' }); setShowSlotModal(true); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleDeleteSlot(slot.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Image Queue */}
            <div className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" /> Image Queue ({queuedImages.length}/9)
                    </h2>
                    <label className="cursor-pointer">
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={queuedImages.length >= 9} />
                        <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${queuedImages.length >= 9 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-primary-600 text-white hover:bg-primary-700 cursor-pointer'}`}>
                            <Upload className="h-4 w-4" /> Upload Images
                        </div>
                    </label>
                </div>
                <p className="text-xs text-gray-500 mb-4">Click an image to set custom caption • Images will be posted in order</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3">
                    {queuedImages.map((image, index) => (
                        <div key={image.id} className="relative group aspect-[9/16] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                            <img src={image.image_url} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button onClick={() => openCaptionModal(image)} className="p-1.5 bg-white rounded-full">
                                    <MessageSquare className="h-4 w-4 text-gray-700" />
                                </button>
                                <button onClick={() => handleDeleteImage(image.id)} className="p-1.5 bg-red-500 rounded-full">
                                    <X className="h-4 w-4 text-white" />
                                </button>
                            </div>
                            <span className="absolute top-1 left-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">{index + 1}</span>
                            {(image.caption || image.caption_template_id) && (
                                <span className="absolute top-1 right-1 text-xs">✏️</span>
                            )}
                        </div>
                    ))}
                    {Array.from({ length: 9 - queuedImages.length }).map((_, i) => (
                        <label key={`empty-${i}`} className="aspect-[9/16] rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-primary-400">
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={queuedImages.length >= 9} />
                            <Plus className="h-6 w-6 text-gray-400" />
                        </label>
                    ))}
                </div>
            </div>

            {/* Posting History */}
            <div className="card p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">📊 Posting History</h2>
                {postingHistory.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No posts yet</p>
                ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {postingHistory.map(post => (
                            <div key={post.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    {post.status === 'posted' ? (
                                        <Check className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <X className="h-5 w-5 text-red-500" />
                                    )}
                                    <span className="text-sm text-gray-900 dark:text-white">
                                        {new Date(post.posted_at || post.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${post.status === 'posted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {post.status === 'posted' ? 'Posted' : 'Failed'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Template Modal */}
            <Modal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} title={editingTemplate ? 'Edit Template' : 'Add Caption Template'}>
                <div className="space-y-4">
                    <Input label="Template Name" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="e.g., Morning Promo" />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Caption</label>
                        <textarea value={templateForm.caption} onChange={(e) => setTemplateForm({ ...templateForm, caption: e.target.value })} rows={3} className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl" placeholder="Your caption text..." />
                    </div>
                    <Input label="Hashtags (optional)" value={templateForm.hashtags} onChange={(e) => setTemplateForm({ ...templateForm, hashtags: e.target.value })} placeholder="#salon #beauty #style" />
                    <div className="flex gap-3 pt-4">
                        <Button variant="outline" onClick={() => setShowTemplateModal(false)} className="flex-1">Cancel</Button>
                        <Button variant="primary" onClick={handleSaveTemplate} className="flex-1">Save</Button>
                    </div>
                </div>
            </Modal>

            {/* Slot Modal */}
            <Modal isOpen={showSlotModal} onClose={() => setShowSlotModal(false)} title={editingSlot ? 'Edit Time Slot' : 'Add Time Slot'}>
                <div className="space-y-4">
                    <Input label="Posting Time" type="time" value={slotForm.posting_time} onChange={(e) => setSlotForm({ ...slotForm, posting_time: e.target.value })} />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Caption Template</label>
                        <select value={slotForm.caption_template_id} onChange={(e) => setSlotForm({ ...slotForm, caption_template_id: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl">
                            <option value="">No template</option>
                            {captionTemplates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button variant="outline" onClick={() => setShowSlotModal(false)} className="flex-1">Cancel</Button>
                        <Button variant="primary" onClick={handleSaveSlot} className="flex-1">Save</Button>
                    </div>
                </div>
            </Modal>

            {/* Caption Modal */}
            <Modal isOpen={showCaptionModal} onClose={() => setShowCaptionModal(false)} title="Set Image Caption">
                <div className="space-y-4">
                    {editingImage && (
                        <img src={editingImage.image_url} alt="" className="w-full h-40 object-cover rounded-lg" />
                    )}
                    <div className="space-y-2">
                        <label className="flex items-center gap-2">
                            <input type="radio" checked={captionOption === 'slot'} onChange={() => setCaptionOption('slot')} />
                            <span className="text-sm">Use slot's default caption</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input type="radio" checked={captionOption === 'template'} onChange={() => setCaptionOption('template')} />
                            <span className="text-sm">Select a template</span>
                        </label>
                        {captionOption === 'template' && (
                            <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg ml-6">
                                <option value="">Select template...</option>
                                {captionTemplates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        )}
                        <label className="flex items-center gap-2">
                            <input type="radio" checked={captionOption === 'custom'} onChange={() => setCaptionOption('custom')} />
                            <span className="text-sm">Enter custom caption</span>
                        </label>
                        {captionOption === 'custom' && (
                            <textarea value={customCaption} onChange={(e) => setCustomCaption(e.target.value)} rows={3} className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg ml-6" placeholder="Your custom caption..." />
                        )}
                    </div>
                    <div className="flex gap-3 pt-4">
                        <Button variant="outline" onClick={() => setShowCaptionModal(false)} className="flex-1">Cancel</Button>
                        <Button variant="primary" onClick={handleSaveCaption} className="flex-1">Save Caption</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
