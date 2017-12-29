
'use strict';

const nodemailer    = require("nodemailer");
const smtpTransport = require('nodemailer-smtp-transport');

// SMTP Transport
let transporter = nodemailer.createTransport(smtpTransport(global.SMTP));

const fn_send_mail = async (options) => {
    return await new Promise((resolve, reject) => {
        transporter.sendMail(options, (error) => {
            if (error) {
                resolve({
                    err : true,
                    res : error
                });
            } else {
                resolve({
                    err : null,
                    res : "mail send success !"
                });
            }
        });
    });
};

module.exports = fn_send_mail;
