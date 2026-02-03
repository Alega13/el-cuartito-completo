
const { Resend } = require('resend');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
    console.error('❌ RESEND_API_KEY missing in .env');
    process.exit(1);
}

console.log(`🔑 Using API Key: ${apiKey.substring(0, 5)}...`);

const resend = new Resend(apiKey);

async function sendTestEmail() {
    try {
        console.log('📧 Attempting to send test email...');
        const { data, error } = await resend.emails.send({
            from: 'El Cuartito Records <hola@elcuartito.dk>',
            to: ['alejogalli98@gmail.com'],
            subject: 'Test Email from Debugging Script',
            html: '<p>This is a test email to verify Resend configuration.</p>'
        });

        if (error) {
            console.error('❌ Resend API Error:', error);
        } else {
            console.log('✅ Email sent successfully:', data);
        }
    } catch (err) {
        console.error('❌ Unexpected Error:', err);
    }
}

sendTestEmail();
