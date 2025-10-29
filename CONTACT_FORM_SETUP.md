# Contact Form SMTP Setup Guide

Your contact form is now connected to send emails via your Swizzonic SMTP server. Follow these steps to complete the setup.

## 1. Configure SMTP Secret in Supabase

The Edge Function needs your SMTP password to send emails. Set it up in the Supabase Dashboard:

### Steps:
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Edge Functions** (in the left sidebar)
4. Click on **Secrets** tab
5. Click **Add new secret**
6. Enter the following:
   - **Key**: `SMTP_PASS`
   - **Value**: Your Swizzonic mailbox password for `support@legionofbrother.com`
7. Click **Save**

## 2. Verify Edge Function Deployment

The Edge Function `contact-send` has been deployed. You can verify it in your Supabase Dashboard:

- Go to **Edge Functions** → **Functions**
- You should see `contact-send` listed as **ACTIVE**

## 3. How It Works

### Backend (Edge Function: contact-send)
- Accepts POST requests with contact form data
- Validates all fields (name, email, subject, message)
- Rate limits: 1 request per IP per 60 seconds
- Escapes HTML and converts line breaks to `<br/>` for safety
- Tries port 465 (TLS) first, falls back to port 587 (STARTTLS) if needed
- Sends formatted HTML email to `support@legionofbrother.com`

### Frontend (Contact Component)
- Client-side validation before submission
- Shows loading state during email send
- Displays success message on completion
- Shows error messages for validation or SMTP failures
- Clears form on successful submission
- Character counter for message field (max 5000)

## 4. SMTP Configuration Details

- **Host**: `mail.swizzonic.ch`
- **Primary Port**: 465 (TLS via `connectTLS`)
- **Fallback Port**: 587 (STARTTLS via `connect`)
- **Username**: `support@legionofbrother.com`
- **From**: `support@legionofbrother.com`
- **To**: `support@legionofbrother.com`

## 5. Testing the Contact Form

1. Navigate to your website's contact section
2. Fill in all required fields:
   - Name
   - Email (valid format)
   - Subject (select from dropdown)
   - Message (up to 5000 characters)
3. Click "SEND MESSAGE"
4. You should see a loading spinner
5. On success: "Message sent successfully" appears
6. Check `support@legionofbrother.com` inbox for the email

## 6. Rate Limiting

The form implements rate limiting to prevent spam:
- **Limit**: 1 submission per IP address per 60 seconds
- **Error Message**: Shows remaining wait time if limit exceeded

## 7. Security Features

- No credentials exposed in client code
- SMTP password stored securely in Supabase secrets
- HTML escaping prevents XSS attacks
- Email validation on both client and server
- Field length limits (max 5000 characters)
- Rate limiting prevents abuse

## 8. Troubleshooting

### Email not arriving?
- Verify the `SMTP_PASS` secret is set correctly in Supabase
- Check your Swizzonic mailbox settings
- Look for errors in Supabase Edge Function logs (Dashboard → Edge Functions → Logs)

### Rate limit errors?
- Wait 60 seconds between submissions
- Rate limit is per IP address

### Validation errors?
- Ensure all fields are filled
- Email must be valid format
- Message must be under 5000 characters

## 9. Email Format

Emails arrive with:
- **Subject**: `Contact Form: [selected subject]`
- **From/To**: `support@legionofbrother.com`
- **Body**: Formatted HTML with:
  - Sender's name
  - Sender's email (clickable)
  - Subject
  - Message (with line breaks preserved)

## Support

If you encounter issues, check:
1. Supabase Edge Function logs
2. Browser console for frontend errors
3. SMTP credentials are correct
4. Swizzonic SMTP service is operational
