
'use strict';

let redis = require('redis');

//初始化连接池
global.REDIS_POOL = {};

class Redis {
    constructor () {
        this._client = null;
    }

    connect (name) {
        let self = this;

        if (global.REDIS_POOL[name]) {
            self._client = global.REDIS_POOL[name];

            return {
                res : "Redis Connect Success!",
                err : null
            };
        }

        let option = global.REDIS[name];

        if (option == undefined) {
            return {
                res : "Redis Not Exist!",
                err : true
            };
        }

        let client = redis.createClient({
            host           : option.host,
            port           : option.port,
            auth_pass      : option.password,
            retry_strategy : function (options) {
                if (options.error && options.error.code === 'ECONNREFUSED') {
                    // End reconnecting on a specific error and flush all commands with a individual error
                    return new Error('The server refused the connection');
                }

                if (options.total_retry_time > 1000 * 60 * 60) {
                    // End reconnecting after a specific timeout and flush all commands with a individual error
                    return new Error('Retry time exhausted');
                }

                if (options.times_connected > 60) {
                    // End reconnecting with built in error
                    return undefined;
                }

                // reconnect after
                return Math.min(options.attempt * 100, 3000);
            }
        });

        client.on("ready", () => {
            if (option.db != undefined) {
                client.select(option.db);
            }

            self._client = global.REDIS_POOL[name] = client;
        });

        client.on("reconnecting", () => {
            delete global.REDIS_POOL[name];
            self._client = null;
        });

        client.on("end", function() {
            delete global.REDIS_POOL[name];
            self._client = null;
        });

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve({
                    res : "Redis Connect Timeout!",
                    err : true
                });
            }, 8000);

            client.once("ready", () => {
                resolve({
                    res : "Redis Connect Success!",
                    err : null
                })
            });
        });
    }

    exec () {
        let self = this;
        let [func, ...args] = [].slice.call(arguments);

        return new Promise((resolve, reject) => {
            args.push((error, result) => {
                if (error) {
                    resolve({
                        res : error,
                        err : true
                    });
                } else {
                    resolve({
                        res : result,
                        err : null
                    })
                }
            });

            self._client[func](...args);
        });
    }
}

module.exports = new Redis();
