var extargsparse = require('../');
var test = require('tape');
var util = require('util');
var fs = require('fs');
var mktemp = require('mktemp');
var chldproc = require('child_process');
var path = require('path');
var upath = require('upath');

var get_notice = function (t, name) {
    'use strict';
    return util.format('%s %s', t.name, name);
};

var delete_variable = function (name) {
    'use strict';
    if (process.env[name] !== undefined) {
        delete process.env[name];
    }
    return;
};

var renew_variable = function (name, value) {
    'use strict';
    var oldval = null;
    if (process.env[name] !== undefined) {
        oldval = process.env[name];
        delete process.env[name];
    }

    process.env[name] = value;
    return oldval;
};



var setup_before = function (t) {
    'use strict';
    var keys;
    var i;
    var depreg, extargsreg, jsonreg;
    t = t;
    keys = Object.keys(process.env);
    depreg = new RegExp('^[r]?dep_[.]*', 'i');
    extargsreg = new RegExp('^extargs_[.]*', 'i');
    jsonreg = new RegExp('^EXTARGSPARSE_JSON$', 'i');
    for (i = 0; i < keys.length; i += 1) {
        if (depreg.test(keys[i]) || extargsreg.test(keys[i]) || jsonreg.test(keys[i])) {
            delete_variable(keys[i]);
        }
    }
    return;
};

var write_file_callback = function (filetemplate, filecon, t, notice, callback) {
    'use strict';
    mktemp.createFile(filetemplate, function (err, filename) {
        t.equal(err, null, get_notice(t, util.format('create %s [%s]', notice, filename)));
        fs.writeFile(filename, filecon, function (err2) {
            t.equal(err2, null, get_notice(t, util.format('write %s [%s]', notice, filename)));
            callback(filename);
        });
    });
};

var unlink_file_callback = function (filename, notice, t, callback) {
    'use strict';
    fs.unlink(filename, function (err) {
        t.equal(err, null, get_notice(t, util.format('remove %s [%s]', notice, filename)));
        callback();
    });
};



var call_args_function = function (args) {
    'use strict';
    var context = this;
    context.has_called_args = args.subcommand;
    return;
};
exports.call_args_function = call_args_function;

var assert_get_opt = function (opts, optname) {
    'use strict';
    var idx;
    var c;
    for (idx = 0; idx < opts.length; idx += 1) {
        c = opts[idx];
        if (c.isflag) {
            if (optname === '$' && c.flagname === '$') {
                return c;
            }
            if (c.flagname !== '$') {
                if (c.optdest === optname) {
                    return c;
                }
            }
        }
    }
    return null;
};

function StringIO() {
    'use strict';
    var self = {};
    var innerself = {};

    innerself.init_fn = function () {
        innerself.inner_buffer = '';
        return self;
    };

    self.write = function (input, callback) {
        innerself.inner_buffer += input;
        if (callback !== undefined && callback !== null) {
            callback(null);
        }
        return;
    };
    self.getvalue = function () {
        return innerself.inner_buffer;
    };

    return innerself.init_fn();
}

var split_strings = function (inputstr) {
    'use strict';
    var retsarr = [];
    var sarr;
    var idx;
    if (typeof inputstr === 'string' && inputstr.length > 0) {
        sarr = inputstr.split('\n');
        for (idx = 0; idx < sarr.length; idx += 1) {
            retsarr.push(sarr[idx].replace(/[\r\n]+$/, ''));
        }
    }
    return retsarr;
};

var regex_string_slash = function (s) {
    'use strict';
    var rets = '';
    var idx;
    var c;
    for (idx = 0; idx < s.length; idx += 1) {
        c = s[idx];
        if (c === '[') {
            rets += '\\[';
        } else if (c === ']') {
            rets += '\\]';
        } else if (c === '\\') {
            rets += '\\\\';
        } else if (c === '*') {
            rets += '\\*';
        } else if (c === '+') {
            rets += '\\+';
        } else if (c === '?') {
            rets += '\\?';
        } else {
            rets += c;
        }
    }
    return rets;
};


var assert_string_expr = function (lines, exprstr) {
    'use strict';
    var idx;
    var reg = new RegExp(exprstr);

    for (idx = 0; idx < lines.length; idx += 1) {
        if (reg.test(lines[idx])) {
            return true;
        }
    }
    return false;
};

var get_opt_split_string = function (lines, opt) {
    'use strict';
    var exprstr;
    if (opt.typename === 'args') {
        return true;
    }
    exprstr = util.format('^\\s+%s', regex_string_slash(opt.longopt));
    if (opt.shortopt !== null) {
        exprstr += util.format('|%s', regex_string_slash(opt.shortopt));
    }
    exprstr += '\\s+';
    if (opt.nargs !== 0) {
        exprstr += util.format('%s', regex_string_slash(opt.optdest));
    }
    exprstr += '.*';
    return assert_string_expr(lines, exprstr);
};

var assert_get_subcommand = function (cmds, cmdname) {
    'use strict';
    var idx;
    for (idx = 0; idx < cmds.length; idx += 1) {
        if (cmds[idx] === cmdname) {
            return cmds[idx];
        }
    }
    return null;
};

var environ_key_set = function (keyname) {
    'use strict';
    if (process.env[keyname] === undefined || process.env[keyname] === null) {
        return false;
    }
    return true;
};

function CmdOut(cmdline, callback) {
    'use strict';
    var self = {};
    var innerself = {};


    innerself.init_fn = function () {
        innerself.out_string = '';
        innerself.err_string = '';
        innerself.callback = null;
        innerself.exited = 0;
        innerself.exit_code = -1;
        if (callback !== undefined && callback !== null) {
            innerself.callback = callback;
        }
        innerself.chld = chldproc.exec(cmdline);
        innerself.chld.stdout.on('data', function (data) {
            innerself.out_string += data;
        });
        innerself.chld.stderr.on('data', function (data) {
            innerself.err_string += data;
        });

        innerself.chld.on('close', function (code) {
            innerself.exited = 1;
            innerself.exit_code = code;
            if (innerself.callback !== null) {
                innerself.callback(self);
            }
        });

        return self;
    };

    self.out_value = function () {
        return innerself.out_string;
    };

    self.err_value = function () {
        return innerself.err_string;
    };

    self.exit_code = function () {
        return innerself.exit_code;
    };
    self.get_commandline = function () {
        return innerself.commandline;
    };

    return innerself.init_fn();
}

var quote_string = function (s) {
    'use strict';
    var rets = '';
    var c;
    var idx;
    for (idx = 0; idx < s.length; idx += 1) {
        c = s[idx];
        if (c === '\'') {
            rets += '\\\'';
        } else if (c === '\\') {
            rets += '\\\\';
        } else if (c === '\n') {
            rets += '\\n';
        } else if (c === '\r') {
            rets += '\\r';
        } else if (c === '\`') {
            rets += '\\\`';
        } else {
            rets += c;
        }
    }
    return rets;
};


var write_script = function (cmdlinejson, options, t, callback) {
    'use strict';
    var scriptwrite = '';
    var absdir = path.resolve(__dirname);
    var impdir = path.join(absdir, '..');
    var keys;
    var idx;
    impdir = path.resolve(impdir);
    scriptwrite += 'var extargsparse = require(\'';
    scriptwrite += upath.toUnix(impdir);
    scriptwrite += '\');\n';
    scriptwrite += 'var commandline = \`';
    scriptwrite += cmdlinejson;
    scriptwrite += '\`;\n';
    scriptwrite += 'var parser;\n';
    scriptwrite += 'var options;\n';
    scriptwrite += 'options = new extargsparse.ExtArgsOption();\n';
    if (options !== undefined && options !== null) {
        keys = Object.keys(options);
        for (idx = 0; idx < keys.length; idx += 1) {
            if (typeof options[keys[idx]] === 'string') {
                scriptwrite += util.format('options.%s = \'%s\';\n', keys[idx], quote_string(options[keys[idx]]));
            } else if (typeof options[keys[idx]] !== 'function') {
                scriptwrite += util.format('options.%s = %s;\n', keys[idx], options[keys[idx]]);
            }

        }
    }
    scriptwrite += 'parser = extargsparse.ExtArgsParse(options);\n';
    scriptwrite += 'parser.load_command_line_string(commandline);\n';
    scriptwrite += 'parser.parse_command_line();\n';
    write_file_callback('exthelpXXXXXX.js', scriptwrite, t, 'script file', callback);
};

var run_cmd_out = function (cmdrun, t, callback) {
    'use strict';
    var runexec;
    var oldval = null;
    oldval = renew_variable('EXTARGSPARSE_LOGLEVEL', '0');
    runexec = new CmdOut(cmdrun, function (execobj) {
        t.equal(execobj.exit_code(), 0, get_notice(t, util.format('[%s] exit [0]', cmdrun)));
        if (oldval !== null) {
            renew_variable('EXTARGSPARSE_LOGLEVEL', oldval);
        } else {
            delete_variable('EXTARGSPARSE_LOGLEVEL');
        }
        callback(execobj.out_value());
    });
    return runexec;
};

var debug_set_2_args = function (args, validx, keycls, params) {
    'use strict';
    var arr;
    if ((validx + 2) > params.length) {
        throw new Error('need 2 args');
    }
    arr = args[keycls.optdest];
    if (arr === undefined || arr === null) {
        arr = [];
    }
    arr.push(params[validx]);
    arr.push(params[(validx + 1)]);
    args[keycls.optdest] = arr;
    return 2;
};

var Debug_set_2_args = function(args, validx, keycls, params) {
    'use strict';
    var arr;
    if ((validx + 2) > params.length) {
        throw new Error('need 2 args');
    }
    arr = args[keycls.optdest];
    if (arr === undefined || arr === null) {
        arr = [];
    }
    arr.push(params[validx].toUpperCase());
    arr.push(params[(validx + 1)].toUpperCase());
    args[keycls.optdest] = arr;
    return 2;
};

exports.debug_set_2_args = debug_set_2_args;
exports.Debug_set_2_args = Debug_set_2_args;

var debug_opthelp_set = function (keycls) {
    'use strict';
    return util.format('opthelp function set [%s] default value (%s)', keycls.optdest, keycls.value);
};

exports.debug_opthelp_set = debug_opthelp_set;

var debug_2_jsonfunc = function (args, keycls, value) {
    'use strict';
    var setvalue;
    var idx;
    if (!Array.isArray(value)) {
        throw new Error('not list type');
    }
    if ((value.length % 2) !== 0) {
        throw new Error('not even sized');
    }
    setvalue = [];
    idx = 0;
    while (idx < value.length) {
        setvalue.push(value[idx]);
        idx += 2;
    }
    args[keycls.optdest] = setvalue;
    return;
};
exports.debug_2_jsonfunc = debug_2_jsonfunc;

var debug_upper_jsonfunc = function (args, keycls, value) {
    'use strict';
    var valid = false;
    var setvalue;
    if (typeof value === 'string' || value === null) {
        valid = true;
    }

    if (!valid) {
        throw new Error(util.format('[%s]not string type', value));
    }
    setvalue = null;
    if (typeof value === 'string') {
        setvalue = value.toUpperCase();
    }
    args[keycls.optdest] = setvalue;
    return;
};
exports.debug_upper_jsonfunc = debug_upper_jsonfunc;


var get_cmd_ok = function(sarr, cmdname) {
    'use strict';
    var exprstr = util.format('^\\s+\\[%s\\]\\s+.*',cmdname);
    return assert_string_expr(sarr,exprstr);
};

var get_cmds_ok = function(t,parser,sarr, cmdname) {
    'use strict';
    var subcmds;
    var idx;
    var c;
    var retval;
    subcmds = parser.get_subcommands(cmdname);
    for (idx=0;idx < subcmds.length;idx += 1) {
        c = subcmds[idx];
        retval = get_cmd_ok(sarr, c);
        t.equal(retval, true, get_notice(t, util.format('get cmd [%s]', c)));
    }
    return;
};

test('A001', function (t) {
    'use strict';
    var loads = `{ "verbose|v##increment verbose mode##": "+","flag|f## flag set##": false, "number|n": 0,"list|l": [],"string|s": "string_var","$": {"value": [],"nargs": "*","typename": "string"}}`;
    var parser;
    var args;
    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(loads);
    args = parser.parse_command_line(['-vvvv', '-f', '-n', '30', '-l', 'bar1', '-l', 'bar2', 'var1', 'var2']);
    t.equal(args.verbose, 4, get_notice(t, 'verbose'));
    t.equal(args.flag, true, get_notice(t, 'flag'));
    t.equal(args.number, 30, get_notice(t, 'number'));
    t.deepEqual(args.list, ['bar1', 'bar2'], get_notice(t, 'list'));
    t.equal(args.string, 'string_var', get_notice(t, 'string'));
    t.deepEqual(args.args, ['var1', 'var2'], get_notice(t, 'args'));
    t.end();
});

test('A002', function (t) {
    'use stirct';
    var loads = `{"verbose|v" : "+","port|p" : 3000,"dep" : {"list|l" : [],"string|s" : "s_var","$" : "+"}}`;
    var parser, args;
    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(loads);
    args = parser.parse_command_line(['-vvvv', '-p', '5000', 'dep', '-l', 'arg1', '--dep-list', 'arg2', 'cc', 'dd']);
    t.equal(args.verbose, 4, get_notice(t, 'verbose'));
    t.equal(args.port, 5000, get_notice(t, 'port'));
    t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand'));
    t.deepEqual(args.dep_list, ['arg1', 'arg2'], get_notice(t, 'dep_list'));
    t.equal(args.dep_string, 's_var', get_notice(t, 'dep_string'));
    t.deepEqual(args.subnargs, ['cc', 'dd'], get_notice(t, 'subnargs'));
    t.end();
});

test('A003', function (t) {
    'use strict';
    var loads = `{"verbose|v" : "+","port|p" : 3000,"dep" : {"list|l" : [],"string|s" : "s_var","$" : "+"},"rdep" : {              "list|L" : [],"string|S" : "s_rdep","$" : 2}}`;
    var parser, args;
    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(loads);
    args = parser.parse_command_line(['-vvvv', '-p', '5000', 'rdep', '-L', 'arg1', '--rdep-list', 'arg2', 'cc', 'dd']);
    t.equal(args.verbose, 4, get_notice(t, 'verbose'));
    t.equal(args.port, 5000, get_notice(t, 'port'));
    t.equal(args.subcommand, 'rdep', get_notice(t, 'subcommand'));
    t.deepEqual(args.rdep_list, ['arg1', 'arg2'], get_notice(t, 'rdep_list'));
    t.equal(args.rdep_string, 's_rdep', get_notice(t, 'rdep_string'));
    t.deepEqual(args.subnargs, ['cc', 'dd'], get_notice(t, 'subnargs'));
    t.end();
});

test('A004', function (t) {
    'use strict';
    var loads = `{"verbose|v" : "+","port|p" : 3000, "dep" : { "list|l" : [], "string|s" : "s_var","$" : "+"},"rdep" : {"list|L" : [], "string|S" : "s_rdep", "$" : 2}}`;
    var parser, args;
    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(loads);
    args = parser.parse_command_line(['-vvvv', '-p', '5000', 'rdep', '-L', 'arg1', '--rdep-list', 'arg2', 'cc', 'dd']);
    t.equal(args.verbose, 4, get_notice(t, 'verbose'));
    t.equal(args.port, 5000, get_notice(t, 'port'));
    t.equal(args.subcommand, 'rdep', get_notice(t, 'subcommand'));
    t.deepEqual(args.rdep_list, ['arg1', 'arg2'], get_notice(t, 'rdep_list'));
    t.equal(args.rdep_string, 's_rdep', get_notice(t, 'rdep_string'));
    t.deepEqual(args.subnargs, ['cc', 'dd'], get_notice(t, 'subnargs'));
    t.end();
});


test('A005', function (t) {
    'use strict';
    var context = {};
    var loads = `{"verbose|v" : "+","port|p" : 3000,"dep<call_args_function>" : {"list|l" : [],"string|s" : "s_var","$" : "+"},"rdep" : {"list|L" : [],"string|S" : "s_rdep","$" : 2}}`;
    var parser, args;
    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(loads);
    args = parser.parse_command_line(['-p', '7003', '-vvvvv', 'dep', '-l', 'foo1', '-s', 'new_var', 'zz'], context);
    t.equal(args.port, 7003, get_notice(t, 'port'));
    t.equal(args.verbose, 5, get_notice(t, 'verbose'));
    t.deepEqual(args.dep_list, ['foo1'], get_notice(t, 'dep_list'));
    t.equal(args.dep_string, 'new_var', get_notice(t, 'dep_string'));
    t.deepEqual(args.subnargs, ['zz'], get_notice(t, 'subnargs'));
    t.equal(context.has_called_args, 'dep', get_notice(t, 'has_called_args'));
    t.end();
});

test('A006', function (t) {
    'use strict';
    var loads1 = `{"verbose|v" : "+","port|p" : 3000,"dep" : {"list|l" : [],"string|s" : "s_var","$" : "+"}}`;
    var loads2 = `{"rdep" : {"list|L" : [],"string|S" : "s_rdep","$" : 2}}`;
    var parser, args;
    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(loads1);
    parser.load_command_line_string(loads2);
    args = parser.parse_command_line(['-p', '7003', '-vvvvv', 'rdep', '-L', 'foo1', '-S', 'new_var', 'zz', '64']);
    t.equal(args.port, 7003, get_notice(t, 'port'));
    t.equal(args.verbose, 5, get_notice(t, 'verbose'));
    t.deepEqual(args.rdep_list, ['foo1'], get_notice(t, 'rdep_list'));
    t.equal(args.rdep_string, 'new_var', get_notice(t, 'rdep_string'));
    t.deepEqual(args.subnargs, ['zz', '64'], get_notice(t, 'subnargs'));
    t.end();
});

test('A007', function (t) {
    'use strict';
    var commandline = `{"verbose|v" : "+", "port|p+http" : 3000, "dep" : {"list|l" : [], "string|s" : "s_var", "$" : "+" } }`;
    var parser, args;
    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(commandline);
    args = parser.parse_command_line(['-vvvv', 'dep', '-l', 'cc', '--dep-string', 'ee', 'ww']);
    t.equal(args.verbose, 4, get_notice(t, 'verbose'));
    t.equal(args.http_port, 3000, get_notice(t, 'http_port'));
    t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand'));
    t.deepEqual(args.dep_list, ['cc'], get_notice(t, 'dep_list'));
    t.equal(args.dep_string, 'ee', get_notice(t, 'dep_string'));
    t.deepEqual(args.subnargs, ['ww'], get_notice(t, 'subnargs'));
    t.end();
});

test('A008', function (t) {
    'use strict';
    var commandline = `{"verbose|v" : "+","+http" : {"port|p" : 3000,"visual_mode|V" : false},"dep" : {"list|l" : [],"string|s" : "s_var","$" : "+"}}`;
    var parser, args;
    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(commandline);
    args = parser.parse_command_line(['-vvvv', '--http-port', '9000', '--http-visual-mode', 'dep', '-l', 'cc', '--dep-string', 'ee', 'ww']);
    t.equal(args.verbose, 4, get_notice(t, 'verbose'));
    t.equal(args.http_port, 9000, get_notice(t, 'http_port'));
    t.equal(args.http_visual_mode, true, get_notice(t, 'http_visual_mode'));
    t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand'));
    t.deepEqual(args.dep_list, ['cc'], get_notice(t, 'dep_list'));
    t.equal(args.dep_string, 'ee', get_notice(t, 'dep_string'));
    t.deepEqual(args.subnargs, ['ww'], get_notice(t, 'subnargs'));
    t.end();
});

test('A009', function (t) {
    'use strict';
    var commandline = `{"verbose|v" : "+","$port|p" : { "value" : 3000, "type" : "int", "nargs" : 1 ,  "helpinfo" : "port to connect"},"dep" : {"list|l" : [], "string|s" : "s_var", "$" : "+"} }`;
    var parser, args;
    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(commandline);
    args = parser.parse_command_line(['-vvvv', '-p', '9000', 'dep', '-l', 'cc', '--dep-string', 'ee', 'ww']);
    t.equal(args.verbose, 4, get_notice(t, 'verbose'));
    t.equal(args.port, 9000, get_notice(t, 'port'));
    t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand'));
    t.deepEqual(args.dep_list, ['cc'], get_notice(t, 'dep_list'));
    t.equal(args.dep_string, 'ee', get_notice(t, 'dep_string'));
    t.deepEqual(args.subnargs, ['ww'], get_notice(t, 'subnargs'));
    t.end();
});

test('A010', function (t) {
    'use strict';
    var commandline = `{"verbose|v" : "+","$port|p" : {"value" : 3000,"type" : "int", "nargs" : 1 ,  "helpinfo" : "port to connect"},"dep" : {"list|l" : [],"string|s" : "s_var","$" : "+"}}`;
    setup_before(t);
    write_file_callback('parseXXXXXX.json', '{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"}\n', t, 'depjsonfile', function (depjsonfile) {
        var parser, args;
        parser = extargsparse.ExtArgsParse();
        parser.load_command_line_string(commandline);
        args = parser.parse_command_line(['-vvvv', '-p', '9000', 'dep', '--dep-json', depjsonfile, '--dep-string', 'ee', 'ww']);
        t.equal(args.verbose, 4, get_notice(t, 'verbose'));
        t.equal(args.port, 9000, get_notice(t, 'port'));
        t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand'));
        t.deepEqual(args.dep_list, ['jsonval1', 'jsonval2'], get_notice(t, 'dep_list'));
        t.equal(args.dep_string, 'ee', get_notice(t, 'dep_string'));
        t.deepEqual(args.subnargs, ['ww'], get_notice(t, 'subnargs'));
        unlink_file_callback(depjsonfile, 'depjsonfile', t, function () {
            t.end();
        });
    });
});

test('A011', function (t) {
    'use strict';
    var commandline = `{"verbose|v" : "+","$port|p" : {"value" : 3000,"type" : "int","nargs" : 1 ,"helpinfo" : "port to connect"},"dep" : { "list|l" : [], "string|s" : "s_var","$" : "+"}}`;
    setup_before(t);
    write_file_callback('parseXXXXXX.json', '{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"}\n', t, 'depjsonfile', function (depjsonfile) {
        var parser, args;
        renew_variable('DEP_JSON', depjsonfile);
        parser = extargsparse.ExtArgsParse();
        parser.load_command_line_string(commandline);
        args = parser.parse_command_line(['-vvvv', '-p', '9000', 'dep', '--dep-string', 'ee', 'ww']);
        t.equal(args.verbose, 4, get_notice(t, 'verbose'));
        t.equal(args.port, 9000, get_notice(t, 'port'));
        t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand'));
        t.deepEqual(args.dep_list, ['jsonval1', 'jsonval2'], get_notice(t, 'dep_list'));
        t.equal(args.dep_string, 'ee', get_notice(t, 'dep_string'));
        t.deepEqual(args.subnargs, ['ww'], get_notice(t, 'subnargs'));
        unlink_file_callback(depjsonfile, 'depjsonfile', t, function () {
            t.end();
        });
    });
});

test('A012', function (t) {
    'use strict';
    var commandline = `{"verbose|v" : "+","$port|p" : { "value" : 3000, "type" : "int","nargs" : 1 ,"helpinfo" : "port to connect"},"dep" : {"list|l" : [],"string|s" : "s_var","$" : "+"}}`;
    setup_before(t);
    write_file_callback('parseXXXXXX.json', '{"dep":{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"},"port":6000,"verbose":3}\n', t, 'jsonfile', function (jsonfile) {
        var parser, args;
        parser = extargsparse.ExtArgsParse();
        parser.load_command_line_string(commandline);
        args = parser.parse_command_line(['-p', '9000', '--json', jsonfile, 'dep', '--dep-string', 'ee', 'ww']);
        t.equal(args.verbose, 3, get_notice(t, 'verbose'));
        t.equal(args.port, 9000, get_notice(t, 'port'));
        t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand'));
        t.deepEqual(args.dep_list, ['jsonval1', 'jsonval2'], get_notice(t, 'dep_list'));
        t.equal(args.dep_string, 'ee', get_notice(t, 'dep_string'));
        t.deepEqual(args.subnargs, ['ww'], get_notice(t, 'subnargs'));
        unlink_file_callback(jsonfile, 'jsonfile', t, function () {
            t.end();
        });
    });
});

test('A013', function (t) {
    'use strict';
    var commandline = `{"verbose|v" : "+","$port|p" : { "value" : 3000,"type" : "int", "nargs" : 1 , "helpinfo" : "port to connect"},"dep" : {"list|l" : [],"string|s" : "s_var","$" : "+"}}`;
    setup_before(t);
    write_file_callback('parseXXXXXX.json', '{"dep":{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"},"port":6000,"verbose":3}\n', t, 'jsonfile', function (jsonfile) {
        var parser, args;
        renew_variable('EXTARGSPARSE_JSON', jsonfile);
        parser = extargsparse.ExtArgsParse();
        parser.load_command_line_string(commandline);
        args = parser.parse_command_line(['-p', '9000', 'dep', '--dep-string', 'ee', 'ww']);
        t.equal(args.verbose, 3, get_notice(t, 'verbose'));
        t.equal(args.port, 9000, get_notice(t, 'port'));
        t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand'));
        t.deepEqual(args.dep_list, ['jsonval1', 'jsonval2'], get_notice(t, 'dep_list'));
        t.equal(args.dep_string, 'ee', get_notice(t, 'dep_string'));
        t.deepEqual(args.subnargs, ['ww'], get_notice(t, 'subnargs'));
        unlink_file_callback(jsonfile, 'jsonfile', t, function () {
            t.end();
        });
    });
});

test('A014', function (t) {
    'use strict';
    var commandline = `{"verbose|v" : "+","$port|p" : {"value" : 3000,"type" : "int","nargs" : 1 ,"helpinfo" : "port to connect"},"dep" : {"list|l" : [],"string|s" : "s_var","$" : "+"}}`;
    setup_before(t);
    write_file_callback('parseXXXXXX.json', '{"dep":{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"},"port":6000,"verbose":3}\n', t, 'jsonfile', function (jsonfile) {
        write_file_callback('parseXXXXXX.json', '{"list":["depjson1","depjson2"]}\n', t, 'depjsonfile', function (depjsonfile) {
            var parser, args;
            renew_variable('EXTARGSPARSE_JSON', jsonfile);
            renew_variable('DEP_JSON', depjsonfile);
            parser = extargsparse.ExtArgsParse();
            parser.load_command_line_string(commandline);
            args = parser.parse_command_line(['-p', '9000', 'dep', '--dep-string', 'ee', 'ww']);
            t.equal(args.verbose, 3, get_notice(t, 'verbose'));
            t.equal(args.port, 9000, get_notice(t, 'port'));
            t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand'));
            t.deepEqual(args.dep_list, ['depjson1', 'depjson2'], get_notice(t, 'dep_list'));
            t.equal(args.dep_string, 'ee', get_notice(t, 'dep_string'));
            t.deepEqual(args.subnargs, ['ww'], get_notice(t, 'subnargs'));
            unlink_file_callback(depjsonfile, 'depjsonfile', t, function () {
                unlink_file_callback(jsonfile, 'jsonfile', t, function () {
                    t.end();
                });
            });
        });
    });
});


test('A015', function (t) {
    'use strict';
    var commandline = `{"verbose|v" : "+","$port|p" : {"value" : 3000,"type" : "int","nargs" : 1 , "helpinfo" : "port to connect"},"dep" : {"list|l" : [],"string|s" : "s_var","$" : "+"}}`;
    setup_before(t);
    write_file_callback('parseXXXXXX.json', '{"dep":{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"},"port":6000,"verbose":3}\n', t, 'jsonfile', function (jsonfile) {
        write_file_callback('parseXXXXXX.json', '{"list":["depjson1","depjson2"]}\n', t, 'depjsonfile', function (depjsonfile) {
            var parser, args;
            renew_variable('DEP_JSON', depjsonfile);
            parser = extargsparse.ExtArgsParse();
            parser.load_command_line_string(commandline);
            args = parser.parse_command_line(['-p', '9000', '--json', jsonfile, 'dep', '--dep-string', 'ee', 'ww']);
            t.equal(args.verbose, 3, get_notice(t, 'verbose'));
            t.equal(args.port, 9000, get_notice(t, 'port'));
            t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand'));
            t.deepEqual(args.dep_list, ['jsonval1', 'jsonval2'], get_notice(t, 'dep_list'));
            t.equal(args.dep_string, 'ee', get_notice(t, 'dep_string'));
            t.deepEqual(args.subnargs, ['ww'], get_notice(t, 'subnargs'));
            unlink_file_callback(depjsonfile, 'depjsonfile', t, function () {
                unlink_file_callback(jsonfile, 'jsonfile', t, function () {
                    t.end();
                });
            });
        });
    });
});

test('A016', function (t) {
    'use strict';
    var commandline = `{"verbose|v" : "+","$port|p" : {"value" : 3000,"type" : "int","nargs" : 1 ,"helpinfo" : "port to connect"},"dep" : {"list|l" : [],"string|s" : "s_var","$" : "+"}}`;
    setup_before(t);
    write_file_callback('parseXXXXXX.json', '{"dep":{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"},"port":6000,"verbose":3}\n', t, 'jsonfile', function (jsonfile) {
        write_file_callback('parseXXXXXX.json', '{"list":["depjson1","depjson2"]}\n', t, 'depjsonfile', function (depjsonfile) {
            var depstrval, depliststr, deplistval;
            var parser, args;
            depstrval = 'newval';
            depliststr = '["depenv1","depenv2"]';
            deplistval = eval(depliststr);
            renew_variable('EXTARGSPARSE_JSON', jsonfile);
            renew_variable('DEP_JSON', depjsonfile);
            renew_variable('DEP_STRING', depstrval);
            renew_variable('DEP_LIST', depliststr);
            parser = extargsparse.ExtArgsParse();
            parser.load_command_line_string(commandline);
            args = parser.parse_command_line(['-p', '9000', 'dep', '--dep-string', 'ee', 'ww']);
            t.equal(args.verbose, 3, get_notice(t, 'verbose'));
            t.equal(args.port, 9000, get_notice(t, 'port'));
            t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand'));
            t.deepEqual(args.dep_list, deplistval, get_notice(t, 'dep_list'));
            t.equal(args.dep_string, 'ee', get_notice(t, 'dep_string'));
            t.deepEqual(args.subnargs, ['ww'], get_notice(t, 'subnargs'));
            unlink_file_callback(depjsonfile, 'depjsonfile', t, function () {
                unlink_file_callback(jsonfile, 'jsonfile', t, function () {
                    t.end();
                });
            });
        });
    });
});

test('A017', function (t) {
    'use strict';
    var commandline = `{"+dpkg" : {"dpkg" : "dpkg"},"verbose|v" : "+","$port|p" : {"value" : 3000,"type" : "int","nargs" : 1 , "helpinfo" : "port to connect"}}`;
    var parser, args;
    setup_before(t);
    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(commandline);
    args = parser.parse_command_line([]);
    t.equal(args.verbose, 0, get_notice(t, 'verbose'));
    t.equal(args.port, 3000, get_notice(t, 'port'));
    t.equal(args.dpkg_dpkg, 'dpkg', get_notice(t, 'dpkg_dpkg'));
    t.end();
});

test('A018', function (t) {
    'use strict';
    var commandline = `{"+dpkg" : {"dpkg" : "dpkg"},"verbose|v" : "+","rollback|r": true,"$port|p" : {"value" : 3000,"type" : "int","nargs" : 1 ,"helpinfo" : "port to connect"}}`;
    var parser, args;
    setup_before(t);
    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(commandline);
    args = parser.parse_command_line(['-vvrvv']);
    t.equal(args.verbose, 4, get_notice(t, 'verbose'));
    t.equal(args.rollback, false, get_notice(t, 'rollback'));
    t.equal(args.port, 3000, get_notice(t, 'port'));
    t.equal(args.dpkg_dpkg, 'dpkg', get_notice(t, 'dpkg_dpkg'));
    t.end();
});

test('A019', function (t) {
    'use strict';
    var commandline = `{"verbose|v" : "+","$port|p" : {"value" : 3000,"type" : "int","nargs" : 1 ,"helpinfo" : "port to connect"},"dep" : {"list|l" : [],"string|s" : "s_var","$" : "+"}}`;
    setup_before(t);
    write_file_callback('parseXXXXXX.jsonfile', '{"dep":{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"},"port":6000,"verbose":3}\n', t, 'jsonfile', function (jsonfile) {
        write_file_callback('parseXXXXXX.json', '{"list":["depjson1","depjson2"]}\n', t, 'depjsonfile', function (depjsonfile) {
            var depstrval, depliststr;
            var opt, parser, args;
            depstrval = 'newval';
            depliststr = '["depenv1","depenv2"]';
            renew_variable('EXTARGSPARSE_JSON', jsonfile);
            renew_variable('DEP_JSON', depjsonfile);
            renew_variable('DEP_STRING', depstrval);
            renew_variable('DEP_LIST', depliststr);
            opt = {};
            opt.priority = [extargsparse.ENV_COMMAND_JSON_SET, extargsparse.ENVIRONMENT_SET, extargsparse.ENV_SUB_COMMAND_JSON_SET];
            parser = extargsparse.ExtArgsParse(opt);
            parser.load_command_line_string(commandline);
            args = parser.parse_command_line(['-p', '9000', 'dep', '--dep-string', 'ee', 'ww']);
            t.equal(args.verbose, 3, get_notice(t, 'verbose'));
            t.equal(args.port, 9000, get_notice(t, 'port'));
            t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand'));
            t.deepEqual(args.dep_list, ['jsonval1', 'jsonval2'], get_notice(t, 'dep_list'));
            t.equal(args.dep_string, 'ee', get_notice(t, 'dep_string'));
            t.deepEqual(args.subnargs, ['ww'], get_notice(t, 'subnargs'));
            unlink_file_callback(jsonfile, 'jsonfile', t, function () {
                unlink_file_callback(depjsonfile, 'depjsonfile', t, function () {
                    t.end();
                });
            });
        });
    });
});

test('A020', function (t) {
    'use strict';
    var commandline = `{"verbose|v" : "+","rollback|R" : true,"$port|P" : {"value" : 3000,"type" : "int","nargs" : 1 ,"helpinfo" : "port to connect"},"dep" : {"list|l" : [],"string|s" : "s_var","$" : "+"}}`;
    var parser, args;
    setup_before(t);
    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(commandline);
    args = parser.parse_command_line(['-P', '9000', '--no-rollback', 'dep', '--dep-string', 'ee', 'ww']);
    t.equal(args.verbose, 0, get_notice(t, 'verbose'));
    t.equal(args.port, 9000, get_notice(t, 'port'));
    t.equal(args.rollback, false, get_notice(t, 'rollback'));
    t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand'));
    t.deepEqual(args.dep_list, [], get_notice(t, 'dep_list'));
    t.equal(args.dep_string, 'ee', get_notice(t, 'dep_string'));
    t.deepEqual(args.subnargs, ['ww'], get_notice(t, 'subnargs'));
    t.end();
});

test('A021', function (t) {
    'use strict';
    var commandline = `{"verbose|v" : "+","rollback|R" : true,"$port|P" : {"value" : 3000,"type" : "int","nargs" : 1 ,"helpinfo" : "port to connect"},"dep" : {"list|l" : [],"string|s" : "s_var","$" : "+"}}`;
    var parser, args;
    var objset;
    setup_before(t);
    objset = {};
    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(commandline);
    args = parser.parse_command_line(['-P', '9000', '--no-rollback', 'dep', '--dep-string', 'ee', 'ww']);
    t.equal(args.verbose, 0, get_notice(t, 'verbose'));
    t.equal(args.port, 9000, get_notice(t, 'port'));
    t.equal(args.rollback, false, get_notice(t, 'rollback'));
    t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand'));
    t.deepEqual(args.dep_list, [], get_notice(t, 'dep_list'));
    t.equal(args.dep_string, 'ee', get_notice(t, 'dep_string'));
    t.deepEqual(args.subnargs, ['ww'], get_notice(t, 'subnargs'));
    extargsparse.set_attr_self(objset, args, 'dep');
    t.equal(objset.dep_string, 'ee', get_notice(t, 'objset dep_string'));
    t.deepEqual(objset.dep_list, [], get_notice(t, 'objset dep_list'));
    t.end();
});



test('A022', function (t) {
    'use strict';
    var commandline = `{ "verbose|v" : "+" }`;
    var parser;
    var opts;
    var flag;
    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(commandline);
    t.deepEqual(parser.get_subcommands(), [], get_notice(t, 'subcommands'));
    t.equal(parser.get_subcommands('nocommand'), null, get_notice(t, 'nocommand'));
    opts = parser.get_cmdopts();
    t.equal(opts.length, 4, get_notice(t, 'opts length'));
    flag = assert_get_opt(opts, '$');
    t.equal(flag.flagname, '$', get_notice(t, 'get $'));
    flag = assert_get_opt(opts, 'verbose');
    t.equal(flag.flagname, 'verbose', get_notice(t, 'get verbose'));
    t.equal(flag.longopt, '--verbose', get_notice(t, 'get --verbose'));
    t.equal(flag.shortopt, '-v', get_notice(t, 'get -v'));
    flag = assert_get_opt(opts, 'noflag');
    t.equal(flag, null, get_notice(t, 'get noflag'));
    flag = assert_get_opt(opts, 'json');
    t.equal(flag.value, null, get_notice(t, 'flag json'));
    flag = assert_get_opt(opts, 'help');
    t.ok(flag !== null, get_notice(t, 'help not none'));
    t.equal(flag.longopt, '--help', get_notice(t, 'longopt --help'));
    t.equal(flag.shortopt, '-h', get_notice(t, 'shortopt -h'));
    t.equal(flag.typename, 'help', get_notice(t, 'help typename help'));
    t.end();
});


test('A023', function (t) {
    'use strict';
    var commandline = `{ "verbose|v" : "+","dep" : {"new|n" : false,"$<NARGS>" : "+"},"rdep" : {"new|n" : true,"$<NARGS>" : "?"}}`;
    var parser;
    var cmds;
    var cmd;
    var opts;
    var opt;
    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(commandline);
    cmds = parser.get_subcommands();
    t.equal(cmds.length, 2, get_notice(t, 'cmds length'));
    console.log('cmds %s', cmds);
    cmd = assert_get_subcommand(cmds, 'dep');
    t.equal(cmd, 'dep', get_notice(t, 'cmd dep'));
    cmd = assert_get_subcommand(cmds, 'rdep');
    t.equal(cmd, 'rdep', get_notice(t, 'cmd rdep'));
    opts = parser.get_cmdopts();
    t.equal(opts.length, 4, get_notice(t, 'opts length'));
    opt = assert_get_opt(opts, '$');
    t.equal(opt.nargs, '*');
    opt = assert_get_opt(opts, 'verbose');
    t.equal(opt.typename, 'count');
    opt = assert_get_opt(opts, 'json');
    t.equal(opt.typename, 'jsonfile');
    opt = assert_get_opt(opts, 'help');
    t.equal(opt.typename, 'help');
    opts = parser.get_cmdopts('dep');
    t.equal(opts.length, 4, get_notice(t, 'dep cmdopts length'));
    opt = assert_get_opt(opts, '$');
    t.equal(opt.varname, 'NARGS', get_notice(t, 'dep $'));
    opt = assert_get_opt(opts, 'help');
    t.equal(opt.typename, 'help', get_notice(t, 'dep help'));
    opt = assert_get_opt(opts, 'dep_json');
    t.equal(opt.typename, 'jsonfile', get_notice(t, 'dep json'));
    opt = assert_get_opt(opts, 'dep_new');
    t.equal(opt.typename, 'boolean', get_notice(t, 'dep new'));
    t.end();
});

test('A024', function (t) {
    'use strict';
    var commandline = `{"rdep" : {"ip" : {"modules" : [],"called" : true,"setname" : null,"$" : 2}},"dep" : {"port" : 5000,"cc|C" : true}, "verbose|v" : "+"}`;
    var parser;
    var args;
    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(commandline);
    args = parser.parse_command_line(['rdep', 'ip', '--verbose', '--rdep-ip-modules', 'cc', '--rdep-ip-setname', 'bb', 'xx', 'bb']);
    t.equal(args.subcommand, 'rdep.ip', get_notice(t, 'subcommand'));
    t.equal(args.verbose, 1, get_notice(t, 'verbose'));
    t.deepEqual(args.rdep_ip_modules, ['cc'], get_notice(t, 'rdep_ip_modules'));
    t.deepEqual(args.rdep_ip_setname, 'bb', get_notice(t, 'rdep_ip_setname'));
    t.deepEqual(args.subnargs, ['xx', 'bb'], get_notice(t, 'subnargs'));
    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(commandline);
    args = parser.parse_command_line(['dep', '--verbose', '--verbose', '-vvC']);
    t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand'));
    t.equal(args.verbose, 4, get_notice(t, 'verbose'));
    t.equal(args.dep_port, 5000, get_notice(t, 'dep_port'));
    t.equal(args.dep_cc, false, get_notice(t, 'dep_cc'));
    t.deepEqual(args.subnargs, [], get_notice(t, 'subnargs'));
    t.end();
});


test('A025', function (t) {
    'use strict';
    var commandline = `{"verbose|v" : "+","+http" : {"url|u" : "http://www.google.com","visual_mode|V": false},"$port|p" : {"value" : 3000,"type" : "int","nargs" : 1 , "helpinfo" : "port to connect"},"dep" : {"list|l" : [],"string|s" : "s_var","$" : "+","ip" : {"verbose" : "+","list" : [],"cc" : []}},"rdep" : {"ip" : {"verbose" : "+","list" : [],"cc" : []}}}`;
    var depstrval = 'newval';
    var depliststr = '["depenv1","depenv2"]';
    var httpvmstr = "true";
    setup_before(t);
    write_file_callback('parseXXXXXX.jsonfile', '{ "http" : { "url" : "http://www.github.com"} ,"dep":{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"},"port":6000,"verbose":3}\n', t, 'jsonfile', function (jsonfile) {
        write_file_callback('parseXXXXXX.jsonfile', '{"list":["depjson1","depjson2"]}\n', t, 'depjsonfile', function (depjsonfile) {
            write_file_callback('parseXXXXXX.jsonfile', '{"ip": {"list":["rdepjson1","rdepjson3"],"verbose": 5}}\n', t, 'rdepjsonfile', function (rdepjsonfile) {
                var parser;
                var args;
                renew_variable('EXTARGSPARSE_JSON', jsonfile);
                renew_variable('DEP_JSON', depjsonfile);
                renew_variable('RDEP_JSON', rdepjsonfile);
                parser = extargsparse.ExtArgsParse();
                t.notOk(environ_key_set('DEP_STRING'), get_notice(t, 'not set DEP_STRING'));
                t.notOk(environ_key_set('DEP_LIST'), get_notice(t, 'not set DEP_LIST'));
                t.notOk(environ_key_set('HTTP_VISUAL_MODE'), get_notice(t, 'not set HTTP_VISUAL_MODE'));
                parser.load_command_line_string(commandline);
                args = parser.parse_command_line(['-p', '9000', 'rdep', 'ip', '--rdep-ip-verbose', '--rdep-ip-cc', 'ee', 'ww']);
                renew_variable('DEP_STRING', depstrval);
                renew_variable('DEP_LIST', depliststr);
                renew_variable('HTTP_VISUAL_MODE', httpvmstr);
                t.ok(environ_key_set('DEP_STRING'), get_notice(t, ' set DEP_STRING'));
                t.ok(environ_key_set('DEP_LIST'), get_notice(t, 'set DEP_LIST'));
                t.ok(environ_key_set('HTTP_VISUAL_MODE'), get_notice(t, 'set HTTP_VISUAL_MODE'));
                t.equal(args.verbose, 3, get_notice(t, 'verbose 3'));
                t.equal(args.port, 9000, get_notice(t, 'port 9000'));
                t.equal(args.dep_string, 'jsonstring', get_notice(t, 'dep_string jsonstring'));
                t.deepEqual(args.dep_list, ['jsonval1', 'jsonval2'], get_notice(t, 'dep_list [\'jsonval1\', \'jsonval2\']'));
                t.equal(args.http_visual_mode, false, get_notice(t, 'http_visual_mode false'));
                t.equal(args.http_url, 'http://www.github.com', get_notice(t, 'http_url http://www.github.com'));
                t.deepEqual(args.subnargs, ['ww'], get_notice(t, 'subnargs [\'ww\']'));
                t.equal(args.subcommand, 'rdep.ip', get_notice(t, 'subcommand rdep.ip'));
                t.equal(args.rdep_ip_verbose, 1, get_notice(t, 'rdep_ip_verbose 1'));
                t.deepEqual(args.rdep_ip_cc, ['ee'], get_notice(t, 'rdep_ip_cc [\'ee\']'));
                t.deepEqual(args.rdep_ip_list, ['rdepjson1', 'rdepjson3'], get_notice(t, 'rdep_ip_list [\'rdepjson1\',\'rdepjson3\']'));
                unlink_file_callback(jsonfile, 'jsonfile', t, function () {
                    unlink_file_callback(depjsonfile, 'depjsonfile', t, function () {
                        unlink_file_callback(rdepjsonfile, 'rdepjsonfile', t, function () {
                            t.end();
                        });
                    });
                });
            });
        });
    });
});



test('A026', function (t) {
    'use trict';
    var commandline = `        {            "verbose|v" : "+",            "+http" : {                "url|u" : "http://www.google.com",                "visual_mode|V": false            },            "$port|p" : {                "value" : 3000,                "type" : "int",                "nargs" : 1 ,                 "helpinfo" : "port to connect"            },            "dep" : {                "list|l" : [],                "string|s" : "s_var",                "$" : "+",                "ip" : {                    "verbose" : "+",                    "list" : [],                    "cc" : []                }            },            "rdep" : {                "ip" : {                    "verbose" : "+",                    "list" : [],                    "cc" : []                }            }        }`;
    var options = extargsparse.ExtArgsOption();
    var parser;
    var sio;
    var sarr;
    var opts;
    var idx;
    var curopt;
    setup_before(t);
    options.prog = 'cmd1';
    parser = extargsparse.ExtArgsParse(options);
    parser.load_command_line_string(commandline);
    sio = new StringIO();
    parser.print_help(sio);
    sarr = split_strings(sio.getvalue());
    opts = parser.get_cmdopts();
    for (idx = 0; idx < opts.length; idx += 1) {
        curopt = opts[idx];
        t.ok(get_opt_split_string(sarr, curopt), get_notice(t, util.format('search [%s]', curopt.flagname)));
    }

    sio = new StringIO();
    parser.print_help(sio, 'rdep');
    sarr = split_strings(sio.getvalue());
    opts = parser.get_cmdopts('rdep');
    for (idx = 0; idx < opts.length; idx += 1) {
        curopt = opts[idx];
        t.ok(get_opt_split_string(sarr, curopt), get_notice(t, util.format('search rdep[%s]', curopt.flagname)));
    }

    sio = new StringIO();
    parser.print_help(sio, 'rdep.ip');
    sarr = split_strings(sio.getvalue());
    opts = parser.get_cmdopts('rdep.ip');
    for (idx = 0; idx < opts.length; idx += 1) {
        curopt = opts[idx];
        t.ok(get_opt_split_string(sarr, curopt), get_notice(t, util.format('search rdep.ip[%s]', curopt.flagname)));
    }
    t.end();
});

test('A027', function (t) {
    'use strict';
    var commandline = `        {            "verbose|v" : "+",            "+http" : {                "url|u" : "http://www.google.com",                "visual_mode|V": false            },            "$port|p" : {                "value" : 3000,                "type" : "int",                "nargs" : 1 ,                 "helpinfo" : "port to connect"            },            "dep" : {                "list|l!attr=cc;optfunc=list_opt_func!" : [],                "string|s" : "s_var",                "$" : "+",                "ip" : {                    "verbose" : "+",                    "list" : [],                    "cc" : []                }            },            "rdep" : {                "ip" : {                    "verbose" : "+",                    "list" : [],                    "cc" : []                }            }        }`;
    var parser;
    var opts;
    var attr;
    var idx;
    var curopt;
    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(commandline);
    opts = parser.get_cmdopts('dep');
    attr = null;
    for (idx = 0; idx < opts.length; idx += 1) {
        curopt = opts[idx];
        if (curopt.typename !== 'args' && curopt.flagname === 'list') {
            attr = curopt.attr;
        }
    }
    t.ok(attr !== null, get_notice(t, 'list attr'));
    t.equal(attr.attr, 'cc', get_notice(t, 'list attr.attr'));
    t.equal(attr.optfunc, 'list_opt_func', get_notice(t, 'list attr.optfunc'));
    t.end();
});

test('A028', function (t) {
    'use strict';
    var commandline = `        {            "verbose<VAR1>|v" : "+",            "+http" : {                "url|u<VAR1>" : "http://www.google.com",                "visual_mode|V": false            },            "$port|p" : {                "value" : 3000,                "type" : "int",                "nargs" : 1 ,                 "helpinfo" : "port to connect"            },            "dep" : {                "list|l!attr=cc;optfunc=list_opt_func!" : [],                "string|s" : "s_var",                "$" : "+",                "ip" : {                    "verbose" : "+",                    "list" : [],                    "cc" : []                }            },            "rdep" : {                "ip" : {                    "verbose" : "+",                    "list" : [],                    "cc" : []                }            }        }`;
    var parser;
    var ok;
    var options;
    var e2;
    ok = 0;
    try {
        options = extargsparse.ExtArgsOptions();
        options.errorhandler = 'raise';
        parser = extargsparse.ExtArgsParse(options);
        parser.load_command_line_string(commandline);
        parser.parse_command_line(['dep', 'cc']);
    } catch (e) {
        e2 = e;
        e2 = e2;
        ok = 1;
    }
    t.equal(ok, 1, get_notice(t, 'raise exception'));
    t.end();
});

test('A029', function (t) {
    'use strict';
    var commandline = `        {            "verbose|v" : "+",            "+http" : {                "url|u" : "http://www.google.com",                "visual_mode|V": false            },            "$port|p" : {                "value" : 3000,                "type" : "int",                "nargs" : 1 ,                 "helpinfo" : "port to connect"            },            "dep" : {                "list|l!attr=cc;optfunc=list_opt_func!" : [],                "string|s" : "s_var",                "$" : "+",                "ip" : {                    "verbose" : "+",                    "list" : [],                    "cc" : []                }            },            "rdep" : {                "ip" : {                    "verbose" : "+",                    "list" : [],                    "cc" : []                }            }        }`;
    var parser;
    var options;
    var sio;
    options = extargsparse.ExtArgsOption();
    options.helphandler = 'nohelp';
    parser = extargsparse.ExtArgsParse(options);
    parser.load_command_line_string(commandline);
    sio = new StringIO();
    parser.print_help(sio);
    t.equal(sio.getvalue(), 'no help information', get_notice(t, 'no help'));
    t.end();
});

test('A030', function (t) {
    'use strict';
    var commandline = `        {            "verbose|v" : "+",            "+http" : {                "url|u" : "http://www.google.com",                "visual_mode|V": false            },            "$port|p" : {                "value" : 3000,                "type" : "int",                "nargs" : 1 ,                 "helpinfo" : "port to connect"            },            "dep<dep_handler>!opt=cc!" : {                "list|l!attr=cc;optfunc=list_opt_func!" : [],                "string|s" : "s_var",                "$" : "+",                "ip" : {                    "verbose" : "+",                    "list" : [],                    "cc" : []                }            },            "rdep<rdep_handler>" : {                "ip" : {                    "verbose" : "+",                    "list" : [],                    "cc" : []                }            }        }`;
    var parser;
    var flag;

    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(commandline);
    flag = parser.get_cmdkey(null);
    t.equal(flag.iscmd, true, get_notice(t, 'cmdkey true'));
    t.equal(flag.cmdname, 'main', get_notice(t, 'cmdkey main'));
    t.equal(flag.function, null, get_notice(t, 'cmdkey function'));

    flag = parser.get_cmdkey('dep');
    t.equal(flag.cmdname, 'dep', get_notice(t, 'dep cmdname'));
    t.equal(flag.function, 'dep_handler', get_notice(t, 'dep function'));
    t.equal(flag.attr.opt, 'cc', get_notice(t, 'dep attr.opt'));

    flag = parser.get_cmdkey('rdep');
    t.equal(flag.function, 'rdep_handler', get_notice(t, 'rdep function'));
    t.equal(flag.attr, null, get_notice(t, 'rdep attr'));

    flag = parser.get_cmdkey('nosuch');
    t.equal(flag, null, get_notice(t, 'nosuch'));
    t.end();
});

test('A031', function (t) {
    'use strict';
    var commandline = `        {            "verbose|v" : "+",            "catch|C## to not catch the exception ##" : true,            "input|i## to specify input default(stdin)##" : null,            "$caption## set caption ##" : "runcommand",            "test|t##to test mode##" : false,            "release|R##to release test mode##" : false,            "$" : "*"        }`;
    var parser;
    var args;

    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(commandline);
    args = parser.parse_command_line(['--test']);
    t.equal(args.test, true, get_notice(t, 'test true'));
    t.end();
});

test('A032', function (t) {
    'use strict';
    var commandline = `        {            "verbose|v" : "+",            "+http" : {                "url|u" : "http://www.google.com",                "visual_mode|V": false            },            "$port|p" : {                "value" : 3000,                "type" : "int",                "nargs" : 1 ,                 "helpinfo" : "port to connect"            },            "dep<dep_handler>!opt=cc!" : {                "list|l!attr=cc;optfunc=list_opt_func!" : [],                "string|s" : "s_var",                "$" : "+",                "ip" : {                    "verbose" : "+",                    "list" : [],                    "cc" : []                }            },            "rdep<rdep_handler>" : {                "ip" : {                    "verbose" : "+",                    "list" : [],                    "cc" : []                }            }        }`;
    var parser;
    var opts;
    var idx;
    var opt;
    var sarr;
    setup_before(t);
    write_script(commandline, null, t, function (tempf) {
        var command;
        command = util.format('node %s -h', upath.toUnix(tempf));
        run_cmd_out(command, t, function (output, errout) {
            errout = errout;
            parser = extargsparse.ExtArgsParse();
            parser.load_command_line_string(commandline);
            opts = parser.get_cmdopts();
            sarr = split_strings(output);
            for (idx = 0; idx < opts.length; idx += 1) {
                opt = opts[idx];
                t.equal(get_opt_split_string(sarr, opt), true, get_notice(t, util.format('get opt [%s]', opt.flagname)));
            }
            command = util.format('node %s dep -h', upath.toUnix(tempf));
            run_cmd_out(command, t, function (output2, errout2) {
                errout2 = errout2;
                sarr = split_strings(output2);
                opts = parser.get_cmdopts('dep');
                for (idx = 0; idx < opts.length; idx += 1) {
                    opt = opts[idx];
                    t.equal(get_opt_split_string(sarr, opt), true, get_notice(t, util.format('get dep opt [%s]', opt.flagname)));
                }
                command = util.format('node %s rdep -h', upath.toUnix(tempf));
                run_cmd_out(command, t, function (output3, errout3) {
                    errout3 = errout3;
                    sarr = split_strings(output3);
                    opts = parser.get_cmdopts('rdep');
                    for (idx = 0; idx < opts.length; idx += 1) {
                        opt = opts[idx];
                        t.equal(get_opt_split_string(sarr, opt), true, get_notice(t, util.format('get rdep opt [%s]', opt.flagname)));
                    }
                    unlink_file_callback(tempf, 'tempf', t, function () {
                        t.end();
                    });
                });
            });
        });
    });
});

test('A033', function (t) {
    'use strict';
    var commandline;
    var test_reserved_args = ['subcommand', 'subnargs', 'nargs', 'extargs', 'args'];
    var cmd1_fmt = `        {            "%s" : true        }`;
    var cmd2_fmt = `        {            "+%s" : {                "reserve": true            }        }`;
    var cmd3_fmt = `        {            "%s" : {                "function" : 30            }        }`;
    var cmd_fmts = [cmd1_fmt, cmd2_fmt, cmd3_fmt];
    var parser;
    var idx, jdx;
    var options;
    var curfmt;
    var curargs;
    var ok;
    var e2;
    setup_before(t);
    for (idx = 0; idx < cmd_fmts.length; idx += 1) {
        curfmt = cmd_fmts[idx];
        for (jdx = 0; jdx < test_reserved_args.length; jdx += 1) {
            curargs = test_reserved_args[jdx];
            commandline = util.format(curfmt, curargs);
            options = extargsparse.ExtArgsOption();
            options.errorhandler = 'raise';
            parser = extargsparse.ExtArgsParse(options);
            ok = false;
            try {
                parser.load_command_line_string(commandline);
            } catch (e) {
                e2 = e;
                e2 = e2;
                ok = true;
            }
            t.equal(ok, true, get_notice(t, util.format('get [%d] reserved [%s]', idx, curargs)));
        }
    }
    t.end();
});

test('A034', function (t) {
    'use strict';
    var commandline = `        {            "dep" : {                "string|S" : "stringval"            }        }`;
    setup_before(t);
    write_file_callback('parseXXXXXX.json', '{"dep_string":null}', t, 'depjsonfile', function (depjsonfile) {
        var parser;
        var args;
        parser = extargsparse.ExtArgsParse();
        parser.load_command_line_string(commandline);
        args = parser.parse_command_line(['--json', depjsonfile, 'dep']);
        t.equal(args.dep_string, null, get_notice(t, 'dep_string null'));
        t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand dep'));
        t.deepEqual(args.subnargs, [], get_notice(t, 'subnargs []'));
        unlink_file_callback(depjsonfile, 'depjsonfile', t, function () {
            t.end();
        });
    });
});

test('A035', function (t) {
    'use strict';
    var commandline = `        {            "float1|f" : 3.633 ,            "float2" : 6422.22,            "float3" : 44463.23,            "verbose|v" : "+",            "dep" : {                "float3" : 3332.233            },            "rdep" : {                "ip"  :{                    "float4" : 3377.33,                    "float6" : 33.22,                    "float7" : 0.333                }            }        }`;
    setup_before(t);
    write_file_callback('parseXXXXXX.json', '{"float3":33.221}', t, 'depjsonfile', function (depjsonfile) {
        write_file_callback('parseXXXXXX.json', '{"ip" : { "float4" : 40.3}}', t, 'rdepjsonfile', function (rdepjsonfile) {
            write_file_callback('parseXXXXXX.json', '{"verbose": 30,"float3": 77.1}', t, 'jsonfile', function (jsonfile) {
                write_file_callback('parseXXXXXX.json', '{"float7" : 11.22,"float4" : 779.2}', t, 'rdepipjsonfile', function (rdepipjsonfile) {
                    var parser;
                    var args;
                    renew_variable('EXTARGSPARSE_JSON', jsonfile);
                    renew_variable('DEP_JSON', depjsonfile);
                    renew_variable('RDEP_JSON', rdepjsonfile);
                    renew_variable('DEP_FLOAT3', '33.52');
                    renew_variable('RDEP_IP_FLOAT7', '99.3');
                    parser = extargsparse.ExtArgsParse();
                    parser.load_command_line_string(commandline);
                    args = parser.parse_command_line(['-vvfvv', '33.21', 'rdep', 'ip', '--json', jsonfile, '--rdep-ip-json', rdepipjsonfile]);
                    t.equal(args.subnargs.length, 0, get_notice(t, 'subnargs []'));
                    t.equal(args.subcommand, 'rdep.ip', get_notice(t, 'subcommand rdep.ip'));
                    t.equal(args.verbose, 4, get_notice(t, 'verbose 4'));
                    t.equal(args.float1, 33.21, get_notice(t, 'float1 33.21'));
                    t.equal(args.dep_float3, 33.52, get_notice(t, 'dep_float3 33.52'));
                    t.equal(args.float2, 6422.22, get_notice(t, 'float2 6422.22'));
                    t.equal(args.float3, 77.1, get_notice(t, 'float3 77.1'));
                    t.equal(args.rdep_ip_float4, 779.2, get_notice(t, 'rdep_ip_float4 779.2'));
                    t.equal(args.rdep_ip_float6, 33.22, get_notice(t, 'rdep_ip_float6 33.22'));
                    t.equal(args.rdep_ip_float7, 11.22, get_notice(t, 'rdep_ip_float7 11.22'));
                    unlink_file_callback(jsonfile, 'jsonfile', t, function () {
                        unlink_file_callback(rdepipjsonfile, 'rdepipjsonfile', t, function () {
                            unlink_file_callback(rdepjsonfile, 'rdepjsonfile', t, function () {
                                unlink_file_callback(depjsonfile, 'depjsonfile', t, function () {
                                    t.end();
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

test('A037', function (t) {
    'use strict';
    var commandline = `        {            "jsoninput|j##input json default stdin##" : null,            "input|i##input file to get default nothing - for stdin##" : null,            "output|o##output c file##" : null,            "verbose|v##verbose mode default(0)##" : "+",            "cmdpattern|c" : "%EXTARGS_CMDSTRUCT%",            "optpattern|O" : "%EXTARGS_STRUCT%",             "structname|s" : "args_options_t",            "funcname|F" : "debug_extargs_output",            "releasename|R" : "release_extargs_output",            "funcpattern" : "%EXTARGS_DEBUGFUNC%",            "prefix|p" : "",            "test" : {                "$" : 0            },            "optstruct" : {                "$" : 0            },            "cmdstruct" : {                "$" : 0            },            "debugfunc" : {                "$" : 0            },            "all" : {                "$" : 0            }        }`;
    var parser;
    var options;
    var subcommands;
    var cmdopts;
    options = extargsparse.ExtArgsOption();
    options.errorhandler = 'raise';
    parser = extargsparse.ExtArgsParse(options);
    parser.load_command_line_string(commandline);
    subcommands = parser.get_subcommands();
    t.equal(subcommands.length, 5, get_notice(t, 'subcommands 5'));
    t.deepEqual(subcommands, ['all', 'cmdstruct', 'debugfunc', 'optstruct', 'test'], get_notice(t, 'subcommands array'));
    cmdopts = parser.get_cmdopts();
    t.equal(cmdopts.length, 14, get_notice(t, 'cmdopts 14'));
    t.equal(cmdopts[0].flagname, '$', get_notice(t, '[0].flagname $'));
    t.equal(cmdopts[1].longopt, '--cmdpattern', get_notice(t, '[1].longopt --cmdpattern'));
    t.equal(cmdopts[2].optdest, 'funcname', get_notice(t, '[2].optdest funcname'));
    t.equal(cmdopts[3].varname, 'funcpattern', get_notice(t, '[3].varname funcpattern'));
    t.equal(cmdopts[4].typename, 'help', get_notice(t, '[4].typename help'));
    t.end();
});

test('A038', function (t) {
    'use strict';
    var commandline = `        {            "verbose|v" : "+",            "kernel|K" : "/boot/",            "initrd|I" : "/boot/",            "encryptfile|e" : null,            "encryptkey|E" : null,            "setupsectsoffset" : 0x1f1,            "ipxe<ipxe_handler>" : {                "$" : "+"            }        }`;
    var parser;
    var options;
    var e2;
    var ok = false;
    options = extargsparse.ExtArgsOption();
    options.errorhandler = 'raise';
    parser = extargsparse.ExtArgsParse(options);
    try {
        parser.load_command_line_string(commandline);
    } catch (e) {
        e2 = e;
        e2 = e2;
        ok = true;
    }
    t.equal(ok, true, get_notice(t, 'parse ok'));
    t.end();
});

test('A039', function (t) {
    'use strict';
    var commandline = `        {            "verbose|v" : "+",            "kernel|K" : "/boot/",            "initrd|I" : "/boot/",            "encryptfile|e" : null,            "encryptkey|E" : null,            "setupsectsoffset" : 451        }`;
    var parser;
    var args;
    setup_before(t);
    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(commandline);
    renew_variable('EXTARGS_VERBOSE', '4');
    renew_variable('EXTARGS_SETUPSECTSOFFSET', '0x612');
    args = parser.parse_command_line([]);
    t.equal(args.verbose, 4, get_notice(t, 'verbose 4'));
    t.equal(args.setupsectsoffset, 0x612, get_notice(t, 'setupsectsoffset 0x612'));
    t.end();
});

test('A040', function (t) {
    'use strict';
    var commandline = `        {            "+tce": {                "mirror": "http://repo.tinycorelinux.net",                "root": "/",                "tceversion": "7.x",                "wget": "wget",                "cat": "cat",                "rm": "rm",                "sudoprefix": "sudo",                "optional_dir": "/cde",                "trymode": false,                "platform": "x86_64",                "mount": "mount",                "umount": "umount",                "chroot": "chroot",                "chown": "chown",                "chmod": "chmod",                "mkdir": "mkdir",                "rollback": true,                "cp": "cp",                "jsonfile": null,                "perspace": 3,                "depmapfile": null,                "timeout": 10,                "listsfile": null,                "maxtries": 5            }        }        `;
    var parser;
    var args;
    var tcebase = {};
    setup_before(t);
    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(commandline);
    args = parser.parse_command_line(['--tce-root', '/home/']);
    extargsparse.set_attr_self(tcebase, args, 'tce');
    t.equal(tcebase.tce_mirror, 'http://repo.tinycorelinux.net', get_notice(t, 'tce_mirror'));
    t.equal(tcebase.tce_root, '/home/', get_notice(t, 'tce_root'));
    t.equal(tcebase.tce_listsfile, null, get_notice(t, 'tce_listsfile'));
    t.equal(tcebase.tce_maxtries, 5, get_notice(t, 'tce_maxtries'));
    t.equal(tcebase.tce_timeout, 10, get_notice(t, 'tce_timeout'));
    t.end();
});


test('A041', function (t) {
    'use strict';
    var commandline_fmt = `        {            "countryname|N" : "CN",            "statename|S" : "ZJ",            "localityname" : "HZ",            "organizationname|O" : ["BT"],            "organizationunitname" : "BT R&D",            "commonname|C" : "bingte.com",            "+ssl" : {                "chain" : true,                "dir" : "%s",                "bits" : 4096,                "md" : "sha256",                "utf8" : true,                "name" : "ipxe",                "days" : 3650,                "crl-days": 365,                "emailaddress" : "bt@bingte.com",                "aia_url" : "http://bingte.com/sec/aia",                "crl_url" : "http://bingte.com/sec/crl",                "ocsp_url" : "http://bingte.com/sec/ocsp",                "dns_url" : ["bingte.com"],                "excluded_ip" : ["0.0.0.0/0.0.0.0","0:0:0:0:0:0:0:0/0:0:0:0:0:0:0:0"],                "password|P" : null,                "copy_extensions" : "none",                "subca" : false,                "comment": ""            }        }`;
    var parser;
    var args;
    var curdir = path.resolve(__dirname);
    var commandline;
    curdir = curdir.replace(/\\/, '\\\\');
    commandline = util.format(commandline_fmt, curdir);
    setup_before(t);
    write_file_callback('parseXXXXXX.json', '{"emailaddress" : "unit@bingte.com","organizationname" : "BT RD","ssl" :{ "dir" : "./certs/bingte","name" : "bingte","subca" : true,"copy_extensions" : "copy","days" : 375,"crl_days" : 30,"bits" : 4096}}', t, 'jsonfile', function (jsonfile) {
        parser = extargsparse.ExtArgsParse();
        parser.load_command_line_string(commandline);
        args = parser.parse_command_line(['--json', jsonfile], parser);
        t.equal(args.organizationname.length, 1, get_notice(t, 'organizationname length 1'));
        t.equal(args.organizationname[0], 'BT', get_notice(t, 'organizationname[0] BT'));
        unlink_file_callback(jsonfile, 'jsonfile', t, function () {
            t.end();
        });
    });
});


test('A042', function (t) {
    'use strict';
    var commandline = `        {            "verbose|v" : "+",            "kernel|K" : "/boot/",            "initrd|I" : "/boot/",            "encryptfile|e" : null,            "encryptkey|E" : null,            "setupsectsoffset" : 663,            "ipxe" : {                "$" : "+"            }        }`;
    var parser;
    var args;
    setup_before(t);
    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(commandline);
    args = parser.parse_command_line(['-vvvK', 'kernel', '--initrd', 'initrd', 'cc', 'dd', '-E', 'encryptkey', '-e', 'encryptfile', 'ipxe']);
    t.equal(args.subcommand, 'ipxe', get_notice(t, 'subcommand ipxe'));
    t.deepEqual(args.subnargs, ['cc', 'dd'], get_notice(t, 'subnargs [cc,dd]'));
    t.end();
});

test('A043', function (t) {
    'use strict';
    var commandline = `        {            "verbose|v" : "+",            "kernel|K" : "/boot/",            "initrd|I" : "/boot/",            "encryptfile|e" : null,            "encryptkey|E" : null,            "setupsectsoffset" : 663,            "ipxe" : {                "$" : "+"            }        }`;
    var parser;
    var args;
    var options;
    setup_before(t);
    options = extargsparse.ExtArgsOption();
    options.parseall = true;
    options.longprefix = '-';
    options.shortprefix = '-';
    parser = extargsparse.ExtArgsParse(options);
    parser.load_command_line_string(commandline);
    args = parser.parse_command_line(['-K', 'kernel', '-initrd', 'initrd', 'cc', 'dd', '-E', 'encryptkey', '-e', 'encryptfile', 'ipxe']);
    t.equal(args.subcommand, 'ipxe', get_notice(t, 'subcommand ipxe'));
    t.deepEqual(args.subnargs, ['cc', 'dd'], get_notice(t, 'subnargs [cc,dd]'));
    t.end();
});

test('A044', function (t) {
    'use strict';
    var commandline = `        {            "verbose|v" : "+",            "kernel|K" : "/boot/",            "initrd|I" : "/boot/",            "encryptfile|e" : null,            "encryptkey|E" : null,            "setupsectsoffset" : 663,            "ipxe" : {                "$" : "+"            }        }`;
    var parser;
    var args;
    var options;
    setup_before(t);
    options = extargsparse.ExtArgsOption();
    options.parseall = true;
    options.longprefix = '++';
    options.shortprefix = '+';
    parser = extargsparse.ExtArgsParse(options);
    parser.load_command_line_string(commandline);
    args = parser.parse_command_line(['+K', 'kernel', '++initrd', 'initrd', 'cc', 'dd', '+E', 'encryptkey', '+e', 'encryptfile', 'ipxe']);
    t.equal(args.subcommand, 'ipxe', get_notice(t, 'subcommand ipxe'));
    t.deepEqual(args.subnargs, ['cc', 'dd'], get_notice(t, 'subnargs [cc,dd]'));
    t.end();
});

test('A045', function (t) {
    'use strict';
    var commandline = `        {            "verbose|v" : "+",            "kernel|K" : "/boot/",            "initrd|I" : "/boot/",            "pair|P!optparse=debug_set_2_args!" : [],            "encryptfile|e" : null,            "encryptkey|E" : null,            "setupsectsoffset" : 663,            "ipxe" : {                "$" : "+"            }        }`;
    var parser;
    var args;
    var options;
    setup_before(t);
    options = extargsparse.ExtArgsOption();
    options.parseall = true;
    options.longprefix = '++';
    options.shortprefix = '+';
    parser = extargsparse.ExtArgsParse(options);
    parser.load_command_line_string(commandline);
    args = parser.parse_command_line(['+K', 'kernel', '++pair', 'initrd', 'cc', 'dd', '+E', 'encryptkey', '+e', 'encryptfile', 'ipxe']);
    t.equal(args.subcommand, 'ipxe', get_notice(t, 'subcommand ipxe'));
    t.deepEqual(args.subnargs, ['dd'], get_notice(t, 'subnargs [dd]'));
    t.deepEqual(args.pair, ['initrd', 'cc'], get_notice(t, 'pair [initrd,cc]'));
    t.end();
});

test('A046', function (t) {
    'use strict';
    var commandline = `        {            "verbose|v" : "+",            "kernel|K" : "/boot/",            "initrd|I" : "/boot/",            "pair|P!optparse=debug_set_2_args;opthelp=debug_opthelp_set!" : [],            "encryptfile|e" : null,            "encryptkey|E" : null,            "setupsectsoffset" : 663,            "ipxe" : {                "$" : "+"            }        }`;
    var parser;
    var options;
    var sio;
    var sarr;
    var matchexpr;
    var idx;
    var ok = false;
    setup_before(t);
    options = extargsparse.ExtArgsOption();
    options.parseall = true;
    options.longprefix = '++';
    options.shortprefix = '+';
    parser = extargsparse.ExtArgsParse(options);
    parser.load_command_line_string(commandline);
    sio = new StringIO();
    parser.print_help(sio);
    sarr = split_strings(sio.getvalue());
    matchexpr = new RegExp('.*opthelp function set \\[pair\\].*');
    for (idx = 0; idx < sarr.length; idx += 1) {
        if (matchexpr.test(sarr[idx])) {
            ok = true;
            break;
        }
    }
    t.equal(ok, true, get_notice(t, 'debug_opthelp_set ok'));
    t.end();
});

test('A047', function (t) {
    'use strict';
    var commandline = `        {            "verbose|v" : "+",            "kernel|K" : "/boot/",            "initrd|I" : "/boot/",            "pair|P!optparse=debug_set_2_args;opthelp=debug_opthelp_set!" : [],            "encryptfile|e" : null,            "encryptkey|E" : null,            "setupsectsoffset" : 663,            "ipxe" : {                "$" : "+"            }        }`;
    var options;
    var parser;
    var sarr;
    var opt;
    var opts;
    var idx;
    setup_before(t);
    options = extargsparse.ExtArgsOption();
    options.parseall = true;
    options.longprefix = '++';
    options.shortprefix = '+';
    options.helplong = 'usage';
    options.helpshort = '?';
    options.jsonlong = 'jsonfile';
    write_script(commandline, options, t, function (tempf) {
        var command;
        command = util.format('node %s ++usage', upath.toUnix(tempf));
        run_cmd_out(command, t, function (output, errout) {
            errout = errout;
            parser = extargsparse.ExtArgsParse(options);
            parser.load_command_line_string(commandline);
            opts = parser.get_cmdopts();
            sarr = split_strings(output);
            for (idx = 0; idx < opts.length; idx += 1) {
                opt = opts[idx];
                t.equal(get_opt_split_string(sarr, opt), true, get_notice(t, util.format('get opt [%s]', opt.flagname)));
            }
            unlink_file_callback(tempf, 'tempf', t, function () {
                t.end();
            });
        });
    });
});

test('A048', function (t) {
    'use strict';
    var commandline = `        {            "verbose|v" : "+",            "$port|p" : {                "value" : 3000,                "type" : "int",                "nargs" : 1 ,                 "helpinfo" : "port to connect"            },            "dep" : {                "list|l" : [],                "string|s" : "s_var",                "$" : "+"            }        }`;
    var options;
    var parser;
    var depstrval;
    var depliststr;
    var args;
    depstrval = 'newval';
    depliststr = '["depenv1","depenv2"]';
    setup_before(t);
    write_file_callback('parseXXXXXX.json', '{"dep":{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"},"port":6000,"verbose":3}\n', t, 'jsonfile', function (jsonfile) {
        write_file_callback('parseXXXXXX.json', '{"list":["depjson1","depjson2"]}\n', t, 'depjsonfile', function (depjsonfile) {
            renew_variable('EXTARGSPARSE_JSONFILE', jsonfile);
            renew_variable('DEP_JSONFILE', depjsonfile);
            options = extargsparse.ExtArgsOption();
            options.jsonlong = 'jsonfile';
            options.priority = [extargsparse.ENV_COMMAND_JSON_SET, extargsparse.ENVIRONMENT_SET, extargsparse.ENV_SUB_COMMAND_JSON_SET];
            parser = extargsparse.ExtArgsParse(options);
            parser.load_command_line_string(commandline);
            renew_variable('DEP_STRING', depstrval);
            renew_variable('DEP_LIST', depliststr);

            args = parser.parse_command_line(['-p', '9000', 'dep', '--dep-string', 'ee', 'ww']);
            t.equal(args.verbose, 3, get_notice(t, 'verbose 3'));
            t.equal(args.port, 9000, get_notice(t, 'port 9000'));
            t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand dep'));
            t.deepEqual(args.dep_list, ['jsonval1', 'jsonval2'], get_notice(t, 'dep_list [jsonval1,jsonval2]'));
            t.equal(args.dep_string, 'ee', get_notice(t, 'dep_string ee'));
            t.deepEqual(args.subnargs, ['ww'], get_notice(t, 'subnargs [ww]'));
            unlink_file_callback(depjsonfile, 'depjsonfile', t, function () {
                unlink_file_callback(jsonfile, 'jsonfile', t, function () {
                    t.end();
                });
            });
        });
    });

});

test('A049', function (t) {
    'use strict';
    var commandline = `        {            "verbose|v##very long very long very long very long very long very long very long very long very long very long very long very long very long very long very long very long very long very long##" : "+",            "$port|p"  : {                "value" : 3000,                "type" : "int",                "nargs" : 1 ,                 "helpinfo" : "port to connect"            },            "dep" : {                "list|l" : [],                "string|s" : "s_var",                "$" : "+"            }        }`;
    var options;
    var parser;
    var sio;
    var sarr;
    var overlength;
    var idx;
    setup_before(t);
    options = extargsparse.ExtArgsOption();
    options.usage = 'new usage';
    options.screenwidth = 60;
    parser = extargsparse.ExtArgsParse(options);
    parser.load_command_line_string(commandline);
    sio = new StringIO();
    parser.print_help(sio);
    sarr = split_strings(sio.getvalue());
    overlength = 0;
    for (idx = 0; idx < sarr.length; idx += 1) {
        if (sarr[idx].length > 65) {
            overlength = 1;
        }
    }
    t.equal(overlength, 0, get_notice(t, 'overlength 0'));
    options = extargsparse.ExtArgsOption();
    options.screenwidth = 80;
    parser = extargsparse.ExtArgsParse(options);
    parser.load_command_line_string(commandline);
    sio = new StringIO();
    parser.print_help(sio);
    sarr = split_strings(sio.getvalue());
    overlength = 0;
    for (idx = 0; idx < sarr.length; idx += 1) {
        if (sarr[idx].length > 65) {
            overlength = 1;
        }
    }
    t.equal(overlength, 1, get_notice(t, 'overlength 1'));
    t.end();
});

test('A050', function (t) {
    'use strict';
    var commandline = `        {            "verbose|v" : "+",            "dep" : {                "list|l" : [],                "string|s" : "s_var",                "$" : "+"            }        }`;
    var options;
    var parser;
    var sio;
    var sarr;
    var matchexpr;
    var matched;
    var idx;
    setup_before(t);
    options = extargsparse.ExtArgsOption();
    options.helplong = 'usage';
    options.helpshort = '?';
    options.longprefix = '++';
    options.shortprefix = '+';
    parser = extargsparse.ExtArgsParse(options);
    parser.load_command_line_string(commandline);
    sio = new StringIO();
    parser.print_help(sio);
    sarr = split_strings(sio.getvalue());
    matchexpr = new RegExp('^\\s+\\+\\+usage|\\+\\?\\s+to display.*');
    matched = 0;
    for (idx = 0; idx < sarr.length; idx += 1) {
        if (matchexpr.test(sarr[idx])) {
            matched = 1;
        }
    }
    t.equal(matched, 1, get_notice(t, 'matched 1'));
    t.end();
});

test('A051', function (t) {
    'use strict';
    var commandline = `        {            "verbose|v" : "+",            "dep" : {                "list|l" : [],                "string|s" : "s_var",                "$" : "+"            }        }`;
    var options;
    var optionstr = `        {            "helplong" : "usage",            "helpshort" : null,            "longprefix" : "++",            "shortprefix" : "+"        }`;
    var parser;
    var sio;
    var sarr;
    var matchexpr;
    var matched;
    var idx;
    setup_before(t);
    options = extargsparse.ExtArgsOption(optionstr);
    parser = extargsparse.ExtArgsParse(options);
    parser.load_command_line_string(commandline);
    sio = new StringIO();
    parser.print_help(sio);
    sarr = split_strings(sio.getvalue());
    matchexpr = new RegExp('^\\s+\\+\\+usage\\s+to display.*');
    matched = 0;
    for (idx = 0; idx < sarr.length; idx += 1) {
        if (matchexpr.test(sarr[idx])) {
            matched = 1;
        }
    }
    t.equal(matched, 1, get_notice(t, 'matched 1'));
    t.end();
});

test('A052', function (t) {
    'use strict';
    var commandline = `        {            "verbose|v" : "+",            "$port|p" : {                "value" : 3000,                "type" : "int",                "nargs" : 1 ,                 "helpinfo" : "port to connect"            },            "dep" : {                "list|l" : [],                "string|s" : "s_var",                "$" : "+"            }        }`;
    var options;
    var optionstr = `        {            "nojsonoption" : true,            "nohelpoption" : true        }`;
    var parser;
    var sio;
    var sarr;
    var helpexpr;
    var jsonexpr;
    var helpfind;
    var jsonfind;
    var idx;
    var args;
    var depstrval;
    var depliststr;

    setup_before(t);
    write_file_callback('parseXXXXXX.json', '{"dep":{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"},"port":6000,"verbose":3}\n', t, 'jsonfile', function (jsonfile) {
        write_file_callback('parseXXXXXX.json', '{"list":["depjson1","depjson2"]}\n', t, 'depjsonfile', function (depjsonfile) {
            depstrval = 'newval';
            depliststr = '["depenv1","depenv2"]';
            renew_variable('EXTARGSPARSE_JSONFILE', jsonfile);
            renew_variable('DEP_JSONFILE', depjsonfile);
            options = extargsparse.ExtArgsOption(optionstr);
            parser = extargsparse.ExtArgsParse(options);
            parser.load_command_line_string(commandline);
            renew_variable('DEP_STRING', depstrval);
            renew_variable('DEP_LIST', depliststr);

            sio = new StringIO();
            parser.print_help(sio);
            sarr = split_strings(sio.getvalue());
            helpexpr = new RegExp('^\\s+--help.*');
            jsonexpr = new RegExp('^\\s+--json.*');
            helpfind = 0;
            jsonfind = 0;
            for (idx = 0; idx < sarr.length; idx += 1) {
                if (helpexpr.test(sarr[idx])) {
                    helpfind = 1;
                }
                if (jsonexpr.test(sarr[idx])) {
                    jsonfind = 1;
                }
            }
            t.equal(helpfind, 0, get_notice(t, 'no help option'));
            t.equal(jsonfind, 0, get_notice(t, 'no json option'));

            args = parser.parse_command_line(['-p', '9000', 'dep', '--dep-string', 'ee', 'ww']);
            t.equal(args.verbose, 0, get_notice(t, 'verbose 0'));
            t.equal(args.port, 9000, get_notice(t, 'port 9000'));
            t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand dep'));
            t.deepEqual(args.dep_list, ["depenv1", "depenv2"], get_notice(t, 'dep_list [depenv1,depenv2]'));
            t.equal(args.dep_string, 'ee', get_notice(t, 'dep_string ee'));
            t.deepEqual(args.subnargs, ['ww'], get_notice(t, 'subnargs [ww]'));
            unlink_file_callback(depjsonfile, 'depjsonfile', t, function () {
                unlink_file_callback(jsonfile, 'jsonfile', t, function () {
                    t.end();
                });
            });
        });
    });
});

test('A053', function (t) {
    'use strict';
    var commandline = `        {            "verbose|v" : "+",            "$port|p" : {                "value" : 3000,                "type" : "int",                "nargs" : 1 ,                 "helpinfo" : "port to connect"            },            "dep" : {                "list|l" : [],                "string|s" : "s_var",                "$" : "+"            },            "rdep" : {                "list|l" : [],                "string|s" : "s_rdep",                "$" : "+"            }        }`;
    var options;
    var optionstr = `        {            "cmdprefixadded" : false        }`;
    var parser;
    var sio;
    var sarr;
    var helpexpr;
    var jsonexpr;
    var stringexpr;
    var listexpr;
    var helpfind;
    var jsonfind;
    var stringfind;
    var listfind;
    var idx;
    var args;
    var depstrval;
    var depliststr;

    setup_before(t);
    write_file_callback('parseXXXXXX.json', '{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring","port":6000,"verbose":3}\n', t, 'jsonfile', function (jsonfile) {
        write_file_callback('parseXXXXXX.json', '{"list":["depjson1","depjson2"]}\n', t, 'depjsonfile', function (depjsonfile) {
            depstrval = 'newval';
            depliststr = '["depenv1","depenv2"]';
            renew_variable('EXTARGSPARSE_JSON', jsonfile);
            renew_variable('DEP_JSON', depjsonfile);
            options = extargsparse.ExtArgsOption(optionstr);
            options.priority = [extargsparse.ENV_COMMAND_JSON_SET, extargsparse.ENVIRONMENT_SET, extargsparse.ENV_SUB_COMMAND_JSON_SET];
            parser = extargsparse.ExtArgsParse(options);
            parser.load_command_line_string(commandline);
            renew_variable('DEP_STRING', depstrval);
            renew_variable('DEP_LIST', depliststr);

            sio = new StringIO();
            parser.print_help(sio, 'dep');
            sarr = split_strings(sio.getvalue());
            helpexpr = new RegExp('^\\s+--help.*');
            jsonexpr = new RegExp('^\\s+--dep-json.*');
            listexpr = new RegExp('^\\s+--list.*');
            stringexpr = new RegExp('^\\s+--string.*');

            helpfind = 0;
            jsonfind = 0;
            stringfind = 0;
            listfind = 0;
            for (idx = 0; idx < sarr.length; idx += 1) {
                if (helpexpr.test(sarr[idx])) {
                    helpfind = 1;
                }
                if (jsonexpr.test(sarr[idx])) {
                    jsonfind = 1;
                }

                if (stringexpr.test(sarr[idx])) {
                    stringfind = 1;
                }
                if (listexpr.test(sarr[idx])) {
                    listfind = 1;
                }
            }
            t.equal(helpfind, 1, get_notice(t, 'help option'));
            t.equal(jsonfind, 1, get_notice(t, 'json option'));
            t.equal(listfind, 1, get_notice(t, 'list option'));
            t.equal(stringfind, 1, get_notice(t, 'string option'));

            sio = new StringIO();
            parser.print_help(sio, 'rdep');
            sarr = split_strings(sio.getvalue());
            helpexpr = new RegExp('^\\s+--help.*');
            jsonexpr = new RegExp('^\\s+--rdep-json.*');
            listexpr = new RegExp('^\\s+--list.*');
            stringexpr = new RegExp('^\\s+--string.*');

            helpfind = 0;
            jsonfind = 0;
            stringfind = 0;
            listfind = 0;
            for (idx = 0; idx < sarr.length; idx += 1) {
                if (helpexpr.test(sarr[idx])) {
                    helpfind = 1;
                }
                if (jsonexpr.test(sarr[idx])) {
                    jsonfind = 1;
                }

                if (stringexpr.test(sarr[idx])) {
                    stringfind = 1;
                }
                if (listexpr.test(sarr[idx])) {
                    listfind = 1;
                }
            }
            t.equal(helpfind, 1, get_notice(t, 'help option'));
            t.equal(jsonfind, 1, get_notice(t, 'json option'));
            t.equal(listfind, 1, get_notice(t, 'list option'));
            t.equal(stringfind, 1, get_notice(t, 'string option'));


            args = parser.parse_command_line(['-p', '9000', 'dep', '--string', 'ee', 'ww']);
            t.equal(args.verbose, 3, get_notice(t, 'verbose 3'));
            t.equal(args.port, 9000, get_notice(t, 'port 9000'));
            t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand dep'));
            t.deepEqual(args.list, ["jsonval1", "jsonval2"], get_notice(t, 'dep_list [jsonval1,jsonval2]'));
            t.equal(args.string, 'ee', get_notice(t, 'dep_string ee'));
            t.deepEqual(args.subnargs, ['ww'], get_notice(t, 'subnargs [ww]'));
            unlink_file_callback(depjsonfile, 'depjsonfile', t, function () {
                unlink_file_callback(jsonfile, 'jsonfile', t, function () {
                    t.end();
                });
            });
        });
    });
});


test('A054', function (t) {
    'use strict';
    var commandline = `        {            "verbose|v" : "+",            "$port|p" : {                "value" : 3000,                "type" : "int",                "nargs" : 1 ,                 "helpinfo" : "port to connect"            },            "dep" : {                "list|l" : [],                "string|s" : "s_var",                "$" : "+"            }        }`;
    var options;
    var optionstr = `        {            "jsonlong" : "jsonfile"        }`;
    var parser;
    var args;
    var depstrval;
    var depliststr;

    setup_before(t);
    write_file_callback('parseXXXXXX.json', '{"dep":{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"},"port":6000,"verbose":3}\n', t, 'jsonfile', function (jsonfile) {
        write_file_callback('parseXXXXXX.json', '{"list":["depjson1","depjson2"]}\n', t, 'depjsonfile', function (depjsonfile) {
            depstrval = 'newval';
            depliststr = '["depenv1","depenv2"]';
            renew_variable('EXTARGSPARSE_JSONFILE', jsonfile);
            renew_variable('DEP_JSONFILE', depjsonfile);
            options = extargsparse.ExtArgsOption(optionstr);
            options.priority = [extargsparse.ENV_COMMAND_JSON_SET, extargsparse.ENVIRONMENT_SET, extargsparse.ENV_SUB_COMMAND_JSON_SET];
            parser = extargsparse.ExtArgsParse(options);
            parser.load_command_line_string(commandline);
            renew_variable('DEP_STRING', depstrval);
            renew_variable('DEP_LIST', depliststr);



            args = parser.parse_command_line(['--jsonfile', jsonfile, 'dep', 'ww']);
            t.equal(args.verbose, 3, get_notice(t, 'verbose 3'));
            t.equal(args.port, 6000, get_notice(t, 'port 6000'));
            t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand dep'));
            t.deepEqual(args.dep_list, ["jsonval1", "jsonval2"], get_notice(t, 'dep_list [jsonval1,jsonval2]'));
            t.equal(args.dep_string, 'jsonstring', get_notice(t, 'dep_string jsonstring'));
            t.deepEqual(args.subnargs, ['ww'], get_notice(t, 'subnargs [ww]'));
            unlink_file_callback(depjsonfile, 'depjsonfile', t, function () {
                unlink_file_callback(jsonfile, 'jsonfile', t, function () {
                    t.end();
                });
            });
        });
    });
});

test('A055', function (t) {
    'use strict';
    var commandline = `        {            "verbose|v" : "+",            "$port|p" : {                "value" : 3000,                "type" : "int",                "nargs" : 1 ,                 "helpinfo" : "port to connect"            },            "dep" : {                "list|l!jsonfunc=debug_2_jsonfunc!" : [],                "string|s!jsonfunc=debug_upper_jsonfunc!" : "s_var",                "$" : "+"            }        }`;
    var options;
    var optionstr = `        {            "jsonlong" : "jsonfile"        }`;
    var parser;
    var args;
    var depstrval;
    var depliststr;

    setup_before(t);
    write_file_callback('parseXXXXXX.json', '{"dep":{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"},"port":6000,"verbose":3}\n', t, 'jsonfile', function (jsonfile) {
        write_file_callback('parseXXXXXX.json', '{"list":["depjson1","depjson2"]}\n', t, 'depjsonfile', function (depjsonfile) {
            depstrval = 'newval';
            depliststr = '["depenv1","depenv2"]';
            renew_variable('EXTARGSPARSE_JSONFILE', jsonfile);
            renew_variable('DEP_JSONFILE', depjsonfile);
            options = extargsparse.ExtArgsOption(optionstr);
            options.priority = [extargsparse.ENV_COMMAND_JSON_SET, extargsparse.ENVIRONMENT_SET, extargsparse.ENV_SUB_COMMAND_JSON_SET];
            parser = extargsparse.ExtArgsParse(options);
            parser.load_command_line_string(commandline);
            renew_variable('DEP_STRING', depstrval);
            renew_variable('DEP_LIST', depliststr);



            args = parser.parse_command_line(['--jsonfile', jsonfile, 'dep', 'ww']);
            t.equal(args.verbose, 3, get_notice(t, 'verbose 3'));
            t.equal(args.port, 6000, get_notice(t, 'port 6000'));
            t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand dep'));
            t.deepEqual(args.dep_list, ["jsonval1"], get_notice(t, 'dep_list [jsonval1]'));
            t.equal(args.dep_string, 'JSONSTRING', get_notice(t, 'dep_string JSONSTRING'));
            t.deepEqual(args.subnargs, ['ww'], get_notice(t, 'subnargs [ww]'));
            unlink_file_callback(depjsonfile, 'depjsonfile', t, function () {
                unlink_file_callback(jsonfile, 'jsonfile', t, function () {
                    t.end();
                });
            });
        });
    });
});

test('A056', function (t) {
    'use strict';
    var commandline = `        {            "asn1parse" : {                "$" : 0,                "$inform!optparse=inform_optparse;completefunc=inform_complete!" : null,                "$in" : null,                "$out" : null,                "$noout" : false,                "$offset" : 0,                "$length" : -1,                "$dump" : false,                "$dlimit" : -1,                "$oid" : null,                "$strparse" : 0,                "$genstr" : null,                "$genconf" : null            }        }`;
    var options;
    var optionstr = `        {            "longprefix" : "-",            "shortprefix" : "-",            "nojsonoption" : true,            "cmdprefixadded" : false        }`;
    var parser;
    var optnames;
    var cmdopts;
    var opt;
    var idx;

    setup_before(t);
    options = extargsparse.ExtArgsOption(optionstr);
    parser = extargsparse.ExtArgsParse(options);
    parser.load_command_line_string(commandline);
    t.deepEqual(parser.get_subcommands(), ['asn1parse'], get_notice(t, 'subcommands'));
    optnames = ['inform', 'in', 'out', 'noout', 'offset', 'length', 'dump', 'dlimit', 'oid', 'strparse', 'genstr', 'genconf'];
    cmdopts = parser.get_cmdopts('asn1parse');
    for (idx = 0; idx < cmdopts.length; idx += 1) {
        opt = cmdopts[idx];
        if (opt.isflag && opt.typename !== 'args') {
            if (opt.typename === 'help') {
                t.equal(opt.longopt, '-help', get_notice(t, 'opt help'));
                t.equal(opt.shortopt, '-h', get_notice(t, 'short opt help'));
            } else {
                t.ok(optnames.indexOf(opt.optdest) >= 0, get_notice(t, util.format('optdest [%s]', opt.optdest)));
                t.equal(opt.longopt, util.format('-%s', opt.optdest), get_notice(t, util.format('optlong [%s]', opt.longopt)));
            }
        }
    }
    t.end();
});

test('A057', function (t) {
    'use strict';
    var commandline = `        {            "asn1parse" : {                "$" : 0,                "$inform!optparse=inform_optparse;completefunc=inform_complete!" : null,                "$in" : null,                "$out" : null,                "$noout" : false,                "$offset" : 0,                "$length" : -1,                "$dump" : false,                "$dlimit" : -1,                "$oid" : null,                "$strparse" : 0,                "$genstr" : null,                "$genconf" : null            },            "ca" : {                "$" : 0,                "$config" : null,                "$name" : null,                "$in" : null,                "$ss_cert" : null,                "$spkac" : null,                "$infiles" : null,                "$out" : null,                "$outdir" : null,                "$cert" : null,                "$keyfile" : null,                "$keyform!optparse=inform_optparse;completefunc=inform_complete!" : null,                "$key" : null,                "$selfsign" : false,                "$passin" : null,                "$verbose" : "+",                "$notext" : false,                "$startdate" : null,                "$enddate" : null,                "$days" : 30,                "$md" : null,                "$policy" : null,                "$preserveDN" : false,                "$msie_hack" : false,                "$noemailDN" : false,                "$batch" : false,                "$extensions" : null,                "$extfile" : null,                "$engine" : null,                "$subj" : null,               "$utf8" : false,                "$multivalue-rdn" : false,                "$gencrl" : false,                "$crldays" : 30,                "$crlhours" : -1,                "$revoke" : null,                "$status" : null,                "$updatedb" : false,                "$crl_reason" : null,                "$crl_hold" : null,                "$crl_compromise" : null,                "$crl_CA_compromise" : null,                "$crlexts" : null            }        }        `;
    var options;
    var optionstr = `        {            "longprefix" : "-",            "shortprefix" : "-",            "nojsonoption" : true,            "cmdprefixadded" : false,            "flagnochange" : true        }`;
    var parser;
    var optnames;
    var cmdopts;
    var opt;
    var idx;

    setup_before(t);
    options = extargsparse.ExtArgsOption(optionstr);
    parser = extargsparse.ExtArgsParse(options);
    parser.load_command_line_string(commandline);
    t.deepEqual(parser.get_subcommands(), ['asn1parse', 'ca'], get_notice(t, 'subcommands'));
    optnames = ['config', 'name', 'in', 'ss_cert', 'spkac', 'infiles', 'out', 'outdir', 'cert', 'keyfile', 'keyform', 'key', 'selfsign', 'passin', 'verbose', 'notext', 'startdate', 'enddate', 'days', 'md', 'policy', 'preserveDN', 'msie_hack', 'noemailDN', 'batch', 'extensions', 'extfile', 'engine', 'subj', 'utf8', 'gencrl', 'crldays', 'crlhours', 'revoke', 'status', 'updatedb', 'crl_reason', 'crl_hold', 'crl_compromise', 'crl_CA_compromise', 'crlexts'];
    cmdopts = parser.get_cmdopts('ca');
    for (idx = 0; idx < cmdopts.length; idx += 1) {
        opt = cmdopts[idx];
        if (opt.isflag && opt.typename !== 'args') {
            if (opt.typename === 'help') {
                t.equal(opt.longopt, '-help', get_notice(t, 'opt help'));
                t.equal(opt.shortopt, '-h', get_notice(t, 'short opt help'));
            } else {
                if (opt.longopt === '-multivalue-rdn') {
                    t.equal(opt.optdest, 'multivalue_rdn', get_notice(t, util.format('optdest [%s]', opt.optdest)));
                } else {
                    t.ok(optnames.indexOf(opt.optdest) >= 0, get_notice(t, util.format('optdest [%s]', opt.optdest)));
                    t.equal(opt.longopt, util.format('-%s', opt.optdest), get_notice(t, util.format('optlong [%s]', opt.longopt)));
                }
            }
        }
    }
    t.end();
});

test('A058', function (t) {
    'use strict';
    var commandline = `        {            "verbose" : "+",            "dep" : {                "$" : "*"            },            "rdep" : {                "$" : "*"            }        }`;
    var parser;
    var sio;
    var sarr;
    var matchexpr;

    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(commandline);
    sio = new StringIO();
    parser.print_help(sio);
    sarr = split_strings(sio.getvalue());
    matchexpr = new RegExp('.*\\[OPTIONS\\]\\s+\\[SUBCOMMANDS\\]\\s+.*');
    t.ok(matchexpr.test(sarr[0]), get_notice(t, 'match .*\\[OPTIONS\\]\\s+\\[SUBCOMMANDS\\]\\s+.*'));
    t.end();
});

test('A059', function(t) {
    'use strict';
    var commandline = `        {            "verbose|v" : "+",            "kernel|K" : "/boot/",            "initrd|I" : "/boot/",            "pair|P!optparse=Debug_set_2_args!" : [],            "encryptfile|e" : null,            "encryptkey|E" : null,            "setupsectsoffset" : 663,            "ipxe" : {                "$" : "+"            }        }    `;
    var parser;
    var options;
    var args;

    options = extargsparse.ExtArgsOption();
    options.parseall = true;
    options.longprefix = "++";
    options.shortprefix = "+";
    parser = extargsparse.ExtArgsParse(options);
    parser.load_command_line_string(commandline);

    args = parser.parse_command_line(['+K','kernel','++pair','initrd', 'cc', 'dd', '+E', 'encryptkey',
            '+e' ,'encryptfile','ipxe'], null);
    t.equal(args.subcommand, 'ipxe', get_notice(t,"subcommand"));
    t.deepEqual(args.subnargs, ['dd'], get_notice(t, "subnargs"));
    t.deepEqual(args.pair,['INITRD','CC']);
    t.end();
});

test('A060', function(t) {
    'use strict';
    var commandline=`        {            "dep" : {                "$" : "*",                "ip" : {                    "$" : "*"                }            },            "rdep" : {                "$" : "*",                "ip" : {                    "$" : "*"                }            }        }    `;
    var parser;
    var sio;
    var sarr ;

    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(commandline);
   
    sio = new StringIO();
    parser.print_help(sio);
    sarr = split_strings(sio.getvalue());
    get_cmds_ok(t,parser,sarr,"");

    sio = new StringIO();
    parser.print_help(sio,"dep");
    sarr = split_strings(sio.getvalue());
    get_cmds_ok(t,parser,sarr,"dep");


    sio = new StringIO();
    parser.print_help(sio,"rdep");
    sarr = split_strings(sio.getvalue());
    get_cmds_ok(t,parser,sarr,"rdep");

    t.end();
    return;
});

test('A061', function(t) {
    'use strict';
    var commandline=`        {            "dep##[cc]... dep handler used##" : {                "$" : "*",                "ip" : {                    "$" : "*"                }            },            "rdep##[dd]... rdep handler used##" : {                "$" : "*",                "ip" : {                    "$" : "*"                }            }        }    `;
    var parser;
    var sio;
    var sarr ;
    var expr ;
    var m ;
    var ok = false;

    parser = extargsparse.ExtArgsParse();
    parser.load_command_line_string(commandline);
   
    sio = new StringIO();
    parser.print_help(sio,"dep");
    sarr = split_strings(sio.getvalue());
    expr = new RegExp('\\[cc\\]... dep handler used');
    m = expr.exec(sarr[0]);
    if (m !== null && m !== undefined) {
        ok = true;
    }
    t.equal(ok , true, get_notice(t, 'get dep usage'));

    sio = new StringIO();
    parser.print_help(sio,"rdep");
    sarr = split_strings(sio.getvalue());
    expr = new RegExp('\\[dd\\]... rdep handler used');
    m = expr.exec(sarr[0]);
    if (m !== null && m !== undefined) {
        ok = true;
    }
    t.equal(ok , true, get_notice(t, 'get rdep usage'));
    t.end();
});

test('A062', function(t) {
    'use strict';
    var commandline=`
            {
            "dep##[cc]... dep handler used##" : {
                "$" : "*",
                "ip" : {
                    "$" : "*"
                }
            },
            "rdep##[dd]... rdep handler used##" : {
                "$" : "*",
                "ip" : {
                    "$" : "*"
                }
            }
        }
    `;
    var parser;
    var sio;
    var sarr ;
    var expr ;
    var m ;
    var ok = false;
    var opts;
    var expr2 ;

    opts = extargsparse.ExtArgsOption();
    opts.prog = 'cmd1';
    parser = extargsparse.ExtArgsParse(opts);
    parser.load_command_line_string(commandline);
   
    sio = new StringIO();
    parser.print_help(sio,"dep");
    sarr = split_strings(sio.getvalue());
    expr = new RegExp('\\[cc\\]... dep handler used');
    expr2 = new RegExp('cmd1');
    m = expr.exec(sarr[0]);
    if (m !== null && m !== undefined) {
        m = expr2.exec(sarr[0]);
        if (m !== null && m !== undefined) {
            ok = true;    
        }        
    }
    t.equal(ok , true, get_notice(t, 'get dep usage'));

    sio = new StringIO();
    parser.print_help(sio,"rdep");
    sarr = split_strings(sio.getvalue());
    expr = new RegExp('\\[dd\\]... rdep handler used');
    expr2 = new RegExp('cmd1');
    m = expr.exec(sarr[0]);
    if (m !== null && m !== undefined) {
        m = expr2.exec(sarr[0]);
        if (m !== null && m !== undefined) {
            ok = true;    
        }        
    }
    t.equal(ok , true, get_notice(t, 'get rdep usage'));
    t.end();
});