'use strict';

let request     = require("request");
let querystring = require("querystring");

const get = (uri, timeout) => {
    return new Promise((resolve, reject) => {
        request({
            uri     : uri,
            method  : "GET",
            timeout : timeout || 8000
        }, function(error, response, body) {
            if (error) {
                resolve({
                    "res" : error,
                    "err" : true
                });
            } else {
                resolve({
                    "res" : JSON.parse(body),
                    "err" : null
                });
            }
        });
    });
};

const post = (uri, data, timeout) => {
    return new Promise((resolve, reject) => {
        request({
            uri     : uri,
            method  : "POST",
            json    : true,
            body    : data,
            timeout : timeout || 8000
        }, function(error, response, body) {
            if (error) {
                resolve({
                    "res" : error,
                    "err" : true
                });
            } else {
                resolve({
                    "res" : body,
                    "err" : null
                });
            }
        });
    });
};

module.exports = async (url, params, use_post, timeout=60000) => {
    if (!use_post) {
        url += ("/?" + querystring.stringify(params));
    }

    return use_post ? await post(url, params, timeout) : await get(url, timeout);
};
