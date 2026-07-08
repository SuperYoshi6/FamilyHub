import { WeatherData, SavedLocation } from "../types";

export const fetchWeather = async (lat: number, lng: number): Promise<WeatherData | null> => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,visibility&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=auto`
    );
    if (!response.ok) throw new Error('Weather fetch failed');
    const data = await response.json();
    return data;
  } catch (e) {
    console.error("Weather fetch error:", e);
    return null;
  }
};

export const searchCity = async (query: string): Promise<{lat: number, lng: number, name: string} | null> => {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=de&format=json`
    );
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: result.latitude,
        lng: result.longitude,
        name: `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}`
      };
    }
    return null;
  } catch (e) {
    console.error("Geocoding error:", e);
    return null;
  }
};

export const searchCitySuggestions = async (query: string): Promise<{lat: number, lng: number, name: string}[]> => {
  if (!query.trim()) return [];
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=5&language=de&format=json`
    );
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return data.results.map((result: any) => ({
        lat: result.latitude,
        lng: result.longitude,
        name: `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}${result.country ? ', ' + result.country : ''}`
      }));
    }
    return [];
  } catch (e) {
    console.error("Geocoding suggestions error:", e);
    return [];
  }
};

export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const cached = localStorage.getItem(`geo_${lat.toFixed(4)}_${lng.toFixed(4)}`);
    if (cached) return cached;
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${lat},${lng}&count=1&language=de&format=json`
    );
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const name = `${data.results[0].name}${data.results[0].admin1 ? ', ' + data.results[0].admin1 : ''}`;
      localStorage.setItem(`geo_${lat.toFixed(4)}_${lng.toFixed(4)}`, name);
      return name;
    }
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=de`
    );
    const loc = await res.json();
    if (loc?.address) {
      const parts = [loc.address.city || loc.address.town || loc.address.village || loc.address.municipality, loc.address.state].filter(Boolean);
      const name = parts.join(', ') || `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
      localStorage.setItem(`geo_${lat.toFixed(4)}_${lng.toFixed(4)}`, name);
      return name;
    }
    return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  } catch {
    return `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
  }
};

export const resolveLocationName = async (lat: number, lng: number, currentName?: string): Promise<string> => {
  if (currentName && currentName !== 'Aktueller Standort') return currentName;
  return reverseGeocode(lat, lng);
};

export const getWeatherDescription = (code: number): string => {
  // Simple WMO code mapping to German descriptions
  if (code === 0) return 'Klar';
  if (code === 1) return 'Leicht bewölkt';
  if (code === 2) return 'Bewölkt';
  if (code === 3) return 'Bedeckt';
  if (code >= 45 && code <= 48) return 'Nebel';
  if (code >= 51 && code <= 55) return 'Nieselregen';
  if (code >= 56 && code <= 57) return 'Gefrierender Niesel';
  if (code >= 61 && code <= 65) return 'Regen';
  if (code >= 66 && code <= 67) return 'Gefrierender Regen';
  if (code >= 71 && code <= 77) return 'Schnee';
  if (code >= 80 && code <= 82) return 'Regenschauer';
  if (code >= 85 && code <= 86) return 'Schneeschauer';
  if (code >= 95 && code <= 99) return 'Gewitter';
  return 'Wetter';
};
