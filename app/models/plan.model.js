/**
 * @author      Shivani Mehra
 * @date        Nov, 2024
 * @copyright   www.ibirdsservices.com
 */

const sql = require("./db.js");

let schema = '';
function init(schema_name) {
    this.schema = schema_name;
}

async function getAllRecords(status = null) {
    try {
        let params = [];
        
        let query = `
                 SELECT 
                p.id AS plan_id,
                p.name AS plan_name,
                p.pricepermonth,
                p.priceperyear,
                p.status,
                p.number_of_whatsapp_setting,
                p.number_of_users,
                ARRAY_AGG(
                    json_build_object(
                        'id', m.id,
                        'name', m.name
                    )
                ) FILTER (WHERE m.id IS NOT NULL) AS modules
            FROM 
                public.plans p
            LEFT JOIN 
                public.plan_module pm ON p.id = pm.planid
            LEFT JOIN 
                public.module m ON pm.moduleid = m.id
        `;

        if (status !== null) {
            query += ` WHERE p.status = $1`;
            params.push(status);
        }

        query += `
            GROUP BY 
                p.id
            ORDER BY 
                p.name ASC
        `;

        let result = await sql.query(query, params);


        if (result.rows.length > 0) {
            return result.rows;
        }
        return null;
    } catch (error) {
        console.error("Error fetching plans:", error);
        throw error;
    }
}




// async function createRecord(reqBody) {

//     const result = await sql.query(`INSERT INTO public.plans(name, status, pricepermonth, priceperyear, number_of_whatsapp_setting, number_of_users ) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
//         [ reqBody.name, reqBody.status, reqBody.pricepermonth, reqBody.priceperyear, reqBody.number_of_whatsapp_setting, reqBody.number_of_users]);
//         if (result.rows.length > 0) {
//             return result.rows[0];
//           }
//           return null;
// };

async function createRecord(planInfo, planModules) {
    const { name, status, price_per_month, price_per_year, number_of_whatsapp_setting, number_of_users} = planInfo;

    try {
        await sql.query("BEGIN");

        // Insert into the `plans` table
        const planResult = await sql.query(
            `INSERT INTO public.plans(name, status, pricepermonth, priceperyear, number_of_whatsapp_setting, number_of_users) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [name, status, price_per_month, price_per_year, number_of_whatsapp_setting, number_of_users]
        );

        if (planResult.rows.length === 0) {
            throw new Error("Failed to insert plan.");
        }

        const planId = planResult.rows[0].id; 

        for (const module of planModules) {
            await sql.query(
                `INSERT INTO public.plan_module(planid, moduleid) VALUES ($1, $2)`,
                [planId, module.id]
            );
        }

        await sql.query("COMMIT"); 
        return planResult.rows[0]; 
    } catch (error) {
        await sql.query("ROLLBACK");
        console.error("Error during plan insert transaction:", error);
        return null;
    } 
}



async function updateRecord(planId, planInfo, planModules) {
    const { name, status, price_per_month, price_per_year, number_of_whatsapp_setting, number_of_users } = planInfo;
    try {
        await sql.query("BEGIN");

        const planResult = await sql.query(
            `UPDATE public.plans 
             SET name = $1, status = $2, pricepermonth = $3, priceperyear = $4, number_of_whatsapp_setting = $5, number_of_users = $6 
             WHERE id = $7 RETURNING *`,
            [name, status, price_per_month, price_per_year, number_of_whatsapp_setting, number_of_users, planId]
        );

        if (planResult.rows.length === 0) {
            throw new Error("Failed to update plan.");
        }

        await sql.query(
            `DELETE FROM public.plan_module WHERE planid = $1`,
            [planId]
        );

        for (const module of planModules) {
            await sql.query(
                `INSERT INTO public.plan_module(planid, moduleid) VALUES ($1, $2)`,
                [planId, module.id]
            );
        }

        await sql.query("COMMIT");
        return planResult.rows[0]; 
    } catch (error) {
        await sql.query("ROLLBACK");
        console.error("Error during plan update transaction:", error);
        return null;
    }
}

async function deleteRecord(id) {
    try {
        await sql.query('BEGIN');

        await sql.query(`DELETE FROM public.plan_module WHERE planid = $1`, [id]);
        const result = await sql.query(`DELETE FROM public.plans WHERE id = $1`, [id]);

        await sql.query('COMMIT');

        if (result.rowCount > 0) {
            return "Success";
        }
        return null;
    } catch (error) {
        await sql.query('ROLLBACK');
        console.error("Error deleting record:", error);
        throw error;
    }
}

async function fetchActiveRecords() {
    try {
        const result = await sql.query(`SELECT * FROM public.plans WHERE status='active'`);
        return result.rows;
      } catch (error) {
        throw error;
      }
}

async function findByPlanId(id) {
    const result = await sql.query(
        `
        SELECT 
            p.id AS plan_id,
            p.name AS plan_name,
            p.pricepermonth,
            p.priceperyear,
            p.number_of_users,
            p.status AS plan_status,
            p.number_of_whatsapp_setting,
            m.id AS module_id,
            m.name AS module_name,
            m.api_name,
            m.icon,
            m.url,
            m.icon_type,
            m.parent_module,
            m.order_no
        FROM 
            public.plans p
        LEFT JOIN 
            public.plan_module pm ON p.id = pm.planid
        LEFT JOIN 
            public.module m ON pm.moduleid = m.id
        WHERE 
            p.id = $1
        `,
        [id]
    );

    if (result.rows.length > 0) {
        // Organize results into a structured format
        const plan = {
            id: result.rows[0].plan_id,
            name: result.rows[0].plan_name,
            pricepermonth: result.rows[0].pricepermonth,
            priceperyear: result.rows[0].priceperyear,
            number_of_users: result.rows[0].number_of_users,
            status: result.rows[0].plan_status,
            number_of_whatsapp_setting: result.rows[0].number_of_whatsapp_setting,
            modules: result.rows
                .filter(row => row.module_id) // Exclude plans with no associated modules
                .map(row => ({
                    id: row.module_id,
                    name: row.module_name,
                    api_name: row.api_name,
                    icon: row.icon,
                    url: row.url,
                    icon_type: row.icon_type,
                    parent_module: row.parent_module,
                    order_no: row.order_no,
                }))
        };

        return plan;
    }

    return null;
}


module.exports = { getAllRecords, createRecord, updateRecord, deleteRecord, fetchActiveRecords, findByPlanId, init };
