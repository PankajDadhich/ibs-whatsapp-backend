const SYSTEM_DEFAULT_USER    = 'd7c04d66-7773-44c3-844c-eb2353dbcd88';
const ADMIN_ROLE_ID = '301a2779-73b0-45c4-902e-3acb9c932796';
const USER_ROLE_ID = 'c09d19b6-57f0-4d7e-bf24-18b556c3ddd7';
const LEAD_STATUS_VALUES =
    [
        {
            label: "Open - Not Contacted",
            sortorder: 1,
            is_converted: false,
            is_lost: false,
        },
        {
            label: "Working - Contacted",
            sortorder: 2,
            is_converted: false,
            is_lost: false,
        },
        {
            label: "Closed - Converted",
            sortorder: 3,
            is_converted: true,
            is_lost: false,
        },
        {
            label: "Closed - Not Converted",
            sortorder: 4,
            is_converted: false,
            is_lost: true,
        },
    ];

module.exports = {
    SYSTEM_DEFAULT_USER, ADMIN_ROLE_ID, USER_ROLE_ID,LEAD_STATUS_VALUES
                };
