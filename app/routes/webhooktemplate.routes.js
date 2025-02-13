/**
 * @author      Abdul Pathan
 * @date        Sep, 2024
 * @copyright   www.ibirdsservices.com
 */

const e = require("express");
const wh_Setting = require("../models/whatsappsetting.model.js");
const { fetchUser } = require("../middleware/fetchuser.js");
const webTemplateModel = require("../models/webhooktemplate.model.js");
const FormData = require('form-data');
const fetch = require('node-fetch');
const { Blob } = require('buffer'); // Import Blob if you're using a Node version that supports it
const sendbulkmsg = require("../models/sendbulkmessage.model.js");
const msgTemplate = require("../models/messagetemplate.model.js");
const msgHistory = require("../models/messagehistory.model.js");
const campaignModel = require("../models/campaign.model.js")
const moment = require("moment-timezone");

module.exports = app => {
    const { body, validationResult } = require('express-validator');
    var router = require("express").Router();

    router.get('/alltemplate:?', fetchUser, async (req, res) => {

        const { whatsapp_setting_number } = req.query;
        webTemplateModel.init(req.userinfo.tenantcode);
        try {
            const tempResult = await webTemplateModel.getAllTemplate(whatsapp_setting_number);
            if (tempResult) {
                return res.status(200).json(tempResult);
            } else {
                return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }
    });

    router.get('/template', fetchUser, async (req, res) => {

        const { id, whatsapp_setting_number } = req.query;
        webTemplateModel.init(req.userinfo.tenantcode);
        try {
            const tempResult = await webTemplateModel.getTemplateById(id, whatsapp_setting_number);
            console.log("tempResult",tempResult);
            if (tempResult) {
                return res.status(200).json(tempResult);
            } else {
                return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }
    });

    router.get('/approved/template:?', fetchUser, async (req, res) => {
        wh_Setting.init(req.userinfo.tenantcode);
        webTemplateModel.init(req.userinfo.tenantcode);
        const { whatsapp_setting_number } = req.query;
        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }


        try {
            const tempResult = await webTemplateModel.getAllApprovedTemplate(whatsapp_setting_number);

            if (tempResult) {
                return res.status(200).json(tempResult);
            } else {
                return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }

    });

    router.delete("/template:?", fetchUser, async (req, res) => {
        webTemplateModel.init(req.userinfo.tenantcode);

        const { whatsapp_setting_number } = req.query;

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }

        const id = req.query.hsm_id;
        const name = req.query.name;

        try {
            const tempResult = await webTemplateModel.deleteTemplate(id, name, whatsapp_setting_number);

            if (tempResult) {
                return res.status(200).json(tempResult);
            } else {
                return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }
    });


    // send whatsapp template
    router.post('/message:?', fetchUser, async (req, res) => {
        webTemplateModel.init(req.userinfo.tenantcode);

        const reqBody = req.body;

        const { whatsapp_setting_number } = req.query;

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }



        try {
            const tempResult = await webTemplateModel.sendWhatsappTemplate(reqBody, whatsapp_setting_number);

            if (tempResult) {
                return res.status(200).json(tempResult);
            } else {
                return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }
    });


    router.post('/single/message:?', fetchUser, async (req, res) => {
        webTemplateModel.init(req.userinfo.tenantcode);

        const reqBody = req.body;
        const { whatsapp_setting_number } = req.query;

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }



        try {
            const tempResult = await webTemplateModel.singleMessageSend(reqBody, whatsapp_setting_number);
            if (tempResult) {
                return res.status(200).json(tempResult);
            } else {
                return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }
    });

    // changes 
    router.post('/:?', fetchUser, async (req, res) => {
        webTemplateModel.init(req.userinfo.tenantcode);
        const { whatsapp_setting_number } = req.query;

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }

        const fileData = req.files;


        try {
            if (fileData && fileData.files) {
                const { name, size, mimetype } = fileData.files;
                const tempResult = await webTemplateModel.uplodaedImage(name, size, mimetype, whatsapp_setting_number);
                if (tempResult) {
                    return res.status(200).json(tempResult);
                } else {
                    return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
                }
            } else {
                res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or file data' });
            }
        } catch (error) {
            console.error('Error during file upload:', error);
            res.status(500).json({ error: 'Internal Server Error', message: error.message });
        }
    });

    router.post('/uploadsessionid:?', fetchUser, async (req, res) => {
        webTemplateModel.init(req.userinfo.tenantcode);
        const { whatsapp_setting_number } = req.query;

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }

        const fileData = req.files;
        const { uploadSessionId } = req.body;



        if (!uploadSessionId || !fileData || !fileData.files || !fileData.files.data) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        try {
            if (fileData && fileData.files) {
                const { data, name, size, mimetype } = fileData.files;

                const tempResult = await webTemplateModel.uplodaedImageSession(uploadSessionId, data, whatsapp_setting_number);
                if (tempResult) {
                    return res.status(200).json(tempResult);
                } else {
                    return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
                }
            } else {
                res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or file data' });
            }
        } catch (error) {
            console.error('Error during file upload:', error);
            res.status(500).json({ error: 'Internal Server Error', message: error.message });
        }
    });


    // template create
    router.post('/template:?', fetchUser, async (req, res) => {
        webTemplateModel.init(req.userinfo.tenantcode);
        const { whatsapp_setting_number } = req.query;

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }

        const reqBody = req.body;


        try {
            const tempResult = await webTemplateModel.createTemplate(reqBody, whatsapp_setting_number);
            if (tempResult) {
                return res.status(200).json(tempResult);
            } else {
                return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }
    });

    router.post('/template/:id:?', fetchUser, async (req, res) => {
        webTemplateModel.init(req.userinfo.tenantcode);
        const { whatsapp_setting_number } = req.query;
        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }

        const reqBody = req.body;


        try {
            const tempResult = await webTemplateModel.updateTemplate(req.params.id, reqBody, whatsapp_setting_number);
            if (tempResult) {
                return res.status(200).json(tempResult);
            } else {
                return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }
    });

    router.post('/temp/auth:?', fetchUser, async (req, res) => {

        webTemplateModel.init(req.userinfo.tenantcode);
        const reqBody = req.body;
        const { whatsapp_setting_number } = req.query;

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }


        try {
            const tempResult = await webTemplateModel.upsertAuthTemplate(reqBody, whatsapp_setting_number);
            if (tempResult) {
                return res.status(200).json(tempResult);
            } else {
                return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
            }
        } catch (error) {
            console.error('Error during message sending:', error);
            return res.status(500).json({ error: error.message });
        }
    });


    router.get('/:?', fetchUser, async (req, res) => {
        wh_Setting.init(req.userinfo.tenantcode);
        const { whatsapp_setting_number } = req.query;

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }



        const result = await wh_Setting.getWhatsAppSettingData(whatsapp_setting_number);

        if (result) {
            const { access_token, end_point_url } = result;
            const endpoint = `${end_point_url}${req.query.name}`

            try {
                const response = await fetch(endpoint, {
                    method: 'GET', // Use GET to fetch settings
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `OAuth ${access_token}`,
                    },
                });

                // Check for response status
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to fetch data: ${response.statusText} - ${errorText}`);
                }

                const jsonData = await response.json();
                res.status(200).json(jsonData);

            } catch (error) {
                console.error('Error during API request:', error);
                res.status(500).json({ error: 'Internal Server Error', message: error.message });
            }

        } else {
            res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or file data' });
        }
    });


    // image,audio,video.. send 
    router.post('/documentId:?', fetchUser, async (req, res) => {

        wh_Setting.init(req.userinfo.tenantcode);
        const { whatsapp_setting_number } = req.query;

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }



        const result = await wh_Setting.getWhatsAppSettingData(whatsapp_setting_number);

        const fileData = req.files;
        const { messaging_product = 'whatsapp' } = req.body;

        if (result) {
            const { access_token, end_point_url, business_number_id } = result;

            const endpoint = `${end_point_url}${business_number_id}/media`

            try {
                if (fileData && fileData.file) {
                    const { data, name, mimetype } = fileData.file; // Destructure additional file properties if needed

                    const formData = new FormData();
                    formData.append('messaging_product', messaging_product);
                    formData.append('file', data, { filename: name, contentType: mimetype });

                    let response = await fetch(endpoint, {
                        method: 'POST',
                        mode: 'cors',
                        headers: {
                            // 'Content-Type': 'multipart/form-data',
                            'Access-Control-Allow-Origin': "*",
                            'Access-Control-Allow-Headers': "*",
                            'Authorization': `Bearer ${access_token}`,
                        },
                        body: formData,
                        redirect: 'follow'
                    });

                    // Check for response status
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`Failed to fetch data: ${response.statusText} - ${errorText}`);
                    }

                    const jsonData = await response.json();

                    res.status(200).json(jsonData);
                } else {
                    res.status(400).json({ error: 'Bad Request: Missing file data' });
                }

            } catch (error) {
                console.error('Error during API request:', error);
                res.status(500).json({ error: 'Internal Server Error', message: error.message });
            }

        } else {
            res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or file data' });
        }
    });


    async function fetchPdf(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch PDF from ${url}: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return new Blob([arrayBuffer], { type: 'application/pdf' });
    }


    router.post('/proxy:?', fetchUser, async (req, res) => {
        wh_Setting.init(req.userinfo.tenantcode);
        const { whatsapp_setting_number } = req.query;

        if (!whatsapp_setting_number) {
            return res.status(400).json({ error: 'Bad Request: Missing WhatsApp settings or data' });
        }



        const result = await wh_Setting.getWhatsAppSettingData(whatsapp_setting_number);
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const fileBlob = await fetchPdf(url);

        // Convert Blob to Buffer
        const buffer = Buffer.from(await fileBlob.arrayBuffer()); // Convert Blob to Buffer
        const fileName = url.split('/').pop().split('?')[0] || 'application.pdf';

        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        formData.append('file', buffer, { filename: fileName, contentType: 'application/pdf' }); // Use buffer directly
        formData.append('description', 'Header Image Template');

        const { access_token, end_point_url, business_number_id } = result;
        const endpointURL = `${end_point_url}${business_number_id}/media`;

        const response = await fetch(endpointURL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Authorization': `Bearer ${access_token}`,
            },
            body: formData,
            redirect: 'follow',
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to upload media: ${response.statusText} - ${errorText}`);
        }

        const jsonData = await response.json();
        res.status(200).json(jsonData.id);
    });

    router.post('/bulkcampaign', fetchUser, async (req, res) => {
        try {
            const { campaign_name, template_name, template_id, business_number, members } = req.body;
            const currentdate = moment.tz("Asia/Kolkata").format("YYYY-MM-DDTHH:mm:ss.SSSZ");

            // Validate request body
            if (!campaign_name || !template_name || !template_id || !business_number || !members || !Array.isArray(members)) {
                return res.status(400).json({ error: 'Missing required fields or incorrect data format' });
            }
        
            // Initialize models with tenant-specific configurations
            wh_Setting.init(req.userinfo.tenantcode);
            msgTemplate.init(req.userinfo.tenantcode);
            webTemplateModel.init(req.userinfo.tenantcode);
            msgHistory.init(req.userinfo.tenantcode);
            campaignModel.init(req.userinfo.tenantcode);
    
            // Fetch template data
            const templateData = await webTemplateModel.getTemplateByName(template_name, business_number);
            if (!templateData) {
                return res.status(404).json({ error: 'Template not found' });
            }
    
            const whatsappSettings = await wh_Setting.getWhatsAppSettingData(business_number);
            if (!whatsappSettings) {
                return res.status(500).json({ error: 'Failed to fetch WhatsApp settings' });
            }
    
            // Create Campaign Record
            const campaignData = {
                name: campaign_name,
                type: 'Web',
                status: 'In Progress',
                template_name,
                template_id,
                group_ids: {},
                business_number,
                startDate: currentdate,
            };
    
            const createdCampaign = await campaignModel.createRecord(campaignData, req.userinfo.id);
            if (!createdCampaign) {
                return res.status(500).json({ error: 'Failed to create campaign' });
            }
    
    
            res.status(200).json({ success: true, campaign_id: createdCampaign.id });
    
                setImmediate(async () => {
                const results = await Promise.allSettled(
                    members.map(async (member) => {
                        try {
                            // Create payload for the member
                            const payload = await createMessagePayload(member, templateData, req.userinfo.tenantcode, business_number);
                             
                            // Send message via WhatsApp API
                            const responseBody = await webTemplateModel.sendWhatsappTemplate(payload, business_number);
    
                            // Check if the response is accepted
                            const isAccepted = responseBody?.messages?.[0]?.message_status === 'accepted';
                            const messageId = responseBody?.messages?.[0]?.id;

                            // Create message history record
                            const newMessage = {
                                parent_id: createdCampaign.id, // Link to campaign
                                name: member?.Name || '',
                                message_template_id: templateData.id || null,
                                whatsapp_number: member.Number,
                                message: '',
                                status: isAccepted ? 'Success' : 'Failed',
                                recordtypename: 'campaign',
                                file_id: null,
                                is_read: true,
                                business_number: business_number,
                                message_id: messageId
                            };
    
                            await msgHistory.createMessageHistoryRecord(newMessage, req.userinfo.id);
    
                            if (!isAccepted) {
                                throw new Error(`Message not accepted for ${member.Number}`);
                            }
    
                            return { member: member.Number, status: "Success" };
                        } catch (error) {
                            console.error(`Error processing member ${member.Name}:`, error);
                            return { member: member.Number, status: "Failed", error: error.message };
                        }
                    })
                    
                );
                const updateCampaign = await campaignModel.updateById(createdCampaign.id, { id: createdCampaign.id, status: "Completed" }, req.userinfo.id);
                if (!updateCampaign) {
                    throw new Error('Failed to update campaign status');
                }
                console.log("Bulk message processing results:", results);
            });
    
        } catch (error) {
            console.error("Error processing campaign:", error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });

    router.post('/sendtemplate', fetchUser, async (req, res) => {
        try {
            const { members_name, template_name, template_id, business_number, members_number } = req.body;
            const currentdate = moment.tz("Asia/Kolkata").format("YYYY-MM-DDTHH:mm:ss.SSSZ");
    
            // Validate request body
            if (!members_name || !template_name || !template_id || !business_number || !members_number) {
                return res.status(400).json({ error: 'Missing required fields or incorrect data format' });
            }
    
            let member = {
                Name: members_name,
                Number: members_number
            };
    
            // Initialize models with tenant-specific configurations (only once)
            wh_Setting.init(req.userinfo.tenantcode);
            msgTemplate.init(req.userinfo.tenantcode);
            webTemplateModel.init(req.userinfo.tenantcode);
            msgHistory.init(req.userinfo.tenantcode);
    
            // Fetch template data
            const templateData = await webTemplateModel.getTemplateByName(template_name, business_number);
            if (!templateData) {
                return res.status(404).json({ error: 'Template not found' });
            }
    
            const whatsappSettings = await wh_Setting.getWhatsAppSettingData(business_number);
            if (!whatsappSettings) {
                return res.status(500).json({ error: 'Failed to fetch WhatsApp settings' });
            }
    
            // Create payload for the member
            const payload = await createMessagePayload(member, templateData, req.userinfo.tenantcode, business_number);
    
            // Send message via WhatsApp API
            const responseBody = await webTemplateModel.sendWhatsappTemplate(payload, business_number);
            // const messageId = responseBody?.messages[0]?.id;
            // const newMessage = {
            //     parent_id: null, // Link to campaign
            //     name: member?.Name || '',
            //     message_template_id: templateData.id || null,
            //     whatsapp_number: member.Number,
            //     message: '',
            //     status: 'Outgoing',
            //     recordtypename: '',
            //     file_id: null,
            //     is_read: true,
            //     business_number: business_number,
            //     message_id: messageId
            // };

            // await msgHistory.createMessageHistoryRecord(newMessage, req.userinfo.id);
            res.status(200).json({ success: true, responseBody });
    
        } catch (error) {
            console.error("Error processing campaign:", error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    });
    
    async function createMessagePayload(member, templateData, tenants, business_number) {
        const { name: templateName, language, components } = templateData.data[0];
        // const recipientId = member.Number;
        let recipientId = member.Number;
        if (recipientId.length === 10) {
            recipientId = `91${recipientId}`;
        }
    
        let documentId = null; // Only one document ID as per your request
    
        // Construct message payload
        let payload = {
            messaging_product: 'whatsapp',
            to: recipientId,
            type: "template",
            category: templateData.data[0].category,
            template: {
                name: templateName,
                language: {
                    code: language
                },
                components: []
            }
        };
    
        // Check for HEADER component (image/video/document)
        const headerComponent = components.find(component => component.type === "HEADER");
        if (headerComponent) {
            const headerData = { type: "header", parameters: [] };
            
            if (headerComponent.format && ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComponent.format)) {
                // Upload media if it's an image/video/document
                documentId = await sendbulkmsg.uploadWhatsAppMedia(headerComponent.format, headerComponent.example.header_handle[0], tenants, business_number);
                if (documentId) {
                    headerData.parameters.push({
                        type: headerComponent.format.toLowerCase(),
                        [headerComponent.format.toLowerCase()]: { id: documentId }  // Add media document ID
                    });
                }
            }
    
            // Only push header if it contains parameters (media)
            if (headerData.parameters.length > 0) {
                payload.template.components.push(headerData);
            }
        }
    
        // Check for BODY component (with {{1}})
        const bodyComponent = components.find(component => component.type === "BODY");
        if (bodyComponent) {
            const bodyData = { type: "body", parameters: [] };
            
            if (bodyComponent.text.includes("{{1}}") && bodyComponent.category !== "AUTHENTICATION") {
                bodyData.parameters.push({
                    type: "text",
                    text: bodyComponent.example.body_text[0][0].replace("{{1}}", member.Name)
                });
            }
            
            // Only push body if it contains parameters (text)
            if (bodyData.parameters.length > 0) {
                payload.template.components.push(bodyData);
            }
        }
    
        return payload;
    }
    
    
    

    app.use(process.env.BASE_API_URL + '/api/webhook_template', router);
};
