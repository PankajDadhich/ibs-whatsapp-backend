/**
 * @author      Abdul Pathan
 * @date        Oct, 2024
 * @copyright   www.ibirdsservices.com  
 */

const e = require("express");
const moment = require("moment");
const { fetchUser } = require("../middleware/fetchuser.js");
const Razorpay = require("razorpay");

module.exports = app => {
    const { body, validationResult } = require('express-validator');
    var router = require("express").Router();

    router.post("/online_payment", fetchUser, async (req, res) => {
        try {
            if (!req.body.amount || isNaN(req.body.amount)) {
                return res.status(400).json({ success: false, message: "Invalid amount" });
            }

            const instance = new Razorpay({
                key_id: "rzp_test_dgYSDQuilJnxen",
                key_secret: "9chLmlIYdBxmrQqqqJDjByUi",
            });

            const options = {
                amount: parseInt(req.body.amount * 100), // Razorpay works in paise (1 INR = 100 paise)
                currency: "INR",
                receipt: "order_rcptid_"+ moment().format('YYYYMMDD_HHmmssSSS'),
            };

            // Create an order using Razorpay's instance
            instance.orders.create(options, (err, order) => {
                if (err) {
                    console.error("Error creating Razorpay order:", err);
                    return res.status(500).json({ success: false, message: "Error creating Razorpay order", error: err, });
                }
                // Successfully created the order
                res.status(200).json({ success: true, records: order, });
            });

        } catch (err) {
            console.error("Error in Razorpay order creation:", err);
            res.status(500).json({ success: false, message: "Server error occurred during Razorpay order creation", error: err.message, });
        }
    });


    app.use(process.env.BASE_API_URL + '/api/whatsapp', router);
};
