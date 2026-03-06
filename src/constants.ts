import { Vehicle } from './types';

export const VEHICLES: Vehicle[] = [
  {
    id: 'economy',
    name: 'Swift Economy',
    description: 'Affordable, everyday rides',
    baseFare: 50,
    multiplier: 15,
    capacity: 4,
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'premium',
    name: 'Swift Premium',
    description: 'High-end sedans with top-rated drivers',
    baseFare: 100,
    multiplier: 25,
    capacity: 4,
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'suv',
    name: 'Swift SUV',
    description: 'Spacious rides for groups up to 6',
    baseFare: 150,
    multiplier: 35,
    capacity: 6,
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'electric',
    name: 'Swift Green',
    description: 'Eco-friendly electric vehicles',
    baseFare: 70,
    multiplier: 18,
    capacity: 4,
    image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&q=80&w=400'
  }
];
