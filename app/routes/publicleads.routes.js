const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const Lead = require("../models/publicleads.model.js");
const Company = require("../models/company.model.js")
const permissions = require("../constants/permissions.js");
const Mailer = require("../models/mail.model.js");
const Common = require("../models/common.model.js");
const bcrypt = require('bcryptjs');

module.exports = app => {
  const { body, validationResult } = require('express-validator');
  var router = require("express").Router();

  router.get("/", fetchUser, async (req, res) => {
    const records = await Lead.getAllLeads();
    if (records) {
      res.status(200).json({ success: true, records });
    } else {
      res.status(400).json({ success: false, errors: "Bad request" });
    }

  });



  // ................................ Create a new lead ................................

  router.post("/", fetchUser, [
    body('first_name', 'Please enter First Name').isLength({ min: 1 }),
    body('last_name', 'Please enter Last Name ').isLength({ min: 1 }),
  ],

    async (req, res) => {
      try {
        if (req.body.email) {
          const isDuplicate = await Lead.checkEmailExists(req.body.email);
          if (isDuplicate) {
            return res.status(200).json({ errors: "Email already exists" });
          }
        }
        const formattedCompany = `ibs_${req.body.company.toLowerCase().replace(/\s+/g, '_')}`;

        if (formattedCompany) {
          const result = await Company.getSourceSchemas();
          if (result.includes(formattedCompany)) {
            return res.status(200).json({ errors: "A company is already registered with this name." });
          }
        }
        if (req.body.status === 'Closed - Converted') {

          const password = 'ibs' + req.body.company.toLowerCase().replace(/\s+/g, '') + '#@' + Math.floor(Math.random() * 1000 + 100);
          const salt = bcrypt.genSaltSync(10);
          const cryptPassword = bcrypt.hashSync(password, salt);
          const reqBody = {
            schema: {
              source_schemaname: req.userinfo.tenantcode,
              target_schemaname: formattedCompany,
            },
            company_info: {
              name: req.body.company,
              tenantcode: formattedCompany,
              isactive: true,
              systememail: req.userinfo.email,
              adminemail: req.body.email,
              // logourl: `/var/www/html/logos/ibs_whatsapp/fav.png`,
              street: req.body.street,
              city: req.body.city,
              state: req.body.state,
              pincode: req.body.zipcode,
              country: req.body.country,
            },
            user_info: {
              firstname: req.body.first_name,
              lastname: req.body.last_name,
              password: cryptPassword,
              email: req.body.email,
              phone: req.body.mobile_no,
            },
            invoice: {
              plan: req.body.invoice.planid,
              planname: req.body.invoice.planname,
              amount: req.body.invoice.amount,
              validity: req.body.invoice.validity,
              date: req.body.invoice.date,
            },
          };

          const result = await Company.createCompanyWithUser(reqBody, cryptPassword);
          if (!result) {
            return res.status(400).json({ errors: "Something went wrong while converting company" });
          } else {
            req.body.convertedcompanyid = result.company_id;
            // await Company.sendeMail(req.body.email, password);
            if (req.body?.invoice?.planname === 'Free') {
              await Company.sendeMail(req.body.email, password);
            }
          }
        }

        // Create the lead
        const leadRec = await Lead.createLead(req.body);
        if (leadRec) {
          return res.status(200).json(leadRec);
        } else {
          return res.status(400).json({ success: false, errors: "Bad request" });
        }
      } catch (error) {
        console.error("Error creating lead:", error);
        return res.status(500).json({ success: false, errors: "Internal Server Error" });
      }
    }
  );


  //......................................Update Lead.................................
  router.put("/:id", fetchUser, [
    body('first_name', 'Please enter First Name').isLength({ min: 1 }),
    body('last_name', 'Please enter Last Name').isLength({ min: 1 }),
  ], async (req, res) => {
    const leadId = req.params.id;

    try {
      if (req.body.email) {
        const isDuplicate = await Lead.checkEmailExists(req.body.email, leadId);
        if (isDuplicate) {
          return res.status(400).json({ errors: "Email already exists" });
        }
      }
      const formattedCompany = `ibs_${req.body.company.toLowerCase().replace(/\s+/g, '_')}`;
      if (formattedCompany) {
        const result = await Company.getSourceSchemas();
        if (result.includes(formattedCompany)) {
          return res.status(400).json({ errors: "A company is already registered with this name." });
        }
      }

      if (req.body.status === 'Closed - Converted') {

        const password = 'ibs' + req.body.company.toLowerCase().replace(/\s+/g, '') + '#@' + Math.floor(Math.random() * 1000 + 100);
        const salt = bcrypt.genSaltSync(10);
        const cryptPassword = bcrypt.hashSync(password, salt);

        const reqBody = {
          schema: {
            source_schemaname: req.userinfo.tenantcode,
            target_schemaname: formattedCompany,
          },
          company_info: {
            name: req.body.company,
            tenantcode: formattedCompany,
            isactive: true,
            systememail: req.userinfo.email,
            adminemail: req.body.email,
            // logourl: `/var/www/html/logos/ibs_whatsapp/fav.png`,
            street: req.body.street,
            city: req.body.city,
            state: req.body.state,
            pincode: req.body.zipcode,
            country: req.body.country,
          },
          user_info: {
            firstname: req.body.first_name,
            lastname: req.body.last_name,
            password: cryptPassword,
            email: req.body.email,
            phone: req.body.mobile_no,
          },
          invoice: {
            plan: req.body.invoice.planid,
            planname: req.body.invoice.planname,
            amount: req.body.invoice.amount,
            validity: req.body.invoice.validity,
            date: req.body.invoice.date,
          },
        };

        const result = await Company.createCompanyWithUser(reqBody, cryptPassword);
        if (!result) {
          return res.status(400).json({ errors: "Something went wrong while converting company" });
        } else {
          req.body.convertedcompanyid = result.company_id;
          if (req.body?.invoice?.planname === 'Free') {
            await Company.sendeMail(req.body.email, password);
          }
          // 
        }
      }
      const updatedLead = await Lead.updateById(leadId, req.body);
      if (updatedLead) {
        return res.status(200).json(updatedLead);
      } else {
        return res.status(400).json({ success: false, errors: "Failed to update lead" });
      }
    } catch (error) {
      console.error("Error updating lead:", error);
      return res.status(500).json({ success: false, errors: "Internal Server Error" });
    }
  });


  router.post('/web', async (req, res) => {
    if (req.body.email) {
      const record = await Lead.generatePublicLead(req.body);
      if (record) {
        res.status(200).json({ success: true, record });
      } else {
        res.status(400).json({ success: false, errors: "Bad request" });
      }
    }
  });

  // ................................ Delete lead ................................
  router.delete("/:id", fetchUser, async (req, res) => {

    const result = await Lead.deleteLead(req.params.id);
    if (!result)
      return res.status(200).json({ "success": false, "message": "No record found" });

    res.status(200).json({ "success": true, "message": "Successfully Deleted" });
  });





  app.use(process.env.BASE_API_URL + '/api/publicleads', router);
};