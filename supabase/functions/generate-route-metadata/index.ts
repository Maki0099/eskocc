import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { HfInference } from "https://esm.sh/@huggingface/inference@2.3.2";

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

interface GeneratedImage {
  base64: string;
  caption: string;
}

interface AiSettings {
  text_provider: "lovable" | "openai" | "none";
  image_provider: "lovable" | "openai" | "huggingface" | "none";
}

// Get AI settings from database
async function getAiSettings(supabase: any): Promise<AiSettings> {
  try {
    const { data, error } = await supabase
      .from("ai_settings")
      .select("setting_key, setting_value");

    if (error) {
      console.warn("Error fetching AI settings, using defaults:", error.message);
      return { text_provider: "lovable", image_provider: "lovable" };
    }

    const settings: AiSettings = { text_provider: "lovable", image_provider: "lovable" };
    data?.forEach((row: any) => {
      if (row.setting_key === "text_provider") {
        settings.text_provider = row.setting_value;
      } else if (row.setting_key === "image_provider") {
        settings.image_provider = row.setting_value;
      }
    });

    return settings;
  } catch {
    return { text_provider: "lovable", image_provider: "lovable" };
  }
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
    
    const address = data.address;
    if (address) {
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
async function generateWithLovableAI(
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
    const context = buildRouteContext(routeData, startLocation, endLocation);
    
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
      console.error("Lovable AI API error:", response.status, errorText);
      return generateFallback(routeData, startLocation, endLocation);
    }
    
    return parseAIResponse(await response.json(), routeData, startLocation, endLocation);
  } catch (error) {
    console.error("Lovable AI generation error:", error);
    return generateFallback(routeData, startLocation, endLocation);
  }
}

// Generate route metadata using OpenAI
async function generateWithOpenAI(
  routeData: RouteData,
  startLocation: string | null,
  endLocation: string | null
): Promise<{ name: string; description: string; terrainType: string }> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  
  if (!OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY not configured, using fallback generation");
    return generateFallback(routeData, startLocation, endLocation);
  }
  
  try {
    const context = buildRouteContext(routeData, startLocation, endLocation);
    
    const systemPrompt = `Jsi asistent pro cyklistický klub ESKO.cc. Generuješ metadata pro cyklotrasy v češtině.
    
Pravidla:
- Názvy tras jsou krátké a výstižné (max 6 slov)
- Popisy jsou 2-3 věty popisující charakter trasy
- Typ terénu: "road" (silnice, <15 m/km), "gravel" (smíšené), "mtb" (>25 m/km), "mixed"

Odpověz POUZE validním JSON objektem:
{"name": "název", "description": "popis", "terrainType": "road|gravel|mtb|mixed"}`;

    const userPrompt = `Vygeneruj metadata pro cyklotrasu:\n\n${context}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 500,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return generateFallback(routeData, startLocation, endLocation);
    }
    
    return parseAIResponse(await response.json(), routeData, startLocation, endLocation);
  } catch (error) {
    console.error("OpenAI generation error:", error);
    return generateFallback(routeData, startLocation, endLocation);
  }
}

// Build route context string for AI prompts
function buildRouteContext(
  routeData: RouteData,
  startLocation: string | null,
  endLocation: string | null
): string {
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
  
  return contextParts.join("\n");
}

// Parse AI response to extract metadata
function parseAIResponse(
  data: any,
  routeData: RouteData,
  startLocation: string | null,
  endLocation: string | null
): { name: string; description: string; terrainType: string } {
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
  
  try {
    const parsed = JSON.parse(jsonStr);
    
    return {
      name: parsed.name || generateFallback(routeData, startLocation, endLocation).name,
      description: parsed.description || "",
      terrainType: ["road", "gravel", "mtb", "mixed"].includes(parsed.terrainType) 
        ? parsed.terrainType 
        : suggestTerrain(routeData),
    };
  } catch {
    console.error("Failed to parse AI response as JSON:", content);
    return generateFallback(routeData, startLocation, endLocation);
  }
}

// Fallback generation without AI
function generateFallback(
  routeData: RouteData,
  startLocation: string | null,
  endLocation: string | null
): { name: string; description: string; terrainType: string } {
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

// Generate images with Lovable AI
async function generateImagesWithLovable(
  routeData: RouteData,
  metadata: { name: string; description: string; terrainType: string },
  startLocation: string | null,
  count: number
): Promise<GeneratedImage[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    console.warn("LOVABLE_API_KEY not configured, skipping image generation");
    return [];
  }
  
  const images: GeneratedImage[] = [];
  const locationContext = startLocation || "Česká republika, Beskydy";
  const perspectives = getImagePerspectives(metadata, routeData, locationContext);
  const imagesToGenerate = Math.min(count, perspectives.length);
  
  for (let i = 0; i < imagesToGenerate; i++) {
    try {
      console.log(`[Lovable] Generating image ${i + 1}/${imagesToGenerate}`);
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [{ role: "user", content: perspectives[i].prompt }],
          modalities: ["image", "text"]
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Lovable] Image generation failed:`, response.status, errorText);
        continue;
      }
      
      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (imageUrl) {
        images.push({ base64: imageUrl, caption: perspectives[i].caption });
        console.log(`[Lovable] Successfully generated image ${i + 1}`);
      }
      
      if (i < imagesToGenerate - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`[Lovable] Error generating image ${i + 1}:`, error);
    }
  }
  
  return images;
}

// Generate images with OpenAI DALL-E
async function generateImagesWithOpenAI(
  routeData: RouteData,
  metadata: { name: string; description: string; terrainType: string },
  startLocation: string | null,
  count: number
): Promise<GeneratedImage[]> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  
  if (!OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY not configured, skipping image generation");
    return [];
  }
  
  const images: GeneratedImage[] = [];
  const locationContext = startLocation || "Czech Republic, Beskydy mountains";
  const perspectives = getImagePerspectives(metadata, routeData, locationContext);
  const imagesToGenerate = Math.min(count, perspectives.length);
  
  for (let i = 0; i < imagesToGenerate; i++) {
    try {
      console.log(`[OpenAI] Generating image ${i + 1}/${imagesToGenerate}`);
      
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt: perspectives[i].prompt,
          n: 1,
          size: "1024x1024",
          quality: "medium",
          output_format: "png",
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[OpenAI] Image generation failed:`, response.status, errorText);
        continue;
      }
      
      const data = await response.json();
      console.log(`[OpenAI] Response structure:`, Object.keys(data), data.data?.length ? `data[0] keys: ${Object.keys(data.data[0])}` : 'no data');
      
      // gpt-image-1 returns base64 directly in data[0].b64_json
      let b64 = data.data?.[0]?.b64_json;
      
      // Fallback: pokud je URL místo base64, stáhnout a konvertovat
      if (!b64 && data.data?.[0]?.url) {
        console.log(`[OpenAI] Response contains URL instead of base64, downloading...`);
        try {
          const imageUrl = data.data[0].url;
          const imgResponse = await fetch(imageUrl);
          if (imgResponse.ok) {
            const arrayBuffer = await imgResponse.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let j = 0; j < uint8Array.length; j++) {
              binary += String.fromCharCode(uint8Array[j]);
            }
            b64 = btoa(binary);
            console.log(`[OpenAI] Successfully converted URL to base64`);
          }
        } catch (urlError) {
          console.error(`[OpenAI] Failed to download image from URL:`, urlError);
        }
      }
      
      if (b64) {
        images.push({ 
          base64: `data:image/png;base64,${b64}`, 
          caption: perspectives[i].caption 
        });
        console.log(`[OpenAI] Successfully generated image ${i + 1}`);
      } else {
        console.error(`[OpenAI] No image data in response for image ${i + 1}:`, 
          JSON.stringify(data).substring(0, 500));
      }
      
      if (i < imagesToGenerate - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } catch (error) {
      console.error(`[OpenAI] Error generating image ${i + 1}:`, error);
    }
  }
  
  return images;
}

// Generate images with Hugging Face FLUX
async function generateImagesWithHuggingFace(
  routeData: RouteData,
  metadata: { name: string; description: string; terrainType: string },
  startLocation: string | null,
  count: number
): Promise<GeneratedImage[]> {
  const HF_TOKEN = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
  
  if (!HF_TOKEN) {
    console.warn("HUGGING_FACE_ACCESS_TOKEN not configured, skipping image generation");
    return [];
  }
  
  const images: GeneratedImage[] = [];
  const hf = new HfInference(HF_TOKEN);
  const locationContext = startLocation || "Czech Republic, Beskydy mountains";
  const perspectives = getImagePerspectives(metadata, routeData, locationContext);
  const imagesToGenerate = Math.min(count, perspectives.length);
  
  for (let i = 0; i < imagesToGenerate; i++) {
    try {
      console.log(`[HuggingFace] Generating image ${i + 1}/${imagesToGenerate}`);
      
      const image = await hf.textToImage({
        inputs: perspectives[i].prompt,
        model: "black-forest-labs/FLUX.1-schnell",
      });
      
      const arrayBuffer = await image.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      images.push({ 
        base64: `data:image/png;base64,${base64}`, 
        caption: perspectives[i].caption 
      });
      console.log(`[HuggingFace] Successfully generated image ${i + 1}`);
      
      if (i < imagesToGenerate - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`[HuggingFace] Error generating image ${i + 1}:`, error);
    }
  }
  
  return images;
}

// Get image generation perspectives/prompts
function getImagePerspectives(
  metadata: { name: string; terrainType: string },
  routeData: RouteData,
  locationContext: string
): { prompt: string; caption: string }[] {
  const terrainKeywords: Record<string, string> = {
    road: "asphalt road, road bike, fast cycling",
    gravel: "gravel path, gravel bike, mixed surface",
    mtb: "mountain bike, forest trail, rocks and roots",
    mixed: "varied terrain, cycling",
  };
  
  const terrain = terrainKeywords[metadata.terrainType] || terrainKeywords.mixed;
  
  return [
    {
      prompt: `Photorealistic photo: Cyclist on ${metadata.terrainType === 'mtb' ? 'mountain bike' : metadata.terrainType === 'road' ? 'road bike' : 'gravel bike'} riding through beautiful landscape, ${locationContext}. ${terrain}. Professional sports photography, natural light, high quality, 16:9 aspect ratio.`,
      caption: `${metadata.name} - Na trase`
    },
    {
      prompt: `Photorealistic photo: Panoramic view from a cycling route in Czech Republic, ${locationContext}. Hilly landscape, forests, meadows. Beautiful weather, professional landscape photography, 16:9 aspect ratio.`,
      caption: `${metadata.name} - Výhled`
    },
    {
      prompt: `Photorealistic photo: Detail of cycling path in nature, ${terrain}, ${locationContext}. Focus on surface and surrounding vegetation. Professional photography, 16:9 aspect ratio.`,
      caption: `${metadata.name} - Cesta`
    },
    {
      prompt: `Photorealistic photo: ${routeData.elevationM > 800 ? 'Mountain landscape with hills and forests' : 'Picturesque Czech landscape with meadows and forests'}, ideal for cycling tourism. ${locationContext}. Professional landscape photography, beautiful weather, 16:9 aspect ratio.`,
      caption: `${metadata.name} - Krajina`
    },
    {
      prompt: `Photorealistic photo: Rest area by cycling route with bench or signpost, view of landscape, ${locationContext}. Calm atmosphere, professional photography, 16:9 aspect ratio.`,
      caption: `${metadata.name} - Odpočinek`
    },
  ];
}

// Main text generation dispatcher
async function generateWithAI(
  routeData: RouteData,
  startLocation: string | null,
  endLocation: string | null,
  provider: "lovable" | "openai" | "none"
): Promise<{ name: string; description: string; terrainType: string }> {
  console.log(`Generating metadata with provider: ${provider}`);
  
  switch (provider) {
    case "lovable":
      return generateWithLovableAI(routeData, startLocation, endLocation);
    case "openai":
      return generateWithOpenAI(routeData, startLocation, endLocation);
    case "none":
    default:
      return generateFallback(routeData, startLocation, endLocation);
  }
}

// Main image generation dispatcher
async function generateRouteImages(
  routeData: RouteData,
  metadata: { name: string; description: string; terrainType: string },
  startLocation: string | null,
  count: number,
  provider: "lovable" | "openai" | "huggingface" | "none"
): Promise<GeneratedImage[]> {
  console.log(`Generating ${count} images with provider: ${provider}`);
  
  switch (provider) {
    case "lovable":
      return generateImagesWithLovable(routeData, metadata, startLocation, count);
    case "openai":
      return generateImagesWithOpenAI(routeData, metadata, startLocation, count);
    case "huggingface":
      return generateImagesWithHuggingFace(routeData, metadata, startLocation, count);
    case "none":
    default:
      return [];
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const body = await req.json();
    
    // Check config request (for admin UI to know which providers are available)
    if (body.checkConfig) {
      const configuredProviders: string[] = [];
      if (Deno.env.get("LOVABLE_API_KEY")) configuredProviders.push("lovable");
      if (Deno.env.get("OPENAI_API_KEY")) configuredProviders.push("openai");
      if (Deno.env.get("HUGGING_FACE_ACCESS_TOKEN")) configuredProviders.push("huggingface");
      
      return new Response(
        JSON.stringify({ success: true, configuredProviders }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { routes, generateImages = false, imageCount = 4 } = body as { 
      routes: RouteData[]; 
      generateImages?: boolean;
      imageCount?: number;
    };
    
    if (!routes || !Array.isArray(routes)) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing routes array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Initialize Supabase client to get AI settings
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get AI settings from database
    const aiSettings = await getAiSettings(supabase);
    console.log(`AI Settings - Text: ${aiSettings.text_provider}, Image: ${aiSettings.image_provider}`);
    console.log(`Processing ${routes.length} routes (generateImages: ${generateImages}, count: ${imageCount})`);
    
    const results: (GeneratedMetadata & { images?: GeneratedImage[] })[] = [];
    
    for (const route of routes) {
      console.log(`Processing route: ${route.name || "unnamed"}`);
      
      // Reverse geocode start and end points
      let startLocation: string | null = null;
      let endLocation: string | null = null;
      
      if (route.startLat && route.startLon) {
        startLocation = await reverseGeocode(route.startLat, route.startLon);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (route.endLat && route.endLon) {
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
      
      // Generate metadata with configured provider
      const generated = await generateWithAI(route, startLocation, endLocation, aiSettings.text_provider);
      
      // Optionally generate images with configured provider
      let images: GeneratedImage[] | undefined;
      if (generateImages) {
        images = await generateRouteImages(route, generated, startLocation, imageCount, aiSettings.image_provider);
        console.log(`Generated ${images.length} images for route: ${route.name || generated.name}`);
      }
      
      results.push({
        name: generated.name,
        description: generated.description,
        terrainType: generated.terrainType as "road" | "gravel" | "mtb" | "mixed",
        startLocation: startLocation || undefined,
        endLocation: endLocation || undefined,
        images,
      });
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        providers: {
          text: aiSettings.text_provider,
          image: aiSettings.image_provider
        }
      }),
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
