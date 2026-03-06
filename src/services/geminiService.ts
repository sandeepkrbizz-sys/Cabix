import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const getAI = () => {
  // Use API_KEY (from openSelectKey) if available, otherwise fallback to GEMINI_API_KEY (from secrets)
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
  return new GoogleGenAI({ apiKey });
};

const FALLBACK_LOCATIONS = [
  { name: "Delhi Airport (DEL)", address: "New Delhi, Delhi 110037", lat: 28.5562, lng: 77.1000 },
  { name: "Mumbai Central", address: "Mumbai, Maharashtra 400008", lat: 18.9696, lng: 72.8193 },
  { name: "Bangalore Palace", address: "Bengaluru, Karnataka 560052", lat: 12.9988, lng: 77.5921 },
  { name: "Howrah Bridge", address: "Kolkata, West Bengal 700001", lat: 22.5851, lng: 88.3468 },
  { name: "Chennai Marina Beach", address: "Chennai, Tamil Nadu 600005", lat: 13.0418, lng: 80.2824 },
  { name: "Hyderabad Charminar", address: "Hyderabad, Telangana 500002", lat: 17.3616, lng: 78.4747 }
];

async function callWithRetry<T>(fn: () => Promise<T>, retries = 2, delay = 500): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorMessage = error.message?.toLowerCase() || "";
    const isQuotaError = error.status === 429 || 
                        errorMessage.includes("429") || 
                        errorMessage.includes("quota") || 
                        errorMessage.includes("rate limit") ||
                        errorMessage.includes("exhausted");

    if (retries > 0 && isQuotaError) {
      console.warn(`Gemini Rate limit hit, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const getRouteSuggestions = async (pickup: string, destination: string) => {
  try {
    const ai = getAI();
    const response = await callWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest 3 interesting stops or landmarks between ${pickup} and ${destination}. Also provide a brief travel tip for this route.`,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      },
    }));
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Enjoy your ride! Stay safe.";
  }
};

export const getFareEstimation = async (pickup: string, destination: string, pickupCoords?: [number, number], destCoords?: [number, number]) => {
  try {
    const ai = getAI();
    const coordsInfo = pickupCoords && destCoords 
      ? `Coordinates: From (${pickupCoords[0]}, ${pickupCoords[1]}) to (${destCoords[0]}, ${destCoords[1]}).`
      : "";
      
    const response = await callWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Estimate the road distance in km between ${pickup} and ${destination}. ${coordsInfo} Return ONLY the number. Be as accurate as possible for India roads.`,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            distance: { type: Type.NUMBER }
          },
          required: ["distance"]
        }
      }
    }));
    const data = JSON.parse(response.text);
    return data.distance || 10;
  } catch (error) {
    console.warn("Fare estimation API failed, using local calculation fallback:", error);
    
    // Local calculation fallback if coordinates are available
    if (pickupCoords && destCoords) {
      const R = 6371; // Earth's radius in km
      const dLat = (destCoords[0] - pickupCoords[0]) * Math.PI / 180;
      const dLon = (destCoords[1] - pickupCoords[1]) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(pickupCoords[0] * Math.PI / 180) * Math.cos(destCoords[0] * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return Math.round(R * c * 1.3); // 30% extra for road distance
    }
    
    return 12; // Default fallback
  }
};

export const getLocationSuggestions = async (query: string) => {
  try {
    const ai = getAI();
    const response = await callWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide 5 relevant location suggestions within India for the search query: "${query}". Return as a JSON array of objects with 'name', 'address', 'lat', and 'lng'. Be fast.`,
      config: {
        systemInstruction: "You are a location suggestion service for a cab booking app operating exclusively in India. All suggestions must be real places located within the borders of India.",
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              address: { type: Type.STRING },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER }
            },
            required: ["name", "address", "lat", "lng"]
          }
        }
      }
    }));
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Location search error:", error);
    // Return filtered fallback list if API fails
    return FALLBACK_LOCATIONS.filter(loc => 
      loc.name.toLowerCase().includes(query.toLowerCase()) || 
      loc.address.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
  }
};
