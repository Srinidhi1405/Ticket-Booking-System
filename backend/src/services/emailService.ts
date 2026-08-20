import * as QRCode from 'qrcode';
import nodemailer from 'nodemailer';
import { getTransporter } from '../config/email';

export async function sendTicketEmail(
  toEmail: string,
  userName: string,
  bookingRef: string,
  eventTitle: string,
  dateStr: string,
  timeStr: string,
  seats: string[]
) {
  try {
    // Generate QR Code as Base64 Data URL
    const qrDataUrl = await QRCode.toDataURL(bookingRef);

    // Get nodemailer transporter
    const transporter = getTransporter();
    if (!transporter) {
      console.log(`[MOCK EMAIL] To: ${toEmail}`);
      console.log(`Subject: Ticket Confirmation for ${eventTitle}`);
      console.log(`Body: Hello ${userName}, your seats ${seats.join(', ')} are booked. Ref: ${bookingRef}`);
      return;
    }

    // Embed the QR Code as a CID attachment
    const mailOptions = {
      from: '"Ticketify Support" <support@ticketify.com>',
      to: toEmail,
      subject: `🎉 Ticket Confirmed - ${eventTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #4F46E5; text-align: center;">Ticketify Booking Confirmation</h2>
          <p>Hi ${userName},</p>
          <p>Your booking for <strong>${eventTitle}</strong> has been confirmed!</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <h3>Event Details</h3>
          <p>📅 <strong>Date:</strong> ${dateStr}</p>
          <p>⏰ <strong>Time:</strong> ${timeStr}</p>
          <p>💺 <strong>Seats:</strong> ${seats.join(', ')}</p>
          <p>🔑 <strong>Booking Reference:</strong> ${bookingRef}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <div style="text-align: center; margin: 20px 0;">
            <p style="margin-bottom: 10px; font-weight: bold;">Scan your QR code at the entrance:</p>
            <img src="cid:qrcode" alt="Booking QR Code" style="border: 1px solid #ddd; padding: 10px; border-radius: 5px; width: 200px; height: 200px;" />
          </div>
          <p style="color: #666; font-size: 12px; text-align: center;">Thank you for booking with Ticketify!</p>
        </div>
      `,
      attachments: [
        {
          filename: 'qrcode.png',
          path: qrDataUrl,
          cid: 'qrcode', // same as in src inline
        },
      ],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Ticket email sent to ${toEmail}. Message ID: ${info.messageId}`);
    
    // If it's an Ethereal email, log the URL where we can see the email
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`✉️ [Ethereal Preview URL]: ${previewUrl}`);
    }
  } catch (error) {
    console.error('Error sending ticket email:', error);
  }
}

export async function sendWaitlistOfferEmail(
  toEmail: string,
  userName: string,
  eventTitle: string,
  category: string,
  checkoutUrl: string,
  expiryMinutes: number
) {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      console.log(`[MOCK EMAIL] To: ${toEmail}`);
      console.log(`Subject: Waitlist Seat Available for ${eventTitle}`);
      console.log(`Body: Hello ${userName}, a seat in ${category} is available. Claim in ${expiryMinutes}m here: ${checkoutUrl}`);
      return;
    }

    const mailOptions = {
      from: '"Ticketify Alerts" <alerts@ticketify.com>',
      to: toEmail,
      subject: `⚡ Action Required: Waitlist Spot Available - ${eventTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #FAFAFA;">
          <h2 style="color: #EA580C; text-align: center;">Waitlist Seat Available!</h2>
          <p>Hi ${userName},</p>
          <p>Great news! A seat has become available for <strong>${eventTitle}</strong> in the <strong>${category}</strong> category.</p>
          <p>As you are next on the waitlist, this seat is reserved exclusively for you for a limited time.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${checkoutUrl}" style="background-color: #EA580C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Complete Booking Now
            </a>
          </div>
          <p style="color: #DC2626; font-weight: bold; text-align: center;">
            ⚠️ This offer expires in ${expiryMinutes} minutes. If you do not complete the booking, the seat will be offered to the next person in line.
          </p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #666; font-size: 12px; text-align: center;">Ticketify Automated Reallocation System</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Waitlist offer email sent to ${toEmail}. Message ID: ${info.messageId}`);
    
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`✉️ [Ethereal Preview URL]: ${previewUrl}`);
    }
  } catch (error) {
    console.error('Error sending waitlist email:', error);
  }
}
