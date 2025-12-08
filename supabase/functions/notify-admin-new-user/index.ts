import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewUserPayload {
  type: "INSERT";
  table: "user_roles";
  record: {
    id: string;
    user_id: string;
    role: string;
    created_at: string;
  };
  schema: "public";
  old_record: null;
}

async function sendEmail(to: string[], subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Eskocc <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NewUserPayload = await req.json();
    
    console.log("Received webhook payload:", JSON.stringify(payload));

    // Only process if it's a pending user
    if (payload.record?.role !== "pending") {
      console.log("Skipping - not a pending user");
      return new Response(JSON.stringify({ message: "Skipped - not pending" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email, nickname")
      .eq("id", payload.record.user_id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      throw new Error("Failed to fetch user profile");
    }

    console.log("User profile:", profile);

    // Fetch admin emails
    const { data: adminRoles, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminError) {
      console.error("Error fetching admins:", adminError);
      throw new Error("Failed to fetch admin users");
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found");
      return new Response(JSON.stringify({ message: "No admins to notify" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch admin emails from profiles
    const adminIds = adminRoles.map(r => r.user_id);
    const { data: adminProfiles, error: adminProfilesError } = await supabase
      .from("profiles")
      .select("email")
      .in("id", adminIds);

    if (adminProfilesError) {
      console.error("Error fetching admin profiles:", adminProfilesError);
      throw new Error("Failed to fetch admin profiles");
    }

    const adminEmails = adminProfiles?.map(p => p.email).filter(Boolean) || [];
    
    if (adminEmails.length === 0) {
      console.log("No admin emails found");
      return new Response(JSON.stringify({ message: "No admin emails" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Sending notification to admins:", adminEmails);

    const userName = profile.nickname || profile.full_name || "Nový uživatel";
    const userEmail = profile.email || "Neznámý email";
    const registeredAt = new Date(payload.record.created_at).toLocaleString("cs-CZ");

    // Send email to all admins
    const emailResponse = await sendEmail(
      adminEmails,
      `🚴 Nová registrace čeká na schválení - ${userName}`,
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #2F333A; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #B7A99A 0%, #A39382 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 12px 12px; }
            .user-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #B7A99A; }
            .user-info p { margin: 8px 0; }
            .label { font-weight: 600; color: #7A6855; }
            .button { display: inline-block; background: #B7A99A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .button:hover { background: #A39382; }
            .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚴 Nová registrace</h1>
            </div>
            <div class="content">
              <p>Dobrý den,</p>
              <p>na webu Eskocc se zaregistroval nový uživatel a čeká na schválení členství.</p>
              
              <div class="user-info">
                <p><span class="label">Jméno:</span> ${userName}</p>
                <p><span class="label">Email:</span> ${userEmail}</p>
                <p><span class="label">Přezdívka:</span> ${profile.nickname || "Neuvedena"}</p>
                <p><span class="label">Datum registrace:</span> ${registeredAt}</p>
              </div>
              
              <p>Pro schválení nebo zamítnutí přejděte do administrace:</p>
              
              <a href="https://eskocc.cz/admin" class="button">Přejít do administrace</a>
              
              <div class="footer">
                <p>Tato zpráva byla automaticky odeslána systémem Eskocc.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    );

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in notify-admin-new-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
