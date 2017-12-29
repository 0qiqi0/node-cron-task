'use strict';

let Mysql = require('./mysql_active_record');

//初始化数据库连接
global.MYSQL_POOLS = {};

exports.getConn = function(dbName) {
    if (global.MYSQL_POOLS[dbName] != undefined) {
        return global.MYSQL_POOLS[dbName];
    } else {
        //初始化数据库连接
        for (let server in global.MYSQL) {

            let conf = global.MYSQL[server];

            conf.connectionLimit = conf.connectionLimit || 10;

            global.MYSQL_POOLS[server] = new Mysql(conf);
        }

        return global.MYSQL_POOLS[dbName];
    }
};
