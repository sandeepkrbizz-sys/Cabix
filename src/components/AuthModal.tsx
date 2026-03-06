import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Smartphone, ShieldCheck, Loader2, User, Car, Shield } from 'lucide-react';
import { AuthUser } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [role, setRole] = useState<'user' | 'pilot' | 'admin'>('user');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    if (phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (response.ok) {
        setStep('otp');
      } else {
        setError('Failed to send OTP');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      setError('Please enter a 6-digit OTP');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otp, role, name }),
      });
      const data = await response.json();
      if (data.success) {
        onSuccess(data.user);
        onClose();
      } else {
        setError(data.message || 'Invalid OTP');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden relative"
          >
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 hover:bg-black/5 rounded-full transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="p-8 pt-12">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="text-emerald-600 w-8 h-8" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Welcome to Cabbix</h2>
                <p className="text-black/40 text-sm mt-2">
                  {step === 'phone' ? 'Sign in or create an account' : 'Enter the 6-digit code sent to your phone (Check server logs)'}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100 font-medium">
                  {error}
                </div>
              )}

              {step === 'phone' ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-black/40 ml-4">Select Role</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'user', name: 'User', icon: User },
                        { id: 'pilot', name: 'Pilot', icon: Car },
                        { id: 'admin', name: 'Admin', icon: Shield },
                      ].map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setRole(r.id as any)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                            role === r.id
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-black/5 hover:border-black/10'
                          }`}
                        >
                          <r.icon className="w-5 h-5" />
                          <span className="text-[10px] font-bold uppercase">{r.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-black/40 ml-4">Full Name</label>
                    <input
                      type="text"
                      placeholder="Enter your name"
                      className="w-full px-6 py-4 bg-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/10 transition-all font-medium"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-black/40 ml-4">Mobile Number</label>
                    <div className="relative">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-black/40 font-bold">+91</div>
                      <input
                        type="tel"
                        placeholder="00000 00000"
                        className="w-full pl-16 pr-6 py-4 bg-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/10 transition-all font-medium"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSendOtp}
                    disabled={isLoading || phone.length < 10}
                    className="w-full py-4 bg-black text-white rounded-2xl font-bold text-lg hover:bg-black/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-black/40 ml-4">Verification Code</label>
                    <input
                      type="text"
                      placeholder="000000"
                      className="w-full px-6 py-4 bg-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/10 transition-all font-bold text-center text-2xl tracking-[0.5em]"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  </div>

                  <button
                    onClick={handleVerifyOtp}
                    disabled={isLoading || otp.length < 6}
                    className="w-full py-4 bg-black text-white rounded-2xl font-bold text-lg hover:bg-black/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Sign In'}
                  </button>

                  <button
                    onClick={() => setStep('phone')}
                    className="w-full text-sm font-bold text-black/40 hover:text-black transition-colors"
                  >
                    Change phone number
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 bg-black/5 text-center">
              <p className="text-[10px] text-black/40 font-medium uppercase tracking-widest">
                By signing in, you agree to our Terms & Privacy Policy
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
