import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Rate limiting storage (IP -> last request timestamp)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60000; // 60 seconds

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamp] of rateLimitMap.entries()) {
    if (now - timestamp > RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(ip);
    }
  }
}, 300000);

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function nl2br(text: string): string {
  return text.replace(/\n/g, '<br/>');
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

function validateRequest(data: ContactRequest): string | null {
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    return 'Name is required';
  }
  if (data.name.length > 5000) {
    return 'Name is too long (max 5000 characters)';
  }
  
  if (!data.email || typeof data.email !== 'string' || !validateEmail(data.email)) {
    return 'Valid email is required';
  }
  if (data.email.length > 5000) {
    return 'Email is too long (max 5000 characters)';
  }
  
  if (!data.subject || typeof data.subject !== 'string' || data.subject.trim().length === 0) {
    return 'Subject is required';
  }
  if (data.subject.length > 5000) {
    return 'Subject is too long (max 5000 characters)';
  }
  
  if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) {
    return 'Message is required';
  }
  if (data.message.length > 5000) {
    return 'Message is too long (max 5000 characters)';
  }
  
  return null;
}

async function sendEmailViaSMTP(data: ContactRequest, useTLS: boolean): Promise<void> {
  const smtpPassword = Deno.env.get("SMTP_PASS");
  
  if (!smtpPassword) {
    throw new Error('SMTP password not configured');
  }

  const client = new SmtpClient();
  
  try {
    if (useTLS) {
      await client.connectTLS({
        hostname: "mail.swizzonic.ch",
        port: 465,
        username: "support@legionofbrother.com",
        password: smtpPassword,
      });
    } else {
      await client.connect({
        hostname: "mail.swizzonic.ch",
        port: 587,
        username: "support@legionofbrother.com",
        password: smtpPassword,
      });
    }

    const escapedName = escapeHtml(data.name);
    const escapedEmail = escapeHtml(data.email);
    const escapedSubject = escapeHtml(data.subject);
    const escapedMessage = nl2br(escapeHtml(data.message));

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #667eea; }
    .value { margin-top: 5px; }
    .message-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">New Contact Form Submission</h2>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">From:</div>
        <div class="value">${escapedName}</div>
      </div>
      <div class="field">
        <div class="label">Email:</div>
        <div class="value"><a href="mailto:${escapedEmail}">${escapedEmail}</a></div>
      </div>
      <div class="field">
        <div class="label">Subject:</div>
        <div class="value">${escapedSubject}</div>
      </div>
      <div class="field">
        <div class="label">Message:</div>
        <div class="message-box">${escapedMessage}</div>
      </div>
    </div>
  </div>
</body>
</html>
`;

    await client.send({
      from: "support@legionofbrother.com",
      to: "support@legionofbrother.com",
      subject: `Contact Form: ${data.subject}`,
      content: htmlBody,
      html: htmlBody,
    });

    await client.close();
  } catch (error) {
    await client.close();
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Rate limiting
    const clientIP = req.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();
    const lastRequest = rateLimitMap.get(clientIP);

    if (lastRequest && now - lastRequest < RATE_LIMIT_WINDOW) {
      const remainingTime = Math.ceil((RATE_LIMIT_WINDOW - (now - lastRequest)) / 1000);
      return new Response(
        JSON.stringify({ 
          error: `Rate limit exceeded. Please wait ${remainingTime} seconds before trying again.` 
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse and validate request
    const data: ContactRequest = await req.json();
    const validationError = validateRequest(data);

    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try sending via TLS (port 465) first, fallback to STARTTLS (port 587)
    try {
      await sendEmailViaSMTP(data, true);
    } catch (tlsError) {
      console.error("TLS connection failed, trying STARTTLS:", tlsError);
      try {
        await sendEmailViaSMTP(data, false);
      } catch (starttlsError) {
        console.error("STARTTLS connection also failed:", starttlsError);
        throw new Error("Failed to send email via SMTP");
      }
    }

    // Update rate limit
    rateLimitMap.set(clientIP, now);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing contact form:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to send message. Please try again later." 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});