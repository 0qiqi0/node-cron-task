
'use strict';

const child  = require('child_process');
const path   = require('path');
const fs     = require('fs');
const _      = require('underscore');
const moment = require('moment');
const log4js = require('log4js');
const cron   = require('../lib/cron_match');

const { msg, email } = require('../lib/fn_alarm');

// 日志配置 ✔
log4js.configure(global.APP_LOG_CONF);

// 创建一个日志实例 ✔
const rsyslog = log4js.getLogger();

class Task {
    constructor () {
        this._child_process = {};
        this._child_info    = {};
    }

    // 执行 ✔
    exec (std_time, task_info) {
        // 1.检查时间是否满足条件
        if (this.check_rule(task_info.task_rule, std_time) != true) {
            // 执行条件不满足，退出
            this.logger(`==================== Task Rule Not Match!, ${JSON.stringify(task_info)}`);

            return false;
        }

        // 2.检查脚本是存在
        if (this.check_script(task_info.task_script) != true) {
            // 脚本不存在，退出
            this.logger(`==================== Task Script Not Exist! ${JSON.stringify(task_info)}`);

            return false;
        }

        // 3.检查是否有执行中任务
        if (this.check_state(task_info.task_id) != true) {
            // 脚本不存在，退出
            this.logger(`==================== Task In Processing! ${JSON.stringify(task_info)}`);

            return false;
        }

        // 4.创建子任务
        this.child_init(
            task_info.task_id,
            task_info.task_name,
            task_info.task_script,
            task_info.task_ttl,
            std_time,
            _.pick(task_info, ['notify_type', 'notify_email', 'notify_phone'])
        );

        return true;
    }

    // 日志记录 ✔
    logger (info) {
        rsyslog.info(info);
    }

    // 发送告警 ✔
    async alarm (notify, info) {
        if (notify.notify_type == 'email' || notify.notify_type == "all") {
            await email(notify.notify_email, "CronTask 服务告警", info);
        }

        if (notify.notify_type == 'msg' || notify.notify_type == 'all') {
            await msg(notify.notify_phone, info);
        }
    }

    // 检查执行规则 ✔
    check_rule (expression, std_time) {
        return cron(expression, std_time);
    }

    // 检查脚本是否存在 ✔
    check_script (script_path) {
        script_path = path.join(global.APP_TASK_PATH, script_path);

        return fs.existsSync(script_path);
    }

    // 检查任务状态 ✔
    check_state (id) {
        return this._child_info[id] == undefined ? true : false;
    }

    // 检查任务是否超时 ✔
    check_expire (std_time) {
        _.each(this._child_info, (task) => {
            if ((std_time - task.create) > task.ttl) {
                let expired_msg = `定时任务超时告警: ID: ${task.id}, Name: ${task.name}, Create Time: ${moment.unix(task.create).format("YYYY-MM-DD HH:mm:ss")}, TTL: ${task.ttl}s`;

                this.logger(`******************** Child Process Expired, ID: ${task.id}, Current Time: ${moment.unix(std_time).format('YYYY-MM-DD HH:mm:ss')}, Create Time: ${moment.unix(task.create).format("YYYY-MM-DD HH:mm:ss")}, TTL: ${task.ttl}s`);

                delete this._child_process[task.id];
                delete this._child_info[task.id];

                // 发送告警
                this.alarm(task.notify, expired_msg);
            }
        });
    }

    // 创建子任务 ✔
    child_init (id, name, script, ttl, std_time, notify_info) {
        try {
            script = path.join(global.APP_TASK_PATH, script);

            let info = {
                "id"     : id,
                "name"   : name,
                "script" : script,
                "create" : std_time,
                "ttl"    : ttl,
                "notify" : notify_info
            }

            this._child_process[id] = child.fork(script);
            this._child_info[id]    = info;

            // 向子进程发送数据
            this._child_process[id].send(info);

            // 子进程注册信息,列表中删除相关信息
            this._child_process[id].on('message', (msg) => {
                this.logger(`++++++++++++++++++++ Child Process Init Success, ID: ${id}, Time: ${moment.unix(std_time).format('YYYY-MM-DD HH:mm:ss')}`);
            });

            // 子进程完成时,列表中删除相关信息
            this._child_process[id].on('exit', (code) => {
                this.logger(`-------------------- Child Process Exit Success, ID: ${id}, Code: ${code}, Time: ${moment.unix(moment().unix()).format('YYYY-MM-DD HH:mm:ss')}`);

                // 判断是否异常退出
                if (code != 0) {
                    // 发送告警
                    this.alarm(notify_info, `定时任务异常退出告警: ID: ${id}, Name: ${name}, Exit Time: ${moment.unix(moment().unix()).format("YYYY-MM-DD HH:mm:ss")}`);
                }

                delete this._child_process[id];
                delete this._child_info[id];
            });

        } catch (e) {
            let err_msg = `定时任务异常退出: ID: ${id}, Name: ${name}, Create Time: ${moment.unix(std_time).format("YYYY-MM-DD HH:mm:ss")}`;

            this.logger(`!!!!!!!!!!!!!!!!!!!! Child Process Exception, ID: ${id}, Name: ${name}, Create Time: ${moment.unix(std_time).format("YYYY-MM-DD HH:mm:ss")}`);

            // 发送异常告警
            this.alarm(notify_info, err_msg);
        }
    }

    // 任务列表导出 ✔
    child_dump () {
        if (_.isEmpty(this._child_info) != true) {
            console.log(this._child_info);
        }
    }
}

module.exports = Task;
