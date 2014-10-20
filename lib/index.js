// reserved Postgres words
var reservedMap = require(__dirname + '/reserved.js');

// convert to Postgres default ISO 8601 format
function formatDate(date) {
    date = date.replace('T', ' ');
    date = date.replace('Z', '+00');
    return date;
}

function isReserved(value) {
    if (reservedMap[value.toUpperCase()]) {
        return true;
    }
    return false;
}

// Ported from PostgreSQL 9.2.4 source code in src/interfaces/libpq/fe-exec.c
function quoteIdent(value) {

    if (value === undefined || value === null) {
        throw new Error('SQL identifier cannot be null or undefined');
    } else if (value === false) {
        return '"f"';
    } else if (value === true) {
        return '"t"';
    } else if (value instanceof Date) {
        value = formatDate(value.toISOString());
    } else if (Array.isArray(value) === true) {
        throw new Error('SQL identifier cannot be an array');
    } else if (value === Object(value)) {
        throw new Error('SQL identifier cannot be an object');
    } else {
        value = value.toString();
    }

    // do not quote a valid, unquoted identifier
    if (/^[a-z_][a-z0-9_$]*$/i.test(value) === true && isReserved(value) === false) {
        return value;
    }

    var quoted = '"';

    for (var i = 0; i < value.length; i++) {
        var c = value[i];
        if (c === '"') {
            quoted += c + c;
        } else {
            quoted += c;
        }
    }

    quoted += '"';

    return quoted;
};

// Ported from PostgreSQL 9.2.4 source code in src/interfaces/libpq/fe-exec.c
function quoteLiteral(value) {

    if (value === undefined || value === null) {
        return 'NULL';
    } else if (value === false) {
        return "'f'";
    } else if (value === true) {
        return "'t'";
    } else if (value instanceof Date) {
        value = formatDate(value.toISOString());
    } else if (Array.isArray(value) === true) {
        var temp = [];
        for (var i = 0; i < value.length; i++) {
            temp.push(quoteLiteral(value[i]));
        }
        return temp.toString();
    } else if (value === Object(value)) {
        value = JSON.stringify(value);
    } else {
        value = value.toString();
    }

    var hasBackslash = false;
    var quoted = '\'';

    for (var i = 0; i < value.length; i++) {
        var c = value[i];
        if (c === '\'') {
            quoted += c + c;
        } else if (c === '\\') {
            quoted += c + c;
            hasBackslash = true;
        } else {
            quoted += c;
        }
    }

    quoted += '\'';

    if (hasBackslash === true) {
        quoted = 'E' + quoted;
    }

    return quoted;
};

function quoteString(value) {

    if (value === undefined || value === null) {
        return '';
    } else if (value === false) {
        return 'f';
    } else if (value === true) {
        return 't';
    } else if (value instanceof Date) {
        return formatDate(value.toISOString());
    } else if (Array.isArray(value) === true) {
        var temp = [];
        for (var i = 0; i < value.length; i++) {
            if (value[i] !== null && value[i] !== undefined) {
                temp.push(quoteString(value[i]));
            }
        }
        return temp.toString();
    } else if (value === Object(value)) {
        value = JSON.stringify(value);
    }

    return value.toString();
}

function format(fmt) {
    var i = 1;
    var args = arguments;

    return fmt.replace(/%([%sIL])/g, function(_, type) {

        if (type === '%') {
            return '%';
        }

        var arg = args[i++];

        if (type === 'I') {
            return quoteIdent(arg);
        } else if (type === 'L') {
            return quoteLiteral(arg);
        } else if (type === 's') {
            return quoteString(arg);
        }
    });
}

exports = module.exports = format;
exports.ident = quoteIdent;
exports.literal = quoteLiteral;
exports.string = quoteString;