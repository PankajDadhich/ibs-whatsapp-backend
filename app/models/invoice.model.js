/**
 * @author      Abdul Pathan
 * @date        Aug, 2024
 * @copyright   www.ibirdsservices.com
 */

const sql = require("./db.js");
let schema = '';
const moment = require("moment"); 

function init(schema_name) {
    this.schema = schema_name;
}
async function findAll(status) {
  try {

    // let query = 'SELECT invoices.*, company.name AS company_name, subscriptions.subscriptionname AS subscription_name FROM public.invoices INNER JOIN public.company ON invoices.company_id = company.id INNER JOIN public.subscriptions ON invoices.subscription_id = subscriptions.id';
    let query = `SELECT 
                  invoices.*, 
                  subscriptions.company_id,
                  subscriptions.plan_id,
                  subscriptions.validity,
                  subscriptions.start_date,
                  subscriptions.end_date,
                  company.name AS company_name, 
                  plans.name AS plan_name 
                FROM 
                  public.invoices 
                  INNER JOIN public.subscriptions ON invoices.subscription_id = subscriptions.id
                  INNER JOIN public.company ON subscriptions.company_id = company.id 
                  INNER JOIN public.plans ON subscriptions.plan_id = plans.id`;

    if (status !== 'none') {
      query += ` WHERE invoices.status='${status}'`;
    }

    const result = await sql.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  }
}

async function fetchByCompanyId(id) {
  try {
    // const result = await sql.query(`SELECT inc.*, sub.subscriptionname FROM public.invoices inc JOIN public.subscriptions sub ON inc.subscription_id = sub.id WHERE inc.company_id='${id}'`);
    const result = await sql.query(`SELECT 
                                      invoices.*,
                                      subscriptions.validity,
                                      plans.name AS plan_name
                                    FROM 
                                      public.subscriptions 
                                      JOIN public.plans ON plans.id = subscriptions.plan_id
                                      JOIN public.invoices ON invoices.subscription_id = subscriptions.id
                                    WHERE 
                                      subscriptions.company_id = '${id}'`);

    return result.rows;
  } catch (error) {
    throw error;
  }
}

async function fetchInvoiceById(id) {
  try {
    const result = await sql.query(`SELECT inc.*,
                                      sub.company_id,
                                      sub.plan_id,
                                      sub.validity,
                                      sub.start_date,
                                      sub.end_date,
                                      plans.name as plan_name,
                                      trans.id AS transaction_id,
                                      trans.transaction_date,
                                      trans.amount AS transaction_amount,
                                      trans.payment_method,
                                      trans.transaction_cheque_no	
                                    FROM PUBLIC.invoices inc
                                    LEFT JOIN PUBLIC.transactions trans on inc.id = trans.invoice_id
                                    JOIN PUBLIC.subscriptions sub ON inc.subscription_id = sub.id
                                    JOIN PUBLIC.plans ON sub.plan_id = plans.id 
                                    WHERE inc.id = '${id}'`);
    return result.rows;
  } catch (error) {
    throw error;
  }
}

// async function addInvoice(record) {
//   console.log('Record', record);
//   let start_date = moment(record.date);
//   var end_date;
//   var validity = 5;
//   if (record.subscription === '86a3b58b-99c4-4c48-bb47-eb3c6d048668') {
//     end_date = start_date.add(5, 'days').format('YYYY-MM-DD');
//   } else {
//     end_date = start_date.add(record.validity, 'months').format('YYYY-MM-DD');
//     validity = record.validity;
//   }
//   console.log(end_date);

//   let invoiceData = [
//     record.company_id,
//     record.subscription,
//     record.date,
//     end_date,
//     validity,
//     record.date,
//     record.amount,
//     'Complete',
//     record.new_name,
//   ];

//   const invoiceResult = await sql.query(
//     `INSERT INTO public.invoices(company_id, subscription_id, start_date, end_date, validity, invoice_date, total_amount, status, other_name) VALUES ($1,$2,$3,$4,$5, $6, $7, $8, $9) RETURNING *`, invoiceData);
//   if (invoiceResult.rows.length > 0) {
//     let invoice_id = invoiceResult.rows[0].id;

//     let transactionData = [
//       invoice_id,
//       record.date,
//       record.amount,
//       record.payment_method,
//       'Complete',
//       record.transaction_cheque_no
//     ]

//     const transactionResult = await sql.query(
//       `INSERT INTO public.transactions(invoice_id, transaction_date, amount, payment_method, status, transaction_cheque_no) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, transactionData);

//     if (transactionResult.rows.length > 0) {
//       let transaction_id = transactionResult.rows[0].id;
//       return invoiceResult.rows;
//     }
//   }
//   return null;
// }

async function addInvoiceWithTransaction(record) {
  try {
    await sql.query("BEGIN");
    let start_date = moment(record.date);
    var end_date;
    var validity = 5;
    // if (record.subscription_id === '86a3b58b-99c4-4c48-bb47-eb3c6d048668') {
    if (record.plan_name.toLowerCase() === 'free') {
      end_date = start_date.add(5, 'days').format('YYYY-MM-DD');
    } else {
      end_date = start_date.add(record.validity, 'months').format('YYYY-MM-DD');
      validity = record.validity;
    }
    

    const plaResult = await sql.query(`SELECT * FROM public.plans WHERE id='${record.plan_id}'`);
    var plan = {};
    if (plaResult.rows.length > 0) {
      plan = plaResult.rows[0];
    }

    // console.log(plan);

    const subResult = await sql.query(`SELECT * FROM public.subscriptions WHERE company_id='${record.company_id}' ORDER BY end_date LIMIT 1`);
    var lastStartDate, lastEndDate;
    if (subResult.rows.length > 0) {
      let last_subscription = subResult.rows[0];
      lastStartDate = moment(last_subscription.start_date).format('YYYY-MM-DD');
      lastEndDate = moment(last_subscription.end_date).format('YYYY-MM-DD');
    };

    
    subscriptionData = [
      record.company_id,
      record.plan_id,
      record.date,
      end_date,
      validity
    ];

    const subscriptionResult = await sql.query(`INSERT INTO public.subscriptions(company_id, plan_id, start_date, end_date, validity) VALUES($1,$2,$3,$4,$5) RETURNING *`, subscriptionData);

    if (subscriptionResult.rows.length > 0) {
      let invoiceData = [
        subscriptionResult.rows[0].id,
        record.date,
        record.amount,
        'Complete',
        record.new_name,
      ];

      const invoiceResult = await sql.query(`INSERT INTO public.invoices(subscription_id, invoice_date, total_amount, status, other_name) VALUES ($1,$2,$3,$4,$5) RETURNING *`, invoiceData);
      if (invoiceResult.rows.length > 0) {
        let invoice_id = invoiceResult.rows[0].id;

        let transactionData = [
          invoice_id,
          record.date,
          record.amount,
          record.payment_method,
          'Complete',
          record.transaction_cheque_no,
          record.order_id
        ]

        const transactionResult = await sql.query(
          `INSERT INTO public.transactions(invoice_id, transaction_date, amount, payment_method, status, transaction_cheque_no, order_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, transactionData);

        if (transactionResult.rows.length > 0) {
          let transaction_id = transactionResult.rows[0].id;
          await sql.query("COMMIT");
          return invoiceResult.rows;
        }
        else {
          await sql.query("ROLLBACK");
        }
      } else {
        await sql.query("ROLLBACK");
      }
    } else {
      await sql.query("ROLLBACK");
    }
  } catch (error) {
    await sql.query("ROLLBACK");
    console.error("eror", error); // or throw error;
    throw error;
  }
  return null;
}

async function updateInvoiceAddTrans(invoice_id, record) {
  try {

    var start_date = moment(record.start_date).format('YYYY-MM-DD');
    var end_date = moment(record.end_date).format('YYYY-MM-DD');

    var validity;
    // if (record.subscription === '86a3b58b-99c4-4c48-bb47-eb3c6d048668') {
    if (record.plan_name.toLowerCase() === 'free') {
      end_date = moment(record.start_date).add(5, 'days').format('YYYY-MM-DD');
    } else {
      end_date = moment(record.start_date).add(record.validity, 'months').format('YYYY-MM-DD');
      validity = record.validity;
    }

    let subscriptionData = [
      record.subscription_id,
      record.company_id,
      record.plan_id,
      start_date,
      end_date,
      validity
    ];

    const subscriptionResult = await sql.query(`UPDATE public.subscriptions set company_id=$2, plan_id=$3, start_date=$4, end_date=$5, validity=$6 WHERE id=$1 RETURNING *`, subscriptionData);

    if (subscriptionResult.rows.length > 0) {
      let invoiceData = [
        invoice_id,
        record.subscription_id,
        moment(record.invoice_date).format('YYYY-MM-DD'),
        record.amount,
        'Complete',
        record.new_name,
      ];
      // console.log('Invoice: ', invoiceData);
      // console.log('Transaction: ', transactionData);

      const invoiceResult = await sql.query(`UPDATE public.invoices set subscription_id=$2, invoice_date=$3, total_amount=$4, status=$5, other_name=$6 WHERE id=$1 RETURNING *`, invoiceData);
      if (invoiceResult.rows.length > 0) {
        let invoice_id = invoiceResult.rows[0].id;

        let transactionData = [
          invoice_id,
          moment().format('YYYY-MM-DD'),
          record.amount,
          record.payment_method,
          'Complete',
          record.transaction_cheque_no,
          record.order_id
        ]

        const transactionResult = await sql.query(
          `INSERT INTO public.transactions(invoice_id, transaction_date, amount, payment_method, status, transaction_cheque_no, order_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, transactionData);

        if (transactionResult.rows.length > 0) {
          let transaction_id = transactionResult.rows[0].id;
          await sql.query("COMMIT");
          return invoiceResult.rows;
        } else {
          await sql.query("ROLLBACK");
        }
      } else {
        await sql.query("ROLLBACK");
      }
    } else {
      await sql.query("ROLLBACK");
    }
  } catch (error) {
    await sql.query("ROLLBACK");
    console.error("eror", error); // or throw error;
    throw error;
  }
  return null
}

async function fetchCompanyAndUserByInvoice(id) {
  try {
    const result = await sql.query(`SELECT INC.*,
                                      COMP.ID AS COMPANY_ID,
                                      COMP.NAME AS COMPANY_NAME,
                                      COMP.TENANTCODE,
                                      COMP.SOURCESCHEMA,
                                      COMP.ISACTIVE,
                                      COMP.SYSTEMEMAIL,
                                      COMP.ADMINEMAIL,
                                      COMP.CITY,
                                      COMP.STREET,
                                      COMP.PINCODE,
                                      COMP.STATE,
                                      COMP.COUNTRY,
                                      USR.ID AS USER_ID,
                                      USR.FIRSTNAME,
                                      USR.LASTNAME,
                                      USR.PASSWORD,
                                      USR.EMAIL,
                                      USR.PHONE,
                                      SUBSCRIPTIONS.PLAN_ID,
                                      SUBSCRIPTIONS.START_DATE,
                                      SUBSCRIPTIONS.END_DATE,
                                      SUBSCRIPTIONS.VALIDITY,
                                      PLANS.NAME AS PLAN_NAME
                                    FROM PUBLIC.INVOICES INC
                                    JOIN PUBLIC.SUBSCRIPTIONS ON SUBSCRIPTIONS.ID = INC.SUBSCRIPTION_ID 
                                    JOIN PUBLIC.COMPANY COMP ON SUBSCRIPTIONS.COMPANY_ID = COMP.ID
                                    JOIN PUBLIC.USER USR ON USR.COMPANYID = COMP.ID
                                    JOIN PUBLIC.PLANS ON PLANS.ID = SUBSCRIPTIONS.PLAN_ID
                                    WHERE INC.ID = '${id}'`);
    return result.rows;
  } catch (error) {
    throw error;
  }
}

async function updateInvoice(invoice_id, record) {
  try {
    let invoiceData = [
      record.status,
      invoice_id
    ];

    const invoiceResult = await sql.query(
      `UPDATE public.invoices set status=$1 WHERE id=$2 RETURNING *`, invoiceData);
    if (invoiceResult.rows.length > 0) {
      return invoiceResult.rows;
    }
    return null;
  } catch (error) {
    throw error;
  }
}

async function findSubscriptionsForRenewal(end_date) {
  try {
    // const result = await sql.query(`SELECT subscriptions.*, invoices.total_amount, invoices.other_name FROM public.subscriptions JOIN public.invoices ON invoices.subscription_id = subscriptions.id WHERE end_date=$1`, [end_date]);
    // const result = await sql.query(`SELECT 
    //                                   subscriptions.*,
    //                                   invoices.total_amount,
    //                                   invoices.other_name,
    //                                   company.tenantcode,
    //                                   plans.name AS plan_name,
    //                                   plans.number_of_whatsapp_setting,
    //                                   plans.number_of_users,
    //                                   CASE
    //                                     WHEN subscriptions.validity = 1 THEN plans.pricepermonth
    //                                     ELSE plans.priceperyear
    //                                   END 
    //                                   AS plan_price
    //                                 FROM public.subscriptions 
    //                                 JOIN public.invoices ON invoices.subscription_id = subscriptions.id
    //                                 JOIN public.plans ON plans.id = subscriptions.plan_id
    //                                 JOIN public.company ON company.id = subscriptions.company_id
    //                                 LEFT JOIN public.subscriptions next_sub
    //                                 ON subscriptions.end_date = next_sub.start_date - INTERVAL '1 DAY'
    //                                 WHERE subscriptions.end_date = $1
    //                                 AND subscriptions.validity != 5
    //                                 AND next_sub.start_date IS NULL`, [end_date]);
    const result = await sql.query(`SELECT 
                                      subscriptions.*,
                                      users.firstname,
                                      users.lastname,
                                      users.email,
                                      invoices.total_amount,
                                      invoices.other_name,
                                      company.tenantcode,
                                      plans.name AS plan_name,
                                      plans.number_of_whatsapp_setting,
                                      plans.number_of_users,
                                      CASE
                                        WHEN subscriptions.validity = 1 THEN plans.pricepermonth
                                        ELSE plans.priceperyear
                                      END 
                                      AS plan_price
                                    FROM public.subscriptions 
                                    JOIN public.invoices ON invoices.subscription_id = subscriptions.id
                                    JOIN public.plans ON plans.id = subscriptions.plan_id
                                    JOIN public.company ON company.id = subscriptions.company_id
                                    JOIN public.user AS users ON users.companyid = company.id
                                    LEFT JOIN public.subscriptions next_sub ON subscriptions.end_date = next_sub.start_date - INTERVAL '1 DAY'
                                    WHERE subscriptions.end_date = $1 AND USERS.USERROLE = 'ADMIN'
                                    AND next_sub.start_date IS NULL`, [end_date]);
    if (result.rows.length > 0) return result.rows;
  } catch (error) {
    throw error;
  }
  return null;
}

async function hasExistingInvoices(companyId) {
  try {
      const query = `
          SELECT COUNT(*) as count 
          FROM public.invoices 
          WHERE subscription_id IN (
              SELECT id FROM public.subscriptions 
              WHERE company_id = $1
          ) AND status = 'Complete'
      `;

      const result = await sql.query(query, [companyId]);
      // Check if the count is greater than zero
      return result.rows[0].count > 0;
  } catch (error) {
      console.error('Error checking existing invoices:', error);
      throw new Error('Unable to determine if invoices exist for the company.');
  }
}

module.exports = { findAll, fetchByCompanyId, fetchInvoiceById, addInvoiceWithTransaction, updateInvoiceAddTrans, updateInvoice, fetchCompanyAndUserByInvoice, findSubscriptionsForRenewal, hasExistingInvoices, init };