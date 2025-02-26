const sql = require("./db.js");

let schema = '';
function init(schema_name) {
    this.schema = schema_name;
}

// Get group by id
async function getRecordById(groupId) {
    let values = [groupId];
    let query = `
                SELECT 
                    grp.id, 
                    grp.name,
                    grp.status, 
                    grp.createddate,
                    gm.id AS groupmemberid, 
                    gm.member_id AS memberid,
                    COALESCE(
                         ur.firstname, ld.firstname  
                    ) AS member_firstname,
                    COALESCE(
                         ur.lastname, ld.lastname  
                    ) AS member_lastname,
                    COALESCE(
                        ur.whatsapp_number,
                        ld.whatsapp_number   
                    ) AS whatsapp_number  
                FROM 
                    ${this.schema}.groups grp 
                LEFT JOIN 
                    ${this.schema}.group_members gm ON gm.group_id = grp.id 
                LEFT JOIN 
                    ${this.schema}.user ur ON gm.member_id = ur.id  
                LEFT JOIN 
                    ${this.schema}.lead ld ON gm.member_id = ld.id
                WHERE
                    grp.id = $1
                ORDER BY grp.createddate DESC
                `;

    try {
        const result = await sql.query(query, values);

        if (result.rows.length > 0) {
            const group = result.rows[0];

            const groupedResult = {
                id: group.id,
                name: group.name,
                status: group.status,
                createddate: group.createddate,
                members: []
            };

            result.rows.forEach(row => {
                if (row.groupmemberid && row.memberid) {
                    if (row.member_firstname || row.member_lastname || row.whatsapp_number) {
                        groupedResult.members.push({
                            groupmemberid: row.groupmemberid,
                            memberid: row.memberid,
                            member_firstname: row.member_firstname,
                            member_lastname: row.member_lastname,
                            whatsapp_number: row.whatsapp_number
                        });
                    }
                }
            });

            return groupedResult;
        } else {
            return {
                id: groupId,
                name: null,
                status: null,
                createddate: null,
                members: []
            };
        }

    } catch (error) {
        console.log("Error fetching group:", error);
        return null;
    }
}


//................ Create Group ................
async function create(newGroup, userid) {
    delete newGroup.id;
    const result = await sql.query(
        `INSERT INTO ${this.schema}.groups (name, createdbyid, lastmodifiedbyid) VALUES ($1, $2, $3) RETURNING *`,
        [newGroup.name, userid, userid]
    );

    if (result.rows.length > 0) {
        return { id: result.rows[0].id, ...newGroup };
    } else {

        return null;
    }
}



//................ Create member ................
async function addMemberToGroup(groupId, memberId, userid) {
    const result = await sql.query(
        `INSERT INTO ${this.schema}.group_members (group_id, member_id, createdbyid, lastmodifiedbyid) VALUES ($1, $2, $3, $4) RETURNING *`,
        [groupId, memberId, userid, userid]
    );

    if (result.rows.length > 0) {
        return { id: result.rows[0].id, group_id: groupId, member_id: memberId };
    }
    return null;
}


//...... Fetch All Group .........................
async function findAllGroups(userinfo, status) {
    let values = [];
    let query = `
                SELECT 
                    grp.id, 
                    grp.name,
                    grp.status, 
                    grp.createddate,
                    gm.id AS groupmemberid, 
                    gm.member_id AS memberid,
                    COALESCE(
                        ur.firstname, ld.firstname, ''
                    ) AS member_firstname,
                    COALESCE(
                        ur.lastname, ld.lastname, ''
                    ) AS member_lastname,
                    COALESCE(
                        ur.whatsapp_number,
                        ld.whatsapp_number, ''
                    ) AS whatsapp_number

                FROM 
                    ${this.schema}.groups grp 
                LEFT JOIN 
                    ${this.schema}.group_members gm ON gm.group_id = grp.id 
                LEFT JOIN 
                    ${this.schema}.user ur ON gm.member_id = ur.id  
                LEFT JOIN 
                    ${this.schema}.lead ld ON gm.member_id = ld.id
                `;

    if (status) {
        query += ` WHERE grp.status = $${values.length + 1}`;
        values.push(status);
    }

    if (userinfo.userrole === 'USER' || userinfo.userrole === 'ADMIN') {
        if (values.length > 0) {
            query += ` AND (grp.createdbyid = $${values.length + 1})   OR grp.createdbyid IN (  SELECT id FROM ${this.schema}.user team WHERE managerid = $${values.length + 1})`;
        } else {
            query += ` WHERE (grp.createdbyid = $${values.length + 1})  OR grp.createdbyid IN (  SELECT id FROM ${this.schema}.user team WHERE managerid = $${values.length + 1})`;
        }
        values.push(userinfo.id);
    }

    query += " ORDER BY grp.createddate DESC";

    try {
        const result = await sql.query(query, values);

        const groupedResults = result.rows.reduce((acc, row) => {
            const groupId = row.id;

            if (!acc[groupId]) {
                acc[groupId] = {
                    id: groupId,
                    name: row.name,
                    status: row.status,
                    createddate: row.createddate,
                    members: []
                };
            }

            if (row.groupmemberid && row.memberid) {
                if (row.member_firstname || row.member_lastname || row.whatsapp_number) {
                    acc[groupId].members.push({
                        groupmemberid: row.groupmemberid,
                        memberid: row.memberid,
                        member_firstname: row.member_firstname,
                        member_lastname: row.member_lastname,
                        whatsapp_number: row.whatsapp_number
                    });
                }
            }

            return acc;
        }, {});

        const finalResult = Object.values(groupedResults);

        return finalResult || [];
    } catch (error) {
        console.log("Error executing query:", error);
        return [];
    }
}

//Get members by groupId
async function getMembersByGroupId(groupId) {
    const query = `SELECT member_id,group_id FROM ${this.schema}.group_members WHERE group_id = $1`;
    const results = await sql.query(query, [groupId]);
    return results.rows;
}

//delete members
async function deleteGroupMember(member_id) {
    try {
        const result = await sql.query(
            `DELETE FROM ${this.schema}.group_members WHERE id = $1`,
            [member_id]
        );

        return { rowCount: result.rowCount };
    } catch (error) {
        throw new Error('Database query failed');
    }
}



// Change group status
async function changeGroupStatus(group_id, status, userid) {
    try {
        const result = await sql.query(
            `UPDATE ${this.schema}.groups SET status = $2, lastmodifiedbyid = $3 WHERE id = $1`,
            [group_id, status, userid]
        );

        return { rowCount: result.rowCount };
    } catch (error) {
        throw new Error('Database query failed');
    }
}

// check duplicate name 
async function findByName(name) {
    const result = await sql.query(
        `SELECT * FROM ${this.schema}.groups WHERE name = $1`,
        [name]
    );
    return result.rows[0];
}



module.exports = {
    getRecordById,
    findAllGroups, findByName, create, addMemberToGroup, getMembersByGroupId, changeGroupStatus, deleteGroupMember, init
};
