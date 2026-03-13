import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { suggestActivities } from '../services/gemini';
import { MapPin, Search, Navigation, ExternalLink, Loader2, Star, X, Info } from 'lucide-react';
import { PlaceRecommendation } from '../types';
import { Geolocation } from '@capacitor/geolocation';

interface ActivitiesPageProps {
  onProfileClick: () => void;
  currentLocation?: { lat: number; lng: number; name: string } | null;
}

const ActivitiesPage: React.FC<ActivitiesPageProps> = ({ onProfileClick, currentLocation }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ text: string; places: PlaceRecommendation[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceRecommendation | null>(null);
  const [isFallbackLocation, setIsFallbackLocation] = useState(false);

  useEffect(() => {
    // 1. If we received a location prop (from Dashboard/Weather), use it!
    if (currentLocation) {
        setLocation({ lat: currentLocation.lat, lng: currentLocation.lng });
        setIsFallbackLocation(false);
        return; 
    }

    // 2. Otherwise try to get it ourselves
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
  }, [currentLocation]); // Re-run if prop updates

  // Manual Trigger to fix permissions
  const requestRealLocation = () => {
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              (p) => {
                  setLocation({ lat: p.coords.latitude, lng: p.coords.longitude });
                  setIsFallbackLocation(false);
                  alert("Standort erfolgreich aktualisiert.");
              },
              (err) => alert("Standortzugriff verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen."),
              { enableHighAccuracy: true, timeout: 10000 }
          );
      }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Safety fallback
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
    <>
      <Header title="Orte & Aktivitäten" onProfileClick={onProfileClick} />
      <div className="p-4 pb-24 space-y-6">
        
        {/* Search Input */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Was wollt ihr unternehmen?"
            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 pl-10 pr-4 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-800 dark:text-white"
          />
          <button 
            type="submit" 
            disabled={loading}
            className="absolute right-2 top-2 bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Navigation size={20} />}
          </button>
        </form>

        {/* Location Status */}
        {isFallbackLocation ? (
            <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl border border-orange-100 dark:border-orange-800/30">
                <span className="text-xs text-orange-600 dark:text-orange-300 font-medium">Nutze Standard-Standort (Berlin).</span>
                <button 
                onClick={requestRealLocation}
                className="bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm hover:bg-orange-600 transition"
                >
                    📍 Mein Standort
                </button>
            </div>
        ) : (
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <MapPin size={12} className="mr-1" />
                {currentLocation 
                    ? `Nutze Standort: ${currentLocation.name}`
                    : (location ? `Bereit zur Suche bei: ${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}` : "Suche Standort...")
                }
            </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-6 animate-fade-in">
            {/* AI Text Summary */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-sm text-blue-900 dark:text-blue-200 leading-relaxed border border-blue-100 dark:border-blue-800">
               {results.text}
            </div>

            {/* Places List */}
            <h3 className="font-bold text-gray-800 dark:text-white">Gefundene Orte</h3>
            <div className="grid gap-4">
              {results.places.length > 0 ? (
                results.places.map((place, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => openPlaceDetails(place)}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col justify-between hover:shadow-md transition cursor-pointer active:scale-[0.98]"
                  >
                    <div>
                        <div className="flex justify-between items-start mb-2">
                           <h4 className="font-bold text-gray-900 dark:text-white text-lg">{place.title}</h4>
                           {place.rating && (
                                <span className="inline-block bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs px-2 py-0.5 rounded font-bold whitespace-nowrap ml-2">
                                    ★ {place.rating}
                                </span>
                           )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-2 line-clamp-2">{place.description}</p>
                        {place.address && (
                             <p className="text-gray-400 dark:text-gray-500 text-xs flex items-center"><MapPin size={10} className="mr-1"/> {place.address}</p>
                        )}
                    </div>
                    <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 text-xs font-bold">
                        Details & Route <ExternalLink size={12} className="ml-1" />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-sm italic">Keine Orte gefunden.</p>
              )}
            </div>
          </div>
        )}

        {!results && !loading && (
             <div className="mt-10 text-center opacity-40">
                <MapPin className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-gray-500 dark:text-gray-400">Suche nach Spielplätzen, Restaurants oder Museen in deiner Nähe.</p>
             </div>
        )}

      </div>

      {/* Detail Modal */}
      {selectedPlace && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 relative max-h-[85vh] flex flex-col">
                  <button onClick={() => setSelectedPlace(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24}/></button>
                  
                  <div className="mb-4 pr-8">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{selectedPlace.title}</h3>
                      {selectedPlace.rating && (
                          <div className="flex items-center mt-2 text-yellow-500 font-bold">
                              <Star size={16} className="fill-current mr-1"/>
                              {selectedPlace.rating}
                          </div>
                      )}
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
                      
                      {/* Address */}
                      <div className="flex items-start text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                          <MapPin size={18} className="mr-2 mt-0.5 text-blue-500 flex-shrink-0" />
                          <span className="text-sm font-medium">{selectedPlace.address || "Adresse nicht verfügbar"}</span>
                      </div>

                      {/* Description */}
                      <div>
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Über diesen Ort</h4>
                          <p className="text-gray-700 dark:text-gray-200 text-sm leading-relaxed">
                              {selectedPlace.description}
                          </p>
                      </div>

                      {/* Reviews Summary */}
                      {selectedPlace.reviewsSummary && (
                          <div>
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                                  <Info size={12} className="mr-1"/> Rezensionen (Zusammenfassung)
                              </h4>
                              <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-100 dark:border-yellow-800/30">
                                  <p className="text-sm text-yellow-900 dark:text-yellow-200 italic leading-relaxed">
                                      "{selectedPlace.reviewsSummary}"
                                  </p>
                              </div>
                          </div>
                      )}
                  </div>

                  {/* Actions */}
                  <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-3">
                      <button 
                          onClick={() => selectedPlace.address && handleNavigate(selectedPlace.address)}
                          className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center space-x-2 active:scale-95 transition hover:bg-blue-700"
                      >
                          <Navigation size={18} />
                          <span>Route starten (Google Maps)</span>
                      </button>
                  </div>
              </div>
          </div>
      )}
    </>
  );
};

export default ActivitiesPage;