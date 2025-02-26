/**
 * @author      Abdul Pathan
 * @date        Aug, 2024
 * @copyright   www.ibirdsservices.com
 */

const sql = require("./db.js");
const { execute } = require('@getvim/execute');
const dbConfig = require("../config/db.config.js");
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // Ensure you have installed node-fetch || npm install node-fetch@2
const wh_Setting = require("../models/whatsappsetting.model.js");

let schema = '';
function init(schema_name) {
    this.schema = schema_name;
}


async function singleMessageSend(reqBody, phoneNumber) {
    const { access_token: whatsapptoken, end_point_url, business_number_id } = await getWhatsAppSettingRecord(this.schema, phoneNumber);
    const endpoint = `${end_point_url}${business_number_id}/messages`;
    try {
        let response = await fetch(endpoint, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${whatsapptoken}`,
            },
            body: JSON.stringify(reqBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            // return (`Failed to send message: ${response.status} - ${errorText}`);
            let errorJson;

            try {
                errorJson = JSON.parse(errorText);
            } catch (parseError) {
                errorJson = { message: "Unable to parse error response", raw: errorText };
            }
            // throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
            return {
                error: {
                    message: errorJson?.error?.message || "Unknown error",
                    title: errorJson?.error?.error_user_title || "No title",
                    body: errorJson?.error?.error_user_msg || "No body",
                }

            };
        }

        return await response.json();

    } catch (error) {
        console.error('Error during message sending:', error);
         return {
            error: {
                message: error.message || "An unexpected error occurred",
            }
        };
    }
}


async function sendWhatsappTemplate(reqBody, phoneNumber) {


    const { access_token: whatsapptoken, end_point_url, business_number_id } = await getWhatsAppSettingRecord(this.schema, phoneNumber);
    const endpoint = `${end_point_url}${business_number_id}/messages`;
    try {
        let response = await fetch(endpoint, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${whatsapptoken}`,
            },
            body: JSON.stringify(reqBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson;

            try {
                errorJson = JSON.parse(errorText);
            } catch (parseError) {
                errorJson = { message: "Unable to parse error response", raw: errorText };
            }
            // throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
            return {
                error: {
                    message: errorJson?.error?.message || "Unknown error",
                    title: errorJson?.error?.error_user_title || "No title",
                    body: errorJson?.error?.error_user_msg || "No body",
                }

            };

        }
// console.log("response",response);
        return await response.json();

    } catch (error) {
        console.error('Error during message sending:', error);
        return {
            error: {
                message: error.message || "An unexpected error occurred",
            }
        };
    }
}



async function deleteTemplate(id, name, phoneNumber) {

    const { access_token: whatsapptoken, end_point_url, whatsapp_business_account_id } = await getWhatsAppSettingRecord(this.schema, phoneNumber);
    const endpoint = `${end_point_url}${whatsapp_business_account_id}/message_templates?hsm_id=${id}&name=${name}`;

    try {
        let response = await fetch(endpoint, {
            method: 'DELETE',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${whatsapptoken}`,
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson;

            try {
                errorJson = JSON.parse(errorText);
            } catch (parseError) {
                errorJson = { message: "Unable to parse error response", raw: errorText };
            }
            // throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
            return {
                error: {
                    message: errorJson?.error?.message || "Unknown error",
                    title: errorJson?.error?.error_user_title || "No title",
                    body: errorJson?.error?.error_user_msg || "No body",
                }

            };
        }

        return await response.json();

    } catch (error) {
        console.error('Error during message sending:', error);
         return {
            error: {
                message: error.message || "An unexpected error occurred",
            }
        };
    }
}

async function getAllTemplate(phoneNumber) {


    const { access_token: whatsapptoken, end_point_url, whatsapp_business_account_id } = await getWhatsAppSettingRecord(this.schema, phoneNumber);
    const endpoint = `${end_point_url}${whatsapp_business_account_id}/message_templates`;

    try {
        let response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${whatsapptoken}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson;

            try {
                errorJson = JSON.parse(errorText);
            } catch (parseError) {
                errorJson = { message: "Unable to parse error response", raw: errorText };
            }
            // throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
            return {
                error: {
                    message: errorJson?.error?.message || "Unknown error",
                    title: errorJson?.error?.error_user_title || "No title",
                    body: errorJson?.error?.error_user_msg || "No body",
                }

            };
        }

        return await response.json();

    } catch (error) {
        console.error('Error during message sending:', error);
         return {
            error: {
                message: error.message || "An unexpected error occurred",
            }
        };
    }
}

async function getTemplateByName(name, phoneNumber) {

    const { access_token: whatsapptoken, end_point_url, whatsapp_business_account_id } = await getWhatsAppSettingRecord(this.schema, phoneNumber);
    const endpoint = `${end_point_url}${whatsapp_business_account_id}/message_templates?name=${name}`;

    try {
        let response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${whatsapptoken}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson;

            try {
                errorJson = JSON.parse(errorText);
            } catch (parseError) {
                errorJson = { message: "Unable to parse error response", raw: errorText };
            }
            // throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
            return {
                error: {
                    message: errorJson?.error?.message || "Unknown error",
                    title: errorJson?.error?.error_user_title || "No title",
                    body: errorJson?.error?.error_user_msg || "No body",
                }

            };
        }

        return await response.json();

    } catch (error) {
        console.error('Error during message sending:', error);
         return {
            error: {
                message: error.message || "An unexpected error occurred",
            }
        };
    }

}


async function getTemplateById(id, phoneNumber) {

    const { access_token: whatsapptoken, end_point_url} = await getWhatsAppSettingRecord(this.schema, phoneNumber);
    const endpoint = `${end_point_url}${id}`;

    try {
        let response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${whatsapptoken}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson;

            try {
                errorJson = JSON.parse(errorText);
            } catch (parseError) {
                errorJson = { message: "Unable to parse error response", raw: errorText };
            }
            // throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
            return {
                error: {
                    message: errorJson?.error?.message || "Unknown error",
                    title: errorJson?.error?.error_user_title || "No title",
                    body: errorJson?.error?.error_user_msg || "No body",
                }

            };
        }

        return await response.json();

    } catch (error) {
        console.error('Error during message sending:', error);
         return {
            error: {
                message: error.message || "An unexpected error occurred",
            }
        };
    }

}



async function getAllApprovedTemplate(phoneNumber) {

    const { access_token: whatsapptoken, end_point_url, whatsapp_business_account_id } = await getWhatsAppSettingRecord(this.schema, phoneNumber);
    const endpoint = `${end_point_url}${whatsapp_business_account_id}/message_templates?status=APPROVED`;
    try {
        let response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${whatsapptoken}`,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson;

            try {
                errorJson = JSON.parse(errorText);
            } catch (parseError) {
                errorJson = { message: "Unable to parse error response", raw: errorText };
            }
            // throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
            return {
                error: {
                    message: errorJson?.error?.message || "Unknown error",
                    title: errorJson?.error?.error_user_title || "No title",
                    body: errorJson?.error?.error_user_msg || "No body",
                }

            };
        }

        return await response.json();
    } catch (error) {
        console.error('Error during message sending:', error);
         return {
            error: {
                message: error.message || "An unexpected error occurred",
            }
        };
    }
}

// Image upload
async function uplodaedImage(name, size, mimetype, phoneNumber) {

    const { access_token: whatsapptoken, end_point_url, app_id } = await getWhatsAppSettingRecord(this.schema, phoneNumber);
    const endpoint = `${end_point_url}${app_id}/uploads?file_name=${name}&file_length=${size}&file_type=${mimetype}&access_token=${whatsapptoken}`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson;

            try {
                errorJson = JSON.parse(errorText);
            } catch (parseError) {
                errorJson = { message: "Unable to parse error response", raw: errorText };
            }
            // throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
            return {
                error: {
                    message: errorJson?.error?.message || "Unknown error",
                    title: errorJson?.error?.error_user_title || "No title",
                    body: errorJson?.error?.error_user_msg || "No body",
                }

            };
        }

        return await response.json();

    } catch (error) {
        console.error('Error during message sending:', error);
         return {
            error: {
                message: error.message || "An unexpected error occurred",
            }
        };
    }
}

async function uplodaedImageSession(uploadSessionId, data, phoneNumber) {

    const { access_token: whatsapptoken, end_point_url } = await getWhatsAppSettingRecord(this.schema, phoneNumber);
    const endpoint = `${end_point_url}${uploadSessionId}`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                "Access-Control-Allow-Origin": "*",
                'Content-Type': 'application/octet-stream',
                'Content-Type': 'multipart/form-data',
                'Authorization': `OAuth ${whatsapptoken}`,
                'file_offset': '0',
            },
            body: data,
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson;

            try {
                errorJson = JSON.parse(errorText);
            } catch (parseError) {
                errorJson = { message: "Unable to parse error response", raw: errorText };
            }
            // throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
            return {
                error: {
                    message: errorJson?.error?.message || "Unknown error",
                    title: errorJson?.error?.error_user_title || "No title",
                    body: errorJson?.error?.error_user_msg || "No body",
                }

            };
        }

        return await response.json();

    } catch (error) {
        console.error('Error during message sending:', error);
         return {
            error: {
                message: error.message || "An unexpected error occurred",
            }
        };
    }
}



async function updateTemplate(id, reqBody, phoneNumber) {


    const { access_token: whatsapptoken, end_point_url } = await getWhatsAppSettingRecord(this.schema, phoneNumber);
    const endpoint = `${end_point_url}${id}`;

    try {
        let response = await fetch(endpoint, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${whatsapptoken}`,
            },
            body: JSON.stringify(reqBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson;

            try {
                errorJson = JSON.parse(errorText);
            } catch (parseError) {
                errorJson = { message: "Unable to parse error response", raw: errorText };
            }
            // throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
            return {
                error: {
                    message: errorJson?.error?.message || "Unknown error",
                    title: errorJson?.error?.error_user_title || "No title",
                    body: errorJson?.error?.error_user_msg || "No body",
                }

            };
        }

        return await response.json();

    } catch (error) {
        console.error('Error during message sending:', error);
         return {
            error: {
                message: error.message || "An unexpected error occurred",
            }
        };
    }
}

async function createTemplate(reqBody, phoneNumber) {

    const { access_token: whatsapptoken, end_point_url, whatsapp_business_account_id } = await getWhatsAppSettingRecord(this.schema, phoneNumber);
    const endpoint = `${end_point_url}${whatsapp_business_account_id}/message_templates`;
console.log("endpoint", endpoint);
console.log("JSON.stringify(reqBody)", JSON.stringify(reqBody));
console.log("endpoint",process.env.BASE_API_URL);

try {
        let response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${whatsapptoken}`,
            },
            body: JSON.stringify(reqBody),
        });
console.log("response",response)
        if (!response.ok) {
            const errorText = await response.text();
            let errorJson;

            try {
                errorJson = JSON.parse(errorText);
            } catch (parseError) {
                errorJson = { message: "Unable to parse error response", raw: errorText };
            }
            // throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
            return {
                error: {
                    message: errorJson?.error?.message || "Unknown error",
                    title: errorJson?.error?.error_user_title || "No title",
                    body: errorJson?.error?.error_user_msg || "No body",
                }

            };
        }

        return await response.json();

    } catch (error) {
        console.error('Error during message sending:', error);
         return {
            error: {
                message: error.message || "An unexpected error occurred",
            }
        };
    }
}

async function upsertAuthTemplate(reqBody, phoneNumber) {

    const { access_token: whatsapptoken, end_point_url, whatsapp_business_account_id } = await getWhatsAppSettingRecord(this.schema, phoneNumber);
    const endpoint = `${end_point_url}${whatsapp_business_account_id}/upsert_message_templates`;

    try {
        let response = await fetch(endpoint, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${whatsapptoken}`,
            },
            body: JSON.stringify(reqBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson;

            try {
                errorJson = JSON.parse(errorText);
            } catch (parseError) {
                errorJson = { message: "Unable to parse error response", raw: errorText };
            }
            // throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
            return {
                error: {
                    message: errorJson?.error?.message || "Unknown error",
                    title: errorJson?.error?.error_user_title || "No title",
                    body: errorJson?.error?.error_user_msg || "No body",
                }

            };
        }

        return await response.json();

    } catch (error) {
        console.error('Error during message sending:', error);
         return {
            error: {
                message: error.message || "An unexpected error occurred",
            }
        };
    }
}


// upload Documents get id
async function uploadDocumentWithApi(file, phoneNumber) {


    const { access_token: whatsapptoken, end_point_url, business_number_id } = await getWhatsAppSettingRecord(this.schema, phoneNumber);
    const endpoint = `${end_point_url}${business_number_id}/media`;

    try {
        let response = await fetch(endpoint, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Access-Control-Allow-Origin': "*",
                'Access-Control-Allow-Headers': "*",
                'Authorization': `Bearer ${whatsapptoken}`,
            },
            body: file,
            redirect: 'follow'
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorJson;

            try {
                errorJson = JSON.parse(errorText);
            } catch (parseError) {
                errorJson = { message: "Unable to parse error response", raw: errorText };
            }
            // throw new Error(`Failed to send message: ${response.status} - ${errorText}`);
            return {
                error: {
                    message: errorJson?.error?.message || "Unknown error",
                    title: errorJson?.error?.error_user_title || "No title",
                    body: errorJson?.error?.error_user_msg || "No body",
                }

            };
        }

        return await response.json();

    } catch (error) {
        console.error('Error during message sending:', error);
         return {
            error: {
                message: error.message || "An unexpected error occurred",
            }
        };
    }
}

async function getWhatsAppSettingRecord(schemaName, phoneNumber) {

    const name = schemaName;
    // console.log("schemaName, phoneNumber",schemaName, phoneNumber);
    try {
        wh_Setting.init(name);
        const tokenAccess = await wh_Setting.getWhatsAppSettingData(phoneNumber);
        return tokenAccess;
    } catch (error) {
        console.error('Error getting WhatsApp settings:', error.message);
        throw error;
    }
}



module.exports = {
    singleMessageSend, sendWhatsappTemplate, deleteTemplate, getAllTemplate, getAllApprovedTemplate,
    uplodaedImage, uplodaedImageSession, updateTemplate, createTemplate, upsertAuthTemplate, init,
    uploadDocumentWithApi, getTemplateByName, getTemplateById
};