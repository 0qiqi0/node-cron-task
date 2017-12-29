
'use strict';

let _           = require('underscore');
let MongoClient = require('mongodb').MongoClient;

//初始化数据库配置
global.MONGO_CONF = {};

//初始化数据库连接
global.MONGO_POOLS = {};

for (let server in global.MONGO) {
    let conf = global.MONGO[server];

    global.MONGO_CONF[server] = 'mongodb://'+ conf.user + ':' + conf.password + '@' +  conf.ip + ':' + conf.port + '/' + conf.db_name;
    
    if (conf.auth_source != undefined) {
        global.MONGO_CONF[server] += '?authSource=' + conf.auth_source;
    }
    else{
        global.MONGO_CONF[server] += '?authSource=admin';
    }
    
    if (conf.auth_mechanism != undefined) {
        global.MONGO_CONF[server] += '&authMechanism=' + conf.auth_mechanism;
    }
}

class Mongo {
    constructor() {
        this._db = null;
    }

    connect (db) {
        let self = this;

        if (global.MONGO_POOLS[db]) {
            self._db = global.MONGO_POOLS[db];

            return {
                res : "DB Connect Success!",
                err : null
            }
        }

        let url = global.MONGO_CONF[db];

        if (url == undefined) {
            return {
                res : "DB not exist!",
                err : true
            }
        }

        return new Promise((resolve, reject) => {
            MongoClient.connect(url, (error, conn) => {
                if (error) {
                    console.log(url);
                    console.log(error);
                    resolve({
                        res : error,
                        err : true
                    });
                } else {
                    self._db = global.MONGO_POOLS[db] = conn;

                    resolve({
                        res : "DB Connect Success!",
                        err : null
                    });
                }
            });
        });
    };

    close () {
        this._db.close();

        this._db = null;
    }

    // find
    find (col, where, fields, options) {
        let self = this;

        return new Promise((resolve, reject) => {
            self._db.collection(col).find(where, fields, options).toArray((error, result) => {
                if (error) {
                    resolve({
                        res : error,
                        err : true
                    });
                } else {
                    resolve({
                        res : result,
                        err : null
                    });
                }
            });
        });
    }

    // find One
    findOne (col, where, fields, options) {
        let self = this;

        return new Promise((resolve, reject) => {
            self._db.collection(col).findOne(where, fields, options, (error, result) => {
                if (error) {
                    resolve({
                        res : error,
                        err : true
                    });
                } else {
                    resolve({
                        res : result,
                        err : null
                    });
                }
            });
        });
    }

    // Distinct
    distinct (col, where) {
        let self = this;

        return new Promise((resolve, reject) => {
            self._db.collection(col).distinct(where, (error, result) => {
                if (error) {
                    resolve({
                        res : error,
                        err : true
                    });
                } else {
                    resolve({
                        res : result,
                        err : null
                    });
                }
            });
        });
    }

    // aggregate
    aggregate (col, where, offset, limit, sort, options) {
        let self = this;

        let conditions = [];

        if (_.isEmpty(where)) {
            return {
                res : "where can't be empty",
                err : true
            };
        }

        conditions.push(where);

        if (!_.isEmpty(offset)) {
            conditions.push(offset);
        }

        if (!_.isEmpty(limit)) {
            conditions.push(limit);
        }

        if (!_.isEmpty(sort)) {
            conditions.push(sort);
        }

        if (!_.isEmpty(options)) {
            conditions.push(options);
        }

        return new Promise((resolve, reject) => {
            self._db.collection(col).aggregate(conditions, (error, result) => {
                if (error) {
                    resolve({
                        res : error,
                        err : true
                    });
                } else {
                    resolve({
                        res : result,
                        err : null
                    });
                }
            });
        });
    }

    // insert
    insert (col, data, options) {
        let self = this;

        return new Promise((resolve, reject) => {
            self._db.collection(col).insert(data, options, (error, result) => {
                if (error) {
                    resolve({
                        res : error,
                        err : true
                    });
                } else {
                    resolve({
                        res : result,
                        err : null
                    });
                }
            });
        });
    }

    // update
    update (col, where, updateObj, options) {
        let self = this;

        return new Promise((resolve, reject) => {
            self._db.collection(col).update(where, updateObj, options, (error, result) => {
                if (error) {
                    resolve({
                        res : error,
                        err : true
                    });
                } else {
                    resolve({
                        res : result,
                        err : null
                    });
                }
            });
        });
    }

    // delete
    delete (col, where, options) {
        let self = this;

        return new Promise((resolve, reject) => {
            self._db.collection(col).remove(where, options, (error, result) => {
                if (error) {
                    resolve({
                        res : error,
                        err : true
                    });
                } else {
                    resolve({
                        res : result,
                        err : null
                    });
                }
            });
        });
    }
}

module.exports = new Mongo();
