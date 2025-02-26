const sql = require("../models/db.js");
const cron = require('node-cron');
const moment = require('moment');

const Invoice = require("../models/invoice.model.js");
const Mailer = require("../models/mail.model.js");


// cron.schedule("0 */20 * * *", async function () {
//     console.log('--------------- Subscription Schedular ----------------------');
//     await sql.query("BEGIN");
//     // let date = moment().add(1, 'Days').format('YYYY-MM-DD');
//     try {
//         let date = moment().format('YYYY-MM-DD');
//         // let date = '2024-11-10';
//         let plansForRenewal = await Invoice.findSubscriptionsForRenewal(date);

//         if (plansForRenewal) {
//             plansForRenewal.map(async (data, index) => {
//                 const date = moment(data.end_date).add(1, 'days');
//                 const start_date = moment(data.end_date).add(1, 'days').format('YYYY-MM-DD');
//                 var end_date;
//                 var due_date;
//                 var invoiceStatus;  

//                 // if (data.plan_id !== '86a3b58b-99c4-4c48-bb47-eb3c6d048668') {
//                 if (data.plan_name.toLowerCase() !== 'free') {
//                     end_date = date.add(data.validity, 'months').format('YYYY-MM-DD');
//                     validity = data.validity;
//                     due_date = moment(data.end_date).add(11, 'days').format('YYYY-MM-DD');
//                     invoiceStatus = 'Pending';

//                     let total_amount = data?.plan_price ?? 0;
                
//                     let subscriptionData = [
//                         data.company_id,
//                         data.plan_id,
//                         start_date,
//                         end_date,
//                         data.validity
//                     ];

//                     const subscriptionResult = await sql.query(`INSERT INTO public.subscriptions(company_id, plan_id, start_date, end_date, validity) VALUES ($1, $2, $3, $4, $5) RETURNING *`, subscriptionData);

//                     if (subscriptionResult.rows.length > 0) {
//                         let subscriptionId = subscriptionResult?.rows[0]?.id;
//                         let invoiceData = [
//                             subscriptionId,
//                             start_date,
//                             total_amount,
//                             invoiceStatus,
//                             due_date,
//                             data.other_name
//                         ];
//                         // console.log(subscriptionData, invoiceData);

//                         const invoiceResult = await sql.query(`INSERT INTO public.invoices(subscription_id, invoice_date, total_amount, status, payment_due_date, other_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, invoiceData);

//                         if (invoiceResult.rows.length > 0) {
//                             await sql.query("COMMIT");

//                             let subject = "Important: Your Subscription is About to Expire!";
//                             let body = `<html><body><p>Dear${' ' + data.firstname + ' ' + data.lastname},</p><p>We hope you have enjoyed your subscription to <b>Watconnect</b>! We wanted to remind you that your current subscription will expire on ${moment(data.end_date).format('DD-MM-YYYY')}.</p><p>To ensure uninterrupted access to all the features and benefits of <b>Watconnect</b>, we recommend renewing your subscription as soon as possible.</p><p>Best regards,</p></body></html>`;

//                             const emailData = {
//                                 name: data.firstname + ' ' + data.lastname,
//                                 end_date: moment(data.end_date).format('DD-MM-YYYY')
//                             }

//                             Mailer.sendEmail(data.email, emailData, '', "subscription_expire");
//                         }
//                     } else {
//                         console.log('Error in creating subscriptions');
//                         await sql.query("ROLLBACK");
//                     }
//                 }else{
//                     let company_id = data.company_id;
//                     const companyQry = sql.query(`UPDATE public.company SET isactive=$2 WHERE id=$1 RETURNING *`, [company_id, false]);

//                     if((await companyQry).rows.length > 0){
//                         const userQry = sql.query(`UPDATE public.user SET isactive=$2 WHERE companyid=$1 RETURNING *`, [company_id, false]);

//                         if(userQry.rows.length > 0){
//                             await sql.query("COMMIT");

//                             let subject = "Your Free Subscription Plan is Expiring!";
//                             let body = `<html><body><p>Dear${' ' + data.firstname + ' ' + data.lastname},</p><p>We hope you've enjoyed your free subscription to <b>Watconnect</b>!</p><p>We wanted to let you know that your free subscription plan will expire on ${moment(data.end_date).format('DD-MM-YYYY')}. To continue enjoying all the great features and benefits of <b>Watconnect</b>, you can upgrade to one of our premium plans.</p><p>Best regards</p></body></html>`;

//                             const emailData = {
//                                 name: data.firstname + ' ' + data.lastname,
//                                 end_date: moment(data.end_date).format('DD-MM-YYYY')
//                             }

//                             Mailer.sendEmail(data.email, emailData, '', "free_subscription_expire");

//                         } else{
//                             console.log('Error in updating subscriptions');
//                             await sql.query("ROLLBACK");
//                         }
//                     }else{
//                         console.log('Error in updating subscriptions');
//                         await sql.query("ROLLBACK");
//                     }
//                 }
//             });
//         }
//     } catch (error) {
//         await sql.query("ROLLBACK");
//         console.error("eror", error); // or throw error;
//         throw error;
//     }
//     return null;
// });

cron.schedule("0 */20 * * *", async function () {
    console.log('--------------- Subscription Scheduler ----------------------');
    
    try {
        let date = moment().format('YYYY-MM-DD');
        let plansForRenewal = await Invoice.findSubscriptionsForRenewal(date);

        if (plansForRenewal && plansForRenewal.length > 0) {
            for (let data of plansForRenewal) {
                const tenantSchema = data.tenantcode; // Fetch the correct schema
                const date = moment(data.end_date).add(1, 'days');
                const start_date = date.format('YYYY-MM-DD');
                let end_date, due_date, invoiceStatus;  

                await sql.query("BEGIN"); // Start transaction

                if (data.plan_name.toLowerCase() !== 'free') {
                    end_date = date.add(data.validity, 'months').format('YYYY-MM-DD');
                    due_date = moment(data.end_date).add(11, 'days').format('YYYY-MM-DD');
                    invoiceStatus = 'Pending';

                    let total_amount = data?.plan_price ?? 0;
                    let subscriptionData = [
                        data.company_id,
                        data.plan_id,
                        start_date,
                        end_date,
                        data.validity
                    ];

                    const subscriptionResult = await sql.query(`
                        INSERT INTO public.subscriptions (company_id, plan_id, start_date, end_date, validity) 
                        VALUES ($1, $2, $3, $4, $5) RETURNING *`, subscriptionData
                    );

                    if (subscriptionResult.rows.length > 0) {
                        let subscriptionId = subscriptionResult.rows[0].id;
                        let invoiceData = [
                            subscriptionId,
                            start_date,
                            total_amount,
                            invoiceStatus,
                            due_date,
                            data.other_name
                        ];

                        const invoiceResult = await sql.query(`
                            INSERT INTO public.invoices (subscription_id, invoice_date, total_amount, status, payment_due_date, other_name) 
                            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, invoiceData
                        );

                        if (invoiceResult.rows.length > 0) {
                            await sql.query("COMMIT");

                            let emailData = {
                                name: `${data.firstname} ${data.lastname}`,
                                end_date: moment(data.end_date).format('DD-MM-YYYY')
                            };
                            Mailer.sendEmail(data.email, emailData, '', "subscription_expire");
                        }
                    } else {
                        console.log('Error in creating subscriptions');
                        await sql.query("ROLLBACK");
                    }
                } else {
                    let company_id = data.company_id;
                    
                    const companyQry = await sql.query(`
                        UPDATE public.company SET isactive = $2 WHERE id = $1 RETURNING *`, 
                        [company_id, false]
                    );

                    if (companyQry.rows.length > 0) {
                        const userQry = await sql.query(`
                            UPDATE ${tenantSchema}.user SET isactive = $2 WHERE companyid = $1 RETURNING *`, 
                            [company_id, false]
                        );

                        if (userQry.rows.length > 0) {
                            await sql.query("COMMIT");

                            let emailData = {
                                name: `${data.firstname} ${data.lastname}`,
                                end_date: moment(data.end_date).format('DD-MM-YYYY')
                            };
                            Mailer.sendEmail(data.email, emailData, '', "free_subscription_expire");
                        } else {
                            console.log('Error in updating user status');
                            await sql.query("ROLLBACK");
                        }
                    } else {
                        console.log('Error in updating company status');
                        await sql.query("ROLLBACK");
                    }
                }
            }
        }
    } catch (error) {
        await sql.query("ROLLBACK");
        console.error("Error in subscription scheduler:", error);
        throw error;
    }
});
