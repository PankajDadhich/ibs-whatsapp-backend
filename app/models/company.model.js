/**
 * @author      Abdul Pathan
 * @date        Aug, 2024
 * @copyright   www.ibirdsservices.com
 */

const sql = require("./db.js");
// const pgSchema = require("../models/pgschema.model.js");
const pgSchema = require("../models/pgschema.model.js");
const nodeMailer = require('nodemailer');
const moment = require("moment");
let schema = '';

function init(schema_name) {
  this.schema = schema_name;
}

async function findAllCompany(is_active) {
  let params = [];
  let query = `
    SELECT 
      c.id, 
      c.name, 
      c.tenantcode, 
      c.isactive AS company_active, 
      c.systememail, 
      c.adminemail,
      c.logourl,
      c.sourceschema, 
      c.city, 
      c.street, 
      c.pincode, 
      c.state, 
      c.country,
      u.id AS user_id, 
      u.firstname, 
      u.lastname, 
      u.email, 
      u.userrole, 
      u.isactive AS user_active, 
      u.managerid, 
      u.phone, 
      u.whatsapp_number, 
      u.blocked, 
      u.whatsapp_settings
    FROM 
      public.company c
    LEFT JOIN 
      public."user" u
    ON 
      c.id = u.companyid 
    WHERE 
      u.userrole = 'ADMIN'
  `;

  if (is_active !== undefined) {
    query += " AND c.isactive = $1";
    params.push(is_active);
  }

  query += " ORDER BY c.name";

  const result = await sql.query(query, params);

  return result.rows.length > 0 ? result.rows : null;
}



async function createCompanyWithUser(newCompanyWithUser, cryptPassword) {
  await sql.connect();
  try {
    await sql.query("BEGIN");
    let companyInfo = newCompanyWithUser["company_info"];
    let sourceschema = newCompanyWithUser["schema"].source_schemaname;

    let invoice = newCompanyWithUser['invoice'];
    //Company Create Query
    //SANDBOX
    // const result = await sql.query(`INSERT INTO public.company (name, tenantcode, userlicenses, isactive, systememail, adminemail, logourl, sidebarbgurl)  VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    // [companyInfo.name,companyInfo.tenantcode, companyInfo.userlicenses, companyInfo.isactive, companyInfo.systememail, companyInfo.adminemail, companyInfo.logourl, companyInfo.sidebarbgurl]);

    //PRODUCTION
    const result = await sql.query(
      `INSERT INTO public.company (name, tenantcode, isactive, systememail, adminemail,logourl, street, city, state, pincode, country, sourceschema)  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        companyInfo.name,
        companyInfo.tenantcode,
        companyInfo.isactive,
        companyInfo.systememail,
        companyInfo.adminemail,
        companyInfo.logourl,
        companyInfo.street,
        companyInfo.city,
        companyInfo.state,
        companyInfo.pincode,
        companyInfo.country,
        sourceschema
      ]
    );

    if (result.rows.length > 0) {
      let company_id = result.rows[0].id;

      let userInfo = newCompanyWithUser["user_info"];
      const userResult = await sql.query(
        `INSERT INTO public.user (firstname, lastname, password, email, phone, whatsapp_number, userrole, companyid)  VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          userInfo.firstname,
          userInfo.lastname,
          cryptPassword,
          userInfo.email,
          userInfo.phone,
          userInfo.phone,
          "ADMIN",
          company_id,
        ]
      );
      //User Role Create
      // const userRoleResult = await sql.query(
      //   `INSERT INTO public.userrole (userid, roleid)  VALUES ($1, $2) RETURNING *`,
      //   [userResult.rows[0].id, newCompanyWithUser["userRoleResult"]["id"]]
      // );

      let start_date = moment(invoice.date);
      var end_date;
      var due_date;
      var validity = 5;
      var invoiceStatus;
      // if (invoice.plan === '86a3b58b-99c4-4c48-bb47-eb3c6d048668') {
      if (invoice.planname.toLowerCase() === 'free') {
        end_date = start_date.add(5, 'days').format('YYYY-MM-DD');
        invoiceStatus = 'Complete';
        invoice.amount = 0;
      } else {
        end_date = start_date.add(invoice.validity, 'months').format('YYYY-MM-DD');
        validity = invoice.validity;
        due_date = moment(invoice.date).add(10, 'days').format('YYYY-MM-DD');
        invoiceStatus = 'Pending';
      }

      let subscriptionData = [
        company_id,
        invoice.plan,
        invoice.date,
        end_date,
        validity
      ];

      const subscriptionResult = await sql.query(`INSERT INTO public.subscriptions(company_id, plan_id, start_date, end_date, validity) VALUES ($1, $2, $3, $4, $5) RETURNING *`, subscriptionData);
      let subscriptionId = subscriptionResult?.rows[0]?.id;

      let invoiceData = [
        subscriptionId,
        invoice.date,
        invoice.amount,
        invoiceStatus,
        due_date
      ];

      const invoiceResult = await sql.query(
        `INSERT INTO public.invoices(subscription_id, invoice_date, total_amount, status, payment_due_date) VALUES ($1,$2,$3,$4,$5) RETURNING *`, invoiceData);

      //await sql.query('COMMIT');

      // var values = '';
      // for (let key in modules) {
      //   if (modules.hasOwnProperty(key)) {
      //     // console.log(key, modules[key]);
      //     if(modules[key]){
      //       values += "('"+company_id+"','"+key+"'),";
      //     }
      //   }
      // }
      // values = values.replace(/^,|,$/g,'');
      // let cm_result = "insert into public.company_module (companyid, moduleid) values "+values+" returning id";
      // // console.log('CMR: '+ cm_result);
      // const CMResult = await sql.query(cm_result);

      try {
        const rec = await pgSchema.cloneSchemaWithoutData(
          newCompanyWithUser["schema"]["source_schemaname"],
          newCompanyWithUser["schema"]["target_schemaname"]
        );
        await sql.query("COMMIT");
      } catch (error) {
        await sql.query("ROLLBACK");
        console.error("eror2", error);
        throw error;
      }
      return { id: userResult.rows[0].id, company_id: company_id };
    }
  }
  catch (error) {
    await sql.query("ROLLBACK");
    console.error("eror", error);
    throw error;
  }
  return null;
}

async function findUserRole(roleName) {
  let query = `SELECT * FROM public.role where name =$1`;
  const result = await sql.query(query, [roleName]);
  if (result.rows.length > 0) return result.rows[0];

  return null;
}

async function getSourceSchemas() {
  let query = `select s.nspname as schema_name
    from pg_catalog.pg_namespace s
    join pg_catalog.pg_user u on u.usesysid = s.nspowner
    where nspname not in ('information_schema', 'pg_catalog', 'public')
          and nspname not like 'pg_toast%'
          and nspname not like 'pg_temp_%'
    order by schema_name`;
  const result = await sql.query(query);
  let schemanames = [];
  if (result.rows.length > 0) {
    result.rows.forEach((item) => {
      schemanames.push(item.schema_name);
    });
    return schemanames;
  }
}
// Company Update By Company Id
async function updateById(updateCompanyInfo) {

  try {
    const result = await sql.query(
      `UPDATE public.company SET name=$2, tenantcode=$3, isactive=$4, systememail=$5, adminemail=$6, street=$7, city=$8, state=$9, pincode=$10, country=$11, sourceschema=$12, logourl=$13 WHERE id=$1`,
      [
        updateCompanyInfo.id,
        updateCompanyInfo.name,
        updateCompanyInfo.tenantcode,
        updateCompanyInfo.company_active,
        updateCompanyInfo.systememail,
        updateCompanyInfo.adminemail,
        updateCompanyInfo.street,
        updateCompanyInfo.city,
        updateCompanyInfo.state,
        updateCompanyInfo.pincode,
        updateCompanyInfo.country,
        updateCompanyInfo.sourceschema,
        updateCompanyInfo.logourl
      ]
    );
    if (result.rowCount > 0) return "Updated successfully";
  } catch (error) {
    console.log("error ", error);
  }

  return null;
}

async function findById(company_id) {
  const query = `SELECT * FROM public.company `;
  const result = await sql.query(query + ` WHERE id = $1`, [company_id]);
  if (result.rows.length > 0) return result.rows[0];
  return null;
}

// Create by Abhishek 16-05-2024: To Fetch Company detail with User Info.
async function findCompanyWithUser(company_id) {
  const query = `SELECT 
                  comp.id as company_id,
                  comp.name as company_name,
                  comp.tenantcode,
                  comp.sourceschema,
                  comp.isactive,
                  comp.systememail,
                  comp.adminemail,
                  comp.logourl,
                  comp.city,
                  comp.street,
                  comp.pincode,
                  comp.state,
                  comp.country,
                  usr.id as user_id,
                  usr.firstname,
                  usr.lastname,
                  usr.password,
                  usr.email,
                  usr.phone,
                  plans.id AS plan_id,
                  plans.name AS plan_name,
                  plans.number_of_whatsapp_setting AS number_of_whatsapp_setting,
                  plans.number_of_users AS number_of_users,
                  subscriptions.id AS subscription_id,
                  subscriptions.validity,
                  invoices.id AS invoice_id,
                  invoices.total_amount AS amount,
                  invoices.invoice_date,
                  json_agg(json_build_object(
                    'id', moduleid
                  )) AS modules
                FROM public.company comp
                INNER JOIN public.user usr ON comp.id = usr.companyid
                INNER JOIN public.subscriptions ON subscriptions.company_id = comp.id
                INNER JOIN public.plans ON plans.id = subscriptions.plan_id
                INNER JOIN public.invoices ON invoices.subscription_id = subscriptions.id
                LEFT JOIN public.plan_module pm ON plans.id=pm.planid`;
  const result = await sql.query(query + ` WHERE comp.id = $1 AND usr.userrole = 'ADMIN' GROUP BY comp.id, usr.id, plans.id, subscriptions.id, invoices.id ORDER BY invoices.invoice_date DESC LIMIT 1`, [company_id]);
  // console.log("Rows ", result.rows);
  if (result.rows.length > 0) return result.rows;
  return null;
}

async function updateCompanyWithUser(newCompanyWithUser) {
  await sql.connect();
  try {
    await sql.query("BEGIN");
    let companyInfo = newCompanyWithUser["company_info"];
    let sourceschema = newCompanyWithUser["schema"].source_schemaname;
    let modules = newCompanyWithUser['modules'];


    const result = await sql.query(
      `UPDATE public.company SET name=$2, tenantcode=$3, isactive=$4, systememail=$5, adminemail=$6, street=$7, city=$8, state=$9, pincode=$10, country=$11, sourceschema=$12, logourl=$13 WHERE id=$1`,
      [
        companyInfo.companyId,
        companyInfo.name,
        companyInfo.tenantcode,
        companyInfo.isactive,
        companyInfo.systememail,
        companyInfo.adminemail,
        companyInfo.street,
        companyInfo.city,
        companyInfo.state,
        companyInfo.pincode,
        companyInfo.country,
        sourceschema,
        companyInfo.logourl
      ]
    );
    if (result.rowCount > 0) {
      let company_id = companyInfo.companyId;

      //User Create
      let userInfo = newCompanyWithUser["user_info"];
      // console.log('userInfo-----', userInfo);
      const userResult = await sql.query(
        `UPDATE public.user SET firstname=$2, lastname=$3, email=$4, phone=$5, companyid=$6, isactive=$7 WHERE id=$1`,
        [
          userInfo.userId,
          userInfo.firstname,
          userInfo.lastname,
          userInfo.email,
          userInfo.phone,
          company_id,
          companyInfo.isactive,
        ]
      );
      //await sql.query('COMMIT');

      let invoice = newCompanyWithUser["invoice"];
      let start_date = moment(invoice.date);
      var end_date;
      var due_date;
      var validity = 5;
      // var invoiceStatus;
      // if (invoice.plan === '86a3b58b-99c4-4c48-bb47-eb3c6d048668') {
      if (invoice.planname.toLowerCase() === 'free') {
        end_date = start_date.add(5, 'days').format('YYYY-MM-DD');
        // invoiceStatus = 'Complete';
        invoice.amount = 0;
      } else {
        end_date = start_date.add(invoice.validity, 'months').format('YYYY-MM-DD');
        validity = invoice.validity;
        due_date = moment(invoice.date).add(10, 'days').format('YYYY-MM-DD');
        // invoiceStatus = 'Pending';
      }

      let subscriptionData = [
        invoice.plan,
        moment(invoice.date).format('YYYY-MM-DD'),
        end_date,
        validity,
        invoice.subscriptionId
      ];

      // console.log('subscription === ', subscriptionData);

      const subscriptionResult = await sql.query(`UPDATE public.subscriptions SET plan_id=$1, start_date=$2, end_date=$3, validity=$4 WHERE id=$5`, subscriptionData);

      let invoiceData = [
        invoice.invoiceId,
        moment(invoice.date).format('YYYY-MM-DD'),
        invoice.amount,
        // invoiceStatus,
        due_date
      ];

      // console.log('invoiceData=-------', invoiceData);

      const invoiceResult = await sql.query(`UPDATE public.invoices SET invoice_date=$2, total_amount=$3, payment_due_date=$4 WHERE id=$1`, invoiceData);


      try {
        const rec = await pgSchema.updateSchemaWithoutData(
          newCompanyWithUser["schema"]["source_schemaname"],
          newCompanyWithUser["schema"]["target_schemaname"]
        );
        await sql.query("COMMIT");
      } catch (error) {
        await sql.query("ROLLBACK");
        console.error("eror2", error);
        throw error;
      }

      if (userResult.rowCount > 0) { return "Successfully Update" }
    }
  } catch (error) {
    await sql.query("ROLLBACK");
    console.error("eror", error); // or throw error;
    throw error;
  }
  return null;
}

async function sendeMail(username, password) {
  let mailTransporter = nodeMailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'abhishek.sharma@ibirdsservices.com',
      pass: 'abhishek@108yash'
    }
  });

  let mailDetail = {
    from: 'no-reply@blackbox.com',
    to: username,
    subject: 'Registration Mail',
    text: '',
    html: `<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:Helvetica,Arial,sans-serif;margin:0;padding:0;background-color:#fff"><table role="presentation" style="width:100%;border-collapse:collapse;border:0;border-spacing:0;font-family:Arial,Helvetica,sans-serif;background-color:#efefef"><tbody><tr><td align="center" style="padding:1rem 2rem;vertical-align:top;width:100%"><table role="presentation" style="max-width:600px;min-width:600px;border-collapse:collapse;border:0;border-spacing:0;text-align:left"><tbody><tr><td style="padding:40px 0 0"><div style="text-align:center"></div><div style="padding:20px;min-height:300px;background-color:#fff"><div style="color:#000;text-align:left"><p style="padding-bottom:16px">Dear Admin,</p><p>I hope this email finds you well. We would like to inform you about the status of your recent Whatsapp Business api registration application.</p><p>Congratulations! Your application has met all the necessary requirements, and the registration process has been successfully completed. This means that your whatsapp business api is now officially registered.</p><p>Please find the credentials below:</p><table style="width:100%;background:#efefef;border-top:2px solid #31373f;margin-bottom:1rem"><tbody><tr style="vertical-align:top"><td style="width:100%;padding:16px 8px"><div><b>Username:</b> ${username}<br><b>Password:</b> ${password}<br></div></td></tr></tbody></table><p>If you have any questions or concerns regarding your whatsapp business api registration, feel free to reach out to <a href="https://ibirdsservices.com/" target="_blank" style="color:inherit;text-decoration:underline">ibirdsservices.com</a>. They will be happy to assist you and provide any necessary clarification.</p><p>Thank you for your attention to this matter.</p></div></div><div style="padding-top:20px;color:#999;text-align:center"><p style="padding-bottom:16px"><a href="https://sadabharat.com/" target="_blank" style="color:inherit;text-decoration:underline">iBirds Software Services Pvt. Ltd.</a></p></div></td></tr></tbody></table></td></tr></tbody></table></body></html>`
  };

  mailTransporter.sendMail(mailDetail, function (err, data) {
    if (err) {
      return err;
    } else {
      return "Email Sent Successfully";
    }
  });
}

async function duplicateEmailCheck(email, userId) {
  const query = userId
    ? `SELECT 1 FROM public.user WHERE email = $1 AND id != $2 LIMIT 1`
    : `SELECT 1 FROM public.user WHERE email = $1 LIMIT 1`;

  const queryParams = userId ? [email, userId] : [email];

  try {
    const result = await sql.query(query, queryParams);
    return result.rows.length > 0 ? true : null;
  } catch (error) {
    console.error('Error checking email:', error);
    throw error;
  }
}
async function findByEmail(email) {
  const query = `SELECT * FROM public.company `;
  const result = await sql.query(query + ` WHERE adminemail = $1`, [email]);
  if (result.rows.length > 0) return result.rows[0];
  return null;
}

module.exports = {
  init,
  findAllCompany,
  createCompanyWithUser,
  findUserRole,
  getSourceSchemas,
  updateById,
  findById,
  findCompanyWithUser,
  updateCompanyWithUser,
  sendeMail,
  duplicateEmailCheck,
  findByEmail
};
