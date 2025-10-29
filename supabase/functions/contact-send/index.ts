import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW = 60000;
const SMTP_TIMEOUT = 15000;

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

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeout = new Promise<T>((_, reject) => 
    setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}

async function sendEmailViaSMTP(data: ContactRequest, useTLS: boolean): Promise<void> {
  const smtpPassword = Deno.env.get("SMTP_PASS");
  
  if (!smtpPassword) {
    throw new Error('SMTP password not configured');
  }

  const client = new SmtpClient();
  
  try {
    if (useTLS) {
      await withTimeout(
        client.connectTLS({
          hostname: "mail.swizzonic.ch",
          port: 465,
          username: "support@legionofbrother.com",
          password: smtpPassword,
        }),
        SMTP_TIMEOUT
      );
    } else {
      await withTimeout(
        client.connect({
          hostname: "mail.swizzonic.ch",
          port: 587,
          username: "support@legionofbrother.com",
          password: smtpPassword,
        }),
        SMTP_TIMEOUT
      );
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

    await withTimeout(
      client.send({
        from: "support@legionofbrother.com",
        to: "support@legionofbrother.com",
        subject: `Contact Form: ${data.subject}`,
        content: htmlBody,
        html: htmlBody,
      }),
      SMTP_TIMEOUT
    );

    await client.close();
  } catch (error) {
    try {
      await client.close();
    } catch (e) {
      // Ignore close errors
    }
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

    const data: ContactRequest = await req.json();
    const validationError = validateRequest(data);

    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: dbError } = await supabase
      .from('contact_messages')
      .insert({
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
      });

    if (dbError) {
      console.error('Failed to save to database:', dbError);
    }

    let emailSent = false;
    let emailError: Error | null = null;

    try {
      await sendEmailViaSMTP(data, true);
      emailSent = true;
    } catch (tlsError) {
      console.error("TLS connection failed, trying STARTTLS:", tlsError);
      try {
        await sendEmailViaSMTP(data, false);
        emailSent = true;
      } catch (starttlsError) {
        console.error("STARTTLS connection also failed:", starttlsError);
        emailError = starttlsError as Error;
      }
    }

    rateLimitMap.set(clientIP, now);

    if (emailSent || !dbError) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
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