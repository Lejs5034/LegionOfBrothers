import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function escapeHTML(s: string): string {
  return s.replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"));
}

async function createAirtableRecord(fields: Record<string, unknown>): Promise<void> {
  const AIRTABLE_TOKEN = Deno.env.get("AIRTABLE_TOKEN");
  const AIRTABLE_BASE = Deno.env.get("AIRTABLE_BASE");
  const AIRTABLE_TABLE = Deno.env.get("AIRTABLE_TABLE");

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE || !AIRTABLE_TABLE) {
    throw new Error("Airtable configuration missing. Please configure AIRTABLE_TOKEN, AIRTABLE_BASE, and AIRTABLE_TABLE environment variables.");
  }

  console.log(`Attempting to connect to Airtable Base: ${AIRTABLE_BASE}, Table: ${AIRTABLE_TABLE}`);

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(AIRTABLE_TABLE)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ records: [{ fields }] }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Airtable API Error: Status ${res.status}, Response: ${text}`);
    
    if (res.status === 404) {
      throw new Error(`Airtable base or table not found. Please verify your AIRTABLE_BASE (${AIRTABLE_BASE}) and AIRTABLE_TABLE (${AIRTABLE_TABLE}) are correct, and that your token has access to this base.`);
    } else if (res.status === 401) {
      throw new Error("Airtable authentication failed. Please verify your AIRTABLE_TOKEN is valid.");
    } else if (res.status === 422) {
      throw new Error(`Airtable field validation error: ${text}. Make sure your Airtable table has fields named: Name, Mail, Subject, Message, Status`);
    }
    
    throw new Error(`Airtable error (${res.status}): ${text}`);
  }

  console.log("Successfully saved to Airtable");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const subject = String(body.subject ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await createAirtableRecord({
      Name: escapeHTML(name),
      Mail: email,
      Subject: escapeHTML(subject),
      Message: message,
      Status: "New",
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to process request";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
