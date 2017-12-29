
const _      = require('underscore');
const moment = require('moment');
const log4js = require('log4js');

// TODO 添加自定义库
const config = require('./config.json');

global.MYSQL = config.mysql;

var Mysql = require('../../lib/mysql');

process.on('message', async (msg) => {
    // msg信息: id, name, script, create, ttl, notify

    // 进程回包 ✔
    process.send({ id : msg.id });

    let log_path = msg.script.split("scripts/");
    log_path[1] = log_path[1].split("/").join("_").replace(".js", ".log");

    log_path = log_path.join("logs/");

    // 日志配置 ✔
    log4js.configure({
        "appenders" : {
            "cron_task" : {
                "type"     : "file",
                "filename" : log_path
            }
        },
        "categories" : {
            "default" : {
                "appenders" : ["cron_task"],
                "level"     : "info"
            }
        }
    });

    // 创建一个日志实例 ✔
    const logger = log4js.getLogger();

    // 逻辑代码区 ✔
    try {
        // 脚本开始
        logger.info(`Child Process Start, ID: ${msg.id}, Time: ${moment().format("YYYY-MM-DD HH:mm:ss")}`);

        // ==================================================================================================

        // 初始化MySql连接
        let master = Mysql.getConn("db_name");


        var {err, res} = await master.query("SHOW SLAVE STATUS;");

        if (err) {
            logger.info(`获取67 Master Status 数据失败, Error Info: ${JSON.stringify(res)}`);

            await new Promise((resolve, reject) => {
                setTimeout(() => {
                    resolve();
                }, 3000);
            });

            process.exit(-1);
        }

        logger.info(`67 slave status ${JSON.stringify(res.retObject.results)}`);

        // ==================================================================================================
        // 脚本退出
        logger.info(`Child Process End, ID: ${msg.id}, Time: ${moment().format("YYYY-MM-DD HH:mm:ss")}`);

    } catch (e) {
        // 输出报错日志
        console.log(e)
        console.log(e.stack)

        process.exit(-1);
    }

    // 留出时间打log
    await new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, 3000);
    });

    process.exit(0);
});
