import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Navigation, 
  Car, 
  Clock, 
  Shield, 
  Star, 
  Search, 
  ChevronRight, 
  X, 
  CheckCircle2, 
  Loader2,
  Menu,
  User,
  History,
  Share2,
  Phone,
  Key,
  CreditCard,
  Wallet,
  Smartphone,
  Banknote
} from 'lucide-react';
import { VEHICLES } from './constants';
import { Vehicle, Ride, VehicleType, LocationSuggestion, AuthUser } from './types';
import { getRouteSuggestions, getFareEstimation, getLocationSuggestions } from './services/geminiService';
import MapComponent from './components/MapComponent';
import AuthModal from './components/AuthModal';
import ProfileModal from './components/ProfileModal';

export default function App() {
  const [step, setStep] = useState<'landing' | 'booking' | 'tracking' | 'history'>('landing');
  const [pickup, setPickup] = useState('');
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [destination, setDestination] = useState('');
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [suggestions, setSuggestions] = useState<{ pickup: LocationSuggestion[], destination: LocationSuggestion[] }>({ pickup: [], destination: [] });
  const [isSearchingLocations, setIsSearchingLocations] = useState<{ pickup: boolean, destination: boolean }>({ pickup: false, destination: false });
  const [isSearching, setIsSearching] = useState(false);
  const [estimatedDistance, setEstimatedDistance] = useState<number | null>(null);
  const [aiTips, setAiTips] = useState<string>('');
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [rideStatus, setRideStatus] = useState<Ride['status']>('pending');
  const [suggestionCache, setSuggestionCache] = useState<Record<string, LocationSuggestion[]>>({});
  const [isOffline, setIsOffline] = useState(false);
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('cabbix_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleAuthSuccess = (authUser: AuthUser) => {
    setUser(authUser);
    localStorage.setItem('cabbix_user', JSON.stringify(authUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('cabbix_user');
  };

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasCustomKey(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleSetKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasCustomKey(true);
      setIsOffline(false); // Reset offline status when a new key is set
    }
  };
  const [pastRides, setPastRides] = useState<Ride[]>([]);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'wallet' | 'cash'>('upi');

  // Fetch initial history
  useEffect(() => {
    const fetchHistory = async (retries = 3) => {
      try {
        const response = await fetch('/api/rides');
        if (response.ok) {
          const data = await response.json();
          // Map snake_case from DB to camelCase for frontend
          const mappedRides = data.map((r: any) => ({
            id: r.id,
            pickup: r.pickup,
            pickupCoords: [r.pickup_lat, r.pickup_lng],
            destination: r.destination,
            destCoords: [r.dest_lat, r.dest_lng],
            vehicleType: r.vehicle_type,
            fare: r.fare,
            paymentMethod: r.payment_method,
            status: r.status,
            createdAt: r.created_at
          }));
          setPastRides(mappedRides);
        } else {
          throw new Error(`Server responded with ${response.status}`);
        }
      } catch (error) {
        console.error("Failed to fetch history", error);
        if (retries > 0) {
          console.log(`Retrying fetch history... (${retries} retries left)`);
          setTimeout(() => fetchHistory(retries - 1), 2000);
        }
      }
    };
    fetchHistory();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pickup.length >= 3 && !pickupCoords) {
        if (suggestionCache[pickup]) {
          setSuggestions(prev => ({ ...prev, pickup: suggestionCache[pickup] }));
        } else {
          handleSearchLocations('pickup', pickup);
        }
      }
    }, 300); // Reduced to 300ms
    return () => clearTimeout(timer);
  }, [pickup]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (destination.length >= 3 && !destCoords) {
        if (suggestionCache[destination]) {
          setSuggestions(prev => ({ ...prev, destination: suggestionCache[destination] }));
        } else {
          handleSearchLocations('destination', destination);
        }
      }
    }, 300); // Reduced to 300ms
    return () => clearTimeout(timer);
  }, [destination]);

  // Simulated ride tracking
  useEffect(() => {
    if (rideStatus === 'searching') {
      const timer = setTimeout(() => {
        setRideStatus('accepted');
        setRemainingTime(5); // 5 mins to pickup
      }, 3000);
      return () => clearTimeout(timer);
    }
    if (rideStatus === 'accepted') {
      const timer = setTimeout(() => {
        setRideStatus('arriving');
        setRemainingTime(1); // 1 min to pickup
      }, 3000);
      return () => clearTimeout(timer);
    }
    if (rideStatus === 'arriving') {
      const timer = setTimeout(() => {
        setRideStatus('in_progress');
        setRemainingTime(Math.round((estimatedDistance || 0) * 3)); // Trip duration
      }, 3000);
      return () => clearTimeout(timer);
    }
    if (rideStatus === 'in_progress') {
      const timer = setTimeout(() => {
        setRideStatus('completed');
        setRemainingTime(0);
      }, 15000); // Longer for map simulation
      return () => clearTimeout(timer);
    }
  }, [rideStatus, estimatedDistance]);

  // Countdown for ETA
  useEffect(() => {
    if (remainingTime && remainingTime > 0 && rideStatus !== 'completed') {
      const interval = setInterval(() => {
        setRemainingTime(prev => (prev && prev > 1 ? prev - 1 : prev));
      }, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [remainingTime, rideStatus]);

  // Save completed rides to history
  useEffect(() => {
    if (rideStatus === 'completed' && currentRide) {
      setPastRides(prev => {
        // Prevent duplicate entries
        if (prev.some(r => r.id === currentRide.id)) return prev;
        return [currentRide, ...prev];
      });
    }
  }, [rideStatus, currentRide]);

  const handleSearchLocations = async (type: 'pickup' | 'destination', query: string) => {
    if (query.length < 3) return;
    setIsSearchingLocations(prev => ({ ...prev, [type]: true }));
    try {
      const results = await getLocationSuggestions(query);
      setSuggestions(prev => ({ ...prev, [type]: results }));
      setSuggestionCache(prev => ({ ...prev, [query]: results }));
      
      // If we got results from fallback (length > 0 but maybe API failed)
      // we don't necessarily set isOffline unless it's a hard failure
    } catch (error) {
      console.warn("Location search failed, switching to offline mode");
      setIsOffline(true);
    } finally {
      setIsSearchingLocations(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleBooking = async () => {
    if (!pickup || !destination) return;
    
    setIsSearching(true);
    try {
      const distance = await getFareEstimation(pickup, destination, pickupCoords || undefined, destCoords || undefined);
      const tips = await getRouteSuggestions(pickup, destination);
      
      setEstimatedDistance(distance);
      setAiTips(tips);
      setStep('booking');
    } catch (error) {
      console.error("Booking error:", error);
      setIsOffline(true);
      // Even if it fails, we can proceed with a default distance if we have coords
      setEstimatedDistance(15);
      setStep('booking');
    } finally {
      setIsSearching(false);
    }
  };

  const confirmRide = async () => {
    if (!selectedVehicle || !pickupCoords || !destCoords) return;
    const rideId = Math.random().toString(36).substr(2, 9);
    const fare = (selectedVehicle.baseFare) + (estimatedDistance || 0) * (selectedVehicle.multiplier);
    
    const newRide = {
      id: rideId,
      pickup,
      pickupCoords,
      destination,
      destCoords,
      vehicle_type: selectedVehicle.id,
      fare,
      paymentMethod,
      status: 'searching',
      createdAt: new Date().toISOString()
    };

    try {
      await fetch('/api/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRide)
      });
      // For local state, use camelCase Ride type
      const rideForState: Ride = {
        ...newRide,
        vehicleType: selectedVehicle.id
      } as any;
      setCurrentRide(rideForState);
      setRideStatus('searching');
      setStep('tracking');
    } catch (error) {
      console.error("Failed to book ride", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans text-[#1A1A1A]">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-black/5">
        {isOffline && (
          <div className="bg-amber-50 text-amber-800 text-[10px] py-1 text-center font-medium border-b border-amber-100 uppercase tracking-widest">
            AI Rate limit reached • Using offline mode for locations
          </div>
        )}
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setStep('landing')}>
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Navigation className="text-white w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight leading-none">Cabbix.com</span>
              <span className="text-[8px] uppercase tracking-tighter font-medium text-black/40">Unit of fastbookit.com</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#" className="hover:text-black/60 transition-colors">Ride</a>
            <a href="#" className="hover:text-black/60 transition-colors">Drive</a>
            <a href="#" className="hover:text-black/60 transition-colors">Business</a>
            <a href="#" className="hover:text-black/60 transition-colors">About</a>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleSetKey}
              className={`p-2 hover:bg-black/5 rounded-full transition-colors ${hasCustomKey ? 'text-emerald-600' : 'text-black/40'}`}
              title={hasCustomKey ? "Custom API Key Active" : "Set Custom API Key"}
            >
              <Key className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setStep('history')}
              className={`p-2 hover:bg-black/5 rounded-full transition-colors ${step === 'history' ? 'bg-black/5 text-emerald-600' : ''}`}
            >
              <History className="w-5 h-5" />
            </button>
            
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:block text-right">
                  <div className="text-xs font-bold leading-none">{user.name}</div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">{user.role}</div>
                </div>
                <button 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
                  title="Profile"
                >
                  <User className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-black/40 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-black text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-black/90 transition-all shadow-lg shadow-black/10"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-16">
        <AnimatePresence mode="wait">
          {step === 'landing' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-7xl mx-auto px-4 py-12 md:py-24 grid md:grid-cols-2 gap-12 items-center"
            >
              <div>
                <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tighter mb-6">
                  Go anywhere with <br />
                  <span className="text-emerald-600">Cabbix.com</span>
                </h1>
                <p className="text-lg text-black/60 mb-8 max-w-md">
                  Experience the future of urban mobility in Bihar. Fast, reliable, and AI-powered rides at your fingertips.
                </p>

                <div className="bg-white p-6 rounded-3xl shadow-xl shadow-black/5 border border-black/5 space-y-4">
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-black" />
                    <input
                      type="text"
                      placeholder="Enter pickup location"
                      className="w-full pl-10 pr-12 py-4 bg-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                      value={pickup}
                      onChange={(e) => {
                        setPickup(e.target.value);
                        setPickupCoords(null); // Reset coords when typing
                      }}
                    />
                    {isSearchingLocations.pickup && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-black/20" />
                      </div>
                    )}
                    {suggestions.pickup.length > 0 && (
                      <div className="absolute top-full left-0 w-full bg-white mt-2 rounded-2xl shadow-2xl border border-black/5 z-50 overflow-hidden">
                        {suggestions.pickup.map((s, i) => (
                          <div
                            key={i}
                            className="p-4 hover:bg-black/5 cursor-pointer flex items-start gap-3"
                            onClick={() => {
                              setPickup(s.name);
                              setPickupCoords([s.lat, s.lng]);
                              setSuggestions(prev => ({ ...prev, pickup: [] }));
                            }}
                          >
                            <MapPin className="w-5 h-5 text-black/40 mt-0.5" />
                            <div>
                              <div className="font-medium">{s.name}</div>
                              <div className="text-xs text-black/40">{s.address}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-500" />
                    <input
                      type="text"
                      placeholder="Enter destination"
                      className="w-full pl-10 pr-12 py-4 bg-black/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                      value={destination}
                      onChange={(e) => {
                        setDestination(e.target.value);
                        setDestCoords(null); // Reset coords when typing
                      }}
                    />
                    {isSearchingLocations.destination && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-black/20" />
                      </div>
                    )}
                    {suggestions.destination.length > 0 && (
                      <div className="absolute top-full left-0 w-full bg-white mt-2 rounded-2xl shadow-2xl border border-black/5 z-50 overflow-hidden">
                        {suggestions.destination.map((s, i) => (
                          <div
                            key={i}
                            className="p-4 hover:bg-black/5 cursor-pointer flex items-start gap-3"
                            onClick={() => {
                              setDestination(s.name);
                              setDestCoords([s.lat, s.lng]);
                              setSuggestions(prev => ({ ...prev, destination: [] }));
                            }}
                          >
                            <MapPin className="w-5 h-5 text-black/40 mt-0.5" />
                            <div>
                              <div className="font-medium">{s.name}</div>
                              <div className="text-xs text-black/40">{s.address}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button className="flex items-center justify-center gap-2 py-4 bg-black/5 rounded-2xl font-medium hover:bg-black/10 transition-colors">
                      <Clock className="w-4 h-4" />
                      Ride Now
                    </button>
                    <button className="flex items-center justify-center gap-2 py-4 bg-black/5 rounded-2xl font-medium hover:bg-black/10 transition-colors">
                      <Clock className="w-4 h-4" />
                      Schedule
                    </button>
                  </div>

                  <button
                    onClick={handleBooking}
                    disabled={!pickup || !destination || isSearching}
                    className="w-full py-4 bg-black text-white rounded-2xl font-bold text-lg hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Check Prices'}
                  </button>
                </div>
              </div>

              <div className="relative hidden md:block">
                <div className="absolute -inset-4 bg-emerald-500/10 blur-3xl rounded-full" />
                <img
                  src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=1000"
                  alt="Cab Service"
                  className="relative rounded-[2rem] shadow-2xl border border-white/20"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-8 left-8 right-8 bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-white/20 shadow-xl">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Shield className="text-emerald-600 w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-bold">Safety First</div>
                      <div className="text-sm text-black/60">Every ride is tracked and insured</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-500">
                    {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                    <span className="ml-2 text-black font-medium">4.9/5 Average Rating</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'booking' && (
            <motion.div
              key="booking"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto px-4 py-12"
            >
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setStep('landing')} className="p-2 hover:bg-black/5 rounded-full">
                  <X className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold">Choose a ride</h2>
              </div>

              <div className="grid md:grid-cols-[1fr_350px] gap-8">
                <div className="space-y-4">
                  {VEHICLES.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVehicle(v)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                        selectedVehicle?.id === v.id ? 'border-black bg-white shadow-lg' : 'border-transparent bg-white/50 hover:bg-white'
                      }`}
                    >
                      <img src={v.image} alt={v.name} className="w-24 h-16 object-cover rounded-lg" referrerPolicy="no-referrer" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold">{v.name}</span>
                          <span className="font-bold text-lg">
                            ₹{((v.baseFare + (estimatedDistance || 0) * v.multiplier)).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-sm text-black/40 flex items-center gap-3">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {v.capacity}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {Math.floor(Math.random() * 5) + 2} min away</span>
                        </div>
                        <div className="text-xs text-black/60 mt-1">{v.description}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-6">
                  <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                    <div className="flex items-center gap-2 text-emerald-700 font-bold mb-3">
                      <Star className="w-5 h-5 fill-current" />
                      AI Route Insights
                    </div>
                    <div className="text-sm text-emerald-900/70 leading-relaxed whitespace-pre-wrap">
                      {aiTips}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-black/5 space-y-4">
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-black/40">Payment Method</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'upi', name: 'UPI', icon: Smartphone },
                          { id: 'card', name: 'Card', icon: CreditCard },
                          { id: 'wallet', name: 'Wallet', icon: Wallet },
                          { id: 'cash', name: 'Cash', icon: Banknote },
                        ].map((method) => (
                          <button
                            key={method.id}
                            onClick={() => setPaymentMethod(method.id as any)}
                            className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                              paymentMethod === method.id 
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                                : 'border-black/5 hover:border-black/10'
                            }`}
                          >
                            <method.icon className="w-4 h-4" />
                            <span className="text-xs font-bold">{method.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-black/5" />
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-black/40">Distance</span>
                      <span className="font-medium">{estimatedDistance?.toFixed(1)} km</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-black/40">Estimated Time</span>
                      <span className="font-medium">{Math.round((estimatedDistance || 0) * 3)} mins</span>
                    </div>
                    <div className="h-px bg-black/5" />
                    <button
                      onClick={confirmRide}
                      disabled={!selectedVehicle}
                      className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-black/90 disabled:opacity-50 transition-all"
                    >
                      Confirm {selectedVehicle?.name}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'tracking' && (
            <motion.div
              key="tracking"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-5xl mx-auto px-4 py-12"
            >
              <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-black/5 grid md:grid-cols-[1fr_400px] min-h-[600px]">
                <div className="h-[400px] md:h-full relative">
                  {pickupCoords && destCoords && (
                    <MapComponent 
                      pickup={pickupCoords} 
                      destination={destCoords} 
                      status={rideStatus} 
                    />
                  )}
                  
                  <div className="absolute top-6 left-6 right-6 z-[1000]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={rideStatus}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="px-6 py-3 bg-white/90 backdrop-blur-md rounded-2xl border border-black/5 shadow-xl font-bold text-center"
                      >
                        {rideStatus === 'searching' && "Finding your driver..."}
                        {rideStatus === 'accepted' && "Driver found! Heading your way"}
                        {rideStatus === 'arriving' && "Driver is arriving now"}
                        {rideStatus === 'in_progress' && "Trip in progress"}
                        {rideStatus === 'completed' && "You've arrived!"}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                <div className="p-8 bg-white border-l border-black/5">
                  {/* ETA Component */}
                  {rideStatus !== 'completed' && rideStatus !== 'searching' && remainingTime !== null && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-8 p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/60 mb-1">
                          {rideStatus === 'in_progress' ? 'Estimated Arrival' : 'Driver Arrival'}
                        </div>
                        <div className="text-3xl font-black text-emerald-900 tracking-tighter">
                          {remainingTime} <span className="text-sm font-bold uppercase tracking-normal">mins</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                        <Clock className="text-white w-6 h-6" />
                      </div>
                    </motion.div>
                  )}

                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-black/5 rounded-2xl flex items-center justify-center">
                        <User className="w-8 h-8 text-black/20" />
                      </div>
                      <div>
                        <div className="font-bold text-lg">Alex Johnson</div>
                        <div className="text-sm text-black/40 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" /> 4.9 • Toyota Camry
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const text = `I'm on my way to ${destination} via Cabbix.com! Estimated arrival in ${remainingTime} mins.`;
                          if (navigator.share) {
                            navigator.share({
                              title: 'My Ride Details',
                              text: text,
                            }).catch(console.error);
                          } else {
                            alert(text);
                          }
                        }}
                        className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-colors"
                        title="Share Ride"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                      <button className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-colors">
                        <Phone className="w-5 h-5" />
                      </button>
                      <button className="p-4 bg-black/5 rounded-2xl hover:bg-black/10 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-black" />
                        <div className="w-0.5 flex-1 bg-black/10" />
                        <div className="w-3 h-3 bg-emerald-500" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <div>
                          <div className="text-xs text-black/40 uppercase tracking-wider font-bold">Pickup</div>
                          <div className="font-medium truncate">{pickup}</div>
                        </div>
                        <div>
                          <div className="text-xs text-black/40 uppercase tracking-wider font-bold">Destination</div>
                          <div className="font-medium truncate">{destination}</div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-black/5 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-black/40 uppercase tracking-wider font-bold">Fare</div>
                        <div className="text-2xl font-bold">₹{currentRide?.fare.toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-black/40 uppercase tracking-wider font-bold">Payment</div>
                        <div className="flex items-center justify-end gap-2 font-bold text-black/80">
                          {paymentMethod === 'upi' && <Smartphone className="w-4 h-4" />}
                          {paymentMethod === 'card' && <CreditCard className="w-4 h-4" />}
                          {paymentMethod === 'wallet' && <Wallet className="w-4 h-4" />}
                          {paymentMethod === 'cash' && <Banknote className="w-4 h-4" />}
                          <span className="uppercase text-sm">{paymentMethod}</span>
                        </div>
                      </div>
                    </div>
                    {rideStatus === 'completed' && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center justify-center gap-2 text-emerald-600 font-bold bg-emerald-50 py-3 rounded-2xl mt-4"
                      >
                        <CheckCircle2 className="w-6 h-6" />
                        Paid via {paymentMethod.toUpperCase()}
                      </motion.div>
                    )}

                    {rideStatus === 'completed' && (
                      <button
                        onClick={() => setStep('landing')}
                        className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-black/90 transition-all mt-4"
                      >
                        Back to Home
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto px-4 py-12"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold tracking-tight">Booking History</h2>
                <button 
                  onClick={() => setStep('landing')}
                  className="text-sm font-medium text-black/40 hover:text-black flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Close
                </button>
              </div>

              {pastRides.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-black/5 shadow-sm">
                  <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <History className="w-8 h-8 text-black/20" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">No rides yet</h3>
                  <p className="text-black/40 text-sm max-w-xs mx-auto">
                    Your completed trips will appear here. Start your first journey with Cabbix.com today.
                  </p>
                  <button 
                    onClick={() => setStep('landing')}
                    className="mt-6 bg-black text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-black/80 transition-all"
                  >
                    Book a Ride
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {pastRides.map((ride) => (
                    <motion.div
                      key={ride.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm hover:shadow-md transition-all group"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="px-3 py-1 bg-black/5 rounded-full text-[10px] font-bold uppercase tracking-wider text-black/40">
                              {new Date(ride.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            <div className="px-3 py-1 bg-emerald-50 rounded-full text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                              Completed
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 rounded-full bg-black mt-1.5 shrink-0" />
                              <div className="text-sm font-medium text-black/80">{ride.pickup}</div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-emerald-500 mt-1.5 shrink-0" />
                              <div className="text-sm font-medium text-black/80">{ride.destination}</div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:flex-col md:items-end gap-2 pt-4 md:pt-0 border-t md:border-t-0 border-black/5">
                          <div className="text-2xl font-bold">₹{ride.fare.toFixed(2)}</div>
                          <div className="flex items-center gap-2 text-xs text-black/40">
                            <Car className="w-3 h-3" />
                            {VEHICLES.find(v => v.id === ride.vehicleType)?.name || 'Cabbix Economy'}
                          </div>
                          {ride.paymentMethod && (
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-black/30">
                              {ride.paymentMethod === 'upi' && <Smartphone className="w-3 h-3" />}
                              {ride.paymentMethod === 'card' && <CreditCard className="w-3 h-3" />}
                              {ride.paymentMethod === 'wallet' && <Wallet className="w-3 h-3" />}
                              {ride.paymentMethod === 'cash' && <Banknote className="w-3 h-3" />}
                              {ride.paymentMethod}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-black/5 py-12 mt-24">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Navigation className="text-white w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl tracking-tight leading-none">Cabbix.com</span>
                <span className="text-[8px] uppercase tracking-tighter font-medium text-black/40">Unit of fastbookit.com</span>
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-black/40">
                Redefining urban mobility with AI and sustainable technology.
              </p>
              <div className="pt-4 border-t border-black/5">
                <h5 className="text-[10px] font-bold uppercase tracking-widest text-black/30 mb-2">Head Office</h5>
                <p className="text-xs text-black/60 leading-relaxed">
                  Singhwara, Darbhanga, Bihar<br />
                  PIN 847123
                </p>
                <div className="mt-3 flex items-center gap-2 text-emerald-600">
                  <Phone className="w-3 h-3" />
                  <span className="text-xs font-bold">+91 8709549072</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="text-sm text-black/60 space-y-2">
              <li><a href="#" className="hover:text-black">About Us</a></li>
              <li><a href="#" className="hover:text-black">Newsroom</a></li>
              <li><a href="#" className="hover:text-black">Careers</a></li>
              <li><a href="#" className="hover:text-black">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Products</h4>
            <ul className="text-sm text-black/60 space-y-2">
              <li><a href="#" className="hover:text-black">Ride</a></li>
              <li><a href="#" className="hover:text-black">Drive</a></li>
              <li><a href="#" className="hover:text-black">Business</a></li>
              <li><a href="#" className="hover:text-black">Green</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Support</h4>
            <ul className="text-sm text-black/60 space-y-2">
              <li><a href="#" className="hover:text-black">Help Center</a></li>
              <li><a href="#" className="hover:text-black">Safety</a></li>
              <li><a href="#" className="hover:text-black">Terms</a></li>
              <li><a href="#" className="hover:text-black">Privacy</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-black/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-black/40">
          <div>© 2024 Cabbix.com - Unit of fastbookit.com</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-black">Privacy Policy</a>
            <a href="#" className="hover:text-black">Terms of Service</a>
            <a href="#" className="hover:text-black">Cookie Settings</a>
          </div>
        </div>
      </footer>
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onSuccess={handleAuthSuccess} 
      />
      {user && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={user}
          onUpdateUser={handleAuthSuccess}
        />
      )}
    </div>
  );
}
