'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Clock, User, Scissors } from 'lucide-react';
import Modal from '@/components/shared/Modal';
import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';

interface CreateAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreateAppointmentModal({ isOpen, onClose }: CreateAppointmentModalProps) {
    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        date: '',
        time: '',
        service: '',
        stylist: '',
        notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Add appointment creation logic
        console.log('Creating appointment:', formData);
        onClose();
        // Reset form
        setFormData({
            customerName: '',
            customerPhone: '',
            date: '',
            time: '',
            service: '',
            stylist: '',
            notes: '',
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="New Appointment"
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer Name */}
                    <Input
                        label="Customer Name"
                        type="text"
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        placeholder="Enter customer name"
                        leftIcon={<User className="h-5 w-5" />}
                        required
                    />

                    {/* Customer Phone */}
                    <Input
                        label="Phone Number"
                        type="tel"
                        value={formData.customerPhone}
                        onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                        placeholder="Enter phone number"
                        required
                    />

                    {/* Date */}
                    <Input
                        label="Date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        leftIcon={<Calendar className="h-5 w-5" />}
                        required
                    />

                    {/* Time */}
                    <Input
                        label="Time"
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        leftIcon={<Clock className="h-5 w-5" />}
                        required
                    />

                    {/* Service */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Service
                        </label>
                        <select
                            value={formData.service}
                            onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-gray-900"
                            required
                        >
                            <option value="">Select service</option>
                            <option value="haircut">Hair Cut</option>
                            <option value="styling">Hair Styling</option>
                            <option value="coloring">Hair Coloring</option>
                            <option value="beard">Beard Trim</option>
                            <option value="facial">Facial</option>
                            <option value="bridal">Bridal Makeup</option>
                        </select>
                    </div>

                    {/* Stylist */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Stylist
                        </label>
                        <select
                            value={formData.stylist}
                            onChange={(e) => setFormData({ ...formData, stylist: e.target.value })}
                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors text-gray-900"
                            required
                        >
                            <option value="">Select stylist</option>
                            <option value="stylist1">Sarah Johnson</option>
                            <option value="stylist2">Mike Smith</option>
                            <option value="stylist3">Emily Davis</option>
                        </select>
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Notes (Optional)
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Add any special notes..."
                        rows={3}
                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors resize-none text-gray-900"
                    />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                        Create Appointment
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
