var util = require('util');
var stacktrace = require('stack-trace');


var not_null = function (v) {
    'use strict';
    if (v === undefined || v === null) {
        return false;
    }
    return true;
};

var format_length = function (s, len) {
    'use strict';
    var rets = s;
    var idx;
    if (rets.length < len) {
        for (idx = 0; rets.length < len; idx += 1) {
            rets += ' ';
        }
    }
    return rets;
};


function LoggerObject(cmdname) {
    'use strict';
    var self = {};
    var retself = {};
    var envname;
    if (!not_null(cmdname)) {
        cmdname = 'extargsparse';
    }

    self.loglevel = 0;



    retself.format_string = function (arr) {
        var rets = '';
        if (Array.isArray(arr)) {
            var idx = 0;
            arr.forEach(function (elm) {
                rets += util.format('[%d]%s\n', idx, elm);
                idx += 1;
            });
        } else if (typeof arr === 'object') {
            rets += util.inspect(arr, {
                showHidden: true,
                depth: null
            });
        } else {
            rets += util.format('%s', arr);
        }
        return rets;
    };

    retself.format_call_message = function (msg, callstack) {
        var stktr = stacktrace.get();
        var retstr = '';
        if (callstack !== undefined && stktr.length > callstack && not_null(stktr[callstack])) {
            retstr += util.format('[%s:%s:%s]', format_length(stktr[callstack].getFileName(), 10), format_length(util.format('%s', stktr[callstack].getFunctionName()), 20), format_length(util.format('%s', stktr[callstack].getLineNumber()), 5));
        }
        retstr += msg;
        return retstr + '\n';
    };

    self.inner_output = function (msg, needlevel, callstack) {
        if (self.loglevel >= needlevel) {
            if (!not_null(callstack)) {
                callstack = 3;
            } else {
                callstack += 1;
            }
            process.stderr.write(retself.format_call_message(msg, callstack));
        }
        return;

    };

    retself.info = function (msg, callstack) {
        self.inner_output(msg, 2, callstack);
        return;
    };

    retself.warn = function (msg, callbastack) {
        self.inner_output(msg, 1, callbastack);
        return;
    };

    retself.error = function (msg, callstack) {
        self.inner_output(msg, 0, callstack);
        return;
    };

    retself.debug = function (msg, callstack) {
        self.inner_output(msg, 3, callstack);
        return;
    };

    retself.debug = function (msg, callstack) {
        self.inner_output(msg, 4, callstack);
        return;
    };

    retself.call_func = function (funcname, context, ...args) {
        var pkgname;
        var fname;
        var reg;
        var reqpkg;
        var sarr, idx;

        reg = new RegExp('\\.', 'i');

        if (reg.test(funcname)) {
            sarr = funcname.split('.');
            pkgname = '';
            for (idx = 0; idx < (sarr.length - 1); idx += 1) {
                if (sarr[idx].length === 0) {
                    pkgname += './';
                } else {
                    pkgname += sarr[idx];
                }
            }

            fname = sarr[(sarr.length - 1)];
        } else {
            pkgname = process.argv[1];
            fname = funcname;
        }

        try {
            reqpkg = require(pkgname);
        } catch (e) {
            reqpkg = e;
            console.error('can not load pkg (%s)', pkgname);
            return args;
        }
        if (typeof reqpkg[fname] !== 'function') {
            console.error('%s not function in (%s)', fname, pkgname);
            return args;
        }

        return Function.prototype.call.call(reqpkg[fname], context, ...args);
    };

    self.inner_init_fn = function () {
        envname = util.format('%s_LOGLEVEL', cmdname);
        envname = envname.toUpperCase();
        if (process.env[envname] !== undefined && process.env[envname] !== null) {
            self.loglevel = parseInt(process.env[envname]);
        }

        return retself;
    };


    return self.inner_init_fn();
}

var loginfo = new LoggerObject();

loginfo.info('info');
loginfo.warn('warn');
loginfo.error('error');