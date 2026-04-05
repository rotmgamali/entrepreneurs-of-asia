// EOA Email Service — Nodemailer / Gmail SMTP
// Adapted from the Web4Guru email pattern.
// Env vars required: GMAIL_USER, GMAIL_APP_PASSWORD
// Optional: EMAIL_FROM_NAME (defaults to "Entrepreneurs of Asia")

import nodemailer from "nodemailer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RsvpConfirmationDetails {
  contactName: string;
  contactEmail: string;
  eventTitle: string;
  eventDate: string; // human-readable, e.g. "Thursday 10 April 2025"
  eventTime: string; // e.g. "6:30 PM"
  eventVenue: string;
  rsvpId?: string;
  plusOnes?: number;
}

export interface EventWelcomeDetails {
  contactName: string;
  contactEmail: string;
  whatsappUrl?: string;
  telegramUrl?: string;
  communityUrl?: string;
}

export interface PostEventFollowUpDetails {
  contactName: string;
  contactEmail: string;
  eventTitle: string;
  eventDate: string;
  templateKey: string; // maps to FOLLOWUP_SEQUENCES steps
  subject: string;
  // template-specific extras
  attendanceCount?: number;    // how many times they've attended (returning)
  videoUrl?: string;           // speaker recording
  linkedInDraft?: string;      // speaker repurpose
  nextEventTitle?: string;
  nextEventDate?: string;
  nextEventRsvpUrl?: string;
  rsvpCount?: number;          // sponsor metrics
  actualAttendance?: number;
  percentNew?: number;
  surveyUrl?: string;
  resourceLinks?: Array<{ label: string; url: string }>;
}

export interface SpeakerConfirmationDetails {
  speakerName: string;
  speakerEmail: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  talkTitle: string;
  talkDurationMins: number;
  briefingUrl?: string;
  organizerEmail: string;
}

export interface SponsorOnboardingDetails {
  sponsorName: string;
  sponsorEmail: string;
  companyName: string;
  eventTitle: string;
  eventDate: string;
  packageName: string;
  deliverables: string[];
  contactPersonName: string;
  contactPersonEmail: string;
  briefingUrl?: string;
}

// ---------------------------------------------------------------------------
// Transport (lazy singleton)
// ---------------------------------------------------------------------------

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      throw new Error(
        "Missing email config. Set GMAIL_USER and GMAIL_APP_PASSWORD."
      );
    }
    _transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return _transporter;
}

// ---------------------------------------------------------------------------
// Shared layout helpers
// ---------------------------------------------------------------------------

const PRIMARY = "#1a1a2e";
const ACCENT = "#e94560";
const LIGHT_BG = "#f5f5f5";

function layout(title: string, body: string): string {
  const fromName =
    process.env.EMAIL_FROM_NAME ?? "Entrepreneurs of Asia";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; line-height:1.6; color:#2c3e50; background:${LIGHT_BG}; }
    .wrap { max-width:680px; margin:32px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.08); }
    .header { background:${PRIMARY}; padding:40px 32px; text-align:center; color:#fff; }
    .header h1 { font-size:22px; letter-spacing:.5px; margin-top:16px; }
    .logo-badge { display:inline-block; background:${ACCENT}; color:#fff; font-weight:700; font-size:20px; padding:10px 20px; border-radius:8px; letter-spacing:1px; }
    .body { padding:36px 32px; }
    .body p { margin-bottom:14px; font-size:15px; color:#333; }
    .detail-box { background:${LIGHT_BG}; border-left:4px solid ${ACCENT}; border-radius:6px; padding:16px 20px; margin:20px 0; }
    .detail-box p { margin-bottom:6px; }
    .detail-box strong { color:${PRIMARY}; }
    .btn { display:inline-block; background:${ACCENT}; color:#fff !important; text-decoration:none; padding:12px 28px; border-radius:6px; font-weight:600; font-size:15px; margin:16px 0; }
    .divider { border:none; border-top:1px solid #eee; margin:24px 0; }
    .footer { background:${LIGHT_BG}; padding:24px 32px; text-align:center; font-size:12px; color:#888; }
    .footer a { color:${ACCENT}; text-decoration:none; }
    ul.deliverables { padding-left:20px; margin:8px 0; }
    ul.deliverables li { margin-bottom:6px; font-size:15px; color:#333; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="logo-badge">EOA</div>
      <h1>${title}</h1>
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      <p>${fromName} &bull; Chiang Mai, Thailand</p>
      <p>Questions? Reply to this email or reach us at <a href="mailto:${process.env.GMAIL_USER ?? "hello@eoa.community"}">hello@eoa.community</a></p>
    </div>
  </div>
</body>
</html>`;
}

function btn(label: string, url: string): string {
  return `<p><a class="btn" href="${url}">${label}</a></p>`;
}

// ---------------------------------------------------------------------------
// EmailService
// ---------------------------------------------------------------------------

export class EmailService {
  private from = `${process.env.EMAIL_FROM_NAME ?? "Entrepreneurs of Asia"} <${process.env.GMAIL_USER}>`;

  async testConnection(): Promise<boolean> {
    try {
      await getTransporter().verify();
      return true;
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // RSVP Confirmation
  // -------------------------------------------------------------------------
  async sendRsvpConfirmation(d: RsvpConfirmationDetails): Promise<boolean> {
    const subject = `You're on the list — ${d.eventTitle}`;
    const plusOneNote =
      d.plusOnes && d.plusOnes > 0
        ? `<p>You've also reserved <strong>${d.plusOnes} guest spot${d.plusOnes > 1 ? "s" : ""}</strong>.</p>`
        : "";

    const body = `
      <p>Hi ${d.contactName},</p>
      <p>You're confirmed for <strong>${d.eventTitle}</strong>. We'll see you there!</p>
      <div class="detail-box">
        <p><strong>Date:</strong> ${d.eventDate}</p>
        <p><strong>Time:</strong> ${d.eventTime}</p>
        <p><strong>Venue:</strong> ${d.eventVenue}</p>
        ${d.rsvpId ? `<p><strong>RSVP ref:</strong> ${d.rsvpId}</p>` : ""}
      </div>
      ${plusOneNote}
      <p>Arrive a few minutes early — we start on time and seats fill up fast.</p>
      <hr class="divider">
      <p>Not able to make it? Please let us know so we can offer your spot to someone on the waitlist.</p>
    `;

    return this._send(d.contactEmail, subject, layout(subject, body));
  }

  // -------------------------------------------------------------------------
  // Event Welcome (new community member)
  // -------------------------------------------------------------------------
  async sendEventWelcome(d: EventWelcomeDetails): Promise<boolean> {
    const subject = "Welcome to Entrepreneurs of Asia";
    const links: string[] = [];
    if (d.whatsappUrl)
      links.push(`<li><a href="${d.whatsappUrl}">WhatsApp Community</a></li>`);
    if (d.telegramUrl)
      links.push(`<li><a href="${d.telegramUrl}">Telegram Group</a></li>`);
    const linkList =
      links.length > 0
        ? `<ul style="padding-left:20px;margin:10px 0;">${links.join("")}</ul>`
        : "";

    const body = `
      <p>Hi ${d.contactName},</p>
      <p>Welcome to the <strong>Entrepreneurs of Asia</strong> community — Chiang Mai's home for founders, builders, and digital nomads.</p>
      <p>Here's where to go next:</p>
      ${linkList}
      ${d.communityUrl ? btn("Visit the EOA Community Hub", d.communityUrl) : ""}
      <hr class="divider">
      <p>Our events run weekly. Watch your inbox for RSVP links and keep an eye on the community channels for updates.</p>
      <p>Looking forward to seeing you at the next one,</p>
      <p><strong>The EOA Team</strong></p>
    `;

    return this._send(d.contactEmail, subject, layout(subject, body));
  }

  // -------------------------------------------------------------------------
  // Post-event follow-up (generic dispatcher)
  // Caller selects templateKey matching FOLLOWUP_SEQUENCES; extras are optional.
  // -------------------------------------------------------------------------
  async sendPostEventFollowUp(d: PostEventFollowUpDetails): Promise<boolean> {
    const { html, subject } = this._buildFollowUpTemplate(d);
    return this._send(d.contactEmail, subject, html);
  }

  private _buildFollowUpTemplate(d: PostEventFollowUpDetails): {
    html: string;
    subject: string;
  } {
    const subject = d.subject;

    switch (d.templateKey) {
      // -- New attendee --
      case "new_attendee_thankyou":
        return {
          subject,
          html: layout(
            subject,
            `<p>Hi ${d.contactName},</p>
            <p>It was great meeting you at <strong>${d.eventTitle}</strong> last night. We hope you made some great connections!</p>
            <p>As a next step, join our community channels:</p>
            <ul style="padding-left:20px;margin:10px 0;">
              <li>WhatsApp — stay connected between events</li>
              <li>Telegram — announcements and resources</li>
            </ul>
            <p>See you at the next one,<br><strong>The EOA Team</strong></p>`
          ),
        };

      case "new_attendee_feedback_survey":
        return {
          subject,
          html: layout(
            subject,
            `<p>Hi ${d.contactName},</p>
            <p>We'd love to know what you thought of <strong>${d.eventTitle}</strong>. It only takes 60 seconds.</p>
            ${d.surveyUrl ? btn("Share Your Feedback", d.surveyUrl) : "<p>Reply to this email with your thoughts — we read every response.</p>"}
            <p>Thanks for being part of EOA,<br><strong>The EOA Team</strong></p>`
          ),
        };

      case "new_attendee_resource_pack":
        return {
          subject,
          html: layout(
            subject,
            `<p>Hi ${d.contactName},</p>
            <p>Here are the resources mentioned at <strong>${d.eventTitle}</strong>:</p>
            ${
              d.resourceLinks && d.resourceLinks.length > 0
                ? `<ul class="deliverables">${d.resourceLinks.map((l) => `<li><a href="${l.url}">${l.label}</a></li>`).join("")}</ul>`
                : "<p>We'll add links here as they become available.</p>"
            }
            <hr class="divider">
            <p>Keep building,<br><strong>The EOA Team</strong></p>`
          ),
        };

      case "new_attendee_next_event_invite":
        return {
          subject,
          html: layout(
            subject,
            `<p>Hi ${d.contactName},</p>
            <p>You're on the early-access list for our next event${d.nextEventTitle ? ` — <strong>${d.nextEventTitle}</strong>` : ""}.</p>
            ${d.nextEventDate ? `<div class="detail-box"><p><strong>Date:</strong> ${d.nextEventDate}</p></div>` : ""}
            ${d.nextEventRsvpUrl ? btn("Reserve Your Spot", d.nextEventRsvpUrl) : ""}
            <p>Capacity is limited — grab your spot before it fills up.</p>
            <p>See you there,<br><strong>The EOA Team</strong></p>`
          ),
        };

      // -- Returning attendee --
      case "returning_attendee_thankyou":
        return {
          subject,
          html: layout(
            subject,
            `<p>Hi ${d.contactName},</p>
            <p>Always great to see you at EOA${d.attendanceCount ? ` — that's your <strong>${ordinal(d.attendanceCount)} event</strong> with us` : ""}.</p>
            <p>The community keeps growing because of regulars like you. Thank you for showing up and contributing to the energy.</p>
            <p>See you next week,<br><strong>The EOA Team</strong></p>`
          ),
        };

      case "returning_attendee_feedback_survey":
        return {
          subject,
          html: layout(
            subject,
            `<p>Hi ${d.contactName},</p>
            <p>Two quick questions about last night — your feedback shapes the next event.</p>
            ${d.surveyUrl ? btn("Answer 2 Questions", d.surveyUrl) : "<p>Hit reply and let us know what you thought.</p>"}
            <p>Thanks,<br><strong>The EOA Team</strong></p>`
          ),
        };

      case "returning_attendee_next_event":
        return {
          subject,
          html: layout(
            subject,
            `<p>Hi ${d.contactName},</p>
            <p>Next Thursday is coming up fast${d.nextEventTitle ? ` — <strong>${d.nextEventTitle}</strong>` : ""}.</p>
            <p>Know someone who would get value from EOA? Bring them along — great conversations start with great people in the room.</p>
            ${d.nextEventRsvpUrl ? btn("RSVP for Next Thursday", d.nextEventRsvpUrl) : ""}
            <p>See you there,<br><strong>The EOA Team</strong></p>`
          ),
        };

      case "returning_attendee_digest_optin":
        return {
          subject,
          html: layout(
            subject,
            `<p>Hi ${d.contactName},</p>
            <p>We're launching a monthly EOA digest — curated insights, speaker highlights, and community news, delivered once a month.</p>
            <p>Want in? Just reply <strong>"Yes, add me"</strong> to this email and we'll add you to the list.</p>
            <p>No spam — one email a month, unsubscribe any time.</p>
            <p>Cheers,<br><strong>The EOA Team</strong></p>`
          ),
        };

      // -- Speaker --
      case "speaker_thankyou":
        return {
          subject,
          html: layout(
            subject,
            `<p>Hi ${d.contactName},</p>
            <p>Your talk at <strong>${d.eventTitle}</strong> was brilliant — thank you for sharing your expertise with the room.</p>
            ${d.videoUrl ? `<p>Here's your recording: <a href="${d.videoUrl}">Watch / Download</a></p>` : "<p>Your recording will be ready within 48 hours — we'll send it over as soon as it's processed.</p>"}
            <p>We'd love to have you back. Keep an eye out from us about future events.</p>
            <p>With gratitude,<br><strong>The EOA Team</strong></p>`
          ),
        };

      case "speaker_linkedin_repurpose":
        return {
          subject,
          html: layout(
            subject,
            `<p>Hi ${d.contactName},</p>
            <p>Here's a pre-written LinkedIn post based on your talk — feel free to edit it and make it your own:</p>
            <div class="detail-box">
              ${d.linkedInDraft ? `<p style="white-space:pre-wrap;">${d.linkedInDraft}</p>` : "<p><em>Draft coming soon — our team is putting it together based on your talk.</em></p>"}
            </div>
            <p>If you tag <strong>Entrepreneurs of Asia</strong> we'll reshare it to our network.</p>
            <p>Thanks again,<br><strong>The EOA Team</strong></p>`
          ),
        };

      case "speaker_testimonial_request":
        return {
          subject,
          html: layout(
            subject,
            `<p>Hi ${d.contactName},</p>
            <p>Would you be open to leaving a quick testimonial about your experience speaking at EOA?</p>
            <p>It takes under two minutes and helps us bring in more great speakers and community members.</p>
            ${d.surveyUrl ? btn("Leave a Testimonial", d.surveyUrl) : "<p>Just reply to this email with a sentence or two — we'll take care of the rest.</p>"}
            <p>Thank you,<br><strong>The EOA Team</strong></p>`
          ),
        };

      // -- Sponsor --
      case "sponsor_thankyou_metrics":
        return {
          subject,
          html: layout(
            subject,
            `<p>Hi ${d.contactName},</p>
            <p>Thank you for sponsoring <strong>${d.eventTitle}</strong>. Here's a quick snapshot of last night:</p>
            <div class="detail-box">
              ${d.rsvpCount !== undefined ? `<p><strong>RSVPs:</strong> ${d.rsvpCount}</p>` : ""}
              ${d.actualAttendance !== undefined ? `<p><strong>Actual attendance:</strong> ${d.actualAttendance}</p>` : ""}
              ${d.percentNew !== undefined ? `<p><strong>New attendees:</strong> ${d.percentNew}%</p>` : ""}
            </div>
            <p>A full recap with photos and deliverable confirmation is coming within 24 hours.</p>
            <p>Thank you for supporting the community,<br><strong>The EOA Team</strong></p>`
          ),
        };

      case "sponsor_recap_pdf":
        return {
          subject,
          html: layout(
            subject,
            `<p>Hi ${d.contactName},</p>
            <p>Attached is the full event recap for <strong>${d.eventTitle}</strong>, including audience breakdown, content deliverables, and photos.</p>
            <p>If you have any questions about the data or need additional assets, just reply to this email.</p>
            <p>Thank you again for your support,<br><strong>The EOA Team</strong></p>`
          ),
        };

      case "sponsor_deliverables_check":
        return {
          subject,
          html: layout(
            subject,
            `<p>Hi ${d.contactName},</p>
            <p>We want to make sure all your agreed deliverables from <strong>${d.eventTitle}</strong> were fulfilled — logo placement, social shoutouts, on-stage mentions, etc.</p>
            <p>Is there anything you felt was missed or could be improved for next time?</p>
            <p>Your feedback helps us serve our sponsors better.</p>
            <p>Thanks,<br><strong>The EOA Team</strong></p>`
          ),
        };

      default:
        // Fallback generic template
        return {
          subject,
          html: layout(
            subject,
            `<p>Hi ${d.contactName},</p>
            <p>Thanks for being part of <strong>${d.eventTitle}</strong>.</p>
            <p>See you at the next one,<br><strong>The EOA Team</strong></p>`
          ),
        };
    }
  }

  // -------------------------------------------------------------------------
  // Speaker Confirmation
  // -------------------------------------------------------------------------
  async sendSpeakerConfirmation(d: SpeakerConfirmationDetails): Promise<boolean> {
    const subject = `You're confirmed to speak at ${d.eventTitle}`;

    const body = `
      <p>Hi ${d.speakerName},</p>
      <p>We're delighted to confirm your speaking slot at <strong>${d.eventTitle}</strong>.</p>
      <div class="detail-box">
        <p><strong>Date:</strong> ${d.eventDate}</p>
        <p><strong>Time:</strong> ${d.eventTime}</p>
        <p><strong>Venue:</strong> ${d.eventVenue}</p>
        <p><strong>Talk:</strong> ${d.talkTitle}</p>
        <p><strong>Duration:</strong> ${d.talkDurationMins} minutes</p>
      </div>
      ${d.briefingUrl ? btn("Read the Speaker Briefing", d.briefingUrl) : ""}
      <p>If you have slides or any materials you'd like us to display, please send them to <a href="mailto:${d.organizerEmail}">${d.organizerEmail}</a> at least 24 hours before the event.</p>
      <p>We'll have AV set up and ready for you — plan to arrive 30 minutes early for a quick tech check.</p>
      <hr class="divider">
      <p>Questions? Reply to this email or reach your organizer directly at <a href="mailto:${d.organizerEmail}">${d.organizerEmail}</a>.</p>
      <p>Looking forward to your talk,<br><strong>The EOA Team</strong></p>
    `;

    return this._send(d.speakerEmail, subject, layout(subject, body));
  }

  // -------------------------------------------------------------------------
  // Sponsor Onboarding
  // -------------------------------------------------------------------------
  async sendSponsorOnboarding(d: SponsorOnboardingDetails): Promise<boolean> {
    const subject = `Welcome aboard — ${d.packageName} sponsorship for ${d.eventTitle}`;

    const deliverableList = d.deliverables
      .map((item) => `<li>${item}</li>`)
      .join("");

    const body = `
      <p>Hi ${d.sponsorName},</p>
      <p>Thank you for partnering with <strong>Entrepreneurs of Asia</strong> as a <strong>${d.packageName}</strong> sponsor. We're excited to have <strong>${d.companyName}</strong> involved in <strong>${d.eventTitle}</strong>.</p>
      <div class="detail-box">
        <p><strong>Event date:</strong> ${d.eventDate}</p>
        <p><strong>Package:</strong> ${d.packageName}</p>
      </div>
      <p><strong>Your deliverables include:</strong></p>
      <ul class="deliverables">${deliverableList}</ul>
      ${d.briefingUrl ? btn("Download Sponsorship Briefing", d.briefingUrl) : ""}
      <hr class="divider">
      <p>Your point of contact is <strong>${d.contactPersonName}</strong> — reach them any time at <a href="mailto:${d.contactPersonEmail}">${d.contactPersonEmail}</a>.</p>
      <p>We look forward to a great event together,<br><strong>The EOA Team</strong></p>
    `;

    return this._send(d.sponsorEmail, subject, layout(subject, body));
  }

  // -------------------------------------------------------------------------
  // Internal helper
  // -------------------------------------------------------------------------
  private async _send(
    to: string,
    subject: string,
    html: string
  ): Promise<boolean> {
    try {
      await getTransporter().sendMail({ from: this.from, to, subject, html });
      console.log(`[email] sent "${subject}" → ${to}`);
      return true;
    } catch (err) {
      console.error(`[email] failed to send "${subject}" → ${to}:`, err);
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

let _emailService: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!_emailService) _emailService = new EmailService();
  return _emailService;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
