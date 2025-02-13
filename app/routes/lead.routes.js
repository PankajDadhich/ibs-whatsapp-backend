/**
 * Handles all incoming request for /api/leads endpoint
 * DB table for this public.lead
 * Model used here is lead.model.js
 * SUPPORTED API ENDPOINTS
 *              GET     /api/leads
 *              GET     /api/leads/:id
 *              POST    /api/leads
 *              PUT     /api/leads/:id
 *              DELETE  /api/leads/:id
 * 
 * @author      Aslam Bari
 * @date        Feb, 2023
 * @copyright   www.ibirdsservices.com  
 */

const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const Lead = require("../models/lead.model.js");
const permissions = require("../constants/permissions.js");
const Mailer = require("../models/mail.model.js");
const Common = require("../models/common.model.js");

module.exports = app => {
  const { body, validationResult } = require('express-validator');
  var router = require("express").Router();

  // .....................................Get All leads........................................
  router.get("/", fetchUser, async (req, res) => {


    Lead.init(req.userinfo.tenantcode);
    const leads = await Lead.findAll(req.userinfo);
    if (leads) {
      res.status(200).json(leads);
    } else {
      res.status(400).json({ errors: "No data" });
    }
  });

  //......................................Get lead by Id.................................
  router.get("/:id", fetchUser, async (req, res) => {
    try {

      Lead.init(req.userinfo.tenantcode);
      let resultCon = await Lead.findById(req.params.id);
      if (resultCon) {
        return res.status(200).json(resultCon);
      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }
    } catch (error) {
      return res.status(400).json({ "success": false, "message": error });
    }
  });


  // ................................ Create a new lead ................................
  router.post("/", fetchUser, [
    body('firstname', 'Please enter First Name').isLength({ min: 1 }),
    body('lastname', 'Please enter Last Name ').isLength({ min: 1 }),
  ],

    async (req, res) => {

      Lead.init(req.userinfo.tenantcode);
      if (req.body.whatsapp_number) {
        const isDuplicate = await Lead.checkWhatsAppNumberExists(req.body.whatsapp_number, req.userinfo.id);
        if (isDuplicate) {
          return res.status(400).json({ errors: "WhatsApp number already exists" });
        }
      }
      const leadRec = await Lead.create(req.body, req.userinfo.id);

      if (leadRec) {
        res.status(200).json(leadRec);
      } else {
        res.status(400).json({ success: false, errors: "Bad request" });
      }
    });

  //......................................Update Lead.................................
  router.put("/:id", fetchUser, async (req, res) => {
    try {
      Lead.init(req.userinfo.tenantcode);

      const { firstname, lastname, company, leadsource, leadstatus, rating, conid, salutation, phone, email, fax, whatsapp_number,
        websit, industry, title, annualrevenu, street, city, state, country, zipcode, assignrole, description, lastmodifiedbyid, ownerid, lostreason, amount, paymentmodel, paymentterms, iswon } = req.body;
      const errors = [];
      const leadRec = {};
      if (req.body.hasOwnProperty("firstname")) { leadRec.firstname = firstname; if (!firstname) { errors.push('Lead firstname is required') } };
      if (req.body.hasOwnProperty("lastname")) { leadRec.lastname = lastname; if (!lastname) { errors.push('lastname is required') } };
      if (req.body.hasOwnProperty("ownerid")) { leadRec.ownerid = ownerid; if (!ownerid) { errors.push('Owner is required') } };
      if (req.body.hasOwnProperty("company")) { leadRec.company = company };
      if (req.body.hasOwnProperty("leadsource")) { leadRec.leadsource = leadsource };
      if (req.body.hasOwnProperty("leadstatus")) { leadRec.leadstatus = leadstatus };
      if (req.body.hasOwnProperty("rating")) { leadRec.rating = rating };
      if (req.body.hasOwnProperty("conid")) { leadRec.conid = conid };
      if (req.body.hasOwnProperty("salutation")) { leadRec.salutation = salutation };
      if (req.body.hasOwnProperty("phone")) { leadRec.phone = phone; if (!phone) { phone; errors.push('Phone is required') } };
      if (req.body.hasOwnProperty("email")) { leadRec.email = email };
      if (req.body.hasOwnProperty("fax")) { leadRec.fax = fax };
      if (req.body.hasOwnProperty("websit")) { leadRec.websit = websit };
      if (req.body.hasOwnProperty("industry")) { leadRec.industry = industry };
      if (req.body.hasOwnProperty("title")) { leadRec.title = title };
      if (req.body.hasOwnProperty("annualrevenu")) { leadRec.annualrevenu = annualrevenu };
      if (req.body.hasOwnProperty("street")) { leadRec.street = street };
      if (req.body.hasOwnProperty("city")) { leadRec.city = city };
      if (req.body.hasOwnProperty("state")) { leadRec.state = state };
      if (req.body.hasOwnProperty("country")) { leadRec.country = country };
      if (req.body.hasOwnProperty("zipcode")) { leadRec.zipcode = zipcode };
      if (req.body.hasOwnProperty("description")) { leadRec.description = description };
      if (req.body.hasOwnProperty("assignrole")) { leadRec.assignrole = assignrole };
      if (req.body.hasOwnProperty("lastmodifiedbyid")) { leadRec.lastmodifiedbyid = lastmodifiedbyid };
      if (req.body.hasOwnProperty("lostreason")) { leadRec.lostreason = lostreason };
      if (req.body.hasOwnProperty("amount")) { leadRec.amount = amount };
      if (req.body.hasOwnProperty("paymentmodel")) { leadRec.paymentmodel = paymentmodel };
      if (req.body.hasOwnProperty("paymentterms")) { leadRec.paymentterms = paymentterms };
      if (req.body.hasOwnProperty("iswon")) { leadRec.iswon = iswon };
      if (req.body.hasOwnProperty("whatsapp_number")) { leadRec.whatsapp_number = whatsapp_number };

      if (errors.length !== 0) {
        return res.status(400).json({ errors: errors });
      }

      if (req.body.whatsapp_number) {
        const isDuplicate = await Lead.checkWhatsAppNumberExists(req.body.whatsapp_number, req.userinfo.id, req.params.id);

        if (isDuplicate) {
          return res.status(200).json({ errors: "WhatsApp number already exists" });
        }
        leadRec.whatsapp_number = whatsapp_number;
      }

      let resultCon = await Lead.findById(req.params.id);
      if (resultCon) {
        resultCon = await Lead.updateById(req.params.id, leadRec, req.userinfo.id);
        if (resultCon) {
          return res.status(200).json({ "success": true, "message": "Record updated successfully" });
        }
        return res.status(200).json(resultCon);

      } else {
        return res.status(200).json({ "success": false, "message": "No record found" });
      }

    } catch (error) {
      res.status(400).json({ errors: error });
    }

  });

  // ................................ Delete lead ................................
  router.delete("/:id", fetchUser, async (req, res) => {
    Lead.init(req.userinfo.tenantcode);
    const result = await Lead.deleteLead(req.params.id);
    if (!result)
      return res.status(200).json({ "success": false, "message": "No record found" });

    res.status(200).json({ "success": true, "message": "Successfully Deleted" });
  });


  app.use(process.env.BASE_API_URL + '/api/leads', router);
};