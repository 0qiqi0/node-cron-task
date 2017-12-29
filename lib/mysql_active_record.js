/**
 * MySQL ActiveRecord Adapter for Node.js
 * (C) Martin Tajur 2011-2014
 * martin@tajur.ee
 *
 * Active Record Database Pattern implementation for use with node-mysql as MySQL connection driver.
 *
 * Dual licensed under the MIT and GPL licenses.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL KEVIN VAN ZONNEVELD BE LIABLE FOR ANY CLAIM, DAMAGES
 * OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 *
 **/

var mysql = require('mysql');

function errResponse(err) {
    var ret = {};
    // typeof
    var arr = err && err.sqlState ? err.sqlState.match(/^#(.*)/) : 0;
    if (arr && arr.length > 0) {
        ret.retCode = arr[1];
    } else {
        ret.retCode = err.sqlState;
    }

    ret.retCode = -1000;
    ret.retObject = err.toString();
    return ret;
}

var Adapter = function(settings) {


    var initializeConnectionSettings = function() {
        if (settings.server) {
            settings.host = settings.server;
        }
        if (settings.username) {
            settings.user = settings.username;
        }

        if (!settings.host) {
            throw new Error('Unable to start mysql-activerecord - no server given.');
        }
        if (!settings.port) {
            settings.port = 3306;
        }
        if (!settings.user) {
            settings.user = '';
        }
        if (!settings.password) {
            settings.password = '';
        }
        if (!settings.database) {
            throw new Error('Unable to start mysql-activerecord - no database given.');
        }

        return settings;
    };

    initializeConnectionSettings();

    var pool = mysql.createPool(settings);

    if (settings.charset) {
        self.query('SET NAMES ' + settings.charset);
    }

    var whereClause = {},
        selectClause = [],
        orderByClause = '',
        groupByClause = '',
        havingClause = '',
        limitClause = -1,
        offsetClause = -1,
        joinClause = [],
        lastQuery = '';

    var resetQuery = function(newLastQuery) {
        whereClause = {};
        selectClause = [];
        orderByClause = '';
        groupByClause = '';
        havingClause = '',
            limitClause = -1;
        offsetClause = -1;
        joinClause = [];
        lastQuery = (typeof newLastQuery === 'string' ? newLastQuery : '');
        rawWhereClause = {};
        rawWhereString = {};
    };

    var rawWhereClause = {};
    var rawWhereString = {};

    var escapeFieldName = function(str) {
        return (typeof rawWhereString[str] === 'undefined' && typeof rawWhereClause[str] === 'undefined' ? '`' + str.replace('.', '`.`') + '`' : str);
    };

    var buildTableName = function(str) {
        return '`' + str.replace('.', '`.`').replace(/\s+(as\s+)?/i, "` AS `") + '`';
    };

    var buildDataString = function(dataSet, separator, clause) {
        if (!clause) {
            clause = 'WHERE';
        }
        var queryString = '',
            y = 1;
        if (!separator) {
            separator = ', ';
        }
        var useSeparator = true;

        var datasetSize = getObjectSize(dataSet);

        for (var key in dataSet) {
            useSeparator = true;

            if (dataSet.hasOwnProperty(key)) {
                if (clause == 'WHERE' && rawWhereString[key] == true) {
                    queryString += key;
                } else if (dataSet[key] === null) {
                    queryString += escapeFieldName(key) + (clause == 'WHERE' ? " is NULL" : "=NULL");
                } else if (typeof dataSet[key] !== 'object') {
                    queryString += escapeFieldName(key) + "=" + self.escape(dataSet[key]);
                } else if (typeof dataSet[key] === 'object' && Object.prototype.toString.call(dataSet[key]) === '[object Array]' && dataSet[key].length > 0) {
                    queryString += escapeFieldName(key) + dataSet[key].reduce(function(pre, cur, index, arr) {
                            return pre + self.escape(cur) + (index + 1 === arr.length ? ')' : ', ');
                        }, ' in (');
                } else {
                    useSeparator = false;
                    datasetSize = datasetSize - 1;
                }

                if (y < datasetSize && useSeparator) {
                    queryString += separator;
                    y++;
                }
            }
        }
        if (getObjectSize(dataSet) > 0) {
            queryString = ' ' + clause + ' ' + queryString;
        }
        return queryString;
    };

    var buildJoinString = function() {
        var joinString = '';

        for (var i = 0; i < joinClause.length; i++) {
            joinString += (joinClause[i].direction !== '' ? ' ' + joinClause[i].direction : '') + ' JOIN ' + buildTableName(joinClause[i].table) + ' ON ' + joinClause[i].relation;
        }

        return joinString;
    };

    var mergeObjects = function() {
        for (var i = 1; i < arguments.length; i++) {
            for (var key in arguments[i]) {
                if (arguments[i].hasOwnProperty(key)) {
                    arguments[0][key] = arguments[i][key];
                }
            }
        }
        return arguments[0];
    };

    var getObjectSize = function(object) {
        var size = 0;
        for (var key in object) {
            if (object.hasOwnProperty(key)) {
                size++;
            }
        }
        return size;
    };

    var trim = function(s) {
        var l = 0,
            r = s.length - 1;
        while (l < s.length && s[l] == ' ') {
            l++;
        }
        while (r > l && s[r] == ' ') {
            r -= 1;
        }
        return s.substring(l, r + 1);
    };


    this.where = function(whereSet, whereValue, isRaw) {
        if (typeof whereSet === 'object' && typeof whereValue === 'undefined') {
            whereClause = mergeObjects(whereClause, whereSet);
        } else if ((typeof whereSet === 'string' || typeof whereSet === 'number') && typeof whereValue != 'undefined') {
            if (isRaw) {
                rawWhereClause[whereSet] = true;
            }
            whereClause[whereSet] = whereValue;
        } else if ((typeof whereSet === 'string' || typeof whereSet === 'number') && typeof whereValue === 'object' && Object.prototype.toString.call(whereValue) === '[object Array]' && whereValue.length > 0) {
            whereClause[whereSet] = whereValue;
        } else if (typeof whereSet === 'string' && typeof whereValue === 'undefined') {
            rawWhereString[whereSet] = true;
            whereClause[whereSet] = whereValue;
        }
        return self;
    };

    this.count = function(tableName) {
        if (typeof tableName === 'string') {
            var combinedQueryString = 'SELECT COUNT(*) as count FROM ' + buildTableName(tableName) + buildJoinString() + buildDataString(whereClause, ' AND ', 'WHERE');

            return self.query(combinedQueryString);

            /*
            var result = self.query(combinedQueryString);
            if (result.retCode == 0) {
                return result.retObject.results[0]['count'];
            }
            */
        }

        return 0;
    };

    this.join = function(tableName, relation, direction) {
        joinClause.push({
            table: tableName,
            relation: relation,
            direction: (typeof direction === 'string' ? trim(direction.toUpperCase()) : '')
        });
        return self;
    };

    this.select = function(selectSet) {
        if (Object.prototype.toString.call(selectSet) === '[object Array]') {
            for (var i = 0; i < selectSet.length; i++) {
                selectClause.push(selectSet[i]);
            }
        } else {
            if (typeof selectSet === 'string') {
                var selectSetItems = selectSet.split(',');
                for (var i = 0; i < selectSetItems.length; i++) {
                    selectClause.push(trim(selectSetItems[i]));
                }
            }
        }
        return self;
    };

    this.comma_separated_arguments = function(set) {
        var clause = '';
        if (Object.prototype.toString.call(set) === '[object Array]') {
            clause = set.join(', ');
        } else if (typeof set === 'string') {
            clause = set;
        }
        return clause;
    };

    this.group_by = function(set) {
        groupByClause = this.comma_separated_arguments(set);
        return self;
    };

    this.having = function(set) {
        havingClause = this.comma_separated_arguments(set);
        return self;
    };

    this.order_by = function(set) {
        orderByClause = this.comma_separated_arguments(set);
        return self;
    };

    this.limit = function(newLimit, newOffset) {
        if (typeof newLimit === 'number') {
            limitClause = newLimit;
        }
        if (typeof newOffset === 'number') {
            offsetClause = newOffset;
        }
        return self;
    };


    this.insert = function(tableName, dataSet, verb, querySuffix) {
        if (typeof verb === 'undefined') {
            var verb = 'INSERT';
        }
        if (typeof querySuffix !== 'string') {
            querySuffix = '';
        }
        else {
            querySuffix = ' ' + querySuffix;
        }
        if (Object.prototype.toString.call(dataSet) !== '[object Array]') {
            if (typeof tableName === 'string') {
                var combinedQueryString = verb + ' into ' + escapeFieldName(tableName) + buildDataString(dataSet, ', ', 'SET') + querySuffix;

                return self.query(combinedQueryString);
            }
        } else {
            return doBatchInsert(verb, tableName, dataSet, querySuffix);
        }
    };

    this.insert_ignore = function(tableName, dataSet, querySuffix) {
        return this.insert(tableName, dataSet, 'INSERT IGNORE', querySuffix);
    };

    var doBatchInsert = function(verb, tableName, dataSet, querySuffix) {
        if (Object.prototype.toString.call(dataSet) !== '[object Array]') {
            throw new Error('Array of objects must be provided for batch insert!');
        }

        if (dataSet.length === 0) return false;

        var map = [];
        var columns = [];
        var escColumns = [];

        for (var aSet in dataSet) {
            for (var key in dataSet[aSet]) {
                if (columns.indexOf(key) == -1) {
                    columns.push(key);
                    escColumns.push(escapeFieldName(key));
                }
            }
        }

        for (var i = 0; i < dataSet.length; i++) {
            (function(i) {
                var row = [];

                for (var key in columns) {
                    if (dataSet[i].hasOwnProperty(columns[key])) {
                        row.push(self.escape(dataSet[i][columns[key]]));
                    } else {
                        row.push('NULL');
                    }
                }

                if (row.length != columns.length) {
                    throw new Error('Cannot use batch insert into ' + tableName + ' - fields must match on all rows (' + row.join(',') + ' vs ' + columns.join(',') + ').');
                }
                map.push('(' + row.join(',') + ')');
            })(i);
        }

        return self.query(verb + ' INTO ' + escapeFieldName(tableName) + ' (' + escColumns.join(', ') + ') VALUES' + map.join(',') + querySuffix);
    };

    this.get = function(tableName) {
        if (typeof tableName === 'string') {
            var combinedQueryString = 'SELECT ' + (selectClause.length === 0 ? '*' : selectClause.join(',')) + ' FROM ' + buildTableName(tableName) + buildJoinString() + buildDataString(whereClause, ' AND ', 'WHERE') + (groupByClause !== '' ? ' GROUP BY ' + groupByClause : '') + (havingClause !== '' ? ' HAVING ' + havingClause : '') + (orderByClause !== '' ? ' ORDER BY ' + orderByClause : '') + (limitClause !== -1 ? ' LIMIT ' + limitClause : '') + (offsetClause !== -1 ? ' OFFSET ' + offsetClause : '');

            return self.query(combinedQueryString);
        }
    };

    this.update = function(tableName, newData) {
        if (typeof tableName === 'string') {
            var combinedQueryString = 'UPDATE ' + escapeFieldName(tableName) + buildDataString(newData, ', ', 'SET') + buildDataString(whereClause, ' AND ', 'WHERE') + (limitClause !== -1 ? ' LIMIT ' + limitClause : '');

            return self.query(combinedQueryString);
        }
    };

    this.escape = function(str) {
        return pool.escape(str);
    };

    this.delete = function(tableName) {
        if (typeof tableName === 'string') {
            var combinedQueryString = 'DELETE FROM ' + escapeFieldName(tableName) + buildDataString(whereClause, ' AND ', 'WHERE') + (limitClause !== -1 ? ' LIMIT ' + limitClause : '');

            return self.query(combinedQueryString);
        }
    };

    this._last_query = function() {
        return lastQuery;
    };

    this.query = async function(sqlQueryString) {
        resetQuery(sqlQueryString);

        let ret = await new Promise((resolve, reject) => {
            pool.query(sqlQueryString, function(err, results, fields) {
                if (err) {
                    resolve(errResponse(err));
                } else {
                    resolve({
                        retCode: 0,
                        retObject: {
                            results: results,
                            fields: fields
                        }
                    });
                }
            });
        });

        return {
            res : ret,
            err : ret.retCode != 0 ? true : null
        }
    };

    var self = this;

    return this;
};

module.exports = Adapter;
