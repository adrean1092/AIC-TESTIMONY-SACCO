const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // ⭐ FIXED: was EMAIL_PASS, now EMAIL_PASSWORD
  },
});

// Verify transporter configuration
transporter.verify(function (error, success) {
  if (error) {
    console.log("Email transporter error:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});

const sendGuarantorNotification = async (guarantorEmail, memberDetails) => {
  const { memberName, memberPhone, memberEmail, memberIdNumber } = memberDetails;
  
  const emailContent = `
Dear Guarantor,

You have been listed as a guarantor for a loan application by:

Member Name: ${memberName}
Phone Number: ${memberPhone}
Email Address: ${memberEmail}
ID Number: ${memberIdNumber}

To approve this loan application, please contact our Finance Director:

Finance Director: Emmy
Phone: 0727228097

Thank you for your support.

Best regards,
AIC TESTIMONY PASTORS SACCO
  `;

  try {
    const info = await transporter.sendMail({
      from: `"AIC TESTIMONY PASTORS SACCO" <${process.env.EMAIL_USER}>`,
      to: guarantorEmail,
      subject: "Loan Guarantor Notification - Action Required",
      text: emailContent,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #b91c1c; text-align: center;">AIC TESTIMONY PASTORS SACCO</h2>
          <h3 style="color: #333;">Loan Guarantor Notification</h3>
          
          <p>Dear Guarantor,</p>
          
          <p>You have been listed as a guarantor for a loan application by:</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Member Name:</strong> ${memberName}</p>
            <p style="margin: 5px 0;"><strong>Phone Number:</strong> ${memberPhone}</p>
            <p style="margin: 5px 0;"><strong>Email Address:</strong> ${memberEmail}</p>
            <p style="margin: 5px 0;"><strong>ID Number:</strong> ${memberIdNumber}</p>
          </div>
          
          <div style="background-color: #fef2f2; border-left: 4px solid #b91c1c; padding: 15px; margin: 20px 0;">
            <h4 style="color: #b91c1c; margin-top: 0;">Action Required</h4>
            <p>To approve this loan application, please contact our Finance Director:</p>
            <p style="margin: 5px 0;"><strong>Finance Director:</strong> Emmy</p>
            <p style="margin: 5px 0;"><strong>Phone:</strong> <a href="tel:0727228097" style="color: #b91c1c;">0727228097</a></p>
          </div>
          
          <p>Thank you for your support.</p>
          
          <p style="margin-top: 30px;">Best regards,<br>
          <strong>AIC TESTIMONY PASTORS SACCO</strong></p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="font-size: 12px; color: #666; text-align: center;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `,
    });

    console.log("✓ Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("✗ Error sending email:", error);
    throw error;
  }
};

module.exports = { sendGuarantorNotification };