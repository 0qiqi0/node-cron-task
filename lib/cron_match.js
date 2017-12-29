
'use strict';

let moment = require('moment');
let parser = require('cron-parser');

const cron_match = (expression, time) => {
    let org_time = moment(time * 1000).startOf('minute').unix() * 1000;
    let fix_time = parser.parseExpression(expression, { currentDate : org_time + 1 }).prev().getTime();

    return org_time == fix_time;
}

module.exports = cron_match;


if (require.main == module) {
    console.log(cron_match('*/10 * * * *', moment().unix()));
}
