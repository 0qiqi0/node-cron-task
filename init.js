
'use strict';

const path = require('path');

const init = () => {
  // 1.获取配置文件
  let _config = require('./config.json');

  _config.log.appenders.cron_task.filename = path.join(__dirname, _config.log.appenders.cron_task.filename);

  // 2.设置APP全局配置
  global.APP_PATH      = __dirname;
  global.APP_TASK_PATH = path.join(__dirname, "/scripts/");
  global.APP_ENV       = process.env.NODE_ENV == 'production' ? 'production' : 'development';
  global.APP_LOG_CONF  = _config.log;

  // 3.设置服务全局配置
  global.MONGO = _config.mongo;

  /*
  global.MYSQL = _config.mysql;
  global.PGSQL = _config.pgsql;
  global.REDIS = _config.redis;
  global.NSQ   = _config.nsq;
  global.SSDB  = _config.ssdb;
  */
};

module.exports = init;
