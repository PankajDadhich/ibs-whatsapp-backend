const sql = require("./db.js");
const global = require("../constants/global.js");
const { execute } = require('@getvim/execute');
const dbConfig = require("../config/db.config.js");
const fs = require('fs');

function backup(tenantcode) {

    let DB_USER = dbConfig.USER;
    let DB_NAME = dbConfig.DB;
    let PGPASS = dbConfig.PASSWORD;
    let HOST = dbConfig.HOST;
    const date = new Date();
    const currentDate = `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}.${date.getHours()}.${date.getMinutes()}.${date.getMilliseconds()}`;
    //let uploadPath = process.env.FILE_UPLOAD_PATH + 'backup' + '/' + req.userinfo.tenantcode + '/' + req.params.id;
    let uploadPath = `${process.env.FILE_UPLOAD_PATH}backup/${tenantcode}`;
    if (!fs.existsSync(`${uploadPath}/${tenantcode}`)) {
        fs.mkdirSync(`${uploadPath}/${tenantcode}`, { recursive: true });
    }
    const fileName = `${uploadPath}/${tenantcode}/database-backup-${currentDate}.sql`;

    try {
        execute(`cp -r /home/files/${tenantcode}/ ${uploadPath}/${tenantcode}/`,).then(async () => {

            execute(`PGPASSWORD="${PGPASS}" pg_dump -U ${DB_USER} -h ${HOST} -d ${DB_NAME} -f ${fileName} -F c --no-password`,).then(async () => {

                execute(`tar -cf database-backup-${currentDate}.tar -C ${uploadPath}/${tenantcode}/ .`,).then(async () => {

                    execute(`rm -r ${uploadPath}/${tenantcode}`,).then(async () => {

                        execute(`mv database-backup-${currentDate}.tar ${uploadPath}/`,).then(async () => {

                            return { success: true }

                        }).catch(err => {
                            console.log(err);
                            return { success: false, errors: err }
                        })

                    }).catch(err => {
                        console.log(err);
                        return { success: false, errors: err }
                    })
                }).catch(err => {
                    console.log(err);
                    return { success: false, errors: err }
                })
            }).catch(err => {
                console.log(err);
                return { success: false, errors: err }
            })
        }).catch(err => {
            console.log(err);
            return { success: false, errors: err }
        })








        return { success: true, filePath: `database-backup-${currentDate}.tar` }

    } catch (error) {
        console.log(error)
    }

    return { success: true, filePath: `database-backup-${currentDate}.tar` }

};

module.exports = { backup };
