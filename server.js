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
const MERCHANT_ID = process.env.MERCHANT_ID;
const SECURE_HASH = process.env.SECURE_HASH;
const STORE_ID = process.env.STORE_ID;
const BASE_URL = process.env.BASE_URL;
const RETURN_URL = process.env.RETURN_URL;
console.log('🔵 ENV:', { MERCHANT_ID, STORE_ID, BASE_URL, RETURN_URL });


// Function to generate secure hash
const generateHash = (data) => {
    return crypto.createHmac('sha256', SECURE_HASH)
        .update(data)
        .digest('hex')
        .toUpperCase();
};

// Payment Request Endpoint
app.post('/bankalfalah/pay', async (req, res) => {
    const { amount, orderId } = req.body;

    console.log('🔵 Payment request received:', { amount, orderId });

    try {
        if (!amount || !orderId) {
            console.log('🛑 Missing amount or orderId');
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Generate secure hash
        const hashString = `${MERCHANT_ID}|${STORE_ID}|${orderId}|${amount}|PKR|${RETURN_URL}`;
        const secureHash = generateHash(hashString);
        console.log('🟢 Generated Secure Hash:', secureHash);

        // Payment request payload
        const paymentData = {
            merchantId: MERCHANT_ID,
            storeId: STORE_ID,
            orderId: orderId,
            amount: amount.toFixed(2), // Convert to string with two decimals
            currency: 'PKR',
            returnUrl: RETURN_URL,
            secureHash: secureHash,
        };

        console.log('📤 Sending payment request to Bank Alfalah:', paymentData);

        // Send request to Bank Alfalah
        const response = await axios.post(`${BASE_URL}/pg/paymentRequest`, paymentData, {
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('✅ Response from Bank Alfalah:', response.data);

        if (response.data && response.data.paymentUrl) {
            res.json({ success: true, paymentUrl: response.data.paymentUrl });
        } else {
            console.log('🛑 Error: No payment URL received');
            res.status(400).json({ success: false, message: 'Failed to generate payment link' });
        }
    } catch (error) {
        console.error('🔥 Payment Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Payment Verification Endpoint
app.post('/bankalfalah/verify', async (req, res) => {
    const { orderId } = req.body;

    console.log('🔵 Payment verification request received:', { orderId });

    try {
        if (!orderId) {
            console.log('🛑 Missing orderId');
            return res.status(400).json({ success: false, message: 'Missing orderId' });
        }

        // Generate secure hash for verification
        const verifyHashString = `${MERCHANT_ID}|${STORE_ID}|${orderId}`;
        const secureHash = generateHash(verifyHashString);
        console.log('🟢 Generated Secure Hash for Verification:', secureHash);

        const verifyData = {
            merchantId: MERCHANT_ID,
            storeId: STORE_ID,
            orderId: orderId,
            secureHash: secureHash,
        };

        console.log('📤 Sending verification request to Bank Alfalah:', verifyData);

        const response = await axios.post(`${BASE_URL}/pg/paymentStatus`, verifyData, {
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('✅ Verification Response:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('🔥 Verification Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Start the server
const PORT = process.env.PORT || 5005;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
