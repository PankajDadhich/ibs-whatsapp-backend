/**
 * Handles all incoming request for /api/contacts endpoint
 * DB table for this public.contact
 * Model used here is contact.model.js
 * SUPPORTED API ENDPOINTS
 *              GET     /api/contacts
 *              GET     /api/contacts/:id
 *              POST    /api/contacts
 *              PUT     /api/contacts/:id
 *              DELETE  /api/contacts/:id
 * 
 * @author      Aslam Bari
 * @date        Feb, 2023
 * @copyright   www.ibirdsservices.com  
 */

const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const Common = require("../models/common.model.js");
const permissions = require("../constants/permissions.js");

module.exports = app => {


  const { body, validationResult } = require('express-validator');

  var router = require("express").Router();
  
  // .....................................Get All Lead Count........................................
  router.get("/leadcount", fetchUser, async (req, res) => {
    Common.init(req.userinfo.tenantcode);
    const total = await Common.leadCount(req.userinfo);
    if (total) {
      res.status(200).json({ total: total });
    } else {
      res.status(200).json({ total: 0 });
    }

  });




  // .....................................Get Active Group Count........................................
  router.get("/activegroups", fetchUser, async (req, res) => {
    Common.init(req.userinfo.tenantcode);
    const total = await Common.countActiveGroups(req.userinfo);

    if (total) {
      res.status(200).json({ total: total });
    } else {
      res.status(200).json({ total: 0 });
    }

  });


  // .....................................Get Campaign Status Count........................................
  router.get("/campaignstatus/:business_number", fetchUser, async (req, res) => {
    const { business_number } = req.params;

    // Validate business_number existence
    if (!business_number) {
      return res.status(200).json({ result: [], message: "No business number provided" });
    }
    Common.init(req.userinfo.tenantcode);
    const result = await Common.campaignStatusCount(req.userinfo.id, business_number);
    if (result) {
      res.status(200).json({ result: result });
    } else {
      res.status(200).json({ result: [] });
    }

  });


  // .....................................Get All Contacts........................................
  router.get("/autoresponse", fetchUser, async (req, res) => {


    Common.init(req.userinfo.tenantcode);
    const total = await Common.autoResponseCount(req.userinfo);
    if (total) {
      res.status(200).json({ total: total });
    } else {
      res.status(400).json({ total: 0 });
    }

  });



  // .....................................Get All Contacts........................................
  router.get("/activeusers", fetchUser, async (req, res) => {


    Common.init(req.userinfo.tenantcode);
    const total = await Common.countActiveUsers(req.userinfo.companyid);
    if (total) {
      res.status(200).json({ total: total });
    } else {
      res.status(400).json({ total: 0 });
    }

  });

  // .....................................Get All Contacts........................................
  router.get("/totalbusiness", fetchUser, async (req, res) => {


    Common.init(req.userinfo.tenantcode);
    const total = await Common.getTotalBusiness(req.userinfo.companyid);
    if (total) {
      res.status(200).json({ total: total });
    } else {
      res.status(400).json({ total: 0 });
    }

  });

  // .....................................Get All Contacts........................................
  router.get("/settings/:settingname", fetchUser, async (req, res) => {
    let result = await Common.findCompanySetting(req.userinfo.companyid, req.params.settingname);
    if (result) {
      res.status(200).json({ success: true, setting: result });
    } else {
      res.status(400).json({ success: false });
    }

  });

  router.get("/setting/:name", fetchUser, async (req, res) => {

    let result = await Common.getSetting(req.params.name);
    if (result) {
      res.status(200).json({ success: true, setting: result });
    } else {
      res.status(400).json({ success: false });
    }

  });




  router.post("/chatgpt", async (req, res) => {
    try {
      const CHATGPT_API_KEY = process.env.CHATGPT_API_KEY;

      if (!CHATGPT_API_KEY) {
        return res.status(400).json({ success: false, message: "ChatGPT API key is not set in environment variables." });
      }

      const { prompt, model = "gpt-3.5-turbo", max_tokens = 100 } = req.body;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CHATGPT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: max_tokens
        })
      });


      // Check if the response is not OK
      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({
          success: false,
          message: errorText
        });
      }

      const chatGptResponse = await response.json();
      res.status(200).json({ success: true, data: chatGptResponse });

    } catch (error) {
      console.error('Error fetching ChatGPT response:', error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.use(process.env.BASE_API_URL + '/api/whatsapp/common', router);
};
