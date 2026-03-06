import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Car, MapPin, Loader2 } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { motion, AnimatePresence } from 'motion/react';

// Fix for default marker icons
// @ts-ignore
import icon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons using Lucide
const createCustomIcon = (IconComponent: any, color: string) => {
  const html = renderToStaticMarkup(
    <div style={{ color }}>
      <IconComponent size={32} fill={color} fillOpacity={0.2} />
    </div>
  );
  return L.divIcon({
    html,
    className: 'custom-map-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

const pickupIcon = createCustomIcon(MapPin, '#000000');
const destIcon = createCustomIcon(MapPin, '#10b981');
const carIcon = createCustomIcon(Car, '#059669');

interface MapComponentProps {
  pickup: [number, number];
  destination: [number, number];
  status: string;
}

function ChangeView({ pickup, destination }: { pickup: [number, number], destination: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds([pickup, destination]);
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [pickup, destination, map]);
  return null;
}

export default function MapComponent({ pickup, destination, status }: MapComponentProps) {
  const [carPos, setCarPos] = useState<[number, number]>(pickup);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (status === 'searching' || status === 'accepted') {
      setCarPos(pickup);
      setIsUpdating(false);
    } else if (status === 'arriving') {
      setIsUpdating(true);
      const timer = setTimeout(() => {
        setCarPos([pickup[0] + 0.002, pickup[1] + 0.002]);
        setIsUpdating(false);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (status === 'in_progress') {
      const interval = setInterval(() => {
        setIsUpdating(true);
        setCarPos(prev => {
          const latDiff = destination[0] - prev[0];
          const lngDiff = destination[1] - prev[1];
          const step = 0.02;
          
          if (Math.abs(latDiff) < 0.0001 && Math.abs(lngDiff) < 0.0001) {
            clearInterval(interval);
            setIsUpdating(false);
            return destination;
          }
          
          const nextPos: [number, number] = [
            prev[0] + latDiff * step,
            prev[1] + lngDiff * step
          ];
          
          // Briefly show updating state then hide to simulate "ping"
          setTimeout(() => setIsUpdating(false), 600);
          
          return nextPos;
        });
      }, 3000); // Slower updates to make the "updating" state more visible
      return () => clearInterval(interval);
    } else if (status === 'completed') {
      setCarPos(destination);
      setIsUpdating(false);
    }
  }, [status, pickup, destination]);

  return (
    <div className="h-full w-full rounded-[2rem] overflow-hidden border border-black/5 shadow-inner relative">
      <AnimatePresence>
        {isUpdating && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-black/5 flex items-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/60">Updating Location</span>
          </motion.div>
        )}
      </AnimatePresence>
      <MapContainer 
        center={pickup} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <ChangeView pickup={pickup} destination={destination} />

        <Marker position={pickup} icon={pickupIcon}>
          <Popup>Pickup Point</Popup>
        </Marker>

        <Marker position={destination} icon={destIcon}>
          <Popup>Destination</Popup>
        </Marker>

        <Polyline 
          positions={[pickup, destination]} 
          color="#000" 
          weight={3} 
          opacity={0.2} 
          dashArray="10, 10" 
        />

        {status !== 'searching' && (
          <Marker position={carPos} icon={carIcon}>
            <Popup>Your Driver</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
