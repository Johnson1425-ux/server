import nodemailer from 'nodemailer';
import logger from './logger.js';

const sendEmail = async (options) => {
  try {
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      }
    });

    const message = {
      from: `${process.env.FROM_NAME || 'Hospital Management System'} <${process.env.FROM_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      html: options.html || options.message,
    };

    const info = await transporter.sendMail(message);
    
    logger.info(`Email sent successfully to ${options.email}. Message ID: ${info.messageId}`);
    return info;
    
  } catch (error) {
    logger.error('Email sending error:', {
      error: error.message,
      recipient: options.email,
      subject: options.subject
    });
    throw error;
  }
};

export default sendEmail;