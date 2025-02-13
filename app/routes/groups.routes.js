/**
 * Handles all incoming request for /api/groups endpoint
 * DB table for this ibs_meta_whatsapp.groups
 * Model used here is groups.model.js
 * SUPPORTED API ENDPOINTS
 *              GET     /api/groups
 *              GET     /api/groups/:id
 *              POST    /api/groups
 *              PUT     /api/groups/:id
 *              DELETE  /api/groups/:id
 * 
 * @author      Shivani Merha
 * @date        Sep, 2023
 * @copyright   www.ibirdsservices.com  
 */

const e = require("express");
const { fetchUser } = require("../middleware/fetchuser.js");
const groupsModal = require("../models/groups.model.js");

module.exports = app => {
    const { body, validationResult } = require('express-validator');
    var router = require("express").Router();

    // .....................................Get All Groups........................................
    router.get("/:?", fetchUser, async (req, res) => {
        groupsModal.init(req.userinfo.tenantcode);
        const { status } = req.query;

        const groups = await groupsModal.findAllGroups(req.userinfo, status);

        if (groups && groups.length > 0) {
            res.status(200).json({ success: true, records: groups });
        } else {
            res.status(200).json({ success: false, message: "No data found" });
        }
    });

    router.post("/", fetchUser, [body('name', 'Please enter Group Name').isLength({ min: 1 }),], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name } = req.body;

        let members = req.body.members;
        if (typeof members === 'string') {
            try {
                members = JSON.parse(members);
            } catch (error) {
                return res.status(400).json({ errors: [{ msg: 'Invalid format for members' }] });
            }
        }

        try {
            groupsModal.init(req.userinfo.tenantcode);
            const existingGroup = await groupsModal.findByName(name);
            if (existingGroup) {
                return res.status(200).json({ "success": false, "error": "Group name already exists. Please choose another name" });
            }

            const groupRec = await groupsModal.create({ name }, req.userinfo.id);

            if (!groupRec) {
                return res.status(400).json({ errors: "Failed to create group" });
            }

            for (const member of members) {
                const { member_id } = member;
                if (!member_id) {
                    return res.status(400).json({ errors: `Member is missing member_id` });
                }
                const memberRec = await groupsModal.addMemberToGroup(groupRec.id, member_id, req.userinfo.id);

                if (!memberRec) {
                    return res.status(400).json({ errors: `Failed to add member with ID ${member_id}` });
                }
            }
            return res.status(200).json({ success: true, message: "Group created successfully" });


        } catch (error) {
            return res.status(500).json({ error: "Internal Server Error" });
        }
    });

    //......................................Get group by Id.................................
    router.get("/:id", fetchUser, async (req, res) => {

        groupsModal.init(req.userinfo.tenantcode);

        try {
            let result = await groupsModal.getRecordById(req.params.id);

            if (result) {
                return res.status(200).json({ success: true, records: result });
            } else {
                return res.status(200).json({ "success": false, "message": "No record found" });
            }
        } catch (error) {
            return res.status(400).json({ "success": false, "message": error });
        }
    });



    //.....................................Delete member by Id.................................

    router.delete('/member/:member_id', fetchUser, async (req, res) => {
        const { member_id } = req.params;

        try {
            groupsModal.init(req.userinfo.tenantcode);
            const result = await groupsModal.deleteGroupMember(member_id);
            if (result && result.rowCount > 0) {
                res.status(200).json({ "success": true, message: 'Member deleted successfully' });
            } else {
                res.status(404).json({ "success": false, message: 'Member not found' });
            }
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }
    });

    //.....................................Add more member by groupId.................................

    router.post('/add_members/:groupId', fetchUser, async (req, res) => {
        const groupId = req.params.groupId;

        let members;
        try {
            members = JSON.parse(req.body.members);
        } catch (error) {
            return res.status(400).json({ message: "Invalid members data format." });
        }

        try {
            groupsModal.init(req.userinfo.tenantcode);
            const existingMembers = await groupsModal.getMembersByGroupId(groupId);
            const existingMemberIds = new Set(existingMembers.map(member => member.member_id));

            const newMembers = members.filter(member => !existingMemberIds.has(member.member_id));

            const results = [];
            for (const member of newMembers) {
                const { member_id, createdById } = member;

                const result = await groupsModal.addMemberToGroup(groupId, member_id, createdById);
                if (result) {
                    results.push(result);
                }
            }

            res.status(200).json({ "success": true, members: results });
        } catch (error) {
            res.status(500).json({ message: "Failed to add members to group" });
        }
    });


    //.....................................Change status.................................

    router.put('/:group_id/status', fetchUser, async (req, res) => {
        const { group_id } = req.params;
        const { status } = req.body;

        try {
            groupsModal.init(req.userinfo.tenantcode);
            const result = await groupsModal.changeGroupStatus(group_id, status, req.userinfo.id);

            if (result && result.rowCount > 0) {
                res.status(200).json({ success: true, message: 'Group status updated successfully' });
            } else {
                res.status(404).json({ success: false, message: 'Group not found' });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    });


    app.use(process.env.BASE_API_URL + '/api/whatsapp/groups', router);
};