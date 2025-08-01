import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Create avatars bucket if it doesn't exist
    const { data: buckets } = await supabaseClient.storage.listBuckets();
    const avatarBucket = buckets?.find((bucket) => bucket.name === "avatars");

    if (!avatarBucket) {
      const { data, error } = await supabaseClient.storage.createBucket(
        "avatars",
        {
          public: true,
          allowedMimeTypes: [
            "image/png",
            "image/jpeg",
            "image/gif",
            "image/webp",
          ],
          fileSizeLimit: 1024 * 1024 * 2, // 2MB
        },
      );

      if (error) {
        throw error;
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Avatar bucket ready" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
