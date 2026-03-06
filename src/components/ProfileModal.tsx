import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Phone, CreditCard, Plus, Trash2, Loader2, Save, Wallet, Smartphone } from 'lucide-react';
import { AuthUser, PaymentMethod } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser;
  onUpdateUser: (user: AuthUser) => void;
}

export default function ProfileModal({ isOpen, onClose, user, onUpdateUser }: ProfileModalProps) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);
  const [isAddingMethod, setIsAddingMethod] = useState(false);
  const [newMethodType, setNewMethodType] = useState<'upi' | 'card' | 'wallet'>('upi');
  const [newMethodDetails, setNewMethodDetails] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchPaymentMethods();
    }
  }, [isOpen]);

  const fetchPaymentMethods = async () => {
    setIsLoadingMethods(true);
    try {
      const response = await fetch(`/api/users/${user.id}/payment-methods`);
      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data);
      }
    } catch (err) {
      console.error('Failed to fetch payment methods', err);
    } finally {
      setIsLoadingMethods(false);
    }
  };

  const handleUpdateProfile = async () => {
    setIsUpdating(true);
    setError('');
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });
      const data = await response.json();
      if (data.success) {
        onUpdateUser(data.user);
      } else {
        setError(data.message || 'Update failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!newMethodDetails) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/users/${user.id}/payment-methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newMethodType, details: newMethodDetails }),
      });
      if (response.ok) {
        setNewMethodDetails('');
        setIsAddingMethod(false);
        fetchPaymentMethods();
      }
    } catch (err) {
      console.error('Failed to add payment method', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    try {
      const response = await fetch(`/api/payment-methods/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchPaymentMethods();
      }
    } catch (err) {
      console.error('Failed to delete payment method', err);
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
            className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col"
          >
            <div className="p-8 border-b border-black/5 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Your Profile</h2>
                <p className="text-black/40 text-sm font-medium uppercase tracking-widest mt-1">Manage your account & payments</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-black/5 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              {/* Personal Details */}
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <User className="text-emerald-600 w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold">Personal Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-black/40 ml-4">Full Name</label>
                    <input
                      type="text"
                      className="w-full px-6 py-4 bg-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/10 transition-all font-medium"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-black/40 ml-4">Phone Number</label>
                    <input
                      type="tel"
                      className="w-full px-6 py-4 bg-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/10 transition-all font-medium"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  onClick={handleUpdateProfile}
                  disabled={isUpdating}
                  className="px-8 py-4 bg-black text-white rounded-2xl font-bold hover:bg-black/90 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save Changes
                </button>
              </section>

              {/* Payment Methods */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <CreditCard className="text-blue-600 w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold">Payment Methods</h3>
                  </div>
                  <button
                    onClick={() => setIsAddingMethod(!isAddingMethod)}
                    className="p-2 bg-black/5 hover:bg-black/10 rounded-xl transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {isAddingMethod && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-black/5 rounded-3xl space-y-4"
                  >
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'upi', name: 'UPI', icon: Smartphone },
                        { id: 'card', name: 'Card', icon: CreditCard },
                        { id: 'wallet', name: 'Wallet', icon: Wallet },
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setNewMethodType(m.id as any)}
                          className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                            newMethodType === m.id
                              ? 'border-black bg-white shadow-sm'
                              : 'border-transparent hover:bg-white/50'
                          }`}
                        >
                          <m.icon className="w-4 h-4" />
                          <span className="text-[10px] font-bold uppercase">{m.name}</span>
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      placeholder={newMethodType === 'upi' ? 'UPI ID (e.g. user@upi)' : 'Details'}
                      className="w-full px-6 py-4 bg-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/10 transition-all font-medium"
                      value={newMethodDetails}
                      onChange={(e) => setNewMethodDetails(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddPaymentMethod}
                        disabled={isUpdating || !newMethodDetails}
                        className="flex-1 py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-black/90 transition-all disabled:opacity-50"
                      >
                        Add Method
                      </button>
                      <button
                        onClick={() => setIsAddingMethod(false)}
                        className="px-6 py-3 bg-black/10 text-black rounded-xl font-bold text-sm hover:bg-black/20 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}

                <div className="space-y-3">
                  {isLoadingMethods ? (
                    <div className="py-10 flex justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-black/20" />
                    </div>
                  ) : paymentMethods.length > 0 ? (
                    paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className="flex items-center justify-between p-6 bg-white border border-black/5 rounded-3xl hover:border-black/10 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-black/5 rounded-2xl flex items-center justify-center">
                            {method.type === 'upi' && <Smartphone className="w-6 h-6" />}
                            {method.type === 'card' && <CreditCard className="w-6 h-6" />}
                            {method.type === 'wallet' && <Wallet className="w-6 h-6" />}
                          </div>
                          <div>
                            <div className="text-xs font-bold uppercase tracking-widest text-black/40">{method.type}</div>
                            <div className="text-lg font-bold">{method.details}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeletePaymentMethod(method.id)}
                          className="p-2 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center bg-black/5 rounded-3xl border-2 border-dashed border-black/10">
                      <p className="text-black/40 font-medium">No payment methods added yet</p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="p-6 bg-black/5 text-center">
              <p className="text-[10px] text-black/40 font-medium uppercase tracking-widest">
                Cabbix Secure Profile Management
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
