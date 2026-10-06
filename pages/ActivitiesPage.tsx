import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { suggestActivities } from '../services/gemini';
import { MapPin, Search, Navigation, ExternalLink, Loader2, Star, X, Info } from 'lucide-react';
import { PlaceRecommendation } from '../types';
import { Geolocation } from '@capacitor/geolocation';

interface ActivitiesPageProps {
  onProfileClick: () => void;
  currentLocation?: { lat: number; lng: number; name: string } | null;
  liquidGlass?: boolean;
}

const ActivitiesPage: React.FC<ActivitiesPageProps> = ({ onProfileClick, currentLocation, liquidGlass }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ text: string; places: PlaceRecommendation[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceRecommendation | null>(null);
  const [isFallbackLocation, setIsFallbackLocation] = useState(false);

  useEffect(() => {
    if (currentLocation) {
      setLocation({ lat: currentLocation.lat, lng: currentLocation.lng });
      setIsFallbackLocation(false);
      return;
    }

    const getLoc = async () => {
      const fallbackLocation = { lat: 52.52, lng: 13.40 };
      try {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 5000, maximumAge: Infinity });
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsFallbackLocation(false);
      } catch (e) {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (p) => {
              setLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
              setIsFallbackLocation(false);
            },
            () => {
              setLocation(fallbackLocation);
              setIsFallbackLocation(true);
            },
            { timeout: 5000 }
          );
        } else {
          setLocation(fallbackLocation);
          setIsFallbackLocation(true);
        }
      }
    };
    getLoc();
  }, [currentLocation]);

  const requestRealLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          setLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
          setIsFallbackLocation(false);
        },
        (err) => alert("Standortzugriff verweigert."),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const lat = location?.lat || 52.52;
    const lng = location?.lng || 13.40;
    setLoading(true);
    const data = await suggestActivities(query, lat, lng);
    setResults(data);
    setLoading(false);
  };

  const openPlaceDetails = (place: PlaceRecommendation) => {
    setSelectedPlace(place);
  };

  const handleNavigate = (address: string) => {
    const encodedDest = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedDest}`, '_blank');
  };

  return (
    <main className="p-0 pb-24">
      {/* Header / Search Section (Sticky) */}
      <div className={`z-40 transition-all duration-500 overflow-hidden ${liquidGlass ? 'backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-xl' : ''}`}>
        <Header title="Aktivitäten" onProfileClick={onProfileClick} liquidGlass={liquidGlass} />

        <div className="px-4 pb-4">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Was wollt ihr unternehmen?"
              className={`w-full ${liquidGlass ? 'bg-white/30 backdrop-blur-md border-white/40 text-slate-900 dark:text-white' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white'} border rounded-xl py-3 pl-10 pr-4 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all`}
            />
            <button
              type="submit"
              disabled={loading}
              className={`absolute right-2 top-2 p-1.5 rounded-lg disabled:opacity-50 transition-all active:scale-95 shadow-md ${liquidGlass ? 'bg-blue-500/80 hover:bg-blue-600/80 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Navigation size={20} />}
            </button>
          </form>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {isFallbackLocation ? (
          <div className={`flex items-center justify-between p-3 rounded-xl border ${liquidGlass ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800/30'}`}>
            <span className={`text-xs font-bold ${liquidGlass ? 'text-orange-600 dark:text-orange-400' : 'text-orange-600 dark:text-orange-300'}`}>Nutze Standard-Standort (Berlin).</span>
            <button onClick={requestRealLocation} className="bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm hover:bg-orange-600 transition active:scale-95">📍 Mein Standort</button>
          </div>
        ) : (
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 font-bold ml-1">
            <MapPin size={12} className="mr-1 text-red-500" />
            {currentLocation ? `Nutze Standort: ${currentLocation.name}` : (location ? `Bereit zur Suche bei: ${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}` : "Suche Standort...")}
          </div>
        )}

        {results && (
          <div className="space-y-6 animate-fade-in">
            <div className={`p-4 rounded-2xl text-sm leading-relaxed border ${liquidGlass ? 'bg-blue-500/10 border-blue-500/20 text-blue-900 dark:text-blue-100' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200 border-blue-100 dark:border-blue-800'}`}>{results.text}</div>
            <h3 className="font-black text-gray-800 dark:text-white uppercase text-[10px] tracking-widest ml-1">Gefundene Orte</h3>
            <div className="grid gap-4">
              {results.places.map((place, idx) => (
                <div key={idx} onClick={() => openPlaceDetails(place)} className={`${liquidGlass ? 'liquid-shimmer-card p-5' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 p-4'} rounded-2xl shadow-sm border flex flex-col justify-between hover:shadow-md transition cursor-pointer active:scale-[0.98] group`}>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className={`font-black tracking-tight text-lg ${liquidGlass ? 'text-slate-900 dark:text-white' : 'text-gray-900 dark:text-white'}`}>{place.title}</h4>
                      {place.rating && <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-bold whitespace-nowrap ml-2 ${liquidGlass ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'}`}>★ {place.rating}</span>}
                    </div>
                    <p className={`text-sm mb-3 line-clamp-2 ${liquidGlass ? 'text-slate-700 dark:text-slate-300' : 'text-gray-600 dark:text-gray-300'}`}>{place.description}</p>
                    {place.address && <p className="text-gray-400 dark:text-gray-500 text-[10px] font-bold flex items-center"><MapPin size={10} className="mr-1 text-red-500" /> {place.address}</p>}
                  </div>
                  <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-wider group-hover:translate-x-1 transition-transform">Details & Route <ExternalLink size={12} className="ml-1" /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!results && !loading && (
          <div className="mt-20 text-center opacity-40 animate-pulse-slow">
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full inline-block mb-4"><MapPin className="w-12 h-12 text-gray-400" /></div>
            <p className="text-gray-500 dark:text-gray-400 font-bold text-sm max-w-[250px] mx-auto">Suche nach Spielplätzen, Restaurants oder Museen in deiner Nähe.</p>
          </div>
        )}
      </div>

      {selectedPlace && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-lg rounded-[32px] shadow-2xl p-6 relative max-h-[85vh] flex flex-col animate-scale-in ${liquidGlass ? 'liquid-shimmer-card' : 'bg-white dark:bg-gray-800'}`}>
            <button onClick={() => setSelectedPlace(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 z-10 p-1 rounded-full"><X size={24} /></button>
            <div className="mb-6 pr-10">
              <h3 className={`text-2xl font-black tracking-tighter leading-tight ${liquidGlass ? 'text-slate-900 dark:text-white' : 'text-gray-900 dark:text-white'}`}>{selectedPlace.title}</h3>
              {selectedPlace.rating && <div className="flex items-center mt-2 text-yellow-500 font-black"><Star size={18} className="fill-current mr-1" /><span className="text-lg">{selectedPlace.rating}</span></div>}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
              <div className={`flex items-start p-4 rounded-2xl border ${liquidGlass ? 'bg-white/20 border-white/20' : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-700'}`}>
                <MapPin size={20} className="mr-3 mt-0.5 text-red-500 flex-shrink-0" /><span className={`text-sm font-bold ${liquidGlass ? 'text-slate-900 dark:text-white' : 'text-gray-900 dark:text-gray-100'}`}>{selectedPlace.address || "Adresse nicht verfügbar"}</span>
              </div>
              <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Über diesen Ort</h4>
                <p className={`text-sm leading-relaxed ${liquidGlass ? 'text-slate-800 dark:text-slate-200' : 'text-gray-700 dark:text-gray-200'}`}>{selectedPlace.description}</p>
              </div>
              {selectedPlace.reviewsSummary && (
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center ml-1"><Info size={12} className="mr-1 text-blue-500" /> Rezensionen</h4>
                  <div className={`p-4 rounded-2xl border ${liquidGlass ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-800/30'}`}>
                    <p className={`text-sm italic leading-relaxed ${liquidGlass ? 'text-slate-800 dark:text-slate-200' : 'text-yellow-900 dark:text-yellow-200'}`}>"{selectedPlace.reviewsSummary}"</p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-3">
              <button onClick={() => selectedPlace.address && handleNavigate(selectedPlace.address)} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center space-x-2 active:scale-95 transition-all hover:bg-blue-700">
                <Navigation size={20} /><span>Route starten (Google Maps)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default ActivitiesPage;