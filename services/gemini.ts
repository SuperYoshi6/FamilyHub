
import { GoogleGenAI, Type } from "@google/genai";
import { MealPlan, CalendarEvent, Recipe, PlaceRecommendation, VoiceAction } from "../types";

// API Key Fallback für APK Builds (da process.env dort leer sein kann)
const apiKey = process.env.API_KEY || 'AIzaSyADpKvZxuPBtZ4jd5aWq7hAOqtBGb-O1kc'; 

const getAI = () => new GoogleGenAI({ apiKey });

// Helper to get today's date string
const getTodayString = () => new Date().toISOString().split('T')[0];

// Helper to clean Markdown code blocks from JSON string
const cleanJson = (text: string): string => {
    if (!text) return "[]";
    // Remove ```json and ``` wrapping
    let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
    // Remove any leading/trailing whitespace
    return cleaned.trim();
};

export const suggestMealPlan = async (preferences: string): Promise<MealPlan[]> => {
  if (!apiKey) { console.warn("Gemini API Key fehlt!"); return []; }
  const ai = getAI();
  
  const prompt = `Erstelle einen Essensplan für die nächsten 7 Tage (vollständige Woche). 
  Präferenzen: ${preferences || 'Gesund und schnell, kinderfreundlich'}.
  Gib das Ergebnis als JSON zurück. Antworte immer auf Deutsch.
  WICHTIG: Füge für das Hauptgericht (mealName) eine kurze, verständliche Schritt-für-Schritt Zubereitungsanleitung hinzu.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.STRING, description: "Wochentag (z.B. Montag)" },
              mealName: { type: Type.STRING, description: "Name des Gerichts (Abendessen)" },
              ingredients: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Liste der Hauptzutaten"
              },
              recipeHint: { type: Type.STRING, description: "Sehr kurzer Teaser (z.B. 'Dauert 20 Min')" },
              instructions: { type: Type.STRING, description: "Kompakte Kochanleitung für das Gericht (3-4 Sätze oder Schritte)." }
            },
            required: ["day", "mealName", "ingredients", "recipeHint", "instructions"]
          }
        }
      }
    });

    if (response.text) {
        const raw = JSON.parse(cleanJson(response.text));
        return raw.map((item: any) => ({
            ...item,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            breakfast: '', 
            lunch: ''
        }));
    }
    return [];
  } catch (error) {
    console.error("Meal plan error:", error);
    return [];
  }
};

export const parseNaturalLanguageEvent = async (input: string): Promise<Partial<CalendarEvent> | null> => {
  if (!apiKey) return null;
  const ai = getAI();
  
  const prompt = `Analysiere diesen Text und extrahiere Termindetails: "${input}". 
  Heute ist ${getTodayString()}. 
  Wenn keine Zeit angegeben ist, nimm 12:00 an.
  Wenn kein Datum angegeben ist, nimm das nächstmögliche Datum an.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            date: { type: Type.STRING, description: "YYYY-MM-DD Format" },
            time: { type: Type.STRING, description: "HH:MM Format" },
            location: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["title", "date", "time"]
        }
      }
    });

    return response.text ? JSON.parse(cleanJson(response.text)) : null;
  } catch (error) {
    console.error("Event parse error:", error);
    return null;
  }
};

export const analyzeRecipeImage = async (base64Image: string): Promise<Recipe | null> => {
    if (!apiKey) return null;
    const ai = getAI();

    try {
        const base64Data = base64Image.split(',')[1];
        const mimeType = base64Image.split(';')[0].split(':')[1];

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    },
                    {
                        text: "Analysiere dieses Rezeptbild/Gericht. Extrahiere den Namen des Gerichts, eine kurze Beschreibung und eine Liste der benötigten Zutaten. Antworte unbedingt auf Deutsch."
                    }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        ingredients: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["name", "ingredients"]
                }
            }
        });

        if (response.text) {
            const data = JSON.parse(cleanJson(response.text));
            return {
                id: Date.now().toString(),
                name: data.name,
                ingredients: data.ingredients,
                description: data.description,
                image: base64Image
            };
        }
        return null;
    } catch (error) {
        console.error("Recipe scan error:", error);
        return null;
    }
};

export const importRecipeFromUrl = async (url: string): Promise<Recipe | null> => {
    if (!apiKey) return null;
    const ai = getAI();

    const prompt = `Extract the recipe details from this URL: "${url}".
    Provide the Name, Ingredients, and a brief Description.
    Ensure the output is in German language (translate if necessary).
    Return JSON.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING },
                        ingredients: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["name", "ingredients"]
                }
            }
        });

        if (response.text) {
            const data = JSON.parse(cleanJson(response.text));
            return {
                id: Date.now().toString(),
                name: data.name,
                ingredients: data.ingredients,
                description: data.description,
                image: undefined 
            };
        }
        return null;
    } catch (error) {
        console.error("Recipe URL import error:", error);
        return null;
    }
};

export const interpretVoiceCommand = async (text: string): Promise<VoiceAction | null> => {
    if (!apiKey) return null;
    const ai = getAI();

    const today = getTodayString();
    
    const prompt = `You are a smart family assistant. Interpret the user's voice command: "${text}".
    Map it to one of the following actions:
    - ADD_SHOPPING: Add an item to the shopping list.
    - ADD_TASK: Add a household task.
    - ADD_EVENT: Add a calendar event (extract title, date, time). Today is ${today}.
    - ADD_MEAL: Add a meal request.
    
    Return a JSON object with 'type' and 'data'.
    If unsure, use type 'UNKNOWN'.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, enum: ['ADD_SHOPPING', 'ADD_TASK', 'ADD_EVENT', 'ADD_MEAL', 'UNKNOWN'] },
                        data: { type: Type.OBJECT }
                    },
                    required: ["type", "data"]
                }
            }
        });

        if (response.text) {
            const result = JSON.parse(cleanJson(response.text));
            return {
                type: result.type,
                data: result.data,
                originalText: text
            };
        }
        return null;
    } catch (error) {
        console.error("Voice interpret error:", error);
        return null;
    }
};

export const suggestActivities = async (
  query: string, 
  lat: number, 
  lng: number
): Promise<{ text: string; places: PlaceRecommendation[] }> => {
  if (!apiKey) return { text: "API Key fehlt.", places: [] };
  const ai = getAI();

  try {
    const prompt = `Du bist ein lokaler Reiseführer. Suche nach: "${query}".
    WICHTIG: Suche NUR im Umkreis von 20km um diese Koordinaten: Latitude ${lat}, Longitude ${lng}. Ignoriere Orte, die weit entfernt sind.
    
    Antworte im JSON Format mit einer Liste von echten Orten.
    Für jeden Ort:
    1. 'reviewsSummary': Generiere eine Zusammenfassung basierend auf typischen Google Rezensionen (z.B. "Beliebt für den Kuchen, aber oft voll.").
    2. 'description': Warum ist es gut für Familien?
    3. 'address': Die genaue Straße und Stadt.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: "Kurze Zusammenfassung auf Deutsch" },
                    places: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING, description: "Warum es gut für Familien ist" },
                                rating: { type: Type.STRING, description: "z.B. 4.5" },
                                address: { type: Type.STRING, description: "Adresse und Stadt" },
                                reviewsSummary: { type: Type.STRING, description: "Zusammenfassung der Meinungen/Rezensionen." }
                            },
                            required: ["title", "description", "address", "reviewsSummary"]
                        }
                    }
                },
                required: ["summary", "places"]
            }
        }
    });

    if (response.text) {
        // CLEAN JSON here
        const data = JSON.parse(cleanJson(response.text));
        return {
            text: data.summary || "Hier sind einige Vorschläge in deiner Nähe:",
            places: data.places || []
        };
    }
    
    return { text: "Keine Ergebnisse gefunden.", places: [] };

  } catch (error) {
    console.error("Activity search error:", error);
    return { text: "Entschuldigung, ich konnte keine Aktivitäten laden.", places: [] };
  }
};

export const generateAvatar = async (): Promise<string | null> => {
  if (!apiKey) return null;
  const ai = getAI();
  
  const themes = ['Pixar style 3D character', 'Watercolor painting', 'Cute pixel art', 'Friendly cartoon animal', 'Abstract colorful face'];
  const randomTheme = themes[Math.floor(Math.random() * themes.length)];
  
  const prompt = `Generate a profile picture avatar. Style: ${randomTheme}. 
  The subject should be centered, joyful, and suitable for a family app. 
  White or simple gradient background.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Avatar generation error:", error);
    return null;
  }
};

export const findCoordinates = async (locationName: string): Promise<{lat: number, lng: number, name: string} | null> => {
    if (!apiKey) return null;
    const ai = getAI();

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Bestimme die Geokoordinaten (Latitude/Longitude) für den Ort: "${locationName}".
            Gib den offiziellen Namen des Ortes zurück.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        lat: { type: Type.NUMBER },
                        lng: { type: Type.NUMBER },
                        name: { type: Type.STRING }
                    },
                    required: ["lat", "lng", "name"]
                }
            }
        });
        
        return response.text ? JSON.parse(cleanJson(response.text)) : null;
    } catch (e) {
        console.error("Geocoding error", e);
        return null;
    }
};