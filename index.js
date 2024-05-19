const express = require("express");
const body_parser = require("body-parser");
const axios = require("axios");
require('dotenv').config();

const app = express().use(body_parser.json());

const token = process.env.TOKEN;
const mytoken = process.env.MYTOKEN; // prasath_token
let specificWord = ''; // Variable to store the specific word

app.listen(process.env.PORT, () => {
    console.log("webhook is listening");
});

// Endpoint to receive specific word input
app.post("/set-word", (req, res) => {
    specificWord = req.body.word;
    console.log(`Specific word set to: ${specificWord}`);
    res.status(200).send(`Specific word set to: ${specificWord}`);
});

// to verify the callback url from dashboard side - cloud api side
app.get("/webhook", (req, res) => {
    let mode = req.query["hub.mode"];
    let challenge = req.query["hub.challenge"];
    let token = req.query["hub.verify_token"];

    if (mode && token) {
        if (mode === "subscribe" && token === mytoken) {
            res.status(200).send(challenge);
        } else {
            res.status(403).send('Forbidden');
        }
    }
});

app.post("/webhook", (req, res) => {
    let body_param = req.body;

    console.log(JSON.stringify(body_param, null, 2));

    if (body_param.object) {
        if (body_param.entry && 
            body_param.entry[0].changes && 
            body_param.entry[0].changes[0].value.messages && 
            body_param.entry[0].changes[0].value.messages[0]) {
            
            let phon_no_id = body_param.entry[0].changes[0].value.metadata.phone_number_id;
            let from = body_param.entry[0].changes[0].value.messages[0].from;
            let msg_body = body_param.entry[0].changes[0].value.messages[0].text.body;

            console.log("phone number " + phon_no_id);
            console.log("from " + from);
            console.log("body param " + msg_body);

            // Check for the specific word
            if (specificWord && msg_body.includes(specificWord)) {
                // Notify you that the specific word has been found
                notifyYou(from, specificWord);
            }

            axios({
                method: "POST",
                url: `https://graph.facebook.com/v13.0/${phon_no_id}/messages?access_token=${token}`,
                data: {
                    messaging_product: "whatsapp",
                    to: from,
                    text: {
                        body: `Hi.. I'm Nachum, your message is ${msg_body}`
                    }
                },
                headers: {
                    "Content-Type": "application/json"
                }
            });

            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    }
});

// Function to notify you that the specific word has been found
const notifyYou = async (from, word) => {
    const notificationMessage = `The word "${word}" was found in a message.`;
    try {
        await axios.post('YOUR_NOTIFICATION_ENDPOINT', {  // Replace with your actual notification endpoint
            message: notificationMessage,
            from: from
        }, {
            headers: {
                "Content-Type": "application/json"
            }
        });
        console.log('Notification sent.');
    } catch (error) {
        console.error('Error sending notification:', error);
    }
};

app.get("/", (req, res) => {
    res.status(200).send("Hello, this is webhook setup");
});
