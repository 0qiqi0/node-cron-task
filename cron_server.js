/**
 * Date : 2017-12-13
 * By   : yinlianhua@ucloud.cn
 **/

'use strict';

const moment = require('moment');
const init   = require('./init');

// 1.初始化配置 ✔
init();

// 2.创建任务管理器 ✔
const task = require('./core/task');

let Task = new task();

const Mongo = require('./lib/mongo_v3');

// 3.每隔60s执行循环执行 ✔
setInterval(async () => {
    try {
        // 1.设置std_time
        let std_time = moment().unix();

        // 2.获取任务列表
        // 2.1 连接DB
        await Mongo.connect("cron_task");

        // 2.2 获取任务数据
        var { err, res } = await Mongo.find("cron_task", {
            "open_state" : true
        }, {}, {
            "sort" : { "task_id" : 1 }
        });

        if (err) {
            console.log("******************** Get Cron Task List Failed! ********************");

            return;
        }

        // 3.循环创建任务
        for (let i = 0; i < res.length; i++) {
            process.nextTick(() => {
                Task.exec(std_time, res[i]);
            });
        }

        // 4.超时检测
        Task.check_expire(std_time);

        // 5.输出执行中任务列表
        Task.child_dump();

    } catch (e) {
        // 输出报错日志
        console.log("******************** Cron Task Exception! ********************");
        console.log(e)
        console.log(e.stack)
    }
}, 60000);
