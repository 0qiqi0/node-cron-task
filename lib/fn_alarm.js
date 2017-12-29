
'use strict';

const http = require("./http");

const url = "http://111.111.111.111";

const msg = async (to, content) => {
    return await http(url, {
        "Action"  : "SendEDMMsg",
        "To"      : to,
        "Content" : content
    }, true);
};

const email = async (to, subject, content) => {
    return await http(url, {
        "Action"  : 'SendEDMMail',
        "To"      : to,
        "Subject" : subject,
        "Content" : content
    }, true);
};

exports.msg = msg;

exports.email = email;
