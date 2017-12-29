## cron-task(定时执行脚本) 使用教程

-----------------

本页包含内容：
- [使用简介](#using_introduction)
- [脚本模板](#script_template)
- [任务模板](#task_template)

<a name="Using_Introduction"></a>

### 使用简介(using_introduction)

  脚本的执行模式为主进程调用子进程执行，主进程检查任务规则、脚本状态及日志创建保存等事务，任务创建后记录任务状态，并定期检查是否超时，超时自动关闭并发送告警

#### 整体开发流程如下

> 1.创建远端任务，任务格式参见：`任务模板`，也可配置在本地

> 2.创建逻辑脚本，cp template.js xxx/xxx.test，模板参见：`脚本模板`

> 3.脚本逻辑编写，需要定义自己的配置文件及引入自身需求包等，编写自身脚本逻辑

<a name="script_template"></a>

### 脚本模板

```javascript

const _      = require('underscore');
const moment = require('moment');
const log4js = require('log4js');

// TODO 添加自定义库

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

        // TODO 添加逻辑代码

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

```

<a name="task_template"></a>

### 任务模板

```javascript
{
    "task_id"      : 1,                      // 任务ID，唯一
    "task_name"    : "测试",                  // 任务名称
    "task_script"  : "test/test.js",         // 脚本名称
    "task_rule"    : "* * * * *",            // 执行规则（crontab规则）
    "task_tag"     : "test",                 // 任务标签
    "task_ttl"     : 3600,                   // 任务超时时间
    "open_state"   : false,                  // 是否开启
    "notify_type"  : "email",                // 通知类型 all, email, msg 3选1
    "notify_email" : ["9999@qq.com"], // 邮件通知人
    "notify_phone" : ["150211111"]         // 短信通知人
}
```
