var keyparse = require('./keyparse');
var util = require('util');
var fs = require('fs');
var assert = require('assert');
var stacktrace = require('stack-trace');

var not_null = function (v) {
    'use strict';
    if (v === undefined || v === null) {
        return false;
    }
    return true;
};


var set_property_value = function (self, name, value) {
    'use strict';
    var hasproperties;
    var added = 0;
    hasproperties = Object.getOwnPropertyNames(self);
    if (hasproperties.indexOf(name) < 0) {
        Object.defineProperty(self, name, {
            enumerable: true,
            get: function () {
                return value;
            },
            set: function (v) {
                var errstr;
                v = v;
                errstr = util.format('can not set (%s) value', name);
                throw new Error(errstr);
            }
        });
        added = 1;
    }
    return added;
};

var set_property_max = function (dictobj, newobj, name) {
    'use strict';
    newobj[name] = 0;
    Object.defineProperty(dictobj, name, {
        enumerable: true,
        get: function () {
            return newobj[name];
        },
        set: function (v) {
            if (newobj[name] < v) {
                newobj[name] = v;
            }
        }
    });
    return 1;
};



var setting_object = function (self, setting) {
    'use strict';
    Object.keys(setting).forEach(function (k) {
        if (setting[k] !== undefined) {
            self[k] = setting[k];
        }
    });
    return self;
};

var setting_string = function (self, setting) {
    'use strict';
    var setobj = {};
    try {
        setobj = JSON.parse(setting);
        self = setting_object(self, setobj);
    } catch (e) {
        console.error('[%s] parse error[%s]', setting, e);
    }
    return self;
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
    var innerself = {};
    var self = {};
    var envname;
    if (!not_null(cmdname)) {
        cmdname = 'extargsparse';
    }

    innerself.loglevel = 0;



    self.format_string = function (arr) {
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
        } else if (not_null(arr)) {
            rets += util.format('%s', arr);
        } else if (arr === undefined) {
            rets += 'undefined';
        } else if (arr === null) {
            rets += 'null';
        }
        return rets;
    };

    self.format_call_message = function (msg, callstack) {
        var stktr = stacktrace.get();
        var retstr = '';
        if (callstack !== undefined && stktr.length > callstack && not_null(stktr[callstack])) {
            retstr += util.format('[%s:%s:%s]', format_length(util.format('%s', stktr[callstack].getFileName()), 10), format_length(util.format('%s', stktr[callstack].getFunctionName()), 20), format_length(util.format('%s', stktr[callstack].getLineNumber()), 5));
        }
        retstr += msg;
        return retstr + '\n';
    };

    innerself.inner_output = function (msg, needlevel, callstack) {
        if (innerself.loglevel >= needlevel) {
            if (!not_null(callstack)) {
                callstack = 3;
            } else {
                callstack += 1;
            }
            process.stderr.write(self.format_call_message(msg, callstack));
        }
        return;

    };

    self.info = function (msg, callstack) {
        innerself.inner_output(msg, 2, callstack);
        return;
    };

    self.warn = function (msg, callbastack) {
        innerself.inner_output(msg, 1, callbastack);
        return;
    };

    self.error = function (msg, callstack) {
        innerself.inner_output(msg, 0, callstack);
        return;
    };

    self.debug = function (msg, callstack) {
        innerself.inner_output(msg, 3, callstack);
        return;
    };

    self.debug = function (msg, callstack) {
        innerself.inner_output(msg, 4, callstack);
        return;
    };

    self.call_func = function (funcname, context, ...args) {
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

    innerself.inner_init_fn = function () {
        envname = util.format('%s_LOGLEVEL', cmdname);
        envname = envname.toUpperCase();
        if (process.env[envname] !== undefined && process.env[envname] !== null) {
            innerself.loglevel = parseInt(process.env[envname]);
        }

        return self;
    };


    return innerself.inner_init_fn();
}

function ExtArgsOption(setting) {
    'use strict';
    var default_value = {
        prog: process.argv[1],
        usage: '',
        description: '',
        epilog: '',
        version: '0.0.1',
        errorhandler: 'exit',
        helphandler: null,
        longprefix: '--',
        shortprefix: '-',
        nohelpoption: false,
        nojsonoption: false,
        helplong: 'help',
        helpshort: 'h',
        jsonlong: 'json',
        cmdprefixadded: true,
        parseall: true,
        screenwidth: 80,
        flagnochange: false
    };
    var self = new LoggerObject();
    var innerself = {};

    innerself.inner_init_fn = function () {
        self = setting_object(self, default_value);
        if (typeof setting === 'object') {
            self = setting_object(self, setting);
        } else if (typeof setting === 'string') {
            self = setting_string(self, setting);
        }
        return self;
    };

    self.format_string = function () {
        var rets = '';
        var keys;
        var idx;
        keys = Object.keys(self);
        rets += '{';
        for (idx = 0; idx < keys.length; idx += 1) {
            rets += util.format('%s=%s;', keys[idx], self[keys[idx]]);
        }
        rets += '}';
        return rets;
    };

    return innerself.inner_init_fn();
}

function HelpSize() {
    'use strict';
    var self = new LoggerObject();
    var innerself = {};

    self.format = function (dictobj) {
        var str = '';
        str += '{';
        Object.keys(dictobj).forEach(function (k) {
            if (str.length > 1) {
                str += ',';
            }
            str += util.format('%s=%s', k, self[k]);
        });
        str += '}';
        return str;
    };

    innerself.inner_init_fn = function () {
        set_property_max(self, innerself, 'optnamesize');
        set_property_max(self, innerself, 'optexprsize');
        set_property_max(self, innerself, 'opthelpsize');
        set_property_max(self, innerself, 'cmdnamesize');
        set_property_max(self, innerself, 'cmdhelpsize');
        return self;
    };

    return innerself.inner_init_fn();
}


function ParserCompat(keycls, opt) {
    'use strict';
    var self = new LoggerObject();
    var innerself = {};
    if (!not_null(keycls)) {
        keycls = null;
    }
    if (!not_null(opt)) {
        opt = null;
    }

    innerself.inner_get_opt_helpinfo = function (optcmd) {
        var opthelp = '';
        if (not_null(optcmd.attr) && not_null(optcmd.attr.opthelp)) {
            opthelp += self.call_func(optcmd.attr.opthelp, null, optcmd);
        } else {
            if (optcmd.typename === 'boolean') {
                if (optcmd.value) {
                    opthelp += util.format('%s set false default(True)', optcmd.optdest);
                } else {
                    opthelp += util.format('%s set true default(False)', optcmd.optdest);
                }
            } else if ((optcmd.typename === 'string' && optcmd.value === '+') || optcmd.typename === 'count') {
                if (optcmd.isflag) {
                    opthelp += util.format('%s inc', optcmd.optdest);
                } else {
                    var errstr;
                    errstr = util.format('cmd(%s) can not set value(%s)', optcmd.cmdname, optcmd.value);
                    throw new Error(errstr);
                }
            } else if (optcmd.typename === 'help') {
                opthelp += 'to display this help information';
            } else {
                if (optcmd.isflag) {
                    opthelp += util.format('%s set default(%s)', optcmd.optdest, optcmd.value);
                } else {
                    opthelp += util.format('%s command exec', optcmd.cmdname);
                }
            }

            if (not_null(optcmd.helpinfo)) {
                opthelp = optcmd.helpinfo;
            }
        }
        return opthelp;
    };

    innerself.inner_init_fn = function () {
        if (keycls !== null) {
            assert.equal(keycls.iscmd, true, 'keycls must be cmd');
            self.keycls = keycls;
            self.cmdname = keycls.cmdname;
            self.cmdopts = [];
            self.subcommands = [];
            self.helpinfo = util.format('%s handler', self.cmdname);
            if (not_null(keycls.helpinfo)) {
                self.helpinfo = keycls.helpinfo;
            }
            self.callfunction = null;
            if (not_null(keycls.function)) {
                self.callfunction = keycls.function;
            }
        } else {
            self.keycls = keyparse.KeyParser('', 'main', {}, false);
            self.cmdname = '';
            self.cmdopts = [];
            self.subcommands = [];
            self.helpinfo = null;
            self.callfunction = null;
        }
        self.screenwidth = 80;
        if (not_null(opt) && not_null(opt.screenwidth)) {
            self.screenwidth = opt.screenwidth;
        }
        if (self.screenwidth < 40) {
            self.screenwidth = 40;
        }
        self.epilog = null;
        self.description = null;
        self.prog = null;
        self.usage = null;
        self.version = null;
        return self;
    };



    innerself.inner_get_cmd_cmdname = function (cls) {
        var retstr = '';
        if (not_null(cls.cmdname)) {
            retstr += util.format('[%s]', cls.cmdname);
        }
        return retstr;
    };

    innerself.inner_get_cmd_helpinfo = function (cls) {
        var retstr = '';
        if (not_null(cls.helpinfo)) {
            retstr += cls.helpinfo;
        }
        return retstr;
    };

    innerself.inner_get_opt_optname = function (optcmd) {
        var optname = '';
        optname = optcmd.longopt;
        if (not_null(optcmd.shortopt)) {
            optname += util.format('|%s', optcmd.shortopt);
        }
        return optname;
    };

    innerself.inner_get_opt_expr = function (optcmd) {
        var optexpr = '';
        if (optcmd.typename !== 'boolean' && optcmd.typename !== 'args' && optcmd.typename !== 'object' && optcmd.typename !== 'help') {
            optexpr += optcmd.varname;
            optexpr = optexpr.replace(/-/g, '_');
        }
        return optexpr;
    };


    self.get_help_size = function (helpsize, recursive) {
        var cmdname;
        var cmdhelp;

        if (!not_null(helpsize)) {
            helpsize = new HelpSize();
        }

        if (!not_null(recursive)) {
            recursive = 0;
        }

        cmdname = innerself.inner_get_cmd_cmdname(self);
        cmdhelp = innerself.inner_get_cmd_helpinfo(self);
        helpsize.cmdnamesize = cmdname.length;
        helpsize.cmdhelpsize = cmdhelp.length;
        self.cmdopts.forEach(function (curopt) {
            if (curopt.typename !== 'args') {
                helpsize.optnamesize = innerself.inner_get_opt_optname(curopt).length + 1;
                helpsize.optexprsize = innerself.inner_get_opt_expr(curopt).length + 1;
                helpsize.opthelpsize = innerself.inner_get_opt_helpinfo(curopt).length + 1;
            }
        });

        if (recursive) {
            self.subcommands.forEach(function (curcmd) {
                if (recursive > 0) {
                    helpsize = curcmd.get_help_size(helpsize, (recursive - 1));
                } else {
                    helpsize = curcmd.get_help_size(helpsize, recursive);
                }
            });
        }

        self.subcommands.forEach(function (curcmd) {
            helpsize.cmdnamesize = curcmd.cmdname.length + 2;
            helpsize.cmdhelpsize = curcmd.helpinfo.length;
        });
        return helpsize;
    };

    innerself.inner_get_indent_string = function (s, indentsize, maxsize) {
        var rets = '';
        var curs = '';
        var idx = 0;
        var jdx = 0;
        var c;
        for (jdx = 0; jdx < indentsize; jdx += 1) {
            curs += ' ';
        }
        for (idx = 0; idx < s.length; idx += 1) {
            c = s[idx];
            if ((c === ' ' || c === '\t') && curs.length >= maxsize) {
                rets += curs + '\n';
                curs = '';
                for (jdx = 0; jdx < indentsize; jdx += 1) {
                    curs += ' ';
                }
            } else {
                curs += c;
            }

        }
        if (curs.length > 0) {
            if (curs.replace(/[\s]+$/g, '').length > 0) {
                rets += curs + '\n';
            }
        }
        curs = '';
        return rets;
    };


    self.get_help_info = function (helpsize, parentcmds) {
        var retstr = '';
        var rootcmds;
        var optname;
        var optexpr;
        var opthelp;
        var cmdname;
        var cmdhelp;
        var curstr;
        var idx;
        var curopt;
        if (!not_null(helpsize)) {
            helpsize = null;
        }
        if (!not_null(parentcmds)) {
            parentcmds = [];
        }

        if (!not_null(helpsize)) {
            helpsize = self.get_help_size();
        }

        if (not_null(self.usage) && self.usage.length > 0) {
            self.info(util.format('usage [%s]', self.usage));
            retstr += self.usage;
        } else {
            rootcmds = self;
            if (parentcmds.length > 0) {
                rootcmds = parentcmds[0];
            }
            if (not_null(rootcmds.prog)) {
                retstr += util.format('%s', rootcmds.prog);
            } else {
                retstr += util.format('%s', process.argv[1]);
            }

            if (parentcmds.length > 0) {
                parentcmds.forEach(function (curcmd) {
                    retstr += util.format(' %s', curcmd.cmdname);
                });
            }

            retstr += util.format(' %s', self.cmdname);

            if (self.cmdopts.length > 0) {
                retstr += util.format(' [OPTIONS]');
            }

            if (self.subcommands.length > 0) {
                retstr += util.format(' [SUBCOMMANDS]');
            }

            for (idx = 0; idx < self.cmdopts.length; idx += 1) {
                curopt = self.cmdopts[idx];
                if (curopt.flagname === '$') {
                    if (curopt.nargs === '+') {
                        retstr += util.format(' args...');
                    } else if (curopt.nargs === '*') {
                        retstr += util.format(' [args...]');
                    } else if (curopt.nargs === '?') {
                        retstr += util.format(' arg');
                    } else {
                        if (curopt.nargs > 1) {
                            retstr += ' args...';
                        } else if (curopt === 1) {
                            retstr += ' arg';
                        } else {
                            retstr += '';
                        }
                    }
                }
            }
            retstr += '\n';
        }

        if (not_null(self.description)) {
            retstr += util.format('%s\n', self.description);
        }

        if (self.cmdopts.length > 0) {
            retstr += '[OPTIONS]\n';
            for (idx = 0; idx < self.cmdopts.length; idx += 1) {
                curopt = self.cmdopts[idx];
                if (curopt.typename !== 'args') {
                    optname = innerself.inner_get_opt_optname(curopt);
                    optexpr = innerself.inner_get_opt_expr(curopt);
                    opthelp = innerself.inner_get_opt_helpinfo(curopt);

                    curstr = '';
                    curstr += util.format('    ');
                    curstr += util.format('%s %s %s\n', format_length(util.format('%s', optname), helpsize.optnamesize), format_length(optexpr, helpsize.optexprsize), format_length(opthelp, helpsize.opthelpsize));
                    if (curstr.length < self.screenwidth) {
                        retstr += curstr;
                    } else {
                        curstr = '';
                        curstr += util.format('    ');
                        curstr += util.format('%s %s', format_length(optname, helpsize.optnamesize), format_length(optexpr, helpsize.optexprsize));
                        retstr += curstr + '\n';
                        if (self.screenwidth >= 60) {
                            retstr += innerself.inner_get_indent_string(opthelp, 20, self.screenwidth);
                        } else {
                            retstr += innerself.inner_get_indent_string(opthelp, 15, self.screenwidth);
                        }
                    }
                }
            }
        }

        if (self.subcommands.length > 0) {
            retstr += '[SUBCOMMANDS]\n';
            self.subcommands.forEach(function (curcmd) {
                cmdname = innerself.inner_get_cmd_cmdname(curcmd);
                cmdhelp = innerself.inner_get_cmd_helpinfo(curcmd);
                curstr = '';
                curstr += util.format('    ');
                curstr += util.format('%s %s', format_length(cmdname, helpsize.cmdnamesize), format_length(cmdhelp, helpsize.cmdhelpsize));
                if (curstr.length < self.screenwidth) {
                    retstr += curstr + '\n';
                } else {
                    curstr = '';
                    curstr += '    ';
                    curstr += format_length(cmdname, helpsize.cmdnamesize);
                    retstr += curstr + '\n';
                    if (self.screenwidth >= 60) {
                        retstr += innerself.inner_get_indent_string(cmdhelp, 20, self.screenwidth);
                    } else {
                        retstr += innerself.inner_get_indent_string(cmdhelp, 15, self.screenwidth);
                    }
                }
            });
        }

        if (not_null(self.epilog)) {
            retstr += '\n' + self.epilog + '\n';
        }

        return retstr;
    };

    self.format = function () {
        var retstr = '';
        var idx = 0;
        retstr += util.format('@%s|', self.cmdname);
        if (self.subcommands.length > 0) {
            idx = 0;
            retstr += util.format('subcommands[%d]<', self.subcommands.length);
            for (idx = 0; idx < self.subcommands.length; idx += 1) {
                if (idx > 0) {
                    retstr += '|';
                }
                retstr += util.format('%s', self.subcommands[idx].cmdname);
            }
            retstr += '>';
        }

        if (self.cmdopts.length > 0) {
            retstr += util.format('cmdopts[%d]<', self.cmdopts.length);
            for (idx = 0; idx < self.cmdopts.length; idx += 1) {
                if (idx > 0) {
                    retstr += '|';
                }
                retstr += util.format('%s', self.subcommands[idx].format());
            }
            retstr += '>';
        }
        return retstr;
    };

    return innerself.inner_init_fn();
}



function ParseState(args, maincmd, optattr) {
    'use strict';
    var self = new LoggerObject();
    var innerself = {};
    if (!not_null(optattr)) {
        optattr = new ExtArgsOption();
    }
    self.info(util.format('args [%s]', args));

    innerself.inner_init_fn = function () {
        innerself.cmdpaths = [maincmd];
        innerself.curidx = 0;
        innerself.curcharidx = -1;
        innerself.shortcharargs = -1;
        innerself.longargs = -1;
        innerself.keyidx = -1;
        innerself.validx = -1;
        innerself.args = args;
        self.info(util.format('innerself.args [%s]', innerself.args));
        innerself.ended = 0;
        innerself.longprefix = optattr.longprefix;
        innerself.shortprefix = optattr.shortprefix;
        if (innerself.shortprefix === null || innerself.longprefix === null || innerself.shortprefix !== innerself.longprefix) {
            innerself.bundlemode = true;
        } else {
            innerself.bundlemode = false;
        }
        innerself.parseall = optattr.parseall;
        innerself.leftargs = [];
        return self;
    };



    self.format_cmdname_path = function (curparser) {
        var cmdname = '';
        if (!not_null(curparser)) {
            curparser = null;
        }
        if (!not_null(curparser)) {
            curparser = innerself.cmdpaths;
        }
        curparser.forEach(function (curcmd) {
            if (cmdname.length > 0) {
                cmdname += '.';
            }
            cmdname += curcmd.cmdname;
        });
        return cmdname;
    };

    innerself.inner_find_sub_command = function (name) {
        var cmdpathslen = innerself.cmdpaths.length;
        var findkeycls = null;
        if (cmdpathslen > 0) {
            self.info(util.format('cmdpathslen [%d] [%s] search for [%s]', cmdpathslen, innerself.cmdpaths[(cmdpathslen - 1)].cmdname, name));
            innerself.cmdpaths[(cmdpathslen - 1)].subcommands.forEach(function (curcmd, jdx) {
                self.info(util.format('[%d]cmd[%s]', jdx, curcmd.cmdname));
                if (curcmd.cmdname === name) {
                    innerself.cmdpaths.push(curcmd);
                    self.info(util.format(' keycls [%s]', curcmd.keycls.format_string()));
                    findkeycls = curcmd.keycls;
                }
            });
        }
        return findkeycls;
    };


    self.add_parse_args = function (nargs) {
        if (innerself.curcharidx >= 0) {
            if (nargs > 0 && innerself.shortcharargs > 0) {
                throw new Error(util.format('[%s] already set args', innerself.args[innerself.curidx]));
            }
            if (innerself.shortcharargs < 0) {
                innerself.shortcharargs = 0;
            }
            innerself.shortcharargs += nargs;
        } else {
            if (innerself.longargs > 0) {
                throw new Error(util.format('[%s] already set args', innerself.args[innerself.curidx]));
            }

            if (innerself.longargs < 0) {
                innerself.longargs = 0;
            }
            innerself.longargs += nargs;
            self.info(util.format('longargs [%d] nargs[%d]', innerself.longargs, nargs));
        }
        return;
    };

    innerself.inner_find_key_cls = function () {
        var c;
        var oldcharidx;
        var oldidx;
        var curch;
        var idx;
        var curcmd;
        var curarg;
        var copyargs;
        var keycls;
        var curopt;
        var jdx;
        if (innerself.ended > 0) {
            return null;
        }

        if (innerself.longargs >= 0) {
            assert.ok(innerself.curcharidx < 0, util.format('curcharidx[%d] < 0', innerself.curcharidx));
            innerself.curidx += innerself.longargs;
            innerself.longargs = -1;
            innerself.validx = -1;
            innerself.keyidx = -1;
        }

        oldcharidx = innerself.curcharidx;
        oldidx = innerself.curidx;
        if (oldidx >= innerself.args.length) {
            innerself.curidx = oldidx;
            innerself.curcharidx = -1;
            innerself.shortcharargs = -1;
            innerself.longargs = -1;
            innerself.keyidx = -1;
            innerself.validx = -1;
            innerself.ended = 1;
            return null;
        }

        if (oldcharidx >= 0) {
            c = innerself.args[oldidx];
            if (c.length <= oldcharidx) {
                oldidx += 1;
                self.info(util.format('oldidx [%d]', oldidx));
                if (innerself.shortcharargs > 0) {
                    oldidx += innerself.shortcharargs;
                }
                self.info(util.format('oldidx [%d] shortcharargs [%d]', oldidx, innerself.shortcharargs));
                innerself.curidx = oldidx;
                innerself.curcharidx = -1;
                innerself.shortcharargs = -1;
                innerself.keyidx = -1;
                innerself.validx = -1;
                innerself.longargs = -1;
                return innerself.inner_find_key_cls();
            }

            curch = c[oldcharidx];
            self.info(util.format('argv[%d][%d] %s', oldidx, oldcharidx, curch));
            idx = innerself.cmdpaths.length - 1;
            self.info(util.format('cmdpathslen [%s]', innerself.cmdpaths.length));
            while (idx >= 0) {
                curcmd = innerself.cmdpaths[idx];
                self.info(util.format('[%d] cmdopts.length [%d]', idx, curcmd.cmdopts.length));
                for (jdx = 0; jdx < curcmd.cmdopts.length; jdx += 1) {
                    curopt = curcmd.cmdopts[jdx];
                    self.info(util.format('curopt %s', curopt.format_string()));
                    if (curopt.isflag && curopt.flagname !== '$' && not_null(curopt.shortflag)) {
                        if (curopt.shortflag === curch) {
                            innerself.keyidx = oldidx;
                            innerself.validx = (oldidx + 1);
                            innerself.curidx = oldidx;
                            innerself.curcharidx = (oldcharidx + 1);
                            self.info(util.format('%s validx [%s]', curopt.format_string(), innerself.validx));
                            return curopt;
                        }
                    }
                }
                idx -= 1;
            }
            if (true) {
                throw new Error(util.format('can not parse (%s)', innerself.args[oldidx]));
            }
        } else {
            if (innerself.bundlemode) {
                curarg = innerself.args[oldidx];
                if (curarg.startsWith(innerself.longprefix)) {
                    if (curarg === innerself.longprefix) {
                        innerself.keyidx = -1;
                        innerself.curidx = (oldidx + 1);
                        innerself.curcharidx = -1;
                        innerself.validx = (oldidx + 1);
                        innerself.shortcharargs = -1;
                        innerself.longargs = -1;
                        innerself.ended = 1;
                        if (innerself.args.length > innerself.curidx) {
                            copyargs = [];
                            for (jdx = innerself.curidx; jdx < innerself.args.length; jdx += 1) {
                                copyargs.push(innerself.args[jdx]);
                            }
                            innerself.leftargs = innerself.leftargs.concat(copyargs);
                        }
                        return null;
                    }
                    idx = innerself.cmdpaths.length - 1;
                    while (idx >= 0) {
                        curcmd = innerself.cmdpaths[idx];
                        for (jdx = 0; jdx < curcmd.cmdopts.length; jdx += 1) {
                            curopt = curcmd.cmdopts[jdx];
                            if (curopt.isflag && curopt.flagname !== '$') {
                                self.info(util.format('[%d]longopt %s curarg %s', idx, curopt.longopt, curarg));
                                if (curopt.longopt === curarg) {
                                    innerself.keyidx = oldidx;
                                    oldidx += 1;
                                    innerself.validx = oldidx;
                                    innerself.shortcharargs = -1;
                                    innerself.longargs = -1;
                                    self.info(util.format('oldidx %d (len %d)', oldidx, innerself.args.length));
                                    innerself.curidx = oldidx;
                                    innerself.curcharidx = -1;
                                    return curopt;
                                }
                            }
                        }
                        idx -= 1;
                    }
                    if (true) {
                        throw new Error(util.format('can not parse [%s]', innerself.args[oldidx]));
                    }
                } else if (curarg.startsWith(innerself.shortprefix)) {
                    if (curarg === innerself.shortprefix) {
                        if (innerself.parseall) {
                            innerself.leftargs.push(curarg);
                            oldidx += 1;
                            innerself.curidx = oldidx;
                            innerself.curcharidx = -1;
                            innerself.longargs = -1;
                            innerself.shortcharargs = -1;
                            innerself.keyidx = -1;
                            innerself.validx = -1;
                            return innerself.inner_find_key_cls();
                        } else {
                            innerself.ended = 1;
                            copyargs = [];
                            for (jdx = oldidx; jdx < innerself.args.length; jdx += 1) {
                                copyargs.push(innerself.args[jdx]);
                            }
                            innerself.leftargs = innerself.leftargs.concat(copyargs);
                            innerself.validx = oldidx;
                            innerself.keyidx = -1;
                            innerself.curidx = oldidx;
                            innerself.curcharidx = -1;
                            innerself.shortcharargs = -1;
                            innerself.longargs = -1;
                            return null;
                        }
                    }
                    oldcharidx = innerself.shortprefix.length;
                    innerself.curidx = oldidx;
                    innerself.curcharidx = oldcharidx;
                    return innerself.inner_find_key_cls();
                }
            } else {
                /* not bundle mode */
                idx = innerself.cmdpaths.length - 1;
                curarg = innerself.args[oldidx];
                while (idx >= 0) {
                    curcmd = innerself.cmdpaths[idx];
                    for (jdx = 0; jdx < curcmd.cmdopts.length; jdx += 1) {
                        curopt = curcmd.cmdopts[jdx];
                        if (curopt.isflag && curopt.flagname !== '$') {
                            self.info(util.format('curopt %s', curopt.format_string()));
                            self.info(util.format('[%d](%s) curarg [%s]', idx, curopt.longopt, curarg));
                            if (curopt.longopt === curarg) {
                                innerself.keyidx = oldidx;
                                innerself.validx = (oldidx + 1);
                                innerself.shortcharargs = -1;
                                innerself.longargs = -1;
                                self.info(util.format('oldidx %d (len %d)', oldidx, innerself.args.length));
                                innerself.curidx = (oldidx + 1);
                                innerself.curcharidx = -1;
                                return curopt;
                            }
                        }
                    }
                    idx -= 1;
                }

                idx = innerself.cmdpaths.length - 1;
                while (idx >= 0) {
                    curcmd = innerself.cmdpaths[idx];
                    for (jdx = 0; jdx < curcmd.cmdopts.length; jdx += 1) {
                        curopt = curcmd.cmdopts[jdx];
                        if (curopt.isflag && curopt.flagname !== '$') {
                            if (not_null(curopt.shortopt) && curopt.shortopt === curarg) {
                                innerself.keyidx = oldidx;
                                innerself.validx = (oldidx + 1);
                                innerself.shortcharargs = -1;
                                innerself.longargs = -1;
                                self.info(util.format('oldidx %d (len %d)', oldidx, innerself.args.length));
                                innerself.curidx = oldidx;
                                innerself.curcharidx = curopt.shortopt.length;
                                self.info('[%s]shortopt (%s)', oldidx, curopt.shortopt);
                                return curopt;
                            }
                        }
                    }
                    idx -= 1;
                }
            }
        }

        /*come here because we may be the command*/
        keycls = innerself.inner_find_sub_command(innerself.args[oldidx]);
        if (not_null(keycls)) {
            self.info(util.format('find %s', innerself.args[oldidx]));
            innerself.keycidx = oldidx;
            innerself.curidx = (oldidx + 1);
            innerself.validx = (oldidx + 1);
            innerself.curcharidx = -1;
            innerself.shortcharargs = -1;
            innerself.longargs = -1;
            return keycls;
        }

        self.info(util.format('keycls [null] for [%s]', innerself.args[oldidx]));
        if (not_null(innerself.parseall) && innerself.parseall) {
            self.info(util.format('push [%s]', innerself.args[oldidx]));
            innerself.leftargs.push(innerself.args[oldidx]);
            oldidx += 1;
            innerself.keyidx = -1;
            innerself.validx = oldidx;
            innerself.curidx = oldidx;
            innerself.curcharidx = -1;
            innerself.shortcharargs = -1;
            innerself.longargs = -1;
            return innerself.inner_find_key_cls();
        }
        /* this is over */
        innerself.ended = 1;
        copyargs = [];
        for (jdx = oldidx; jdx < innerself.args.length; jdx += 1) {
            copyargs.push(innerself.args[jdx]);
        }
        innerself.leftargs = innerself.leftargs.concat(copyargs);
        innerself.keycidx = -1;
        innerself.curidx = oldidx;
        innerself.curcharidx = -1;
        innerself.shortcharargs = -1;
        innerself.longargs = -1;
        return null;
    };

    self.step_one = function () {
        var curopt = null;
        if (innerself.ended > 0) {
            self.info(util.format('args %s __curidx %d', innerself.args, innerself.curidx));
            innerself.optval = innerself.leftargs;
            innerself.validx = innerself.curidx;
            return null;
        }

        curopt = innerself.inner_find_key_cls();
        if (!not_null(curopt)) {
            self.info(util.format('idx [%d] args[%s]', innerself.curidx, innerself.args));
            assert.ok(innerself.ended > 0, util.format('not ended [%d] > 0', innerself.ended));
            innerself.optval = innerself.leftargs;
            innerself.validx = innerself.curidx;
            return null;
        }

        if (!curopt.iscmd) {
            innerself.optval = curopt.optdest;
        } else {
            innerself.optval = self.format_cmdname_path(innerself.cmdpaths);
        }
        return curopt;
    };

    self.get_cmd_paths = function () {
        return innerself.cmdpaths;
    };

    self.get_optval = function () {
        return innerself.optval;
    };

    self.get_validx = function () {
        return innerself.validx;
    };

    self.get_curidx = function () {
        return innerself.curidx;
    };

    return innerself.inner_init_fn();
}

set_property_value(exports, 'COMMAND_SET', 'COMMAND_SET');
set_property_value(exports, 'SUB_COMMAND_JSON_SET', 'SUB_COMMAND_JSON_SET');
set_property_value(exports, 'COMMAND_JSON_SET', 'COMMAND_JSON_SET');
set_property_value(exports, 'ENVIRONMENT_SET', 'ENVIRONMENT_SET');
set_property_value(exports, 'ENV_SUB_COMMAND_JSON_SET', 'ENV_SUB_COMMAND_JSON_SET');
set_property_value(exports, 'ENV_COMMAND_JSON_SET', 'ENV_COMMAND_JSON_SET');
set_property_value(exports, 'DEFAULT_SET', 'DEFAULT_SET');


var set_attr_args = function (self, args, prefix) {
    'use strict';
    var keys = Object.keys(args);
    var idx;
    var curkey;
    var startkey = '';
    if (prefix !== undefined && prefix.length > 0) {
        startkey = util.format('%s_', prefix);
    }
    for (idx = 0; idx < keys.length; idx += 1) {
        curkey = keys[idx];
        if (startkey.length === 0 || curkey.startsWith(startkey)) {
            self[curkey] = args[curkey];
        }
    }
    return;
};

module.exports.set_attr_args = set_attr_args;

function OptCheck() {
    'use strict';
    var self = {};
    var innerself = {};

    innerself.inner_reset = function () {
        innerself.longopt = [];
        innerself.shortopt = [];
        innerself.varname = [];
        return self;
    };

    innerself.inner_init_fn = function () {
        innerself.inner_reset();
        return self;
    };

    self.copy = function (other) {
        innerself.inner_reset();
        innerself.longopt = innerself.longopt.concat(other.get_longopt());
        innerself.shortopt = innerself.shortopt.concat(other.get_shortopt());
        innerself.varname = innerself.varname.concat(other.get_varname());
        return;
    };

    self.get_longopt = function () {
        return innerself.longopt;
    };

    self.get_shortopt = function () {
        return innerself.shortopt;
    };

    self.get_varname = function () {
        return innerself.varname;
    };


    self.add_and_check = function (typename, value) {
        if (typename === 'longopt') {
            if (innerself.longopt.indexOf(value) >= 0) {
                return false;
            }
            innerself.longopt.push(value);
            if (true) {
                return true;
            }
        } else if (typename === 'shortopt') {
            if (innerself.shortopt.indexOf(value) >= 0) {
                return false;
            }
            innerself.shortopt.push(value);
            if (true) {
                return true;
            }
        } else if (typename === 'varname') {
            if (innerself.varname.indexOf(value) >= 0) {
                return false;
            }
            innerself.varname.push(value);
            return true;
        }
        return false;
    };

    return innerself.inner_init_fn();
}

function ExtArgsParse(option) {
    'use strict';
    var reserved_args = ['subcommand', 'subnargs', 'nargs', 'extargs', 'args'];
    var opt;
    var self = new LoggerObject();
    var accessed = {};
    var innerself = {};

    opt = new ExtArgsOption(option);


    innerself.inner_format_cmd_from_cmd_array = function (cmdarray) {
        var cmdname = '';
        if (!not_null(cmdarray)) {
            return '';
        }
        cmdarray.forEach(function (c) {
            if (cmdname.length > 0) {
                cmdname += '.';
            }
            cmdname += c.cmdname;
        });
        return cmdname;
    };

    innerself.inner_need_args_error = function (args, validx, keycls, params) {
        var keyval;
        args = args;
        keyval = '';
        if (validx > 0) {
            keyval = params[(validx - 1)];
        }

        if (keyval === keycls.longopt) {
            keyval = keycls.longopt;
        } else if (not_null(keycls.shortopt) && keyval.indexOf(keycls.shortflag) > 0) {
            /*we have shortprefix before ,so do this*/
            keyval = keycls.shortopt;
        }
        self.error_msg(util.format('[%s] need args', keyval));
        return;
    };

    innerself.inner_bool_action = function (args, validx, keycls, params) {
        validx = validx;
        params = params;
        if (keycls.value) {
            args[keycls.optdest] = false;
        } else {
            args[keycls.optdest] = true;
        }
        return 0;
    };

    innerself.inner_append_action = function (args, validx, keycls, params) {
        var value;
        if (validx >= params.length) {
            innerself.inner_need_args_error(validx, keycls, params);
        }
        value = params[validx];
        if (!not_null(args[keycls.optdest])) {
            args[keycls.optdest] = [];
        }
        args[keycls.optdest].push(value);
        return 1;
    };

    innerself.inner_string_action = function (args, validx, keycls, params) {
        if (validx >= params.length) {
            innerself.inner_need_args_error(validx, keycls, params);
        }
        args[keycls.optdest] = params[validx];
        return 1;
    };

    innerself.inner_jsonfile_action = function (args, validx, keycls, params) {
        return innerself.inner_string_action(args, validx, keycls, params);
    };

    innerself.inner_int_action = function (args, validx, keycls, params) {
        var base = 10;
        var value;
        if (validx >= params.length) {
            innerself.inner_need_args_error(validx, keycls, params);
        }
        value = params[validx];
        self.info(util.format('set value [%s][%s]', validx, value));
        if (value.startsWith('0x') || value.startsWith('0X')) {
            value = value.substring(2);
            base = 16;
        } else if (value.startsWith('x') || value.startsWith('X')) {
            value = value.substring(1);
            base = 16;
        }
        value = value.toLowerCase();

        if ((!value.match('^[0-9a-f]+$') && base === 16) || (!value.match('^[0-9]+$') && base === 10)) {
            self.error_msg(util.format('%s not valid int', params[validx]));
        }
        args[keycls.optdest] = parseInt(value, base);
        return 1;
    };

    innerself.inner_inc_action = function (args, validx, keycls, params) {
        validx = validx;
        params = params;
        if (!not_null(args[keycls.optdest])) {
            args[keycls.optdest] = 0;
        }
        args[keycls.optdest] += 1;
        return 0;
    };

    innerself.innner_float_action = function (args, validx, keycls, params) {
        var value;
        if (validx >= params.length) {
            innerself.inner_need_args_error(validx, keycls, params);
        }
        value = params[validx];
        if (!value.match('^[0-9]+(\.[0-9]+)?$')) {
            self.error_msg(util.format('can not parse %s', params[validx]));
        }
        args[keycls.optdest] = parseFloat(value);
        return 1;
    };

    innerself.inner_help_action = function (args, validx, keycls, value) {
        args = args;
        validx = validx;
        keycls = keycls;
        self.print_help(process.stdout, value);
        process.exit(0);
        return 0;
    };

    innerself.inner_command_action = function (args, validx, keycls, params) {
        args = args;
        validx = validx;
        keycls = keycls;
        params = params;
        return 0;
    };

    innerself.inner_json_value_base = function (args, keycls, value) {
        args[keycls.optdest] = value;
        return;
    };

    innerself.inner_json_value_error = function (args, keycls, value) {
        args = args;
        keycls = keycls;
        value = value;
        throw new Error('error set json value');
    };

    innerself.inner_get_full_trace_back = function (callstck, tabs, cnt) {
        if (!not_null(callstck)) {
            callstck = 1;
        }
        if (!not_null(tabs)) {
            tabs = 1;
        }
        if (!not_null(cnt)) {
            cnt = 0;
        }
        var rets = '';
        var stktr = stacktrace.get();
        var idx;
        for (idx = callstck; idx < stktr.length && ((cnt > 0 && idx < cnt) || cnt <= 0); idx += 1) {
            rets += format_length('', tabs * 4);
            rets += util.format('[%d][%s:%s:%s]\n', idx, stktr[idx].getFileName(), stktr[idx].getFunctionName(), stktr[idx].getLineNumber());
        }
        return rets;
    };

    self.error_msg = function (message) {
        var output = false;
        var outs = '';
        var modes = innerself.output_mode;
        if (modes.length > 0) {
            if (modes[(modes.length - 1)] === 'bash') {
                outs = '';
                outs += 'cat >&2 <<EXTARGSEOF\n';
                outs += util.format('parse command error\n    %s\n', message);
                outs += 'EXTARGSEOF\n';
                outs += 'exit 3\n';
                process.stdout.write(outs);
                output = true;
                process.exit(3);
            }
        }
        if (!output) {
            outs = 'parse command error\n';
            outs += util.format('    %s', self.format_call_message(message, 2));
        }

        if (innerself.error_handler === 'exit') {
            process.stderr.write(outs);
            process.exit(3);
            return;
        }
        throw new Error(outs);
    };

    innerself.inner_check_flag_insert = function (keycls, curparser) {
        var lastparser;
        var copyparser;
        var idx;
        var curopt;
        if (!not_null(curparser)) {
            curparser = null;
        }

        if (not_null(curparser)) {
            copyparser = [];
            for (idx = 0; idx < curparser.length; idx += 1) {
                copyparser.push(curparser[idx]);
            }
            lastparser = copyparser[(copyparser.length - 1)];
        } else {
            lastparser = innerself.maincmd;
        }

        for (idx = 0; idx < lastparser.cmdopts.length; idx += 1) {
            curopt = lastparser.cmdopts[idx];
            if (curopt.isflag && curopt.flagname !== '$' && keycls.flagname !== '$') {
                if (curopt.typename !== 'help' && keycls.typename !== 'help') {
                    if (curopt.optdest === keycls.optdest) {
                        return false;
                    }
                } else if (curopt.typename === 'help' && keycls.typename === 'help') {
                    return false;
                }
            } else if (curopt.isflag && curopt.flagname === '$' && keycls.flagname === '$') {
                return false;
            }
        }
        lastparser.cmdopts.push(keycls);
        return true;
    };

    innerself.inner_check_flag_insert_mustsucc = function (keycls, curparser) {
        var inserted;
        inserted = innerself.inner_check_flag_insert(keycls, curparser);
        if (!inserted) {
            var curcmdname = '';
            if (not_null(curparser)) {
                curparser.forEach(function (curcmd) {
                    if (curcmdname.length > 0) {
                        curcmdname += '.';
                    }
                    curcmdname += curcmd.cmdname;
                });
            }
            self.error_msg(util.format('(%s) already in command(%s)', keycls.flagname, curcmdname));
        }
        return inserted;
    };

    innerself.inner_load_command_line_base = function (prefix, keycls, curparser) {
        prefix = prefix;
        if (!not_null(curparser)) {
            curparser = null;
        }
        if (keycls.isflag && keycls.flagname !== '$' && reserved_args.indexOf(keycls.flagname) >= 0) {
            self.error_msg(util.format('(%s) in reserved_args (%s)', keycls.flagname, reserved_args));
        }
        innerself.inner_check_flag_insert_mustsucc(keycls, curparser);
        return true;
    };


    innerself.inner_load_command_line_args = function (prefix, keycls, curparser) {
        prefix = prefix;
        return innerself.inner_check_flag_insert(keycls, curparser);
    };

    innerself.inner_load_command_line_help = function (keycls, curparser) {
        return innerself.inner_check_flag_insert(keycls, curparser);
    };

    innerself.inner_load_command_line_jsonfile = function (keycls, curparser) {
        return innerself.inner_check_flag_insert(keycls, curparser);
    };

    innerself.inner_load_command_line_json_added = function (curparser) {
        var prefix = '';
        var key = util.format('%s##json input file to get the value set##', innerself.jsonlong);
        var value = null;
        var keycls;
        if (!not_null(curparser)) {
            curparser = null;
        }
        prefix = innerself.inner_format_cmd_from_cmd_array(curparser);
        prefix = prefix.replace('.', '_');
        keycls = keyparse.KeyParser(prefix, key, value, false, false, true, innerself.longprefix, innerself.shortprefix);
        return innerself.inner_load_command_line_jsonfile(keycls, curparser);
    };

    innerself.inner_load_command_line_help_added = function (curparser) {
        if (!not_null(curparser)) {
            curparser = null;
        }
        var key = util.format('%s', innerself.helplong);
        var value = null;
        var keycls;
        if (not_null(innerself.helpshort)) {
            key += util.format('|%s', innerself.helpshort);
        }
        key += '##to display this help information##';
        keycls = keyparse.KeyParser('', key, value, false, true, false, innerself.longprefix, innerself.shortprefix);
        return innerself.inner_load_command_line_help(keycls, curparser);
    };

    innerself.init_fn = function () {
        if (process.argv.length > 1) {
            innerself.cmdname = process.argv[1];
        } else {
            innerself.cmdname = process.argv[0];
        }


        innerself.load_priority = [exports.SUB_COMMAND_JSON_SET, exports.COMMAND_JSON_SET, exports.ENVIRONMENT_SET, exports.ENV_SUB_COMMAND_JSON_SET, exports.ENV_COMMAND_JSON_SET];
        if (not_null(opt.priority)) {
            opt.priority.forEach(function (elm, idx) {
                if (innerself.load_priority.indexOf(elm) < 0) {
                    throw new Error(util.format('[%d]elm (%s) not valid', idx, elm));
                }
            });
            innerself.load_priority = opt.priority;
        }


        if (typeof opt.cmdname === 'string') {
            self.cmdname = opt.cmdname;
        }

        innerself.options = opt;
        innerself.maincmd = new ParserCompat(null, opt);
        innerself.maincmd.prog = opt.prog;
        innerself.maincmd.usage = opt.usage;
        innerself.maincmd.description = opt.description;
        innerself.maincmd.epilog = opt.epilog;
        innerself.maincmd.version = opt.version;
        innerself.error_handler = opt.errorhandler;
        innerself.help_handler = opt.helphandler;
        innerself.output_mode = [];
        innerself.ended = 0;
        innerself.longprefix = opt.longprefix;
        innerself.shortprefix = opt.shortprefix;
        innerself.nohelpoption = opt.nohelpoption;
        innerself.nojsonoption = opt.nojsonoption;
        innerself.helplong = opt.helplong;
        innerself.helpshort = opt.helpshort;
        innerself.jsonlong = opt.jsonlong;
        innerself.cmdprefixadded = opt.cmdprefixadded;

        /*inner load command map set for innerself*/
        innerself.inner_load_command_map = {};
        innerself.inner_load_command_map.string = innerself.inner_load_command_line_base;
        innerself.inner_load_command_map.unicode = innerself.inner_load_command_line_base;
        innerself.inner_load_command_map.int = innerself.inner_load_command_line_base;
        innerself.inner_load_command_map.long = innerself.inner_load_command_line_base;
        innerself.inner_load_command_map.float = innerself.inner_load_command_line_base;
        innerself.inner_load_command_map.array = innerself.inner_load_command_line_base;
        innerself.inner_load_command_map.boolean = innerself.inner_load_command_line_base;
        innerself.inner_load_command_map.args = innerself.inner_load_command_line_args;
        innerself.inner_load_command_map.command = innerself.inner_load_command_subparser;
        innerself.inner_load_command_map.prefix = innerself.inner_load_command_prefix;
        innerself.inner_load_command_map.count = innerself.inner_load_command_line_base;
        innerself.inner_load_command_map.help = innerself.inner_load_command_line_base;
        innerself.inner_load_command_map.jsonfile = innerself.inner_load_command_line_base;


        innerself.opt_parse_handle_map = {};
        innerself.opt_parse_handle_map.string = innerself.inner_string_action;
        innerself.opt_parse_handle_map.unicode = innerself.inner_string_action;
        innerself.opt_parse_handle_map.boolean = innerself.inner_bool_action;
        innerself.opt_parse_handle_map.int = innerself.inner_int_action;
        innerself.opt_parse_handle_map.long = innerself.inner_int_action;
        innerself.opt_parse_handle_map.array = innerself.inner_append_action;
        innerself.opt_parse_handle_map.count = innerself.inner_inc_action;
        innerself.opt_parse_handle_map.help = innerself.inner_help_action;
        innerself.opt_parse_handle_map.jsonfile = innerself.inner_jsonfile_action;
        innerself.opt_parse_handle_map.command = innerself.inner_command_action;
        innerself.opt_parse_handle_map.float = innerself.innner_float_action;

        innerself.parse_set_map = {};
        innerself.parse_set_map.SUB_COMMAND_JSON_SET = innerself.inner_parse_sub_command_json_set;
        innerself.parse_set_map.COMMAND_JSON_SET = innerself.inner_parse_command_json_set;
        innerself.parse_set_map.ENVIRONMENT_SET = innerself.inner_parse_environment_set;
        innerself.parse_set_map.ENV_SUB_COMMAND_JSON_SET = innerself.inner_parse_env_subcommand_json_set;
        innerself.parse_set_map.ENV_COMMAND_JSON_SET = innerself.inner_parse_env_command_json_set;

        innerself.set_json_value = {};
        innerself.set_json_value.string = innerself.inner_json_value_base;
        innerself.set_json_value.unicode = innerself.inner_json_value_base;
        innerself.set_json_value.boolean = innerself.inner_json_value_base;
        innerself.set_json_value.int = innerself.inner_json_value_base;
        innerself.set_json_value.long = innerself.inner_json_value_base;
        innerself.set_json_value.array = innerself.inner_json_value_base;
        innerself.set_json_value.count = innerself.inner_json_value_base;
        innerself.set_json_value.jsonfile = innerself.inner_json_value_base;
        innerself.set_json_value.float = innerself.inner_json_value_base;
        innerself.set_json_value.command = innerself.inner_json_value_error;
        innerself.set_json_value.help = innerself.inner_json_value_error;

        return self;
    };

    innerself.inner_call_json_value = function (args, keycls, value) {
        accessed[keycls.optdest] = true;
        if (not_null(keycls.attr) && not_null(keycls.attr.jsonfunc)) {
            self.call_func(keycls.attr.jsonfunc, null, args, keycls, value);
            return;
        }
        self.info(util.format('%s typename [%s]', keycls.format_string(), keycls.typename));
        innerself.set_json_value[keycls.typename](args, keycls, value);
        return;
    };

    innerself.inner_format_cmdname_path = function (curparser) {
        var curcmdname = '';
        if (not_null(curparser)) {
            curparser.forEach(function (curcmd) {
                if (curcmdname.length > 0) {
                    curcmdname += '.';
                }
                curcmdname += curcmd.cmdname;
            });
        }
        return curcmdname;
    };

    innerself.inner_find_commands_in_path = function (cmdname, curparser) {
        var sarr = [''];
        var commands = [];
        var idx = 0;
        var curcommand;
        curparser = curparser;
        if (not_null(cmdname)) {
            sarr = cmdname.split('.');
        }
        if (not_null(innerself.maincmd)) {
            commands.push(innerself.maincmd);
        }
        idx = 1;
        self.info(util.format('idx [%d] sarr [%s][%s]', idx, sarr.length, sarr));
        while (idx <= sarr.length && not_null(cmdname) && cmdname.length > 0) {
            if (idx !== 0) {
                self.info(util.format('find [%d] [%s]', idx - 1, sarr[(idx - 1)]));
                curcommand = innerself.inner_find_command_inner(sarr[(idx - 1)], commands);
                if (!not_null(curcommand)) {
                    break;
                }
                commands.push(curcommand);
            }
            idx += 1;
        }
        return commands;
    };

    innerself.inner_find_command_inner = function (name, curparser) {
        var sarr;
        var curroot;
        var nextparsers = [];
        var copysarr;
        var idx;
        var copylen;
        var curcmd;
        var jdx;

        if (!not_null(curparser)) {
            curparser = null;
        }
        sarr = name.split('.');
        curroot = innerself.maincmd;
        if (not_null(curparser)) {
            nextparsers = curparser;
            copylen = nextparsers.length;
            curroot = nextparsers[(copylen - 1)];
            self.info(' ');
        }
        self.info(util.format('curroot [%s]', curroot));

        if (sarr.length > 1) {
            nextparsers.push(curroot);
            for (jdx = 0; jdx < curroot.subcommands.length; jdx += 1) {
                curcmd = curroot.subcommands[jdx];
                if (curcmd.cmdname === sarr[0]) {
                    nextparsers = [];
                    if (not_null(curparser)) {
                        nextparsers = curparser;
                    }
                    nextparsers.push(curcmd);
                    copysarr = [];
                    for (idx = 1; idx < sarr.length; idx += 1) {
                        copysarr.push(sarr[idx]);
                    }
                    return innerself.inner_find_command_inner(copysarr.join('.'), nextparsers);
                }
            }
        } else {
            for (idx = 0; idx < curroot.subcommands.length; idx += 1) {
                curcmd = curroot.subcommands[idx];
                if (sarr.length > 0 && curcmd.cmdname === sarr[0]) {
                    return curcmd;
                }
            }
        }
        return null;
    };

    innerself.inner_find_subparser_inner = function (cmdname, parentcmd) {
        var sarr;
        var findcmd;
        var copyname;
        var idx;
        if (!not_null(parentcmd)) {
            parentcmd = null;
        }
        if (!not_null(cmdname) || cmdname.length === 0) {
            return parentcmd;
        }
        if (!not_null(parentcmd)) {
            parentcmd = innerself.maincmd;
        }
        sarr = cmdname.split('.');
        parentcmd.subcommands.forEach(function (curcmd) {
            if (curcmd.cmdname === sarr[0]) {
                copyname = [];
                for (idx = 1; idx < sarr.length; idx += 1) {
                    copyname.push(sarr[idx]);
                }
                findcmd = innerself.inner_find_subparser_inner(copyname.join('.'), curcmd);
                if (not_null(findcmd)) {
                    return findcmd;
                }
            }
        });
        return null;
    };

    innerself.inner_get_subparser_inner = function (keycls, curparser) {
        if (!not_null(curparser)) {
            curparser = null;
        }
        var cmdname = '';
        var parentname = innerself.inner_format_cmdname_path(curparser);
        var cmdparser;
        var copyparser;
        var idx;
        cmdname += parentname;
        if (cmdname.length > 0) {
            cmdname += '.';
        }
        cmdname += keycls.cmdname;
        cmdparser = innerself.inner_find_subparser_inner(cmdname);
        if (not_null(cmdparser)) {
            return cmdparser;
        }
        cmdparser = new ParserCompat(keycls);
        if (parentname.length === 0) {
            innerself.maincmd.subcommands.push(cmdparser);
        } else {
            copyparser = [];
            for (idx = 0; idx < curparser.length; idx += 1) {
                copyparser.push(curparser[idx]);
            }
            copyparser[(copyparser.length - 1)].subcommands.push(cmdparser);
        }
        return cmdparser;
    };


    innerself.inner_load_command_subparser = function (prefix, keycls, lastparser) {
        if (!not_null(lastparser)) {
            lastparser = null;
        }
        self.info(util.format('lastparser [%s]', innerself.inner_format_cmd_from_cmd_array(lastparser)));
        if (typeof keycls.value !== 'object') {
            self.error_msg(util.format('(%s) value must be dict', keycls.origkey));
        }
        var parser_in = null;
        var nextparsers = [];
        var newprefix = '';
        if (keycls.iscmd && reserved_args.indexOf(keycls.cmdname) >= 0) {
            self.error_msg(util.format('command(%s) in reserved_args (%s)', keycls.cmdname, reserved_args));
        }
        parser_in = innerself.inner_get_subparser_inner(keycls, lastparser);
        nextparsers = [innerself.maincmd];
        if (not_null(lastparser)) {
            nextparsers = lastparser;
        }

        nextparsers.push(parser_in);
        //self.info(util.format('nextparser %s', self.format_string(nextparsers)));
        self.info(util.format('keycls %s', keycls.format_string()));
        if (innerself.cmdprefixadded) {
            newprefix = prefix;
            if (newprefix.length > 0) {
                newprefix += '_';
            }
            newprefix += keycls.cmdname;
        } else {
            newprefix = '';
        }
        self.info(util.format('keycls %s', keycls.format_string()));
        self.info(util.format('nextparsers [%s]', innerself.inner_format_cmd_from_cmd_array(nextparsers)));
        innerself.inner_load_command_line_inner(newprefix, keycls.value, nextparsers);
        nextparsers.pop();
        return true;
    };

    innerself.inner_load_command_prefix = function (prefix, keycls, curparser) {
        if (!not_null(curparser)) {
            curparser = null;
        }
        prefix = prefix;
        if (reserved_args.indexOf(keycls.prefix) >= 0) {
            self.error_msg(util.format('prefix (%s) in reserved_args (%s)', keycls.prefix, reserved_args));
        }
        innerself.inner_load_command_line_inner(keycls.prefix, keycls.value, curparser);
        return true;
    };

    innerself.inner_load_command_line_inner = function (prefix, d, curparser) {
        var parentpath = [innerself.maincmd];
        var keys;
        var idx;
        var v;
        var k;
        var keycls;
        var valid;
        if (!not_null(curparser)) {
            curparser = null;
        }

        /*to add default flag for one parser*/
        if (!not_null(innerself.nojsonoption) || !innerself.nojsonoption) {
            innerself.inner_load_command_line_json_added(curparser);
        }
        if (!not_null(innerself.nohelpoption) || !innerself.nohelpoption) {
            innerself.inner_load_command_line_help_added(curparser);
        }

        parentpath = [innerself.maincmd];
        if (not_null(curparser)) {
            parentpath = curparser;
        }
        keys = Object.keys(d);
        for (idx = 0; idx < keys.length; idx += 1) {
            k = keys[idx];
            v = d[k];
            keycls = keyparse.KeyParser(prefix, k, v, false, false, false, innerself.longprefix, innerself.shortprefix, innerself.options.flagnochange);
            self.info(util.format('%s , %s , %s , True type[%s]', prefix, k, v, keycls.typename));
            valid = innerself.inner_load_command_map[keycls.typename](prefix, keycls, parentpath);
            if (!valid) {
                self.error_msg(util.format('can not add (%s, %s)', k, v));
            }
        }
        //self.info(util.format('%s', self.format_string(parentpath)));
        return;
    };

    self.load_command_line = function (d) {
        if (innerself.ended !== 0) {
            throw new Error(util.format('you have call parse_command_line before call load_command_line_string or load_command_line'));
        }
        if (typeof d !== 'object') {
            self.error_msg(util.format('input parameter (%s) not object', d));
        }
        innerself.inner_load_command_line_inner('', d, null);
        return;
    };

    innerself.inner_get_except_info = function (e) {
        var rets = '';
        rets += util.format('%s', util.inspect(e, {
            showHidden: true,
            depth: null
        }));
        rets += 'trace back:\n';
        rets += innerself.inner_get_full_trace_back(2, 1, 0);
        return rets;
    };

    self.load_command_line_string = function (s) {
        var d;
        try {
            d = JSON.parse(s);
        } catch (e) {
            self.error_msg(util.format('(%s) not valid json string\n%s', s, innerself.inner_get_except_info(e)));
        }
        self.load_command_line(d);
        return;
    };

    innerself.inner_print_help = function (cmdparser) {
        if (not_null(innerself.help_handler) && innerself.help_handler === 'nohelp') {
            return 'no help information';
        }
        var curcmd;
        var cmdpaths = [];
        var idx;
        curcmd = innerself.maincmd;
        if (not_null(cmdparser)) {
            curcmd = cmdparser[(cmdparser.length - 1)];
            idx = 0;
            while (idx < (cmdparser.length - 1)) {
                cmdpaths.push(cmdparser[idx]);
                idx += 1;
            }
        }
        return curcmd.get_help_info(null, cmdpaths);
    };

    self.print_help = function (fout, cmdname) {
        if (!not_null(fout)) {
            fout = process.stderr;
        }
        if (!not_null(cmdname)) {
            cmdname = '';
        }
        var s;
        var paths;
        paths = innerself.inner_find_commands_in_path(cmdname);

        s = innerself.inner_print_help(paths);
        if (not_null(innerself.output_mode) && innerself.output_mode.length > 0 && innerself.output_mode[(innerself.output_mode.length - 1)] === 'bash') {
            var outs;
            outs = util.format('cat <<EOFMM\n%s\nEOFMM\nexit 0', s);
            process.stdout.write(outs);
            process.exit(0);
            return;
        }
        fout.write(s);
        return;
    };

    innerself.inner_get_args_accessed = function (optdest) {
        if (not_null(accessed[optdest])) {
            return true;
        }
        return false;
    };

    innerself.inner_set_jsonvalue_not_defined = function (args, cmd, key, value) {
        var idx;
        var chld;
        var curopt;
        for (idx = 0; idx < cmd.subcommands.length; idx += 1) {
            chld = cmd.subcommands[idx];
            args = innerself.inner_set_jsonvalue_not_defined(args, chld, key, value);
        }

        for (idx = 0; idx < cmd.cmdopts.length; idx += 1) {
            curopt = cmd.cmdopts[idx];
            if (curopt.isflag && curopt.typename !== 'prefix' && curopt.typename !== 'args' && curopt.typename !== 'help') {
                if (curopt.optdest === key) {
                    self.info(util.format('set key [%s] =[%s]', key, value));
                    if (!innerself.inner_get_args_accessed(key)) {
                        if (keyparse.get_value_type(curopt.value) !== keyparse.get_value_type(value)) {
                            self.warn(util.format('%s  type (%s) as default value type (%s)', key, keyparse.get_value_type(value), keyparse.get_value_type(curopt.value)));
                        } else {
                            innerself.inner_call_json_value(args, curopt, value);
                        }

                    }
                    return args;
                }
            }
        }
        return args;
    };

    innerself.inner_load_jsonvalue = function (args, prefix, jsonvalue) {
        var k;
        var idx;
        var keys = Object.keys(jsonvalue);
        var newprefix;
        var newkey;
        self.info(util.format('prefix [%s] jsonvalue [%s]', prefix, self.format_string(jsonvalue)));
        if (Array.isArray(jsonvalue)) {
            newkey = prefix;
            args = innerself.inner_set_jsonvalue_not_defined(args, innerself.maincmd, newkey, jsonvalue);
        } else {
            for (idx = 0; idx < keys.length; idx += 1) {
                k = keys[idx];
                if (typeof jsonvalue[k] === 'object') {
                    newprefix = '';
                    if (prefix.length > 0) {
                        newprefix += util.format('%s_', prefix);
                    }
                    newprefix += k;
                    args = innerself.inner_load_jsonvalue(args, newprefix, jsonvalue[k]);
                } else {
                    newkey = '';
                    if (prefix.length > 0) {
                        newkey += util.format('%s_', prefix);
                    }
                    newkey += k;
                    self.info(util.format('newkey [%s] value [%s][%s]', newkey, k, jsonvalue[k]));
                    args = innerself.inner_set_jsonvalue_not_defined(args, innerself.maincmd, newkey, jsonvalue[k]);
                }
            }
        }
        return args;
    };

    innerself.inner_load_jsonfile = function (args, cmdname, jsonfile) {
        assert.ok(!innerself.nojsonoption, 'must no json file false');
        assert.ok(not_null(jsonfile), 'jsonfile set');
        var prefix = '';
        var jsondata;
        var jsonvalue;
        if (not_null(cmdname)) {
            prefix += cmdname;
        }
        prefix = prefix.replace('.', '_');
        try {
            jsondata = fs.readFileSync(jsonfile, {
                encoding: 'utf-8',
                flag: 'r'
            });
        } catch (e2) {
            self.error_msg(util.format('can not read data from [%s]\n%s', jsonfile, innerself.inner_get_except_info(e2)));
        }

        try {
            jsonvalue = JSON.parse(jsondata);
        } catch (e3) {
            self.error_msg(util.format('can not parse (%s)\n%s', jsonfile, innerself.inner_get_except_info(e3)));
        }
        self.info(util.format('load (%s) prefix(%s) value (%s)', jsonfile, prefix, jsonvalue));
        return innerself.inner_load_jsonvalue(args, prefix, jsonvalue);
    };

    innerself.inner_set_parser_default_value = function (args, cmd) {
        var chld;
        var idx;
        var curopt;
        for (idx = 0; idx < cmd.subcommands.length; idx += 1) {
            chld = cmd.subcommands[idx];
            args = innerself.inner_set_parser_default_value(args, chld);
        }
        for (idx = 0; idx < cmd.cmdopts.length; idx += 1) {
            curopt = cmd.cmdopts[idx];
            if (curopt.isflag && curopt.typename !== 'prefix' && curopt.typename !== 'args' && curopt.typename !== 'help') {
                args = innerself.inner_set_jsonvalue_not_defined(args, cmd, curopt.optdest, curopt.value);
            }
        }
        return args;
    };

    innerself.inner_set_default_value = function (args) {
        args = innerself.inner_set_parser_default_value(args, innerself.maincmd);
        return args;
    };

    innerself.inner_set_environ_value_inner = function (args, prefix, cmd) {
        var idx;
        var chld;
        var keycls;
        var val;
        var value;
        var optdest;
        var oldopt;
        var base;
        for (idx = 0; idx < cmd.subcommands.length; idx += 1) {
            chld = cmd.subcommands[idx];
            args = innerself.inner_set_environ_value_inner(args, prefix, chld);
        }

        for (idx = 0; idx < cmd.cmdopts.length; idx += 1) {
            keycls = cmd.cmdopts[idx];
            if (keycls.isflag && keycls.typename !== 'prefix' && keycls.typename !== 'args' && keycls.typename !== 'help') {
                optdest = keycls.optdest;
                oldopt = optdest;
                if (!not_null(accessed[optdest])) { /*has accessed ,so do not handle this*/
                    optdest = optdest.toUpperCase();
                    optdest = optdest.replace('-', '_');
                    if (optdest.indexOf('_') < 0) {
                        /*no _ in the word ,so we add the PREFIX*/
                        optdest = util.format('EXTARGS_%s', optdest);
                    }
                    if (not_null(process.env[optdest])) {
                        val = process.env[optdest];
                        if (keycls.typename === 'string' || keycls.typename === 'jsonfile') {
                            value = val;
                            innerself.inner_call_json_value(args, keycls, value);
                        } else if (keycls.typename === 'boolean') {
                            value = false;
                            if (val.toLowerCase() === 'true') {
                                value = true;
                            }
                            innerself.inner_call_json_value(args, keycls, value);
                        } else if (keycls.typename === 'array') {
                            try {
                                value = JSON.parse(val);
                            } catch (e) {
                                self.warn(util.format('can not set (%s) for %s = %s\n%s', optdest, oldopt, val, innerself.inner_get_except_info(e)));
                            }
                            if (Array.isArray(value)) {
                                innerself.inner_call_json_value(args, keycls, value);
                            } else {
                                self.warn(util.format('[%s] value (%s) not array', optdest, val));
                            }
                        } else if (keycls.typename === 'int' || keycls.typename === 'long' || keycls.typename === 'count') {
                            base = 10;
                            if (val.startsWith('0x') || val.startsWith('0X')) {
                                base = 16;
                                val = val.substring(2);
                            } else if (val.startsWith('x') || val.startsWith('X')) {
                                base = 16;
                                val = val.substring(1);
                            }
                            val = val.toLowerCase();
                            value = null;
                            if (base === 16 && val.match('^[0-9a-f]+$')) {
                                value = parseInt(val, base);
                            } else if (base === 10 && val.match('^[0-9]+$')) {
                                value = parseInt(val, base);
                            } else {
                                self.warn(util.format('can not set (%s) for %s = %s', optdest, oldopt, val));
                            }

                            if (not_null(value)) {
                                innerself.inner_call_json_value(args, keycls, value);
                            }
                        } else if (keycls.typename === 'float') {
                            if (val.match('^[0-9]+(\.[0-9]+)?$')) {
                                value = parseFloat(val);
                                innerself.inner_call_json_value(args, keycls, value);
                            } else {
                                self.warn(util.format('can not set (%s) for %s = %s', optdest, oldopt, val));
                            }
                        } else {
                            self.warn(util.format('internal error when (%s) type(%s)', keycls.optdest, keycls.typename));
                        }
                    }
                }
            }
        }
        return args;
    };

    innerself.inner_set_environ_value = function (args) {
        return innerself.inner_set_environ_value_inner(args, '', innerself.maincmd);
    };

    innerself.inner_check_varname_inner = function (paths, optcheck) {
        var parentpath = [innerself.maincmd];
        var chld;
        var idx;
        var curpath;
        var copychk;
        var curopt;
        var bval;
        var parentlen;

        if (!not_null(paths)) {
            paths = null;
        }
        if (!not_null(optcheck)) {
            optcheck = new OptCheck();
        }

        if (not_null(paths)) {
            parentpath = paths;
        }

        parentlen = parentpath.length;
        for (idx = 0; idx < parentpath[(parentlen - 1)].subcommands.length; idx += 1) {
            chld = parentpath[(parentlen - 1)].subcommands[idx];
            curpath = parentpath;
            curpath.push(chld);
            copychk = new OptCheck();
            copychk.copy(optcheck);
            innerself.inner_check_varname_inner(curpath, copychk);
            curpath.pop();
        }

        for (idx = 0; idx < parentpath[(parentlen - 1)].cmdopts.length; idx += 1) {
            curopt = parentpath[(parentlen - 1)].cmdopts[idx];
            if (curopt.isflag) {
                if (curopt.typename !== 'args' && curopt.typename !== 'help') {
                    bval = optcheck.add_and_check('varname', curopt.varname);
                    if (!bval) {
                        self.error_msg(util.format('%s is already in the check list', curopt.varname));
                    }

                    bval = optcheck.add_and_check('longopt', curopt.longopt);
                    if (!bval) {
                        self.error_msg(util.format('%s is already in the check list', curopt.longopt));
                    }

                    if (not_null(curopt.shortopt)) {
                        bval = optcheck.add_and_check('shortopt', curopt.shortopt);
                        if (!bval) {
                            self.error_msg(util.format('%s is already in the check list', opt.shortopt));
                        }
                    }
                }
            }
        }
        return;
    };

    innerself.inner_set_command_line_self_args_inner = function (paths) {
        var parentpath = [innerself.maincmd];
        var chld;
        var idx;
        var curopt;
        var curpath;
        var setted = false;
        var cmdname;
        var curkey;
        var parentlen;
        if (!not_null(paths)) {
            paths = null;
        }

        if (not_null(paths)) {
            parentpath = paths;
        }

        parentlen = parentpath.length;
        for (idx = 0; idx < parentpath[(parentlen - 1)].subcommands.length; idx += 1) {
            chld = parentpath[(parentlen - 1)].subcommands[idx];
            curpath = parentpath;
            curpath.push(chld);
            innerself.inner_set_command_line_self_args_inner(curpath);
            curpath.pop();
        }

        for (idx = 0; idx < parentpath[(parentlen - 1)].cmdopts; idx += 1) {
            curopt = parentpath[(parentlen - 1)].cmdopts[idx];
            if (curopt.isflag && curopt.typename === 'args') {
                setted = true;
                break;
            }
        }

        if (!setted) {
            cmdname = innerself.inner_format_cmd_from_cmd_array(parentpath);
            if (!not_null(cmdname)) {
                self.error_msg(util.format('can not get cmd (%s) whole name', self.format_string(parentpath)));
            }
            curkey = keyparse.KeyParser('', '$', '*', true);
            innerself.inner_load_command_line_args('', curkey, parentpath);
        }

        return;
    };

    innerself.inner_set_command_line_self_args = function (paths) {
        if (innerself.ended !== 0) {
            return;
        }
        innerself.inner_set_command_line_self_args_inner(paths);
        innerself.inner_check_varname_inner();
        innerself.ended = 1;
    };

    innerself.inner_parse_sub_command_json_set = function (args) {
        var idx;
        if (not_null(args.subcommand) && !innerself.nojsonoption) {
            var cmds;
            var subname;
            var prefix;
            var jsondest;
            var dummycmds;
            var jdx;
            cmds = innerself.inner_find_commands_in_path(args.subcommand);
            idx = cmds.length;
            while (idx >= 2) {
                dummycmds = [];
                for (jdx = 0; jdx < (idx); jdx += 1) {
                    dummycmds.push(cmds[jdx]);
                }
                subname = innerself.inner_format_cmd_from_cmd_array(dummycmds);
                prefix = subname.replace('.', '_');
                jsondest = util.format('%s_%s', prefix, innerself.jsonlong);
                if (not_null(args[jsondest])) {
                    args = innerself.inner_load_jsonfile(args, subname, args[jsondest]);
                }
                idx -= 1;
            }
        }
        return args;
    };

    innerself.inner_parse_command_json_set = function (args) {
        if (!innerself.nojsonoption && not_null(args[innerself.jsonlong])) {
            args = innerself.inner_load_jsonfile(args, '', args[innerself.jsonlong]);
        }
        return args;
    };

    innerself.inner_parse_environment_set = function (args) {
        return innerself.inner_set_environ_value(args);
    };

    innerself.inner_parse_env_subcommand_json_set = function (args) {
        if (!innerself.nojsonoption && not_null(args.subcommand)) {
            var cmds;
            var idx;
            var subname;
            var prefix;
            var jsondest;
            var ccmds;
            var jdx;
            cmds = innerself.inner_find_commands_in_path(args.subcommand);
            idx = cmds.length;
            while (idx >= 2) {
                ccmds = [];
                for (jdx = 0; jdx < (idx); jdx += 1) {
                    ccmds.push(cmds[jdx]);
                }
                subname = innerself.inner_format_cmd_from_cmd_array(ccmds);
                prefix = subname.replace('.', '_');
                jsondest = util.format('%s_%s', prefix, innerself.jsonlong);
                jsondest = jsondest.replace('-', '_');
                jsondest = jsondest.toUpperCase();
                if (not_null(process.env[jsondest])) {
                    args = innerself.inner_load_jsonfile(args, subname, process.env[jsondest]);
                }
                idx -= 1;
            }
        }
        return args;
    };

    innerself.inner_parse_env_command_json_set = function (args) {
        var jsonenv;
        jsonenv = util.format('EXTARGSPARSE_%s', innerself.jsonlong);
        jsonenv = jsonenv.toUpperCase().replace('-', '_').replace('.', '_');
        if (!innerself.nojsonoption && not_null(process.env[jsonenv])) {
            args = innerself.inner_load_jsonfile(args, '', process.env[jsonenv]);
        }
        return args;
    };

    innerself.inner_format_cmdname_msg = function (cmdname, msg) {
        var retmsg = cmdname;
        if (retmsg.length > 0) {
            retmsg += ' command ';
        }
        retmsg += msg;
        return retmsg;
    };

    innerself.inner_set_args = function (args, cmdpaths, vals) {
        var argkeycls = null;
        var cmdname;
        var lastcmd;
        var curopt;
        var keyname;
        var idx;
        var ccmdpathslen = cmdpaths.length;
        cmdname = innerself.inner_format_cmdname_path(cmdpaths);
        //self.info(util.format('[%s] %s', cmdname, self.format_string(cmdpaths[(ccmdpathslen - 1)].cmdopts)));
        lastcmd = cmdpaths[(ccmdpathslen - 1)];
        for (idx = 0; idx < lastcmd.cmdopts.length; idx += 1) {
            curopt = lastcmd.cmdopts[idx];
            if (curopt.isflag && curopt.flagname === '$') {
                argkeycls = curopt;
                break;
            }
        }
        if (!not_null(argkeycls)) {
            self.error_msg(util.format('can not find args in (%s)', cmdname));
        }
        if (not_null(vals) && !Array.isArray(vals)) {
            self.error_msg(innerself.inner_format_cmdname_msg(cmdname, util.format('invalid type args (%s) %s', typeof vals, vals)));
        }

        if (argkeycls.nargs === '*' || argkeycls.nargs === '+' || argkeycls.nargs === '?') {
            if (argkeycls.nargs === '?') {
                if (not_null(vals) && vals.length > 1) {
                    self.error_msg(innerself.inner_format_cmdname_msg(cmdname, 'args \'?\' must <= 1'));
                }
            } else if (argkeycls.nargs === '+') {
                if (!not_null(vals) || vals.length < 1) {
                    self.error_msg(innerself.inner_format_cmdname_msg(cmdname, 'args must at least 1'));
                }
            }
        } else {
            var nargint = parseInt(argkeycls.nargs);
            if (!not_null(vals)) {
                if (nargint !== 0) {
                    self.error_msg(innerself.inner_format_cmdname_msg(cmdname, util.format('args must 0 but(%s)', vals)));
                }
            } else {
                if (vals.length !== nargint) {
                    self.error_msg(innerself.inner_format_cmdname_msg(cmdname, util.format('vals(%s) %d != nargs %d', vals, vals.length, nargint)));
                }
            }
        }
        keyname = 'args';
        if (cmdpaths.length > 1) {
            keyname = 'subnargs';
        }
        if (not_null(vals)) {
            args[keyname] = vals;
        } else {
            args[keyname] = [];
        }
        cmdname = innerself.inner_format_cmd_from_cmd_array(cmdpaths);
        if (cmdname.length > 0) {
            args.subcommand = cmdname;
        }
        return args;
    };

    innerself.inner_call_opt_method = function (args, validx, keycls, params) {
        var nargs;
        if (keycls.isflag && keycls.typename !== 'help' && keycls.flagname !== '$') {
            accessed[keycls.optdest] = true;
        }
        if (not_null(keycls.attr) && not_null(keycls.attr.optparse)) {
            nargs = self.call_func(keycls.attr.optparse, null, args, validx, keycls, params);
        } else {
            nargs = innerself.opt_parse_handle_map[keycls.typename](args, validx, keycls, params);
        }
        return nargs;
    };

    self.parse_args = function (params) {
        var parsestate = null;
        var validx;
        var optval;
        var keycls;
        var cmdpaths;
        var s;
        var nargs;
        var args;
        var jdx;
        var kdx;

        if (!not_null(params)) {
            params = [];
            for (kdx = 2; kdx < process.argv.length; kdx += 1) {
                params.push(process.argv[kdx]);
            }
        }

        self.info(util.format('params [%s]', params));
        parsestate = new ParseState(params, innerself.maincmd, innerself.options);
        self.info(util.format('parsestate [%s]', parsestate));
        args = {};
        try {
            while (true) {
                keycls = parsestate.step_one();
                optval = parsestate.get_optval();
                validx = parsestate.get_validx();
                self.info(util.format('keycls [%s] optval [%s] validx [%s]', keycls, optval, validx));
                nargs = 0;
                if (!not_null(keycls)) {
                    cmdpaths = parsestate.get_cmd_paths();
                    s = '';
                    for (jdx = 0; jdx < cmdpaths.length; jdx += 1) {
                        s += util.format('%s', cmdpaths[jdx]);
                    }
                    args = innerself.inner_set_args(args, cmdpaths, optval);
                    if (true) {
                        break;
                    }
                } else if (keycls.typename === 'help') {
                    cmdpaths = parsestate.get_cmd_paths();
                    s = innerself.inner_format_cmd_from_cmd_array(cmdpaths);
                    innerself.inner_call_opt_method(args, validx, keycls, s);
                } else {
                    nargs = innerself.inner_call_opt_method(args, validx, keycls, params);
                }
                parsestate.add_parse_args(nargs);
                self.info(util.format('%s', args));
            }
        } catch (e) {
            self.error_msg(util.format('parse (%s) error(%s)\n', params, innerself.inner_get_except_info(e)));
        }
        return args;
    };

    innerself.inner_debug_opt = function (rootcmd, tabs) {
        var s = '';
        var idx;
        if (!not_null(rootcmd)) {
            rootcmd = null;
        }
        if (!not_null(tabs)) {
            tabs = 0;
        }

        if (!not_null(rootcmd)) {
            rootcmd = innerself.maincmd;
        }

        for (idx = 0; idx < tabs; idx += 1) {
            s += '    ';
        }
        s += util.format('%s', rootcmd);
        for (idx = 0; idx < rootcmd.subcommands.length; idx += 1) {
            s += innerself.inner_debug_opt(rootcmd.subcommands[idx], tabs + 1);
        }
        return s;
    };

    self.parse_command_line = function (params, Context, mode) {
        var pushmode = false;
        var args;
        var funcname;
        var cmds;
        var getmode = null;
        var idx;
        var kdx;
        var prioelm;
        if (not_null(mode)) {
            pushmode = true;
            innerself.output_mode.push(mode);
        }

        args = {};
        try {
            innerself.inner_set_command_line_self_args();
            if (!not_null(params)) {
                params = [];
                for (kdx = 2; kdx < process.argv.length; kdx += 1) {
                    params.push(process.argv[kdx]);
                }
            }

            args = self.parse_args(params);
            self.info(util.format('load_priority {%s}', innerself.load_priority));
            for (idx = 0; idx < innerself.load_priority.length; idx += 1) {
                prioelm = innerself.load_priority[idx];
                self.info(util.format('priority %s', prioelm));
                args = innerself.parse_set_map[prioelm](args);
            }

            args = innerself.inner_set_default_value(args);
            self.info(util.format('args [%s]', util.inspect(args, {
                showHidden: true,
                depth: null
            })));
            if (not_null(args.subcommand)) {
                self.info(util.format('subcommand [%s]', args.subcommand));
                cmds = innerself.inner_find_commands_in_path(args.subcommand);
                kdx = cmds.length;
                self.info(util.format('[%d]keycls [%s]', (kdx - 1), cmds[(kdx - 1)].keycls.format_string()));
                funcname = cmds[(kdx - 1)].keycls.function;
                if (innerself.output_mode.length > 0) {
                    idx = (innerself.output_mode.length - 1);
                    getmode = innerself.output_mode[idx];
                }
                self.info(util.format('getmode [%s] funcname [%s]', getmode, funcname));
                if (not_null(funcname) && !not_null(getmode)) {
                    self.info(util.format('funcname [%s]', funcname));
                    self.call_func(funcname, Context, args);
                    return args;
                }
            }
        } catch (e) {
            self.error_msg(innerself.inner_get_except_info(e));
        }
        if (pushmode) {
            innerself.output_mode.pop();
            pushmode = false;
        }
        return args;
    };


    innerself.inner_get_subcommands = function (cmdname, cmdpaths) {
        var retnames = null;
        var sarr;
        var copysarr;
        var cmdpathslen;
        var kdx;
        var idx;
        var c;
        if (!not_null(cmdpaths)) {
            cmdpaths = null;
        }

        if (!not_null(cmdpaths)) {
            cmdpaths = [innerself.maincmd];
        }

        if (!not_null(cmdname) || cmdname.length === 0) {
            retnames = [];
            cmdpathslen = cmdpaths.length;
            cmdpaths[(cmdpathslen - 1)].subcommands.forEach(function (c) {
                retnames.push(c.cmdname);
            });
            return retnames.sort();
        }

        sarr = cmdname.split('.');
        cmdpathslen = cmdpaths.length;
        for (idx = 0; idx < cmdpaths[(cmdpathslen - 1)].subcommands.length; idx += 1) {
            c = cmdpaths[(cmdpathslen - 1)].subcommands[idx];
            if (c.cmdname === sarr[0]) {
                cmdpaths.push(c);
                copysarr = [];
                for (kdx = 1; kdx < sarr.length; kdx += 1) {
                    copysarr.push(sarr[kdx]);
                }
                return innerself.inner_get_subcommands(copysarr.join('.'), cmdpaths);
            }
        }
        if (not_null(retnames)) {
            return retnames.sort();
        }
        return retnames;
    };

    innerself.inner_get_cmdkey = function (cmdname, cmdpaths) {
        var retkey = null;
        var copycmds;
        var sarr;
        var copysarr;
        var cmdpathslen;
        var kdx;
        var idx;
        var c;
        if (!not_null(cmdpaths)) {
            cmdpaths = [innerself.maincmd];
        }
        retkey = null;
        if (!not_null(cmdname) || cmdname.length === 0) {
            cmdpathslen = cmdpaths.length;
            retkey = cmdpaths[(cmdpathslen - 1)].keycls;
            return retkey;
        }
        sarr = cmdname.split('.');
        cmdpathslen = cmdpaths.length;
        for (idx = 0; idx < cmdpaths[(cmdpathslen - 1)].subcommands.length; idx += 1) {
            c = cmdpaths[(cmdpathslen - 1)].subcommands[idx];
            if (c.cmdname === sarr[0]) {
                copycmds = [];
                for (kdx = 0; kdx < cmdpaths.length; kdx += 1) {
                    copycmds.push(cmdpaths[kdx]);
                }
                copycmds.push(c);
                copysarr = [];
                for (kdx = 1; kdx < sarr.length; kdx += 1) {
                    copysarr.push(sarr[kdx]);
                }
                return innerself.inner_get_cmdkey(copysarr.join('.'), copycmds);
            }
        }
        return null;
    };

    self.get_subcommands = function (cmdname) {
        innerself.inner_set_command_line_self_args();
        return innerself.inner_get_subcommands(cmdname);
    };

    self.get_cmdkey = function (cmdname) {
        innerself.inner_set_command_line_self_args();
        return innerself.inner_get_cmdkey(cmdname);
    };

    innerself.inner_sort_cmdopts = function (retopts) {
        var normalopts = null;
        if (not_null(retopts)) {
            var argsopt = null;
            var idx;
            var jdx;
            var tmpopt;
            normalopts = [];
            self.info(util.format('retopts [%d]', retopts.length));
            retopts.forEach(function (curopt) {
                self.info(util.format('%s', curopt.format_string()));
                if (curopt.typename !== 'args') {
                    normalopts.push(curopt);
                } else {
                    assert.ok(argsopt === null, 'argsopt is null');
                    argsopt = curopt;
                }
            });
            idx = 0;
            while (idx < normalopts.length) {
                jdx = idx + 1;
                while (jdx < normalopts.length) {
                    if (normalopts[jdx].optdest < normalopts[idx].optdest) {
                        tmpopt = normalopts[jdx];
                        normalopts[jdx] = normalopts[idx];
                        normalopts[idx] = tmpopt;
                    }
                    jdx += 1;
                }
                idx += 1;
            }

            if (not_null(argsopt)) {
                normalopts.push(argsopt);
            }
        }
        return normalopts;
    };

    innerself.inner_get_cmdopts = function (cmdname, cmdpaths) {
        var retopts = null;
        var copycmds;
        var sarr;
        var cmdpathslen;
        var kdx;
        var copysarr;
        var idx;
        var curcmd;
        if (!not_null(cmdpaths)) {
            cmdpaths = [innerself.maincmd];
        }

        if (!not_null(cmdname) || cmdname.length === 0) {
            cmdpathslen = cmdpaths.length;
            retopts = cmdpaths[(cmdpathslen - 1)].cmdopts;
            return innerself.inner_sort_cmdopts(retopts);
        }
        sarr = cmdname.split('.');
        cmdpathslen = cmdpaths.length;
        for (idx = 0; idx < cmdpaths[(cmdpathslen - 1)].subcommands.length; idx += 1) {
            curcmd = cmdpaths[(cmdpathslen - 1)].subcommands[idx];
            if (curcmd.cmdname === sarr[0]) {
                copycmds = [];
                for (kdx = 0; kdx < cmdpathslen; kdx += 1) {
                    copycmds.push(cmdpaths[kdx]);
                }
                copycmds.push(curcmd);
                copysarr = [];
                for (kdx = 1; kdx < sarr.length; kdx += 1) {
                    copysarr.push(sarr[kdx]);
                }
                return innerself.inner_get_cmdopts(copysarr.join('.'), copycmds);
            }
        }
        return null;
    };

    self.get_cmdopts = function (cmdname) {
        innerself.inner_set_command_line_self_args();
        return innerself.inner_get_cmdopts(cmdname);
    };


    return innerself.init_fn();
}

var set_attr_self = function (self, args, prefix) {
    'use strict';
    var keys;
    var curkey;
    var i;
    var prefixnew;

    if (typeof prefix !== 'string' || prefix.length === 0) {
        throw new Error('not valid prefix');
    }

    prefixnew = util.format('%s_', prefix);
    prefixnew = prefixnew.toLowerCase();

    keys = Object.keys(args);
    for (i = 0; i < keys.length; i += 1) {
        curkey = keys[i];
        if (curkey.substring(0, prefixnew.length).toLowerCase() === prefixnew) {
            self[curkey] = args[curkey];
        }
    }

    return self;
};

module.exports.ExtArgsParse = ExtArgsParse;
module.exports.ExtArgsOption = ExtArgsOption;
module.exports.set_attr_self = set_attr_self;