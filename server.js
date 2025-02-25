require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Load environment variables
const { MERCHANT_ID, SECURE_HASH, STORE_ID, BASE_URL, RETURN_URL, PORT = 5005 } = process.env;

// Generate Secure Hash
const generateHash = (data) => 
    crypto.createHmac('sha256', SECURE_HASH).update(data).digest('hex').toUpperCase();

// Bank Alfalah Payment Request
app.post('/bankalfalah/pay', async (req, res) => {
    const { amount, orderId } = req.body;
    if (!amount || !orderId) return res.status(400).json({ success: false, message: 'Missing fields' });

    try {
        const hashString = `${MERCHANT_ID}|${STORE_ID}|${orderId}|${amount}|PKR|${RETURN_URL}`;
        const secureHash = generateHash(hashString);
        const paymentData = { merchantId: MERCHANT_ID, storeId: STORE_ID, orderId, amount, currency: 'PKR', returnUrl: RETURN_URL, secureHash };

        const response = await axios.post(`${BASE_URL}/pg/paymentRequest`, paymentData, { headers: { 'Content-Type': 'application/json' } });

        if (response.data?.paymentUrl) {
            res.json({ success: true, paymentUrl: response.data.paymentUrl });
        } else {
            res.status(400).json({ success: false, message: 'Failed to generate payment link' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Payment Verification
app.post('/bankalfalah/verify', async (req, res) => {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'Missing orderId' });

    try {
        const verifyHashString = `${MERCHANT_ID}|${STORE_ID}|${orderId}`;
        const secureHash = generateHash(verifyHashString);

        const verifyData = { merchantId: MERCHANT_ID, storeId: STORE_ID, orderId, secureHash };
        const response = await axios.post(`${BASE_URL}/pg/paymentStatus`, verifyData, { headers: { 'Content-Type': 'application/json' } });

        res.json(response.data);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
