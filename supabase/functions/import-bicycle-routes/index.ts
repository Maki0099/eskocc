import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Route data from bicycle.holiday/cs/trasy-a-vylety/
const ROUTES = [
  {
    id: "100",
    title: "100 – Playa de Muro – Ermita de Victoria – Port de Pollenca",
    description: "Příjemná trasa na začátek kempu. Cyklostezkou podél pobřeží do Alcúdie a dále do Port de Pollença. Odtud stoupání na Ermitu de Victoria s výhledem na záliv. Návrat přes Can Picafort.",
    distance_km: 61,
    elevation_m: 639,
    difficulty: "easy",
    gpx_url: "https://ridewithgps.com/trips/32433475.gpx?sub_format=track",
    cover_url: "https://bicycle.holiday/wp-content/uploads/2020/04/100-Playa-de-Muro-Ermita-de-Victoria-Port-de-Pollenca.png",
    route_link: "https://bicycle.holiday/cs/100-playa-de-muro-ermita-de-victoria-port-de-pollenca/"
  },
  {
    id: "101",
    title: "101 – Playa de Muro – Petra – Muro",
    description: "Rovinatá trasa vnitrozemím přes vesnice Petra a Muro. Ideální pro rozjezd nebo odpočinkový den. Minimum převýšení a krásná krajina.",
    distance_km: 68,
    elevation_m: 483,
    difficulty: "easy",
    gpx_url: "https://ridewithgps.com/trips/32433479.gpx?sub_format=track",
    cover_url: "https://bicycle.holiday/wp-content/uploads/2020/04/101-Playa-de-Muro-Petra-Muro.png",
    route_link: "https://bicycle.holiday/cs/101-playa-de-muro-petra-muro/"
  },
  {
    id: "102",
    title: "102 – Playa de Muro – Cap de Formentor",
    description: "Klasická trasa na nejsevernější výběžek ostrova. Stoupání na Cap de Formentor nabízí úchvatné výhledy na moře a útesy. Jedna z nejkrásnějších silnic na Mallorce.",
    distance_km: 66,
    elevation_m: 1270,
    difficulty: "medium",
    gpx_url: "https://ridewithgps.com/trips/32433481.gpx?sub_format=track",
    cover_url: "https://bicycle.holiday/wp-content/uploads/2020/04/102-Playa-de-Muro-Cap-de-Formentor.png",
    route_link: "https://bicycle.holiday/cs/102-playa-de-muro-cap-de-formentor/"
  },
  {
    id: "103",
    title: "103 – Playa de Muro – Arta – Ermita de Betlem",
    description: "Delší trasa do města Artà s návštěvou kláštera Ermita de Betlem. Krásné výhledy z kopce nad městem. Návrat podél pobřeží.",
    distance_km: 95,
    elevation_m: 1329,
    difficulty: "medium",
    gpx_url: "https://ridewithgps.com/trips/32433484.gpx?sub_format=track",
    cover_url: "https://bicycle.holiday/wp-content/uploads/2020/04/103-Playa-de-Muro-Arta-Ermita-de-Betlem.png",
    route_link: "https://bicycle.holiday/cs/103-playa-de-muro-arta-ermita-de-betlem/"
  },
  {
    id: "104",
    title: "104 – Playa de Muro – Cala Rajada – Canyamel – Petra",
    description: "Dlouhá trasa na východní pobřeží. Přes Cala Rajada a Canyamel do vnitrozemí. Několik menších stoupání a krásné vesnice.",
    distance_km: 141,
    elevation_m: 1468,
    difficulty: "medium",
    gpx_url: "https://ridewithgps.com/trips/32433487.gpx?sub_format=track",
    cover_url: "https://bicycle.holiday/wp-content/uploads/2020/04/104-Playa-de-Muro-Cala-Rajada-Canyamel-Petra.png",
    route_link: "https://bicycle.holiday/cs/104-playa-de-muro-cala-rajada-canyamel-petra/"
  },
  {
    id: "105",
    title: "105 – Playa de Muro – Sa Calobra",
    description: "Legendární stoupání na Sa Calobra - jeden z nejslavnějších cyklistických výstupů v Evropě. 9,4 km serpentin s 26 zatáčkami a převýšením 682 m. Nezapomenutelný zážitek!",
    distance_km: 111,
    elevation_m: 2495,
    difficulty: "hard",
    gpx_url: "https://ridewithgps.com/trips/32433490.gpx?sub_format=track",
    cover_url: "https://bicycle.holiday/wp-content/uploads/2020/04/105-Playa-de-Muro-Sa-Calobra.png",
    route_link: "https://bicycle.holiday/cs/105-playa-de-muro-sa-calobra/"
  },
  {
    id: "106",
    title: "106 – Playa de Muro – Orient – Bunyola – Santa Maria",
    description: "Horská trasa přes malebnou vesnici Orient v srdci pohoří Serra de Tramuntana. Stoupání Coll d'Honor nabízí nádherné výhledy na údolí.",
    distance_km: 114,
    elevation_m: 1236,
    difficulty: "medium",
    gpx_url: "https://ridewithgps.com/trips/32433494.gpx?sub_format=track",
    cover_url: "https://bicycle.holiday/wp-content/uploads/2020/04/106-Playa-de-Muro-Orient-Bunyola-Santa-Maria.png",
    route_link: "https://bicycle.holiday/cs/106-playa-de-muro-orient-bunyola-santa-maria/"
  },
  {
    id: "107",
    title: "107 – Playa de Muro – Lluc – Soller – Puig Major",
    description: "Královská etapa přes klášter Lluc a průsmyk Puig Major (884 m) - nejvyšší silniční bod na Mallorce. Sjezd do Solleru a zpět přes Orient.",
    distance_km: 140,
    elevation_m: 2751,
    difficulty: "hard",
    gpx_url: "https://ridewithgps.com/trips/32433497.gpx?sub_format=track",
    cover_url: "https://bicycle.holiday/wp-content/uploads/2020/04/107-Playa-de-Muro-Lluc-Soller-Puig-Major.png",
    route_link: "https://bicycle.holiday/cs/107-playa-de-muro-lluc-soller-puig-major/"
  },
  {
    id: "108",
    title: "108 – Playa de Muro – Sant Salvator – Montuiri",
    description: "Jižní trasa na kopec Sant Salvador s klášterem a monumentálním křížem. Krásné výhledy na celý jih ostrova. Návrat přes Montuïri.",
    distance_km: 127,
    elevation_m: 1239,
    difficulty: "medium",
    gpx_url: "https://ridewithgps.com/trips/32433501.gpx?sub_format=track",
    cover_url: "https://bicycle.holiday/wp-content/uploads/2020/04/108-Playa-de-Muro-Sant-Salvator-Montuiri.png",
    route_link: "https://bicycle.holiday/cs/108-playa-de-muro-sant-salvator-montuiri/"
  },
  {
    id: "109",
    title: "109 – Playa de Muro – Puig de Randa",
    description: "Trasa na posvátnou horu Puig de Randa s třemi kláštery. Stoupání nabízí 360° výhledy na celý ostrov. Oblíbená trasa místních cyklistů.",
    distance_km: 107,
    elevation_m: 1201,
    difficulty: "medium",
    gpx_url: "https://ridewithgps.com/trips/32433504.gpx?sub_format=track",
    cover_url: "https://bicycle.holiday/wp-content/uploads/2020/04/109-Playa-de-Muro-Puig-de-Randa.png",
    route_link: "https://bicycle.holiday/cs/109-playa-de-muro-puig-de-randa/"
  },
  {
    id: "110",
    title: "110 – Andratx – Valldemossa (🚌 transfer)",
    description: "Západní pobřeží s transferem busem do Andratxu. Stoupání na Coll de Sa Gramola a přes Banyalbufar do Valldemossy. Nejkrásnější pobřežní silnice ostrova.",
    distance_km: 126,
    elevation_m: 3072,
    difficulty: "hard",
    gpx_url: "https://ridewithgps.com/trips/32433508.gpx?sub_format=track",
    cover_url: "https://bicycle.holiday/wp-content/uploads/2020/04/110-Andraxt-Valldemosa-bus-transfer.png",
    route_link: "https://bicycle.holiday/cs/110-andraxt-valldemosa-bus-transfer/"
  },
  {
    id: "111",
    title: "111 – Andratx – Esporles (🚌 transfer)",
    description: "Kratší varianta západního pobřeží s transferem. Stoupání na Coll de Sa Gramola a sjezd do Esporles. Méně náročná alternativa k trase 110.",
    distance_km: 89,
    elevation_m: 1028,
    difficulty: "medium",
    gpx_url: "https://ridewithgps.com/trips/32433512.gpx?sub_format=track",
    cover_url: "https://bicycle.holiday/wp-content/uploads/2020/04/111-Andraxt-Esporles-bus-transfer.png",
    route_link: "https://bicycle.holiday/cs/111-andraxt-esporles-bus-transfer/"
  },
  {
    id: "112",
    title: "112 – Soller – Sa Calobra (🚌 transfer)",
    description: "Transfer do Solleru a přímý výjezd na Sa Calobra z druhé strany přes Puig Major. Méně kilometrů, ale plná porce hor. Alternativa k trase 105.",
    distance_km: 92,
    elevation_m: 2437,
    difficulty: "hard",
    gpx_url: "https://ridewithgps.com/trips/32433514.gpx?sub_format=track",
    cover_url: "https://bicycle.holiday/wp-content/uploads/2020/04/112-Soller-Sa-Calobra-bus-transfer.png",
    route_link: "https://bicycle.holiday/cs/112-soller-sa-calobra-bus-transfer/"
  }
];

async function fetchWithRetry(url: string, retries = 3, timeout = 30000): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) return response;
      
      console.log(`Attempt ${i + 1} failed for ${url}: ${response.status}`);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.log(`Attempt ${i + 1} error for ${url}:`, errMsg);
    }
    
    if (i < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const results = {
      imported: [] as string[],
      skipped: [] as string[],
      errors: [] as string[],
    };

    // Check existing routes
    const { data: existingRoutes } = await supabase
      .from('favorite_routes')
      .select('title');
    
    const existingTitles = new Set(existingRoutes?.map(r => r.title) || []);

    for (const route of ROUTES) {
      console.log(`Processing route ${route.id}: ${route.title}`);
      
      // Skip if already exists
      if (existingTitles.has(route.title)) {
        console.log(`Skipping ${route.id} - already exists`);
        results.skipped.push(route.id);
        continue;
      }

      try {
        // 1. Download and upload GPX file
        console.log(`Downloading GPX for ${route.id}...`);
        const gpxResponse = await fetchWithRetry(route.gpx_url);
        const gpxData = await gpxResponse.arrayBuffer();
        
        const gpxPath = `gpx/${route.id}.gpx`;
        const { error: gpxUploadError } = await supabase.storage
          .from('routes')
          .upload(gpxPath, gpxData, {
            contentType: 'application/gpx+xml',
            upsert: true
          });
        
        if (gpxUploadError) {
          throw new Error(`GPX upload failed: ${gpxUploadError.message}`);
        }
        
        const { data: gpxUrlData } = supabase.storage
          .from('routes')
          .getPublicUrl(gpxPath);

        // 2. Download and upload cover image
        console.log(`Downloading cover image for ${route.id}...`);
        const imageResponse = await fetchWithRetry(route.cover_url);
        const imageData = await imageResponse.arrayBuffer();
        const contentType = imageResponse.headers.get('content-type') || 'image/png';
        const extension = contentType.includes('jpeg') ? 'jpg' : 'png';
        
        const imagePath = `images/${route.id}.${extension}`;
        const { error: imageUploadError } = await supabase.storage
          .from('routes')
          .upload(imagePath, imageData, {
            contentType,
            upsert: true
          });
        
        if (imageUploadError) {
          throw new Error(`Image upload failed: ${imageUploadError.message}`);
        }
        
        const { data: imageUrlData } = supabase.storage
          .from('routes')
          .getPublicUrl(imagePath);

        // 3. Insert route into database
        console.log(`Inserting route ${route.id} into database...`);
        const { error: insertError } = await supabase
          .from('favorite_routes')
          .insert({
            title: route.title,
            description: route.description,
            distance_km: route.distance_km,
            elevation_m: route.elevation_m,
            difficulty: route.difficulty,
            terrain_type: 'road',
            gpx_file_url: gpxUrlData.publicUrl,
            cover_image_url: imageUrlData.publicUrl,
            route_link: route.route_link
          });

        if (insertError) {
          throw new Error(`Database insert failed: ${insertError.message}`);
        }

        console.log(`Successfully imported route ${route.id}`);
        results.imported.push(route.id);

      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`Error processing route ${route.id}:`, error);
        results.errors.push(`${route.id}: ${errMsg}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Import completed. Imported: ${results.imported.length}, Skipped: ${results.skipped.length}, Errors: ${results.errors.length}`,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Import error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errMsg 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
