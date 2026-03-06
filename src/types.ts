export type VehicleType = 'economy' | 'premium' | 'suv' | 'electric';

export interface Vehicle {
  id: VehicleType;
  name: string;
  description: string;
  baseFare: number;
  multiplier: number;
  capacity: number;
  image: string;
}

export interface Ride {
  id: string;
  pickup: string;
  pickupCoords?: [number, number];
  destination: string;
  destCoords?: [number, number];
  vehicleType: VehicleType;
  fare: number;
  paymentMethod?: 'upi' | 'card' | 'wallet' | 'cash';
  status: 'pending' | 'searching' | 'accepted' | 'arriving' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  type: 'upi' | 'card' | 'wallet';
  details: string;
  is_default: number;
}

export interface AuthUser {
  id: string;
  phone: string;
  name: string;
  role: 'user' | 'pilot' | 'admin';
}

export interface LocationSuggestion {
  name: string;
  address: string;
  lat: number;
  lng: number;
  distance?: string;
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
