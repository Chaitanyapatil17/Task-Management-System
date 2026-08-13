const dotenv = require("dotenv");
dotenv.config();

console.log("EMAIL_HOST:", process.env.EMAIL_HOST);
console.log("EMAIL_PORT:", process.env.EMAIL_PORT);
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "loaded (" + process.env.EMAIL_PASS.length + " chars)" : "NOT LOADED");

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("\n❌ Connection failed:", error.message);
    console.error("Full error:", error);
  } else {
    console.log("\n✅ SMTP connection successful! Emails will work.");
  }
});
