'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { motion } from 'framer-motion';
import { Mail, Lock, Scissors, AlertCircle } from 'lucide-react';
import Input from '@/components/shared/Input';
import Button from '@/components/shared/Button';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Email validation
    const validateEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEmail = e.target.value;
        setEmail(newEmail);
        setEmailError('');
        setError('');

        // Validate email on blur or after typing
        if (newEmail && !validateEmail(newEmail)) {
            setEmailError('Please enter a valid email address');
        }
    };

    const handleEmailBlur = () => {
        if (email && !validateEmail(email)) {
            setEmailError('Please enter a valid email address');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setEmailError('');

        // Validate email before submission
        if (!email) {
            setEmailError('Email is required');
            return;
        }

        if (!validateEmail(email)) {
            setEmailError('Please enter a valid email address');
            return;
        }

        if (!password) {
            setError('Password is required');
            return;
        }

        setIsLoading(true);

        try {
            const result = await login(email, password);
            if (result.success) {
                router.push('/dashboard');
            } else {
                setError(result.error || 'Login failed. Please try again.');
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-800 via-primary-950 to-black flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: 'spring' }}
                        className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4"
                    >
                        <Scissors className="h-8 w-8 text-primary-600" />
                    </motion.div>
                    <h1 className="text-4xl font-bold text-white mb-2">SalonFlow</h1>
                    <p className="text-primary-100">Manage your salon with ease</p>
                </div>

                {/* Login Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass bg-gray-900/30 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10"
                >
                    <h2 className="text-2xl font-bold text-white mb-6">Welcome Back</h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-1.5">
                                Email Address
                            </label>
                            <Input
                                type="email"
                                value={email}
                                onChange={handleEmailChange}
                                onBlur={handleEmailBlur}
                                leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
                                placeholder="you@example.com"
                                required
                                autoComplete="email"
                                className={`bg-white/10 text-white border-white/20 placeholder:text-gray-400 focus:bg-white/15 focus:border-primary-400 ${emailError ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : ''
                                    }`}
                            />
                            {emailError && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-1 mt-1.5 text-red-300 text-sm"
                                >
                                    <AlertCircle className="h-4 w-4" />
                                    <span>{emailError}</span>
                                </motion.div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-1.5">
                                Password
                            </label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError('');
                                }}
                                leftIcon={<Lock className="h-5 w-5 text-gray-400" />}
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                                className="bg-white/10 text-white border-white/20 placeholder:text-gray-400 focus:bg-white/15 focus:border-primary-400"
                            />
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-start gap-2 p-3 bg-red-500/20 border border-red-400/30 rounded-xl text-red-200 text-sm"
                            >
                                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </motion.div>
                        )}

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            className="w-full bg-white text-primary-950 hover:bg-gray-100 font-bold shadow-lg shadow-black/20 border-none"
                            isLoading={isLoading}
                            disabled={isLoading || !!emailError}
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>
                </motion.div>

                <p className="text-center text-white/50 text-sm mt-6">
                    © 2025 Metafuse. All rights reserved.
                </p>
            </motion.div>
        </div>
    );
}
