'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { motion } from 'framer-motion';
import { Mail, Lock, Scissors } from 'lucide-react';
import Input from '@/components/shared/Input';
import Button from '@/components/shared/Button';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const success = await login(email, password);
            if (success) {
                router.push('/dashboard');
            } else {
                setError('Invalid email or password');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 flex items-center justify-center p-4">
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
                    className="glass bg-white/95 p-8 rounded-3xl shadow-2xl"
                >
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Welcome Back</h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            type="email"
                            label="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            leftIcon={<Mail className="h-5 w-5" />}
                            placeholder="you@example.com"
                            required
                            autoComplete="email"
                        />

                        <Input
                            type="password"
                            label="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            leftIcon={<Lock className="h-5 w-5" />}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                        />

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 bg-danger-50 border border-danger-200 rounded-xl text-danger-700 text-sm"
                            >
                                {error}
                            </motion.div>
                        )}

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            className="w-full"
                            isLoading={isLoading}
                        >
                            Sign In
                        </Button>
                    </form>

                    {/* Demo Credentials */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Demo Credentials:</p>
                        <div className="space-y-1 text-xs text-gray-600">
                            <p>Owner: owner@salonflow.com / owner123</p>
                            <p>Manager: manager@salonflow.com / manager123</p>
                            <p>Receptionist: receptionist@salonflow.com / receptionist123</p>
                            <p>Stylist: stylist@salonflow.com / stylist123</p>
                        </div>
                    </div>
                </motion.div>

                <p className="text-center text-primary-100 text-sm mt-6">
                    © 2024 SalonFlow. All rights reserved.
                </p>
            </motion.div>
        </div>
    );
}
