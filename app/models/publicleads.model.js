const sql = require("./db.js");

async function getAllLeads() {
    let query = "SELECT ld.*, concat(ld.first_name, ' ', ld.last_name) AS name FROM public.leads ld ORDER BY ld.createddate DESC";
    let result = await sql.query(query);
    return result.rows.length > 0 ? result.rows : [];
}

//.......... Create Lead ..............................
async function createLead(newLead) {
    const query = `
    INSERT INTO public.leads (
      first_name, last_name, email, mobile_no, status, company, description, 
      state, city, street, country, zipcode, lostreason, convertedcompanyid )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, 
      $8, $9, $10, $11, $12, $13, $14
    )
    RETURNING *;
  `;

  const values = [
    newLead.first_name,
    newLead.last_name,
    newLead.email,
    newLead.mobile_no,
    newLead.status,
    newLead.company,
    newLead.description,
    newLead.state,
    newLead.city,
    newLead.street,
    newLead.country,
    newLead.zipcode,
    newLead.lostreason,
    newLead.convertedcompanyid || null,
  ];

  try {
    const result = await sql.query(query, values);
    if (result.rows.length > 0) {
        return result.rows[0];
    }
  } catch (error) {
    console.error("Error in Lead.createLead:", error);
    throw new Error("Database error while creating lead.");
  }
};


async function updateById(id, newLead) {
    delete newLead.id;
    delete newLead.name;
    delete newLead.invoice;
    const setClause = Object.keys(newLead).map((key, index) => `${key} = $${index + 1}`).join(', ');
    const query = `UPDATE public.leads SET ${setClause} WHERE id = $${Object.keys(newLead).length + 1} RETURNING *`;
    const values = [...Object.values(newLead), id];
    try {
        const result = await sql.query(query, values);
        if (result.rowCount > 0) {
            return result.rows[0];  
        } else {
            return null;  
        }
    } catch (error) {
        console.log('Error updating lead:', error);
        return null;  
    }
}


//.......... Delete Lead ..............................
async function deleteLead(id) {
    const result = await sql.query(`DELETE FROM public.leads WHERE id = $1`, [id]);
    return result.rowCount > 0 ? "Success" : null;
};

//.......... Duplicate Email Check Lead ..............................
async function checkEmailExists(email, id = null) {
    const query = `
        SELECT 1 
        FROM (
            SELECT id FROM public.leads WHERE email = $1 ${id ? "AND id != $2" : ""}
            UNION ALL
            SELECT id FROM public."user" WHERE email = $1
        ) subquery
        LIMIT 1;
    `;

    const params = id ? [email, id] : [email];
    const result = await sql.query(query, params);
    return result.rows.length > 0;
}


async function generatePublicLead(body) {
    try {
        const checkEmailQuery = `SELECT * FROM public.leads WHERE email='${body.email}'`;

        const result = await sql.query(checkEmailQuery);
        if (result.rows.length > 0) {
            let value = [body.firstname, body.lastname, body.mobile, result.rows[0].id];
            let query = `UPDATE public.leads SET first_name=$1, last_name=$2, mobile_no=$3 WHERE id = $4 RETURNING *`;

            const updateResult = await sql.query(query, value);
            if (updateResult.rows.length > 0) {
                return { id: updateResult.rows[0].id, ...body };
            }
        } else {
            let value = [body.firstname, body.lastname, body.email, body.mobile, body.status];
            let query = `INSERT INTO public.leads (first_name, last_name, email, mobile_no, status)  VALUES ($1, $2, $3, $4, $5) RETURNING *`;

            const createResult = await sql.query(query, value);
            if (createResult.rows.length > 0) {
                return { id: createResult.rows[0].id, ...body };
            }
        }
        return null;
    } catch (error) {
        console.log('error:', error);
    }
}

async function getOpenLeads() {
    try {
        let query = `SELECT * FROM public.leads WHERE status = 'Open - Not Contacted'`;
        const result = await sql.query(query);
        if (result.rows.length > 0) {
            return result.rows;
        } else {
            return [];
        }
    } catch (error) {
        console.log(error);
    }
}

module.exports = { getAllLeads, createLead, updateById, deleteLead, checkEmailExists, generatePublicLead, getOpenLeads };