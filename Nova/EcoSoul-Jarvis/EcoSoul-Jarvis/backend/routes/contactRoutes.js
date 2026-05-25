const express = require("express");
const router = express.Router();
const transporter = require("../utils/mailer");

// POST: Send contact message
router.post("/send", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validate inputs
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and message",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Send email to admin
    const adminEmail = process.env.EMAIL_USER;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: `New Contact Message from ${name}`,
      html: `
        <h2>New Contact Message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br>")}</p>
        <hr>
        <p style="color: #888; font-size: 12px;">This is an automated message from SocialCart contact form</p>
      `,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    // Send confirmation to user
    const userConfirmation = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "We received your message - SocialCart",
      html: `
        <h2>Thank you for reaching out!</h2>
        <p>Dear ${name},</p>
        <p>We have received your message and appreciate you contacting us. Our team will review your message and get back to you as soon as possible.</p>
        <p>If you have any urgent queries, please feel free to call us at:</p>
        <ul>
          <li>+91 67456 97890</li>
          <li>+91 80456 37891</li>
        </ul>
        <p>Best regards,<br>SocialCart Team</p>
      `,
    };

    await transporter.sendMail(userConfirmation);

    return res.status(200).json({
      success: true,
      message:
        "Your message has been sent successfully. We will get back to you soon!",
    });
  } catch (error) {
    console.error("Contact form error:", error);
    return res.status(500).json({
      success: false,
      message: "Error sending message. Please try again later.",
    });
  }
});

module.exports = router;
