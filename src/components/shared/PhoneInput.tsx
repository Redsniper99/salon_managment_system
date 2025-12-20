'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountryCode {
    code: string;
    country: string;
    flag: string;
}

const countryCodes: CountryCode[] = [
    { code: '+94', country: 'Sri Lanka', flag: '🇱🇰' },
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
    { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
    { code: '+971', country: 'UAE', flag: '🇦🇪' },
    { code: '+65', country: 'Singapore', flag: '🇸🇬' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' },
    { code: '+33', country: 'France', flag: '🇫🇷' },
    { code: '+81', country: 'Japan', flag: '🇯🇵' },
];

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    className?: string;
}

export default function PhoneInput({
    value,
    onChange,
    label,
    placeholder = '7X XXX XXXX',
    required = false,
    disabled = false,
    error,
    className,
}: PhoneInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedCode, setSelectedCode] = useState<CountryCode>(countryCodes[0]); // Sri Lanka default
    const [phoneNumber, setPhoneNumber] = useState('');

    // Parse value on mount/change to extract country code and number
    useEffect(() => {
        if (value) {
            // Check if value starts with any known country code
            const matchedCode = countryCodes.find(c => value.startsWith(c.code));
            if (matchedCode) {
                setSelectedCode(matchedCode);
                setPhoneNumber(value.substring(matchedCode.code.length).trim());
            } else if (value.startsWith('+')) {
                // Unknown country code, keep as is
                setPhoneNumber(value);
            } else {
                // No country code, assume just the number
                setPhoneNumber(value);
            }
        }
    }, []);

    const handleCodeChange = (code: CountryCode) => {
        setSelectedCode(code);
        setIsOpen(false);
        // Update the full value
        const fullNumber = phoneNumber ? `${code.code}${phoneNumber.replace(/^0+/, '')}` : '';
        onChange(fullNumber);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let num = e.target.value.replace(/[^\d]/g, ''); // Only digits
        // Remove leading zero if present (as we're adding country code)
        if (num.startsWith('0')) {
            num = num.substring(1);
        }
        setPhoneNumber(num);
        // Construct full number with country code
        const fullNumber = num ? `${selectedCode.code}${num}` : '';
        onChange(fullNumber);
    };

    return (
        <div className={cn('w-full', className)}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {label}
                    {required && <span className="text-danger-500 ml-1">*</span>}
                </label>
            )}
            <div className="flex">
                {/* Country Code Dropdown */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => !disabled && setIsOpen(!isOpen)}
                        disabled={disabled}
                        className={cn(
                            'flex items-center gap-1 px-3 py-2.5 bg-gray-100 dark:bg-gray-700 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-xl text-sm font-medium transition-colors',
                            'hover:bg-gray-200 dark:hover:bg-gray-600',
                            disabled && 'opacity-50 cursor-not-allowed',
                            error && 'border-danger-500'
                        )}
                    >
                        <span className="text-lg">{selectedCode.flag}</span>
                        <span className="text-gray-700 dark:text-gray-300">{selectedCode.code}</span>
                        <ChevronDown className="h-3 w-3 text-gray-500" />
                    </button>

                    {isOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                            <div className="absolute z-50 top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                {countryCodes.map((country) => (
                                    <button
                                        key={country.code}
                                        type="button"
                                        onClick={() => handleCodeChange(country)}
                                        className={cn(
                                            'w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                                            selectedCode.code === country.code && 'bg-primary-50 dark:bg-primary-900/20'
                                        )}
                                    >
                                        <span className="text-lg">{country.flag}</span>
                                        <span className="text-gray-900 dark:text-white font-medium">{country.code}</span>
                                        <span className="text-gray-500 text-xs">{country.country}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Phone Number Input */}
                <input
                    type="tel"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={cn(
                        'flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-r-xl',
                        'focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors',
                        'text-gray-900 dark:text-white placeholder-gray-400',
                        disabled && 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700',
                        error && 'border-danger-500 focus:ring-danger-500 focus:border-danger-500'
                    )}
                />
            </div>
            {error && (
                <p className="mt-1 text-sm text-danger-500">{error}</p>
            )}
        </div>
    );
}

// Helper to format phone for display (e.g., +94 77 123 4567)
export function formatPhoneDisplay(phone: string): string {
    if (!phone) return '';

    // Find matching country code
    const matchedCode = countryCodes.find(c => phone.startsWith(c.code));
    if (matchedCode) {
        const number = phone.substring(matchedCode.code.length);
        // Format as: +94 77 123 4567
        if (number.length >= 9) {
            return `${matchedCode.code} ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5)}`;
        }
        return `${matchedCode.code} ${number}`;
    }
    return phone;
}
