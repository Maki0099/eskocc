import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RouteData {
  name?: string;
  distanceKm: number;
  elevationM: number;
  startLat?: number;
  startLon?: number;
  endLat?: number;
  endLon?: number;
  maxElevation?: number;
  minElevation?: number;
  avgGradient?: number;
}

interface GeneratedMetadata {
  name: string;
  description: string;
  terrainType: "road" | "gravel" | "mtb" | "mixed";
  startLocation?: string;
  endLocation?: string;
}

// Reverse geocode coordinates to location name using Nominatim
async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10&addressdetails=1`,
      {
        headers: {
          "User-Agent": "Eskocc-CyclingClub/1.0",
          "Accept-Language": "cs,en",
        },
      }
    );
    
    if (!response.ok) {
      console.error("Geocoding failed:", response.status);
      return null;
    }
    
    const data = await response.json();
    
    // Try to extract meaningful location name
    const address = data.address;
    if (address) {
      // Prefer village/town/city name
      const locationName = address.village || address.town || address.city || 
                           address.municipality || address.county || address.state;
      return locationName || null;
    }
    
    return data.display_name?.split(",")[0] || null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

// Generate route metadata using Lovable AI
async function generateWithAI(
  routeData: RouteData,
  startLocation: string | null,
  endLocation: string | null
): Promise<{ name: string; description: string; terrainType: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    console.warn("LOVABLE_API_KEY not configured, using fallback generation");
    return generateFallback(routeData, startLocation, endLocation);
  }
  
  try {
    // Build context for AI
    const contextParts: string[] = [];
    
    if (routeData.name) {
      contextParts.push(`Původní název: "${routeData.name}"`);
    }
    
    contextParts.push(`Vzdálenost: ${routeData.distanceKm} km`);
    contextParts.push(`Převýšení: ${routeData.elevationM} m`);
    
    if (routeData.maxElevation && routeData.minElevation) {
      contextParts.push(`Nadmořská výška: ${routeData.minElevation} - ${routeData.maxElevation} m`);
    }
    
    if (routeData.avgGradient) {
      contextParts.push(`Průměrný sklon: ${routeData.avgGradient} m/km`);
    }
    
    if (startLocation) {
      contextParts.push(`Start: ${startLocation}`);
    }
    
    if (endLocation) {
      contextParts.push(`Cíl: ${endLocation}`);
    }
    
    const isLoop = startLocation && endLocation && startLocation === endLocation;
    if (isLoop) {
      contextParts.push("Typ: Okruh (start = cíl)");
    }
    
    const context = contextParts.join("\n");
    
    const systemPrompt = `Jsi asistent pro cyklistický klub ESKO.cc. Generuješ metadata pro cyklotrasy v češtině.
    
Pravidla:
- Názvy tras jsou krátké a výstižné (max 6 slov)
- Popisy jsou 2-3 věty popisující charakter trasy
- Typ terénu urči podle převýšení a charakteru oblasti:
  - "road" pro silniční trasy s nízkým převýšením (<15 m/km)
  - "gravel" pro smíšené povrchy nebo hornaté oblasti
  - "mtb" pro velmi strmé trasy (>25 m/km) nebo horské oblasti
  - "mixed" pokud nelze jasně určit

Odpověz POUZE validním JSON objektem bez dalšího textu:
{
  "name": "název trasy",
  "description": "popis trasy",
  "terrainType": "road|gravel|mtb|mixed"
}`;

    const userPrompt = `Vygeneruj metadata pro tuto cyklotrasu:

${context}

${!routeData.name ? "Trasa nemá název - vygeneruj vhodný název podle lokace a charakteru." : "Můžeš ponechat původní název nebo navrhnout lepší."}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      return generateFallback(routeData, startLocation, endLocation);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error("No content in AI response");
      return generateFallback(routeData, startLocation, endLocation);
    }
    
    // Parse JSON from response (handle possible markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    }
    
    const parsed = JSON.parse(jsonStr);
    
    return {
      name: parsed.name || generateFallback(routeData, startLocation, endLocation).name,
      description: parsed.description || "",
      terrainType: ["road", "gravel", "mtb", "mixed"].includes(parsed.terrainType) 
        ? parsed.terrainType 
        : suggestTerrain(routeData),
    };
  } catch (error) {
    console.error("AI generation error:", error);
    return generateFallback(routeData, startLocation, endLocation);
  }
}

// Fallback generation without AI
function generateFallback(
  routeData: RouteData,
  startLocation: string | null,
  endLocation: string | null
): { name: string; description: string; terrainType: string } {
  // Generate name
  let name = routeData.name || "";
  
  if (!name && startLocation) {
    if (endLocation && startLocation !== endLocation) {
      name = `${startLocation} - ${endLocation}`;
    } else {
      name = `Okruh z ${startLocation}`;
    }
  }
  
  if (!name) {
    name = `Trasa ${routeData.distanceKm} km`;
  }
  
  // Generate description
  const difficultyText = 
    routeData.elevationM > 1200 ? "náročná" :
    routeData.elevationM > 500 ? "středně náročná" : "lehká";
  
  const description = `${difficultyText.charAt(0).toUpperCase() + difficultyText.slice(1)} cyklotrasa o délce ${routeData.distanceKm} km s převýšením ${routeData.elevationM} m.`;
  
  return {
    name,
    description,
    terrainType: suggestTerrain(routeData),
  };
}

// Suggest terrain type based on route characteristics
function suggestTerrain(routeData: RouteData): string {
  const avgGradient = routeData.avgGradient || 
    (routeData.distanceKm > 0 ? routeData.elevationM / routeData.distanceKm : 0);
  
  if (avgGradient > 25) return "mtb";
  if (avgGradient > 15) return "gravel";
  if (avgGradient < 10) return "road";
  return "mixed";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { routes } = await req.json() as { routes: RouteData[] };
    
    if (!routes || !Array.isArray(routes)) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing routes array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Processing ${routes.length} routes for metadata generation`);
    
    const results: GeneratedMetadata[] = [];
    
    for (const route of routes) {
      console.log(`Processing route: ${route.name || "unnamed"}`);
      
      // Reverse geocode start and end points (with rate limiting)
      let startLocation: string | null = null;
      let endLocation: string | null = null;
      
      if (route.startLat && route.startLon) {
        startLocation = await reverseGeocode(route.startLat, route.startLon);
        // Rate limit for Nominatim
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (route.endLat && route.endLon) {
        // Check if end is same as start (loop route)
        const isLoop = route.startLat && route.startLon &&
          Math.abs(route.startLat - route.endLat) < 0.01 &&
          Math.abs(route.startLon - route.endLon) < 0.01;
        
        if (isLoop) {
          endLocation = startLocation;
        } else {
          endLocation = await reverseGeocode(route.endLat, route.endLon);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Generate metadata with AI
      const generated = await generateWithAI(route, startLocation, endLocation);
      
      results.push({
        name: generated.name,
        description: generated.description,
        terrainType: generated.terrainType as "road" | "gravel" | "mtb" | "mixed",
        startLocation: startLocation || undefined,
        endLocation: endLocation || undefined,
      });
    }
    
    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error generating metadata:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
