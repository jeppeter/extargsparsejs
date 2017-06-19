var keyparse = require('./keyparse');
var util = require('util');
var fs = require('fs');
var assert = require('assert');
var stacktrace = require('stack-trace');

var not_null = function (v) {
    if (v === undefined || v === null) {
        return false;
    }
    return true;
};

var call_args_function = function (funcname, context, ...args) {
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

    return Function.prototype.call.call(reqpkg[fname], context , ...args);    
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

var set_property_max = function (dictobj, name) {
    'use strict';
    dictobj[name] = 0;
    Object.defineProperty(dictobj, name, {
        enumerable: true,
        get: function () {
            return dictobj[name];
        },
        set: function (v) {
            if (dictobj[name] < v) {
                dictobj[name] = v;
            }
        }
    });
    return 1;
};



var setting_object = function (self,setting) {
    Object.keys(setting).forEach(function (k) {
        if (setting[k] !== undefined) {
            self[k] = setting[k];    
        }        
    });
    return self;
};

var setting_string = function (self,setting) {
    var setobj = {};
    try{
        setobj = JSON.parse(setting);
        self = setting_object(self,setobj);
    }
    catch (e) {
        console.error('[%s] parse error[%s]', setting, e);
    }
    return self;
};

var format_length = function (s, len) {
    var rets = s;
    var idx;
    if (rets.length < len) {
        for(idx=0;rets.length < len;idx+=1) {
            rets += ' ';
        }
    }
    return rets;
};

function LoggerObject(cmdname) {
    var self = {};
    var envname ;
    if (!not_null(cmdname)) {
        cmdname = 'extargsparse';
    }

    self.loglevel = 0;

    envname = util.format('%s_LOGLEVEL', cmdname);
    envname = envname.toUpperCase();
    if (process.env[envname] !== undefined && 
        process.env[envname] !== null) {
        self.loglevel = parseInt(process.env[envname]);
    }

    self.format_call_message = function ( msg , callstack) {
        var stktr = stacktrace.get();
        var retstr = '';
        if (callstack !== undefined) {
            retstr += util.format('[%s:%s:%s]', format_length(stktr[callstack].getFileName(),10),
                format_length(stktr[callstack].getFunctionName(), 20), 
                format_length(stktr[callstack].getLineNumber(), 5));
        }
        retstr += msg;
        return retstr + '\n';
    };

    self.__inner_output = function( msg , needlevel, callbastack) {
        if (self.loglevel >= needlevel)  {
            if (!not_null(callbastack)) {
                callstack = 2;
            } else {
                callbastack += 1;
            }
            process.stderr.write(self.format_call_message(msg,callstack));
        }
        return ;

    };

    self.info = function (msg , callstack) {
        self.__inner_output(msg , 2 , callbastack);
        return;
    };

    self.warn = function(msg , callbastack) {
        self.__inner_output(msg, 1, callbastack);
        return;
    };

    self.error = function(msg , callstack) {
        self.__inner_output(msg, 0, callbastack);
        return;
    };

    self.debug = function(msg, callstack) {
        self.__inner_output(msg, 3, callbastack);
        return;
    };

    self.debug = function(msg, callstack) {
        self.__inner_output(msg, 4, callbastack);
        return;
    };

    return self;
}


function ExtArgsOption(setting) {
    'use strict';
    var default_value = {
        prog: process.argv[1],
        usage: '',
        description: '',
        epilog : '',
        version : '0.0.1',
        errorhandler : 'exit',
        helphandler : null,
        longprefix : '--',
        shortprefix : '-',
        nohelpoption : false,
        nojsonoption : false,
        helplong : 'help',
        helpshort : 'h',
        jsonlong : 'json',
        cmdprefixadded : true,
        parseall : true,
        screenwidth : 80,
        flagnochange : false
    };
    var self = LoggerObject();
    self = setting_object(self,default_value);
    if (typeof setting === 'object') {
        self = setting_object(self, setting);
    } else if (typeof setting === 'string') {
        self = setting_string(self, setting);
    }
    return self;
}

function HelpSize() {
    var self = LoggerObject();

    set_property_max(self, 'optnamesize');
    set_property_max(self, 'optexprsize');
    set_property_max(self, 'opthelpsize');
    set_property_max(self, 'cmdnamesize');
    set_property_max(self, 'cmdhelpsize');

    self.format() = function () {
        var str = '';
        str += '{';
        Object.keys(dict).forEach(function(k) {
            if (str.length > 1) {
                str += ',';
            }
            str += util.format('%s=%s', k, self[k]);
        });
        str += '}';
        return str;
    };

    return self;
}


function ParserCompat(keycls,opt) {
    'use strict';
    var self = LoggerObject();
    if (keycls === undefined) {
        keycls = null;
    }
    if (opt === undefined) {
        opt = null;
    }

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
        self.keycls = keyparse.KeyParser('','main',{}, false);
        self.cmdname = '';
        self.cmdopts = [];
        self.subcommands = [];
        self.helpinfo = null;
        self.callfunction = null;
    }

    self.screenwidth = 80;
    if (opt !== null && not_null(opt.screenwidth)) {
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

    self.__get_cmd_cmdname = function (cls) {
        var retstr = '';
        if (not_null(cls.cmdname)) {
            retstr += util.format('[%s]', cls.cmdname);
        }
        return retstr;
    };

    self.__get_cmd_helpinfo = function (cls) {
        var retstr = '';
        if (not_null(cls.helpinfo)) {
            retstr += cls.helpinfo;
        }
        return retstr;
    };

    self.__get_opt_optname = function (optcmd) {
        var optname = '';
        optname = optcmd.longopt;
        if (not_null(optcmd.shortopt)) {
            optname += util.format('|%s', optcmd.shortopt);
        }
        return optname;
    };

    self.__get_opt_expr = function (optcmd) {
        var optexpr = '';
        if (optcmd.typename !== 'boolean' && 
            optcmd.typename !== 'args' && 
            optcmd.typename !== 'object' &&
            optcmd.typename !== 'help') {
            optexpr += optcmd.varname;
            optexpr = optexpr.replace(/-/g, '_');
        }
        return optexpr;
    };

    self.__get_opt_helpinfo = function (optcmd) {
        var opthelp = '';
        if (not_null(optcmd.attr) && 
            not_null(optcmd.attr.opthelp)) {
            opthelp += call_args_function(optcmd.attr.opthelp, null, optcmd);
        } else {
            if (optcmd.typename === 'boolean') {
                if (optcmd.value) {
                    opthelp += util.format('%s set false default(True)', optcmd.optdest);
                } else {
                    opthelp += util.format('%s set true default(False)', optcmd.optdest);
                }
            } else if (optcmd.typename === 'string' && optcmd.value === '+' || 
                       optcmd.typename === 'count') {
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

    self.get_help_size = function (helpsize, recursive) {
        var cmdname ;
        var cmdhelp ;

        if (! not_null(helpsize)) {
            helpsize = HelpSize();
        }

        if (recursive === undefined) {
            recursive = 0;
        }

        cmdname = self.__get_cmd_cmdname(self);
        cmdhelp = self.__get_cmd_helpinfo(self);
        helpsize.cmdnamesize = len(cmdname);
        helpsize.cmdhelpsize = len(cmdhelp);
        self.cmdopts.forEach( function (cmdopt) {
            if (cmdopt.typename !== 'args') {
                helpsize.optnamesize = len(self.__get_opt_optname(cmdopt));
                helpsize.optexprsize = len(self.__get_opt_expr(cmdopt));
                helpsize.opthelpsize = len(self.__get_opt_helpinfo(cmdopt));
            }
        });

        if (recursive) {
            self.subcommands.forEach( function (curcmd) {
                if (recursive > 0) {
                    helpsize = curcmd.get_help_size(helpsize, (recursive - 1));
                } else {
                    helpsize = curcmd.get_help_size(helpsize, recursive);
                }
            });
        }

        self.subcommands.forEach( function( curcmd)) {
            helpsize.cmdnamesize = len(curcmd.cmdname) + 2;
            helpsize.cmdhelpsize = len(curcmd.helpinfo);
        }
        return helpsize;
    };

    self.__get_indent_string = function (s,indentsize,maxsize) {
        var rets = '';
        var curs = '';
        var idx =0;
        var jdx = 0;
        for (jdx=0;jdx<indentsize;jdx+=1) {
            curs += ' ';
        }
        for (idx = 0;idx < s.length ;idx+=1) {
            var c = s[idx];
            if ((c === ' ' || c === '\t') && 
                curs.length >= maxsize) {
                rets += curs + '\n';
                curs = '';
                for (jdx =0 ;jdx < indentsize;jdx += 1) {
                    curs += ' ';
                }
                continue;
            }
            curs += c;
        }
        if (curs.length > 0) {
            if (curs.replace(/[\s]+$/g,'').length > 0) {
                rets += curs + '\n';
            }
        }
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
        if (! not_null(helpsize)) {
            helpsize = null;
        }
        if (! not_null(parentcmds)) {
            parentcmds = [];
        }

        if ( ! not_null(helpsize)) {
            helpsize = self.get_help_size();
        }

        if (not_null(self.usage)) {
            retstr += self.usage;
        } else {
            rootcmds = self;
            if (parentcmds.length > 0 ) {
                rootcmds = parentcmds[0];
            }
            if (not_null(rootcmds.prog)) {
                retstr += util.format('%s', rootcmds.prog);
            } else {
                retstr += util.format('%s', process.argv[1]);
            }

            if (parentcmds.length > 0) {
                parentcmds.forEach( function(curcmd) {
                    retstr += util.format(' %s',curcmd.cmdname);
                });
            }

            retstr += util.format('%s', self.cmdname);

            if (self.cmdopts.length > 0) {
                retstr += util.format(' [OPTIONS]');
            }

            if (self.subcommands.length > 0) {
                retstr += util.format(' [SUBCOMMANDS]');
            }

            self.cmdopts.forEach( function( curopt) {
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
            });
            retstr += '\n';
        }

        if (not_null(self.description)) {
            retstr += util.format('%s\n', self.description);
        }

        if (self.cmdopts.length > 0) {
            retstr += '[OPTIONS]\n';
            self.cmdopts.forEach( function( curopt) {
                if (curopt.typename !== 'args') {
                    var curstr = '';
                    optname = self.__get_opt_optname(curopt);
                    optexpr = self.__get_opt_expr(curopt);
                    opthelp = self.__get_opt_helpinfo(curopt);
                    curstr += util.format('    ');
                    curstr += util.format('%s %s %s\n', format_length(optname, helpsize.optnamesize), 
                        format_length(optexpr,helpsize.optexprsize),
                        format_length(opthelp,helpsize.opthelpsize));
                    if (curstr.length < self.screenwidth) {
                        retstr += curstr;
                    } else {
                        curstr = ''
                        curstr += util.format('    ');
                        curstr += util.format('%s %s', format_length(optname, helpsize.optnamesize) ,
                            format_length(optexpr, helpsize.optexprsize));
                        retstr += curstr + '\n';
                        if (self.screenwidth >= 60) {
                            retstr += self.__get_indent_string(opthelp, 20, self.screenwidth);
                        } else {
                            retstr += self.__get_indent_string(opthelp, 15, self.screenwidth);
                        }
                    }
                }
            });
        }

        if (self.subcommands.length > 0) {
            retstr += '[SUBCOMMANDS]\n';
            self.subcommands.forEach(function(curcmd) {
                cmdname = self.__get_cmd_cmdname(curcmd);
                cmdhelp = self.__get_cmd_helpinfo(curcmd);
                curstr = '';
                curstr += util.format('    ');
                curstr += util.format('%s %s', format_length(cmdname,helpsize.cmdnamesize),
                        format_length(cmdhelp, helpsize.cmdhelpsize));
                if (curstr.length < self.screenwidth) {
                    retstr += curstr + '\n';
                } else {
                    curstr = '';
                    curstr += '    ';
                    curstr += format_length(cmdname,helpsize.cmdnamesize);
                    retstr += curstr + '\n';
                    if (self.screenwidth >= 60) {
                        retstr += self.__get_indent_string(cmdhelp, 20, self.screenwidth);
                    } else {
                        retstr += self.__get_indent_string(cmdhelp, 15, self.screenwidth);
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
            retstr += util.format('subcommands[%d]<',self.subcommands.length);
            for (idx = 0;idx < self.subcommands.length; idx += 1) {
                if (idx > 0) {
                    retstr += '|';
                }
                retstr += util.format('%s',self.subcommands[idx].cmdname);
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

    return self;
};



function ParseState(args,maincmd,optattr) {
    var self = LoggerObject();
    var dict = {};
    if (optattr === undefined || optattr === null) {
        optattr = ExtArgsOption();
    }

    dict.cmdpaths = [maincmd];
    dict.curidx = 0;
    dict.curcharidx = -1;
    dict.shortcharargs = -1;
    dict.longargs = -1;
    dict.keyidx = -1;
    dict.validx = -1;
    dict.args = args;
    dict.ended = 0;
    dict.longprefix = optattr.longprefix;
    dict.shortprefix = optattr.shortprefix;
    dict.leftargs = [];

    if ((dict.shortprefix === null || dict.longprefix === null ||
        dict.shortprefix !== dict.longprefix)) {
        dict.bundlemode = true;
    } else {
        dict.bundlemode = false;
    }

    self.format_cmdname_path = function (curparser) {
        var cmdname = '';
        var idx;
        if (curparser === undefined) {
            curparser = null;
        }
        if (curparser === null) {
            cmdname = dict.cmdpaths;
        } else {
            for (idx = 0;idx < curparser.length ;idx += 1) {
                var c;
                c = curparser[idx];
                if (cmdname.length > 0) {
                    cmdname += '.';
                }
                cmdname += c.cmdname;
            }
        }
        return cmdname;
    };

    self.__find_sub_command = function (name) {
        var idx = dict.cmdpaths.length;
        if (idx > 0) {
            var cmdparent = dict.cmdpaths[(idx-1)];
            var jdx;
            for (jdx = 0;jdx < cmdparent.subcommands.length; jdx += 1) {
                var curcmd = cmdparent.subcommands[jdx];
                if (curcmd === name) {
                    dict.cmdpaths.push(curcmd);
                    return curcmd.keycls;
                }
            }
        }
        return null;
    };

    self.add_parse_args = function (nargs) {
        if (dict.curcharidx >= 0) {
            if (nargs > 0 && dict.shortcharargs > 0) {
                var errstr;
                errstr = util.format('[%s] already set args', dict.args[dict.curidx]);
                throw new Error(errstr);
            }
            if (dict.shortcharargs < 0) {
                dict.shortcharargs = 0;
            }
            dict.shortcharargs += nargs;
        } else {
            if (dict.longargs > 0) {
                var errstr;
                errstr = util.format('[%s] already set args', dict.args[dict.curidx]);
                throw new Error(errstr);
            }

            if (dict.longargs < 0) {
                dict.longargs = 0;
            }
            dict.longargs += nargs;
        }
    };

    self.__find_key_cls = function () {
        var c;
        var oldcharidx;
        var oldidx;
        var curch;
        var idx;
        var curcmd;
        var curopt;
        var jdx;
        var curarg;
        if (dict.ended > 0) {
            return null;
        }

        if (dict.longargs >= 0) {
            assert.ok(dict.curcharidx < 0, util.format('curcharidx[%d] < 0', dict.curcharidx));
            dict.curidx += dict.longargs;
            dict.longargs = -1;
            dict.validx = -1;
            dict.keyidx = -1;
        }
        oldcharidx = dict.curcharidx;
        oldidx = dict.curidx;
        if (oldidx >= dict.args.length) {
            dict.curidx = oldidx;
            dict.curcharidx = -1;
            dict.shortcharargs = -1;
            dict.longargs = -1;
            dict.keyidx = -1;
            dict.validx = -1;
            dict.ended = 1;
            return null;
        }
        if (oldcharidx >= 0) {
            c = dict.args[oldidx];
            if (c.length <= oldcharidx) {
                oldidx += 1;
                self.info(util.format('oldidx [%d]', oldidx));
                if (dict.shortcharargs > 0) {
                    oldidx += dict.shortcharargs;
                }
                self.info(util.format('oldidx [%d] shortcharargs [%d]', oldidx, dict.shortcharargs));
                dict.curidx = oldidx;
                dict.curcharidx = -1;
                dict.shortcharargs = -1;
                dict.keyidx = -1;
                dict.validx = -1;
                dict.longargs = -1;
                return self.__find_key_cls();
            }
            curch = c[oldcharidx];
            self.info(util.format('argv[%d][%d] %s', oldidx, oldcharidx, curch));
            idx = dict.cmdpaths.length - 1;
            while ( idx  >= 0) {
                curcmd = dict.cmdpaths[idx];
                curopt ;
                jdx;
                for (jdx = 0;jdx < curcmd.cmdopts.length; jdx += 1) {
                    curopt = curcmd.cmdopts[jdx];
                    if (!curopt.isflag) {
                        continue;
                    }
                    if (curopt.flagname === '$') {
                        continue;
                    }

                    if (! not_null(curopt.shortflag)) {
                        if (curopt.shortflag === curch) {
                            dict.keyidx = oldidx;
                            dict.validx = (oldidx + 1);
                            dict.curidx = oldidx;
                            dict.curcharidx = (oldcharidx + 1);
                            self.info(util.format('%s validx[%d]', curopt.format(), dict.validx))
                            return curopt;
                        }
                    }
                }
                idx -= 1;
            }
            throw new Error(util.format('can not parse (%s)', dict.args[oldidx]));
        } else {
            if (dict.bundlemode) {
                curarg = dict.args[oldidx];
                if (curarg.startsWith(dict.longprefix)) {
                    if (curarg === dict.longprefix) {
                        dict.keyidx = -1;
                        dict.curidx = (oldidx + 1);
                        dict.curcharidx = -1;
                        dict.validx = (oldidx + 1);
                        dict.shortcharargs = -1;
                        dict.longargs = -1;
                        dict.ended = 1;
                        if (dict.args.length > dict.curidx) {
                            dict.leftargs = dict.leftargs.concat(dict.args.splice(dict.curidx));
                        }
                        return null;
                    }
                    idx = dict.cmdpaths.length - 1;
                    while (idx >= 0) {
                        curcmd = dict.cmdpaths[idx];
                        for (jdx = 0; jdx < curcmd.cmdopts.length ; jdx += 1) {
                            curopt = curcmd.cmdopts[jdx];
                            if (! curopt.isflag) {
                                continue;
                            }
                            if (curopt.flagname === '$') {
                                continue;
                            }

                            self.info(util.format('[%d]longopt %s curarg %s', idx, curopt.longopt, curarg));
                            if (curopt.longopt === curarg) {
                                dict.keyidx = oldidx;
                                oldidx += 1;
                                dict.validx = oldidx;
                                dict.shortcharargs = -1;
                                dict.longargs = -1;
                                self.info(util.format('oldidx %d (len %d)', oldidx, dict.args.length));
                                dict.curidx = oldidx;
                                dict.curcharidx = -1;
                                return curopt;

                            }
                        }
                        idx -= 1;
                    }
                    throw new Error(util.format('can not parse [%s]', dict.args[oldidx]));
                } else if (curarg.startsWith(dict.shortprefix)) {
                    if (curarg === dict.shortprefix) {
                        if (dict.parseall) {
                            dict.leftargs.push(curarg);
                            oldidx += 1;
                            dict.curidx = oldidx;
                            dict.curcharidx = -1;
                            dict.longargs = -1;
                            dict.shortcharargs = -1;
                            dict.keyidx = -1;
                            dict.validx = -1;
                            return self.__find_key_cls();
                        } else {
                            dict.ended = 1;
                            dict.leftargs = dict.leftargs.concat(dict.args.splice(oldidx));
                            dict.validx = oldidx;
                            dict.keyidx = -1;
                            dict.curidx = oldidx;
                            dict.curcharidx = -1;
                            dict.shortcharargs = -1;
                            dict.longargs = -1;
                            return null;
                        }
                    }
                    oldcharidx = dict.shortprefix.length;
                    dict.curidx = oldidx;
                    dict.curcharidx = oldcharidx;
                    return self.__find_key_cls();
                }
            } else {
                /* not bundle mode */
                idx = dict.cmdpaths.length - 1;
                curarg = dict.args[oldidx];
                while (idx >= 0) {
                    curcmd = dict.cmdpaths[idx];
                    for (jdx = 0;jdx < curcmd.cmdopts.length ;jdx += 1) {
                        curopt = curcmd.cmdopts[jdx];
                        if (!curopt.isflag) {
                            continue;
                        }
                        if (curopt.flagname === '$') {
                            continue;
                        }
                        self.info(util.format('[%d](%s) curarg [%s]', idx, curopt.longopt,curarg));
                        if (curopt.longopt === curarg) {
                            dict.keyidx = oldidx;
                            dict.validx = (oldidx + 1);
                            dict.shortcharargs = -1;
                            dict.longargs = -1;
                            self.info(util.format('oldidx %d (len %d)', oldidx, dict.args.length));
                            dict.curidx = (oldidx + 1);
                            dict.curcharidx = -1;
                            return curopt;
                        }
                    }
                    idx -= 1;
                }

                idx = dict.cmdpaths.length - 1;
                while (idx >= 0) {
                    curcmd = dict.cmdpaths[idx];
                    for (jdx = 0; jdx < curcmd.cmdopts.length ; jdx += 1) {
                        curopt = curcmd.cmdopts[jdx];
                        if (!curopt.isflag) {
                            continue;
                        }
                        if (curopt.flagname === '$') {
                            continue;
                        }
                        self.info(util.format('[%d](%s) curarg [%s]', idx, curopt.shortopt,curarg));
                        if (not_null(curopt.shortopt) && curopt.shortopt === curarg)  {
                            dict.keyidx = oldidx;
                            dict.validx = (oldidx + 1);
                            dict.shortcharargs = -1;
                            dict.longargs = -1;
                            self.info(util.format('oldidx %d (len %d)', oldidx, dict.args.length));
                            dict.curidx = oldidx;
                            dict.curcharidx = curopt.shortopt.length;
                            self.info(util.format('[%s]shortopt (%s)', oldidx, curopt.shortopt));
                            return curopt;
                        }
                    }
                    idx -= 1;
                }

                /*it maybe the sub command ,so find it*/
                curopt = self.__find_sub_command(dict.args[oldidx]);
                if (curopt !== null) {
                    self.info(util.format('find %s', dict.args[oldidx]));
                    dict.keyidx = oldidx;
                    dict.curidx = (oldidx  + 1);
                    dict.validx = (oldidx + 1);
                    dict.curcharidx = -1;
                    dict.shortcharargs = -1;
                    dict.longargs = -1;
                    return curopt;
                }

                /*now no thing to find ,suppose it is args ,so handle it when 
                  parse all or not*/
                if (dict.parseall) {
                    dict.leftargs.push(dict.args[oldidx]);
                    oldidx += 1;
                    dict.keyidx = -1;
                    dict.validx = oldidx;
                    dict.curidx = oldidx;
                    dict.curcharidx = -1;
                    dict.shortcharargs = -1;
                    dict.longargs = -1;
                    return self.__find_key_cls();
                } else {
                    dict.ended = 1;
                    dict.leftargs = dict.leftargs.concat(dict.args.splice(oldidx));
                    dict.keyidx = -1;
                    dict.curidx = oldidx;
                    dict.curcharidx = -1;
                    dict.shortcharargs = -1;
                    dict.longargs = -1;
                    return null;
                }
            }
        }
    };

    self.step_one = function () {
        var curopt = null;
        if (dict.ended) {
            return null;
        }

        curopt = self.__find_key_cls();
        if (curopt === null) {
            return null;
        }

        if (!curopt.iscmd) {
            dict.optval = curopt.optdest;
        } else {
            dict.optval = self.format_cmdname_path(dict.cmdpaths);
        }
        return curopt;
    };

    self.get_cmd_paths = function () {
        return dict.cmdpaths;
    };

    self.get_optval = function () {
        return dict.optval;
    };

    self.get_validx = function () {
        return dict.validx;
    }

    return self;
}

set_property_value(exports, 'COMMAND_SET', 'COMMAND_SET');
set_property_value(exports, 'SUB_COMMAND_JSON_SET', 'SUB_COMMAND_JSON_SET');
set_property_value(exports, 'COMMAND_JSON_SET', 'COMMAND_JSON_SET');
set_property_value(exports, 'ENVIRONMENT_SET', 'ENVIRONMENT_SET');
set_property_value(exports, 'ENV_SUB_COMMAND_JSON_SET', 'ENV_SUB_COMMAND_JSON_SET');
set_property_value(exports, 'ENV_COMMAND_JSON_SET', 'ENV_COMMAND_JSON_SET');
set_property_value(exports, 'DEFAULT_SET', 'DEFAULT_SET');

function set_attr_args(self, args, prefix) {
    var keys = Object.keys(args);
    var idx;
    var curkey;
    var startkey = '';
    if (prefix !== undefined && prefix.length > 0) {
        startkey = util.format('%s_', prefix);
    }
    for (idx = 0; idx < keys.length; idx +=1) {
        curkey = keys[idx];
        if (startkey.length === 0 || curkey.startsWith(startkey)) {
            self[curkey] = args[curkey];
        }
    }
    return;
}

function OptCheck() {
    var self = {};
    var dict = {};

    self.__reset = function () {
        dict.longopt = [];
        dict.shortopt = [];
        dict.varname = [];
        return self;
    };

    self.get_longopt = function () {
        return dict.longopt;
    };

    self.get_shortopt = function () {
        return dict.shortopt;
    };

    self.get_varname = function () {
        return dict.varname;
    }

    self.copy = function(other) {
        self.__reset();
        dict.longopt = dict.longopt.concat(other.get_longopt());
        dict.shortopt = dict.shortopt.concat(other.get_shortopt());
        dict.varname = dict.varname.concat(other.get_varname());
        return ;
    };

    self.add_and_check = function(typename, value) {
        if (typename === 'longopt') {
            if (dict.longopt.indexOf(value) >= 0) {
                return false;
            }

            dict.longopt.push(value);
            return true;
        } else if (typename === 'shortopt') {
            if (dict.shortopt.indexOf(value) >= 0) {
                return false;
            }
            dict.shortopt.push(value);
            return true;
        } else if (typename === 'varname') {
            if (dict.varname.indexOf(value) >= 0) {
                return false;
            }
            dict.varname.push(value);
            return true;
        }
        return false;
    };

    return self.__reset();
}

function NewExtArgsParse(option) {
    'use strict';
    var reserved_args = ['subcommand','subnargs','nargs','extargs','args'];
    var parser = LoggerObject();
    var opt = option || {};
    var self;
    var errstr2;
    var retparser;

    retparser = {};
    parser.flags = [];
    parser.help_func = null;
    parser.subparsers = [];
    parser.error = 0;
    parser.keycls = null;
    parser.tabwidth = 4;

    if (process.argv.length > 1) {
        parser.cmdname = process.argv[1];
    } else {
        parser.cmdname = process.argv[0];
    }

    self = parser;


    parser.priority = [exports.SUB_COMMAND_JSON_SET, exports.COMMAND_JSON_SET, exports.ENVIRONMENT_SET, exports.ENV_SUB_COMMAND_JSON_SET, exports.ENV_COMMAND_JSON_SET];
    if (opt.priority !== undefined && opt.priority !== null) {
        opt.priority.forEach(function (elm, idx) {
            if (parser.priority.indexOf(elm) < 0) {
                errstr2 = util.format('[%d]elm (%s) not valid', idx, elm);
                throw new Error(errstr2);
            }
        });
        parser.priority = opt.priority;
    }

    if (typeof opt.help_func === 'function') {
        parser.help_func = opt.help_func;
    }

    if (typeof opt.cmdname === 'string') {
        parser.cmdname = opt.cmdname;
    }

    self.__format_cmd_from_cmd_array = function (cmdarray) {
        var formcmdname = '';
        var idx;
        var c;
        if (! not_null(cmdarray)) {
            return formcmdname;
        }
        for (idx = 0;idx < cmdarray.length ;idx +=1){
            c = cmdarray[idx];
            if (formcmdname.length > 0) {
                formcmdname += '.';
            }
            formcmdname += c.cmdname;
        }
        return formcmdname;
    };

    self.__need_args_error = function (args, validx, keycls, params) {
        var keyval = '';
        if (validx > 0) {
            keyval = params[(validx - 1)];
        }

        if (keyval === keycls.longopt) {
            keyval = keycls.longopt;
        } else if ( not_null(keycls.shortopt) && keyval.indexOf(keycls.shortflag) > 0) {
            /*we have shortprefix before ,so do this*/
            keyval = keycls.shortopt;
        }
        self.error_msg(util.format('[%s] need args', keyval));
        return;
    };

    self.__bool_action = function(args, validx, keycls, params) {
        if (keycls.value) {
            args[keycls.optdest] = false;
        } else {
            args[keycls.optdest] = true;
        }
        return 0;
    };

    self.__append_action = function(args, validx, keycls, params) {
        var value ;
        if (validx >= params.length) {
            self.__need_args_error(args, validx, keycls, params);
        }
        value = params[validx];
        if (!not_null(args[keycls.optdest])) {
            args[keycls.optdest] = [];
        }
        args[keycls.optdest].push(value);
        return 1;
    };

    self.__string_action = function(args, validx, keycls, params) {
        if (validx >= params.length) {
            self.__need_args_error(args, validx, keycls, params);
        }
        args[keycls.optdest] = params[validx];
        return 1;
    };

    self.__jsonfile_action = function(args, validx, keycls, params) {
        return self.__string_action(args, validx, keycls, params);
    };

    self.__int_action = function(args, validx, keycls, params) {
        var base =10;
        var value ;
        if (validx >= params.length) {
            self.__need_args_error(args, validx, keycls, params);
        }

        value = params[validx];
        self.info(util.format('set value [%s][%s]', validx, value));
        if (value.startsWith('0x') || value.startsWith('0X')) {
            value = value.splice(2);
            base = 16;
        } else if (value.startsWith('x') || value.startsWith('X')) {
            value = value.splice(2);
            base = 16;
        }
        value = value.toLowerCase();

        if ((!value.match('^[0-9a-f]+$') && base === 16) || 
            (!value.match('^[0-9]+$') && base === 10)) {
            self.error_msg(util.format('%s not valid int', params[validx]));
        }

        args[keycls.optdest] = parseInt(value, base);
        return 1;
    };

    self.__inc_action = function(args, validx, keycls, params) {
        if (! not_null(args[keycls.optdest])) {
            args[keycls.optdest] = 0;
        }
        args[keycls.optdest] += 1;
        return 0;
    };

    self.__float_action = function(args, validx, keycls, params) {
        var value;
        if (validx >= params.length) {
            self.__need_args_error(args, validx, keycls, params);
        }
        value = params[validx];
        if (!value.match('^[0-9]+(\.[0-9]+)?$')) {
            self.error_msg(util.format('%s not valid float', params[validx]));
        }
        args[keycls.optdest] = parseFloat(value);
        return 1;
    };

    self.__help_action = function(args, validx, keycls, value) {
        self.print_help(process.stdout, value);
        process.exit(0);
        return 0;
    };

    self.__command_action = function(args, validx, keycls, params) {
        return 0;
    };

    self.__json_value_base = function(args, keycls, value) {
        args[keycls.optdest] = value;
        return;
    };

    self.__json_value_error = function(args, keycls, value) {
        throw new Error('error set json value');
        return ;
    };

    self.__get_full_trace_back = function(callstck,tabs,cnt) {
        if (! not_null(callstck)) {
            callstck = 1;
        }
        if (! not_null(tabs)) {
            tabs = 1;
        }
        if (! not_null(cnt)) {
            cnt = 0;
        }
        var rets = '';
        var stktr = stacktrace.get();
        var idx;
        for (idx =callstck ;idx < stktr.length ;idx += 1) {
            rets += format_length('', tabs * 4);
            rets += util.format('[%d][%s:%s:%s]\n', idx, stktr[idx].getFileName(),
                stktr[idx].getFunctionName(),stktr[idx].getLineNumber());            
        }
        return 
    };

    self.error_msg = function(message) {
        var output = false;
        var outs = '';
        if (dict.output_mode.length > 0) {
            if (dict.output_mode.splice(-1) === 'bash') {
                outs = '';
                outs += 'cat >&2 <<EXTARGSEOF\n'
                outs += util.format('parse command error\n    %s\n', message);
                outs += 'EXTARGSEOF\n';
                outs += 'exit 3\n';
                process.stdout.write(outs);
                process.exit(3);
            }
        }
        if (! output){
            outs = 'parse command error\n'
            outs += util.format('    %s', self.format_call_msg(message,2));
        }

        if (dict.error_handler === 'exit') {
            process.stderr.write(outs);
            process.exit(3);
            return;
        }
        throw new Error(outs);
        return;
    };

    self.__check_flag_insert = function (keycls, curparser) {
        if (!not_null(curparser)) {
            curparser = null;
        }
        var lastparser;
        var idx;
        var curopt;

        if (not_null(curparser)) {
            lastparser = curparser.splice(-1);
        } else {
            lastparser = dict.maincmd;
        }
        for (idx =0;idx < lastparser.cmdopts.length ;idx += 1) {
            curopt = lastparser.cmdopts[idx];
            if (curopt.flagname !== '$' && keycls.flagname !== '$' ) {
                if (curopt.typename !== 'help' && keycls.typename !== 'help') {
                    if (curopt.optdest === keycls.optdest ) {
                        return false;
                    }
                } else if (curopt.typename === 'help' && keycls.typename === 'help') {
                    return false;
                }
            } else if (curopt.flagname === '$' && keycls.flagname === '$') {
                return false;
            }
        }
        lastparser.cmdopts.push(keycls);
        return true;
    };

    self.__check_flag_insert_mustsucc = function (keycls, curparser) {
        var inserted;
        var errstr;

        inserted = self.__check_flag_insert(keycls, curparser);
        if (!inserted) {
            var curcmdname = '';
            var idx;
            if (not_null(curparser)) {
                for (idx=0;idx < curparser.length ;idx += 1) {
                    if (idx > 0) {
                        curcmdname += '.';
                    }
                    curcmdname += curparser[idx].cmdname;
                }
            }
            errstr = util.format('(%s) already in command(%s)', keycls.flagname,cmdname);
            self.error_msg(errstr);
        }
        return inserted;
    };

    self.__load_command_line_base = function(prefix, keycls, curparser) {
        if (! not_null(curparser)) {
            curparser = null;
        }
        if (keycls.isflag && keycls.flagname !== '$' && 
            reserved_args.indexOf(keycls.flagname)) {
            self.error_msg(util.format('(%s) in reserved_args (%s)', keycls.flagname, reserved_args));
        }
        self.__check_flag_insert_mustsucc(keycls,curparser);
        return true;
    };


    self.__load_command_line_args = function (prefix, keycls, curparser) {
        return self.__check_flag_insert(keycls, curparser);
    };

    self.__load_command_line_help = function (prefix, keycls, curparser) {
        return self.__check_flag_insert(keycls, curparser);
    };

    self.__load_command_line_jsonfile = function(prefix, keycls, curparser) {
        return self.__check_flag_insert(keycls, curparser);
    };

    self.__load_command_line_json_added = function(curparser) {
        var prefix = '';
        var key = util.format('%s##json input file to get the value set##', dict.jsonlong);
        var value = null;
        var keycls;
        prefix = self.__format_cmd_from_cmd_array(curparser);
        prefix = prefix.replace('.','_');
        keycls = keyparse.KeyParser(prefix, key, value, true, false, true, dict.longprefix, dict.shortprefix);
        return self.__load_command_line_jsonfile(prefix, keycls, curparser);
    };

    self.__load_command_line_help_added = function(curparser) {
        if (! not_null(curparser)) {
            curparser = null;
        }
        var key = util.format('%s', dict.helplong);
        var value = null;
        var keycls;
        if (not_null(dict.helpshort)) {
            key += util.format('|%s', dict.helpshort);
        }
        key += '##to display this help information##';
        keycls = keyparse.KeyParser('', key, value, true, true, false, dict.longprefix, dict.shortprefix);
        return self.__load_command_line_help(keycls, curparser);
    };

    self.init_fn = function() {
        dict.options = opt;
        dict.maincmd = ParserCompat(None, opt);
        dict.maincmd.prog = opt.prog;
        dict.maincmd.usage = opt.usage;
        dict.maincmd.description = opt.description;
        dict.maincmd.epilog = opt.epilog;
        dict.maincmd.version = opt.version;
        dict.error_handler = opt.errorhandler;
        dict.help_handler = opt.helphandler;
        dict.output_mode = [];
        dict.ended = 0;
        dict.longprefix = opt.longprefix;
        dict.shortprefix = opt.shortprefix;
        dict.nohelpoption = opt.nohelpoption;
        dict.nojsonoption = opt.nojsonoption;
        dict.helplong = opt.helplong;
        dict.helpshort = opt.helpshort;
        dict.jsonlong = opt.jsonlong;
        dict.cmdprefixadded = opt.cmdprefixadded;
        dict.load_command_map = {
            string: self.__load_command_line_base  ,
            unicode: self.__load_command_line_base  ,
            int: self.__load_command_line_base  ,
            long: self.__load_command_line_base  ,
            float: self.__load_command_line_base  ,
            list:  self.__load_command_line_base  ,
            boolean: self.__load_command_line_base  ,
            args:  self.__load_command_line_args  ,
            command: self.__load_command_subparser  ,
            prefix: self.__load_command_prefix  ,
            help: self.__load_command_line_base  ,
            jsonfile:  self.__load_command_line_base  ,
        };
        dict.opt_parse_handle_map = {
            string:   self.__string_action   ,
            unicode:   self.__string_action   ,
            boolean:   self.__bool_action   ,
            int:    self.__int_action  ,
            long:   self.__int_action  ,
            list:   self.__append_action   ,
            count:  self.__inc_action   ,
            help:   self.__help_action  ,
            jsonfile:  self.__jsonfile_action   ,
            command:  self.__command_action   ,
            float:  self.__float_action   ,
        };
        dict.load_priority = opt.priority;
        dict.parse_set_map = {
            SUB_COMMAND_JSON_SET: self.__parse_sub_command_json_set  ,
            COMMAND_JSON_SET:  self.__parse_command_json_set  ,
            ENVIRONMENT_SET:  self.__parse_environment_set  ,
            ENV_SUB_COMMAND_JSON_SET:  self.__parse_env_subcommand_json_set  ,
            ENV_COMMAND_JSON_SET:  self.__parse_env_command_json_set  ,
        };
        dict.set_json_value = {
            string: self.__json_value_base  ,
            unicode:  self.__json_value_base  ,
            boolean:  self.__json_value_base  ,
            int:  self.__json_value_base  ,
            long:  self.__json_value_base  ,
            list:  self.__json_value_base  ,
            count:  self.__json_value_base  ,
            jsonfile:  self.__json_value_base  ,
            float:  self.__json_value_base  ,
            command:  self.__json_value_error  ,
            help:  self.__json_value_error  ,
        };
        return self;
    };

    self.__call_json_value = function(args, keycls, value) {
        accessed[keycls.optdest] = true;
        if (not_null(keycls.attr) && not_null(keycls.attr.jsonfunc)) {
            call_args_function(keycls.attr.jsonfunc, null ,args, keycls, value);
            return;
        }
        dict.set_json_value[keycls.typename](args,  keycls,  value);
        return;
    };

    self.__format_cmdname_path = function(curparser) {
        var curcmdname = '';
        if (not_null(curparser)) {
            var c;
            var idx;
            for(idx=0;idx<curparser.length;idx+=1) {
                c = curparser[idx];
                if (curcmdname.length > 0) {
                    curcmdname += '.';
                }
                curcmdname += c.cmdname;
            }
        }
        return curcmdname;
    };

    self.__find_commands_in_path = function(cmdname, curparser) {
        var sarr = [''];
        var commands = [];
        var idx = 0;
        var curcommand;
        if (not_null(cmdname)) {
            sarr = cmdname.split('.');            
        }
        if (not_null(dict.maincmd)) {
            commands.push(dict.maincmd);
        }

        while(idx < sarr.length && not_null(cmdname) && cmdname.length > 0) {
            if (idx !== 0) {
                curcommand = self.__find_command_inner(sarr[(idx-1)],commands);
                if (not_null(curcommand)) {
                    break;
                }
                commands.push(curcommand);
            }
            idx += 1;
        }
        return commands;
    };

    self.__find_command_inner = function(name, curparser) {
        var sarr;
        var curroot;
        var nextparsers = [];
        var c;
        var idx;
        sarr = name.split('.');
        curroot = dict.maincmd;
        if (not_null(curparser)) {
            nextparsers = curparser;
            curroot = curparser.splice(-1);
        }

        if (sarr.length > 1) {
            nextparsers.push(curroot);
            for (idx =0; idx < curroot.subcommands.length; idx += 1) {
                c = curroot.subcommands[idx];
                if (c.cmdname === sarr[0]) {
                    nextparsers = [];
                    if (not_null(curparser)) {
                        nextparsers = curparser;
                    }
                    nextparsers.push(c);
                    return self.__find_command_inner(sarr.splice(1).join('.'), nextparsers);
                }
            }
        } else {
            for(idx = 0 ; idx < curroot.subcommands.length ; idx += 1) {
                c = curroot.subcommands[idx];
                if (c.cmdname === sarr[0]) {
                    return c;
                }
            }
        }
        return null;
    };

    self.__find_subparser_inner = function(cmdname, parentcmd) {
        var sarr;
        var idx;
        var c;
        var findcmd;
        if (! not_null(cmdname) || cmdname === '') {
            return parentcmd;
        }
        if (! not_null(parentcmd)) {
            parentcmd = dict.maincmd;
        }
        sarr = cmdname.split('.');
        for (idx =0; idx < parentcmd.subcommands.length ;idx += 1) {
            c = parentcmd.subcommands[idx];
            if (c.cmdname === sarr[0]) {
                findcmd = self.__find_subparser_inner(sarr.splice(1).join('.'),c);
                if (not_null(findcmd)) {
                    return findcmd;
                }
            }
        }
        return null;
    };

    self.__get_subparser_inner = function(keycls, curparser) {
        var cmdname = '';
        var parentname = self.__format_cmdname_path(curparser);
        var cmdparser ;
        cmdname += parentname;
        if (cmdname.length > 0) {
            cmdname += '.';
        }
        cmdname += keycls.cmdname;
        cmdparser = self.__find_subparser_inner(cmdname);
        if (not_null(cmdparser)) {
            return cmdparser;
        }
        cmdparser = ParserCompat(keycls);
        if (parentcmd.length === 0) {
            dict.maincmd.subcommands.push(cmdparser);
        } else {
            curparser.splice(-1).subcommands.push(cmdparser);
        }
        return cmdparser;
    };

    self.__load_command_subparser = function(prefix, keycls, lastparser) {
        var parserinner = null;
        var nextparsers = [];
        var newprefix = '';
        if (keycls.iscmd && reserved_args.indexOf(keycls.cmdname) >= 0) {
            self.error_msg(util.format('command(%s) in reserved_args (%s)', keycls.cmdname,reserved_args));
        }
        parserinner = self.__get_subparser_inner(keycls, lastparser);
        nextparsers = [dict.maincmd];
        if (not_null(lastparser)) {
            nextparsers = lastparser;
        }

        nextparsers.push(parserinner);
        self.info('nextparser %s', self.format_string(nextparser));
        self.info('keycls %s', keycls.format());
        if (dict.cmdprefixadded) {
            newprefix = prefix;
            if (newprefix.length > 0) {
                newprefix += '.';
            }
            newprefix += keycls.cmdname;
        }
        self.__load_command_line_inner(newprefix, keycls.value, nextparsers);
        nextparsers.pop();
        return true;
    };

    self.__load_command_prefix = function(prefix, keycls, curparser) {
        if (reserved_args.indexOf(keycls.prefix) >= 0) {
            self.error_msg(util.format('prefix (%s) in reserved_args (%s)', keycls.prefix, reserved_args));
        }
        self.__load_command_line_inner(keycls.prefix, keycls.value, curparser);
        return true;
    };

    self.__load_command_line_inner = function(prefix, d, curparser) {
        var parentpath = [dict.maincmd];
        var keys = Object.keys(d);
        var idx;
        var v;
        var k;
        var keycls;
        var valid;
        if (!not_null(curparser)) {
            curparser = null;
        }
        if (! dict.nojsonoption) {
            self.__load_command_line_json_added(curparser);
        }
        if (! dict.nohelpoption) {
            self.__load_command_line_help_added(curparser);
        }

        if (not_null(curparser)) {
            parentpath = curparser;
        }

        for (idx=0; idx < keys.length; idx += 1) {
            k = keys[idx];
            v = d[k];
            self.info(util.format('%s , %s , %s , True', prefix, k, v));
            keycls = keyparse.KeyParser(prefix, k, v, false, false, false, dict.longprefix, dict.shortprefix, dict.flagnochange);
            valid = dict.load_command_map[keycls.typename](prefix, keycls, parentpath);
            if (! valid) {
                self.error_msg(util.format('can not add (%s, %s)', k, v));
            }
        }
        self.info(util.format('%s', self.format_string(parentpath)));
        return;
    };

    retparser.load_command_line = function(d) {
        if (dict.ended !== 0) {
            throw new Error(util.format('you have call parse_command_line before call load_command_line_string or load_command_line'));
        }
        if (typeof d !== 'object') {
            self.error_msg(util.format('input parameter (%s) not object', d));
        }
        self.__load_command_line_inner('', d, null);
        return;
    };

    self.__get_except_info = function(e) {
        var idx = 1;
        var rets = '';
        var stktr = stacktrace.get();
        rets += util.format('exception: %s\n', e);
        rets += 'trace back:\n';
        rets += self.__get_full_trace_back(2, 1, 0);
        return rets;
    };

    retparser.load_command_line_string = function(s) {
        var d;
        try {
            d = JSON.parse(s);
        }catch(e) {
            self.error_msg(util.format('(%s) not valid json string\n%s', s,self.__get_except_info(e)));
        }
        retparser.load_command_line(d);
        return;
    };

    self.__print_help = function(cmdparser) {
        if (not_null(dict.help_handler) && dict.help_handler === 'nohelp') {
            return 'no help information';
        }
        var curcmd ;
        var cmdpaths = [];
        var idx;
        curcmd = dict.maincmd;
        if (not_null(cmdparser)) {
            self.info(util.format('cmdparser %s', self.format_string(cmdparser)));
            curcmd = cmdparser.splice(-1);
            idx = 0;
            while(idx < (cmdparser.length - 1)) {
                cmdparser.push(cmdparser[idx]);
                idx += 1;
            }
        }
        return curcmd.get_help_info(null, cmdpaths);
    };

    retparser.print_help = function(fout, cmdname) {
        if (!not_null(fout)) {
            fout = process.stderr;
        }
        if (!not_null(cmdname)) {
            cmdname = '';
        }
        var s;
        var paths;
        paths = self.__find_commands_in_path(cmdname);
        s = self.__print_help(paths);
        if (not_null(dict.output_mode) && dict.output_mode.length > 0 && 
            dict.output_mode.splice(-1) === 'bash') {
            var outs;
            outs = util.format('cat <<EOFMM\n%s\nEOFMM\nexit 0', s);
            process.stdout.write(outs);
            process.exit(0);
        }
        fout.write(s);
        return;
    }

    self.__get_args_accessed = function(optdest) {
        if (accessed[optdest] !== undefined) {
            return true;
        }
        return false;
    };

    self.__set_jsonvalue_not_defined = function(args, cmd, key, value) {
        var idx;
        var chld;
        var curopt;
        for (idx = 0; idx < cmd.subcommands.length; idx += 1) {
            chld = cmd.subcommands[idx];
            args = self.__set_jsonvalue_not_defined(args, chld, key, value);
        }

        for (idx = 0; idx < cmd.cmdopts.length; idx += 1) {
            curopt = cmd.cmdopts[idx];
            if (curopt.isflag && 
                curopt.typename !== 'prefix' && 
                curopt.typename !== 'args' && 
                curopt.typename !== 'help') {
                if (curopt.optdest === key) {
                    if (! self.__get_args_accessed(key)) {
                        self.__call_json_value(args, key, value);
                    }
                    return args;
                }
            }
        }
        return args;
    };

    self.__load_jsonvalue = function(args, prefix, jsonvalue) {
        var k;
        var idx;
        var keys = Object.keys(jsonvalue);
        for(idx=0;idx<keys.length;idx+=1) {
            k = keys[idx];
            if (typeof jsonvalue[k] === 'object') {
                var newprefix = '';
                if (prefix.length > 0) {
                    newprefix += util.formt('%s_',prefix);
                }
                newprefix += k;
                args = self.__load_jsonvalue(args, newprefix, jsonvalue[k]);
            } else {
                var newkey = '';
                if (prefix.length > 0) {
                    newkey += util.format('%s_', prefix);
                }
                newkey += k;
                args = self.__set_jsonvalue_not_defined(args, dict.maincmd, newkey, jsonvalue[k]);
            }
        }
        return args;
    };

    self.__load_jsonfile = function(args, cmdname, jsonfile) {
        assert.ok(! dict.nojsonoption, 'must no json file false');
        assert.ok(not_null(jsonfile), 'jsonfile set');
        var prefix = '';
        var jsondata;        
        var v;
        if (not_null(cmdname)) {
            prefix += cmdname;
        }
        prefix = prefix.replace('.','_');
        try{
            jsondata = fs.readFileSync(jsonfile,{
                encoding: 'utf-8',
                flag: 'r'
            });
        } catch(e) {
            self.error_msg(util.format('can not read data from [%s]', jsonfile));
        }

        try{
            v = JSON.parse(jsondata);
        } catch(e) {
            self.error_msg(util.format('can not parse (%s)\n%s', jsonfile, self.__get_except_info(e)));
        }
        self.info(util.format('load (%s) prefix(%s) value (%s)', jsonfile, prefix, jsonvalue));
        return self.__load_jsonvalue(args, prefix, jsonvalue);
    };

    self.__set_parser_default_value = function(args, cmd) {
        var chld;
        var idx;
        var curopt;
        for (idx=0;idx < cmd.subcommands.length; idx += 1) {
            chld = cmd.subcommands[idx];
            args = self.__set_parser_default_value(args, chld);
        }
        for (idx=0;idx < cmd.cmdopts.length; idx += 1) {
            curopt = cmd.cmdopts[idx];
            if (curopt.isflag && 
                curopt.typename !== 'prefix' &&
                curopt.typename !== 'args' &&
                curopt.typename !== 'help') {
                args = self.__set_jsonvalue_not_defined(args, cmd, curopt.optdest, curopt.value);
            }
        }
        return args;
    };

    self.__set_default_value = function(args) {
        args = self.__set_parser_default_value(args, dict.maincmd);
        return args;
    };

    self.__set_environ_value_inner = function(args, prefix, cmd) {
        var idx;
        var chld;
        var curopt;
        var keycls;
        var val;
        var value;
        for (idx=0; idx < cmd.subcommands.length; idx += 1) {
            args = self.__set_environ_value_inner(args, prefix, chld);
        }

        for (idx=0; idx < cmd.cmdopts.length; idx += 1) {
            keycls = cmd.cmdopts[idx];
            if (keycls.isflag && 
                keycls.typename !== 'prefix' &&
                keycls.typename !== 'args' &&
                keycls.typename !== 'help') {
                var optdest = keycls.optdest;
                var oldopt;
                oldopt = optdest;
                if (not_null(accessed[optdest])) {
                    /*has accessed ,so do not handle this*/
                    continue;
                }
                optdest = optdest.toUpperCase();
                optdest = optdest.replace('-','_');
                if (optdest.indexOf('_') < 0) {
                    /*no _ in the word ,so we add the PREFIX*/
                    optdest = util.format('EXTARGS_%s', optdest);
                }
                if (not_null(process.env[optdest])) {
                    val = process.env[optdest];
                    if (keycls.typename === 'string' ||
                        keycls.typename === 'jsonfile') {
                        value = val;
                        self.__call_json_value(args, keycls, value);
                    } else if (keycls.typename === 'boolean') {
                        value = false;
                        if (val.toLowerCase() === 'true') {
                            value = true;
                        }
                        self.__call_json_value(args, keycls, value);
                    } else if (keycls.typename === 'list') {
                        try{
                            value = JSON.parse(val);
                        } catch(e) {
                            self.warn(util.format('can not set (%s) for %s = %s\n%s', optdest, oldopt, val,self.__get_except_info(e)));
                        }
                        if (Array.isArray(value)) {
                            self.__call_json_value(args, keycls, value);
                        } else {
                            self.warn(util.format('[%s] value (%s) not array', optdest, val));
                        }
                    } else if (keycls.typename === 'int' || keycls.typename === 'long' || 
                              keycls.typename === 'count') {
                        var base = 10;
                        if (val.startsWith('0x') || 
                            val.startsWith('0X')) {
                            base = 16;
                            val = val.splice(2);
                        } else if (val.startsWith('x') ||
                            val.startsWith('X')) {
                            base = 16;
                            val = val.splice(1);
                        }
                        val = val.toLowerCase();
                        value = null;
                        if (base === 16 && val.match('^[0-9a-f]+$')) {
                            value = parseInt(val,base);
                        } else if (base === 10 && val.match('^[0-9]+$')) {
                            value = parseInt(val,base);
                        } else {
                            self.warn(util.format('can not set (%s) for %s = %s', optdest, oldopt, val));
                        }

                        if (not_null(value)) {
                            self.__call_json_value(args, keycls, value);
                        }
                    } else if (keycls.typename === 'float') {
                        if (val.match('^[0-9]+(\.[0-9]+)?$')) {
                            value = parseFloat(val);
                            self.__call_json_value(args, keycls, value);
                        } else {
                            self.warn(util.format('can not set (%s) for %s = %s', optdest, oldopt, val));
                        }
                    } else {
                        self.warn(util.format('internal error when (%s) type(%s)', keycls.optdest, keycls.typename));
                    }
                }
            }
        }
    };

    self.__set_environ_value = function(args) {
        return self.__set_environ_value_inner(args, '', dict.maincmd);
    };

    self.__check_varname_inner = function(paths, optcheck) {
        var parentpath = [dict.maincmd];
        var chld;
        var idx;
        var curpath;
        var copychk;
        var curopt;
        var bval;

        if (!not_null(paths)) {
            paths = null;
        }
        if (!not_null(optcheck)) {
            optcheck = OptCheck();
        }

        if (not_null(paths)) {
            parentpath = paths;
        }
        for (idx=0;idx < parentpath.splice(-1).subcommands.length; idx += 1) {
            chld = parentpath.splice(-1).subcommands[idx];
            curpath = parentpath;
            curpath.push(chld);
            copychk = OptCheck();
            copychk.copy(optcheck);
            self.__check_varname_inner(curpath, copychk);
            curpath.pop();
        }

        for (idx=0; parentpath.splice(-1).cmdopts.length; idx += 1) {
            curopt = parentpath.splice(-1).cmdopts[idx];
            if (!curopt.isflag || 
                curopt.typename === 'args' ||
                curopt.typename === 'help') {
                continue;
            }
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
        return;
    };

    self.__set_command_line_self_args_inner = function(paths) {
        var parentpath = [dict.maincmd];
        var chld;
        var idx;
        var curopt;
        var curpath;
        var setted = false;
        var cmdname;
        var prefix;
        var curkey;
        if (!not_null(paths)) {
            paths = null;
        }
        if (not_null(paths)) {
            parentpath = paths;
        }
        for (idx=0;idx < parentpath.splice(-1).subcommands.length; idx += 1) {
            chld = parentpath.splice(-1).subcommands[idx];
            curpath = parentpath;
            curpath.push(chld);
            self.__set_command_line_self_args_inner(curpath);
            curpath.pop();
        }

        for (idx=0;idx< parentpath.splice(-1).cmdopts; idx += 1) {
            curopt = parentpath.splice(-1).cmdopts[idx];
            if(curopt.isflag && curopt.typename === 'args') {
                setted = true;
                break;
            }
        }

        if (! setted) {
            cmdname = self.__format_cmd_from_cmd_array(parentpath);
            if (! not_null(cmdname)) {
                self.error_msg(util.format('can not get cmd (%s) whole name', self.format_string(parentpaths)));
            }
            prefix = cmdname.replace('.', '_');
            curkey = keyparse.KeyParser('', '$', '*', true);
            self.__load_command_line_args('', curkey, parentpath);
        }
        return;
    };

    self.__set_command_line_self_args = function(paths) {
        if (dict.ended !== 0) {
            return;
        }
        self.__set_command_line_self_args(paths);
        self.__check_varname_inner();
        dict.ended = 1;
    };

    self.__parse_sub_command_json_set = function(args) {
        if (not_null(args.subcommand) && ! dict.nojsonoption) {
            var cmds ;
            cmds = self.__find_commands_in_path(args.subcommand);
            idx = cmds.length;
            while(idx >= 2) {
                var subname ;
                var dummycmds = cmds.slice();
                var prefix ;
                var jsondest;
                subname = self.__format_cmd_from_cmd_array(dummycmds.splice(0,(idx + 1)));
                prefix = subname.replace('.', '_');
                jsondest = util.format('%s_%s', prefix, dict.jsonlong);
                if (not_null(args[jsondest])) {
                    args = self.__load_jsonfile(args, subname, args[jsondest]);
                }
                idx -= 1;
            }
        }
        return args;
    };

    self.__parse_command_json_set = function(args) {
        if (!dict.nojsonoption && not_null(args[dict.jsonlong])) {
            args = self.__load_jsonfile(args, '', args[dict.jsonlong]);
        }
        return args;
    };

    self.__parse_environment_set = function(args) {
        return self.__set_environ_value(args);
    };

    self.__parse_env_subcommand_json_set = function(args) {
        if (! dict.nojsonoption && not_null(args.subcommand)) {
            var cmds ;
            var idx;
            cmds = self.__find_commands_in_path(args.subcommand);
            idx = cmds.length;
            while (idx >= 2) {
                var subname;
                var ccmds = cmds.slice();
                var prefix;
                var jsondest;
                subname = self.__format_cmd_from_cmd_array(ccmds.splice(0,(idx+1)));
                prefix = subname.replace('.', '_');
                jsondest = util.format('%s_%s', prefix, dict.jsonlong);
                jsondest = jsondest.replace('-', '_');
                jsondest = jsondest.toUpperCase();
                if (not_null(process.env[jsondest])) {
                    args = self.__load_jsonfile(args, subname, process.env[jsondest]);
                }
                idx -= 1;
            }
        }
        return args;
    };

    self.__parse_env_command_json_set = function(args) {
        var jsonenv;
        jsonenv = util.format('EXTARGS_%s', dict.jsonlong);
        jsonenv = jsonenv.toUpperCase().replace('-', '_').replace('.', '_');
        if (!dict.nojsonoption && not_null(process.env[jsonenv])) {
            args = self.__load_jsonfile(args, '', process.env[jsonenv]);
        }
        return args;
    };

    self.__format_cmdname_msg = function(cmdname, msg) {
        var retmsg = cmdname;
        if (retmsg.length > 0) {
            retmsg += ' command ';
        }
        retmsg += msg;
        return retmsg;
    };

    self.__set_args = function(args, cmdpaths, vals) {
        var argkeycls = null;
        var cmdname ;
        var ccmdpaths;
        var lastcmd;
        var curopt;
        var keyname;
        cmdname = self.__format_cmdname_path(cmdpaths);
        ccmdpaths = cmdpaths.slice();
        self.info(util.format('[%s] %s', cmdname, self.format_string(ccmdpaths.splice(-1).cmdopts)));
        ccmdpaths = cmdpaths.slice();
        lastcmd = ccmdpaths.splice(-1);
        for (idx=0; idx < lastcmd.cmdopts.length; idx += 1) {
            curopt = lastcmd.cmdopts[idx];
            if (curopt.isflag && 
                curopt.flagname === '$') {
                argkeycls = curopt;
                break;
            }
        }
        if (! not_null(argkeycls)) {
            self.error_msg(util.format('can not find args in (%s)', cmdname));
        }
        if (not_null(vals) && ! Array.isArray(vals)) {
            self.error_msg( self.__format_cmdname_msg(cmdname,util.format('invalid type args (%s) %s', typeof vals,vals)));
        }

        if (argkeycls.nargs === '*' || 
            argkeycls.nargs === '+' ||
            argkeycls.nargs === '?')  {
            if (argkeycls.nargs === '?') {
                if (not_null(vals) && vals.length > 1) {
                    self.error_msg(self.__format_cmdname_msg(cmdname,'args \'?\' must <= 1'));
                }
            } else if (argkeycls.nargs === '+') {
                if (! not_null(vals) || vals.length < 1) {
                    self.error_msg(self.__format_cmdname_msg(cmdname, 'args must at least 1'));
                }
            }
        } else {
            var nargint = parseInt(argkeycls.nargs);
            if (! not_null(vals)) {
                if (nargint !== 0) {
                    self.error_msg(self.__format_cmdname_msg(cmdname,util.format('args must 0 but(%s)', vals)));
                }
            } else {
                if (vals.length !== nargint) {
                    self.error_msg(self.__format_cmdname_msg(cmdname, util.format('vals(%s) %d != nargs %d', vals,vals.length,nargs)));
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
        cmdname = self.__format_cmd_from_cmd_array(cmdpaths);
        if (cmdname.length > 0) {
            args.subcommand = cmdname;
        }        
        return args;
    };

    self.__call_opt_method = function(args, validx, keycls, params) {
        var nargs;
        if (not_null(keycls.attr) && not_null(keycls.attr.optparse)) {
            nargs = call_args_function(keycls.attr.optparse, null, args, validx, keycls, params);
            /*to set accessed*/
            accessed[keycls.optdest] = true;
        } else {
            nargs = dict.opt_parse_handle_map[keycls.typename](args, validx, keycls, params);
        }
        return nargs;
    };

    retparser.parse_args = function(params) {
        var cpargs = process.argv.slice();
        var parsestate = null;
        var validx;
        var optval;
        var keycls;
        var cmdpaths;
        var s;
        var nargs;
        if (! not_null(params)) {
            params = cpargs.splice(2);
        }
        parsestate = ParseState(params, dict.maincmd, dict.options);
        args = {};
        try{
            while (true) {
                keycls = parsestate.step_one();
                optval = parsestate.get_optval();
                validx = parsestate.get_validx();
                nargs = 0;
                if (!not_null(keycls)) {
                    cmdpaths = parsestate.get_cmd_paths();
                    s = '';
                    cmdpaths.forEach(function(elm) {
                        s += util.format('%s', elm);
                    });
                    args = self.__set_args(args, cmdpaths, optval);
                    break;
                } else if (keycls.typename === 'help') {
                    cmdpaths = parsestate.get_cmd_paths();
                    s = self.__format_cmd_from_cmd_array(cmdpaths);
                    self.__call_opt_method(args, validx, keycls, s);
                } else {
                    nargs = self.__call_opt_method(args, validx, keycls, params);
                }
                parsestate.add_parse_args(nargs);
                self.info(util.format('%s', args));
            }
        } catch(e) {
            self.error_msg(self.__get_except_info(e));
        }
        return args;
    };

    retparser.parse_command_line = function(params, Context, mode) {
        var cargs;
        var pushmode = false;
        var args;
        var funcname;
        var cmds;
        var getmode = null;
        var idx;
        if (not_null(mode)) {
            pushmode = true;
            dict.output_mode.push(mode);
        }
        args= {};
        try{
            self.__set_command_line_self_args();
            if (! not_null(params)) {
                cargs = process.argv.slice();
                params = cargs.splice(2);
            }
            args = retparser.parse_args(params);
            dict.load_priority.forEach(function(elm) {
                self.info(util.format('priority %s', elm));
                args = dict.parse_set_map[elm](args);
            });
            args = self.__set_default_value(args);
            if (not_null(args.subcommand)) {
                cmds = self.__find_commands_in_path(args.subcommand);
                funcname = cmds.splice(-1).keycls.function;
                if (dict.output_mode.length > 0) {
                    idx = (dict.output_mode.length - 1);
                    getmode = dict.output_mode[idx];
                }
                if (not_null(funcname) && ! not_null(getmode)) {
                    call_args_function(funcname, null, args, Context);
                    return args;
                }
            }
        } catch(e){
            self.error_msg(self.__get_except_info(e));
        }
        if (pushmode) {
            dict.output_mode.pop();
            pushmode = false;
        }
        return args;
    };

    self.__get_subcommands = function(cmdname,cmdpaths) {
        var retnames =null;
        var copycmd;
        var sarr;
        var copysarr;
        if (! not_null(cmdpaths)) {
            cmdpaths = null;
        }

        if (! not_null(cmdpaths)) {
            cmdpaths = [dict.maincmd];
        }

        if (! not_null(cmdname) || cmdname.length === 0) {
            retnames = [];
            copycmd = cmdpaths.slice();
            copycmd.splice(-1).subcommands.forEach(function(c) {
                retnames.push(c);
            });
        }

        sarr = cmdname.split('.');
        copycmd = cmdpaths.slice();
        copycmd.splice(-1).subcommands.forEach(function(c) {
            if (c.cmdname === sarr[0]) {
                cmdpaths.push(c);
                copysarr = sarr.slice();
                return self.__get_subcommands(copysarr.splice(1).join('.'),cmdpaths);
            }
        });
        return retnames;
    };

    self.__get_cmdkey = function(cmdname,cmdpaths) {
        var retkey = null;
        var copycmds;
        var sarr;
        var copysarr;
        if (!not_null(cmdpaths)) {
            cmdpaths = [dict.maincmd];
        }
        if (! not_null(cmdname) || cmdname.length === 0) {
            copycmds = cmdpaths.slice();
            retkey = copycmds.splice(-1).keycls;
            return retkey;
        }
        sarr = cmdname.split('.');
        copysarr = sarr.slice();
        copysarr.splice(-1).subcommands.forEach(function(c) {
            if (c.cmdname === sarr[0]) {
                copycmds = cmdpaths.slice();
                copycmds.push(c);
                return self.__get_cmdkey(copysarr.splice(1).join('.'),copycmds);
            }
        });
        return null;
    };

    self.get_subcommands = function(cmdname) {
        self.__set_command_line_self_args();
        return self.__get_subcommands(cmdname);
    };

    self.get_cmdkey = function(cmdname) {
        self.__set_command_line_self_args();
        return self.__get_cmdkey(cmdname);
    };

    self.__sort_cmdopts = function(retopts) {
        if (not_null(retopts)) {
            var normalopts = [];
            var argsopt = null;
            var idx;
            var jdx;
            retopts.forEach(function(curopt) {
                if (curopt.typename !== 'args') {
                    normalopts.push(curopt);
                }
            });
            idx = 0;
            while(idx < normalopts.length) {
                jdx = idx + 1;
                while ( jdx < normalopts.length) {
                    if (normalopts[jdx].optdest < normalopts[idx].optdest) {
                        var tmpopt = normalopts[jdx];
                        normalopts[jdx] = normalopts[idx];
                        normalopts[idx] = tmpopt;
                    }
                    jdx += 1;
                }
                idx += 1;
            }

            if (not_null(argsopt)) {
                retopts.push(argsopt);
            }
            retopts = retopts.concat(normalopts);
        }
        return retopts;
    };

    self.__get_cmdopts = function(cmdname, cmdpaths) {
        var retopts = null;
        var copycmds;
        var sarr;
        var copysarr;
        if (! not_null(cmdpaths)) {
            cmdpaths = [dict.maincmd];
        }

        if (! not_null(cmdname) || cmdname.length === 0)  {
            copycmds = cmdpaths.slice();
            retopts = copycmds.splice(-1).cmdopts;
            return self.__sort_cmdopts(retopts);
        }
        sarr = cmdname.split('.');
        copycmds = cmdpaths.slice();
        copycmds.splice(-1).subcommands.forEach(function(curcmd) {
            if (curcmd.cmdname === sarr[0]) {
                cmdpaths.push(curcmd);
                return self.__get_cmdopts(copycmds.splice(1).join('.'), cmdpaths);
            }
        });
        return null;
    };

    self.get_cmdopts = function(cmdname) {
        self.__set_command_line_self_args();
        return self.__get_cmdopts(cmdname);
    };

    self.load_command_line_boolean = function (prefix, keycls, curparser) {
        prefix = prefix;
        return self.check_flag_insert_mustsucc(keycls, curparser);
    };

    self.load_command_line_array = function (prefix, keycls, curparser) {
        prefix = prefix;
        return self.check_flag_insert_mustsucc(keycls, curparser);
    };

    self.load_command_line_float = function (prefix, keycls, curparser) {
        prefix = prefix;
        return self.check_flag_insert_mustsucc(keycls, curparser);
    };

    self.load_command_line_int = function (prefix, keycls, curparser) {
        prefix = prefix;
        return self.check_flag_insert_mustsucc(keycls, curparser);
    };
    self.load_command_line_str = function (prefix, keycls, curparser) {
        prefix = prefix;
        return self.check_flag_insert_mustsucc(keycls, curparser);
    };

    self.get_subparser_inner = function (keycls) {
        var idx;
        var cursubparser;
        for (idx = 0; idx < self.subparsers.length; idx += 1) {
            cursubparser = self.subparsers[idx];
            if (keycls.cmdname === cursubparser.cmdname) {
                return cursubparse r;
            }
        }

        cursubparser = {};
        cursubparser.flags = [];
        cursubparser.cmdname = keycls.cmdname;
        cursubparser.cmdkeycls = keycls;
        cursubparser.keycls = null;
        self.subparsers.push(cursubparser);
        return cursubparser;
    };

    self.load_command_line_command = function (prefix, keycls, curparser) {
        var errstr;
        if (curparser) {
            errstr = util.format('can not make (%s) in another subcommand (%s)', keycls.command, curparser.cmdname);
            throw new Error(errstr);
        }
        if (keycls.typename !== 'command' || typeof keycls.value !== 'object') {
            errstr = util.format('(%s) not  object value', keycls.cmdname);
            throw new Error(errstr);
        }

        prefix = prefix;
        curparser = self.get_subparser_inner(keycls);
        self.load_command_line_inner(keycls.cmdname, keycls.value, curparser);
        return true;
    };

    self.load_command_line_prefix = function (prefix, keycls, curparser) {
        var errstr;

        if (typeof keycls.value !== 'object') {
            errstr = util.format('(%s) not object value', keycls.prefix);
            throw new Error(errstr);
        }
        prefix = prefix;
        self.load_command_line_inner(keycls.prefix, keycls.value, curparser);
        return true;
    };

    self.load_command_line_count = function (prefix, keycls, curparser) {
        prefix = prefix;
        return self.check_flag_insert_mustsucc(keycls, curparser);
    };

    self.opt_maxlen = function (curparser) {
        var maxlen = 0;
        var curlen;
        var shortopt = null;
        var longopt;
        var flagarray;
        if (curparser === undefined || curparser === null) {
            flagarray = self.flags;
        } else {
            flagarray = curparser.flags;
        }

        flagarray.forEach(function (elm) {
            shortopt = elm.shortopt;
            longopt = elm.longopt;
            curlen = 0;
            if (shortopt !== null) {
                curlen += shortopt.length;
                /*for , to do*/
                curlen += 1;
            }

            curlen += longopt.length;


            if (curlen > maxlen) {
                maxlen = curlen;
            }
        });
        return maxlen;
    };

    self.dest_maxlen = function (curparser) {
        var optdest;
        var flagarray;
        var maxlen = 0;
        var curlen;

        if (curparser === undefined || curparser === null) {
            flagarray = self.flags;
        } else {
            flagarray = curparser.flags;
        }
        flagarray.forEach(function (elm) {
            curlen = 0;
            optdest = elm.optdest;
            curlen += optdest.length;
            if (curlen > maxlen) {
                maxlen = curlen;
            }
        });
        return maxlen;
    };

    self.subcommand_maxlen = function () {
        var maxlen = 0;

        self.subparsers.forEach(function (elm) {
            if (elm.cmdname.length > maxlen) {
                maxlen = elm.cmdname.length;
            }
        });
        return maxlen;
    };


    self.get_help_info = function (tabs, optmaxsize, destmaxsize, keycls) {
        var s;
        var optdest;
        var longopt, shortopt;
        var idx, j;
        var tabwidth = self.tabwidth;
        s = '';
        for (idx = 0; idx < tabs; idx += 1) {
            for (j = 0; j < tabwidth; j += 1) {
                s += ' ';
            }
        }

        optdest = keycls.optdest;
        shortopt = keycls.shortopt;
        longopt = keycls.longopt;

        if (shortopt !== null) {
            s += shortopt;
            s += ',';
        }
        s += longopt;
        while ((s.length - tabs * tabwidth) < optmaxsize) {
            s += ' ';
        }
        for (j = 0; j < tabwidth; j += 1) {
            s += ' ';
        }
        s += optdest.toUpperCase();

        while ((s.length - (tabs + 1) * tabwidth) < (optmaxsize + destmaxsize)) {
            s += ' ';
        }

        for (j = 0; j < tabwidth; j += 1) {
            s += ' ';
        }

        if (keycls.helpinfo) {
            s += keycls.helpinfo;
            s += '\n';
        } else {
            if (keycls.typename === 'string' || keycls.typename === 'int' || keycls.typename === 'float') {
                s += util.format('set %s default(%s)\n', optdest.toLowerCase(), keycls.value);
            } else if (keycls.typename === 'count') {
                s += util.format('set %s count increment default(%d)\n', optdest.toLowerCase(), keycls.value);
            } else if (keycls.typename === 'array') {
                s += util.format('set %s list default(%s)\n', optdest.toLowerCase(), keycls.value);
            } else if (keycls.typename === 'boolean') {
                if (keycls.value) {
                    s += util.format('set %s false default(true)\n', optdest.toLowerCase());
                } else {
                    s += util.format('set %s true default(false)\n', optdest.toLowerCase());
                }
            }
        }
        return s;
    };

    self.subcommand_helpinfo = function (tabs, subcmdmax, cmdkeycls) {
        var j, i;
        var s;
        var tabwidth = self.tabwidth;

        s = '';
        for (i = 0; i < tabs; i += 1) {
            for (j = 0; j < tabwidth; j += 1) {
                s += ' ';
            }
        }

        s += cmdkeycls.cmdname;
        while ((s.length - (tabs * tabwidth)) < subcmdmax) {
            s += ' ';
        }
        s += ' ';

        if (cmdkeycls.helpinfo) {
            s += cmdkeycls.helpinfo;
        } else {
            s += util.format('make %s', cmdkeycls.cmdname);
        }
        s += '\n';
        return s;
    };

    self.main_help = function (optmaxsize, destmaxsize, subcmdmax) {
        var subnargskeycls;
        var s;

        subnargskeycls = self.keycls;

        s = '';
        s += self.cmdname;
        s += ' ';
        if (self.subparsers.length > 0) {
            s += '[OPTIONS] ';
            if (self.subparsers.length > 0) {
                s += '{subcommand} ';
            }
            s += '\n';

            s += '\nsubcommands:\n';

            self.subparsers.forEach(function (elm) {
                s += self.subcommand_helpinfo(1, subcmdmax, elm.cmdkeycls);
            });

        } else {
            if (subnargskeycls.helpinfo) {
                s += subnargskeycls.helpinfo;
                s += '\n';
            } else {
                if (subnargskeycls.value === '?') {
                    s += util.format('[subnargs]\n');
                } else if (subnargskeycls.value === '*' || subnargskeycls.value === '+') {
                    s += util.format('[subnargs]...\n');
                } else {
                    s += util.format(' %s arguments\n', subnargskeycls.value);
                }
            }
        }

        if (self.flags.length > 0) {
            s += '\n[OPTIONS]:\n';
        }
        self.flags.forEach(function (elm) {
            s += self.get_help_info(1, optmaxsize, destmaxsize, elm);
        });

        return s;
    };


    self.subcommand_help = function (optmaxsize, destmaxsize, subcmdmax, curparser) {
        var s;
        var keycls;
        var subnargskeycls;
        if (curparser === null) {
            return self.main_help(optmaxsize, destmaxsize, subcmdmax);
        }

        keycls = curparser.cmdkeycls;
        s = '';
        s += util.format('%s ', keycls.cmdname);
        subnargskeycls = curparser.keycls;

        if (keycls.helpinfo === null) {
            if (subnargskeycls !== null && subnargskeycls.helpinfo !== null) {
                s += subnargskeycls.helpinfo;
            } else {
                if (subnargskeycls !== null) {
                    if (subnargskeycls.value === '?') {
                        s += '[subnargs]';
                    } else if (subnargskeycls.value === '*' || subnargskeycls.value === '+') {
                        s += '[subnargs]...';
                    } else {
                        s += util.format('%d args', subnargskeycls.value);
                    }
                }
            }
            s += '\n';
        } else {
            s += util.format('%s\n', keycls.helpinfo);
        }

        s += '\n';
        if (curparser.flags.length > 0) {
            s += '[OPTIONS]:\n';
        }
        curparser.flags.forEach(function (elm) {
            s += self.get_help_info(1, optmaxsize, destmaxsize, elm);
        });

        return s;
    };


    self.print_help = function (ec, fmt, curparser) {
        var s;
        var optmaxsize, destmaxsize, subcmdmax;
        var fp;
        s = '';

        optmaxsize = self.opt_maxlen(curparser);
        destmaxsize = self.dest_maxlen(curparser);
        subcmdmax = self.subcommand_maxlen();

        if (fmt !== undefined && fmt !== null) {
            s += fmt;
            s += '\n';
        }
        s += self.subcommand_help(optmaxsize, destmaxsize, subcmdmax, curparser);
        if (self.help_func !== null) {
            self.help_func(ec, s);
        } else {
            if (ec === 0) {
                fp = process.stdout;
            } else {
                fp = process.stderr;
            }
            fp.write(s);
            process.exit(ec);
        }
        return;
    };


    self.load_command_line_inner = function (prefix, opt, curparser) {
        var keys;
        var curkey, curval;
        var idx;
        var keycls;
        var valid;
        var errstr;
        /*we add json file value*/
        self.add_json_file_subcommand(curparser);
        keys = Object.keys(opt);
        for (idx = 0; idx < keys.length; idx += 1) {
            curkey = keys[idx];
            curval = opt[curkey];
            if (curparser !== null) {
                keycls = keyparse.KeyParser(prefix, curkey, curval, true);
            } else {
                keycls = keyparse.KeyParser(prefix, curkey, curval, false);
            }
            valid = self.mapfuncs[keycls.typename](prefix, keycls, curparser);
            if (!valid) {
                errstr = util.format('(%s) (%s) not parse ok', curkey, curval);
                throw new Error(errstr);
            }
        }
        return self;
    };
    self.load_command_line = function (cmdopt) {
        return self.load_command_line_inner('', cmdopt, null);
    };

    self.set_command_line_self_args = function () {
        var curkey;
        self.subparsers.forEach(function (elm) {
            curkey = keyparse.KeyParser(elm.cmdname, '$', '*', true);
            self.load_command_line_args(elm.cmdname, curkey, elm);
        });
        curkey = keyparse.KeyParser('', '$', '*', true);
        self.load_command_line_args('', curkey, null);
        return;
    };


    retparser.load_command_line_string = function (cmdstr) {
        var cmdopt;
        try {
            cmdopt = JSON.parse(cmdstr);
        } catch (e) {
            throw new Error('can not parse (%s) (%s)', cmdstr, JSON.stringify(e));
        }
        return self.load_command_line(cmdopt);
    };

    self.handle_args_value = function (nextarg, keycls) {
        var destname = keycls.optdest.toLowerCase();
        var errstr;
        var added = 0;
        if (keycls.typename === 'boolean') {
            if (keycls.value) {
                self.args[destname] = false;
            } else {
                self.args[destname] = true;
            }
        } else if (keycls.typename === 'count') {
            if (self.args[destname] === undefined) {
                self.args[destname] = 1;
            } else {
                self.args[destname] += 1;
            }
        } else if (keycls.typename === 'float') {
            self.args[destname] = parseFloat(nextarg);
            added += 1;
        } else if (keycls.typename === 'int') {
            self.args[destname] = parseInt(nextarg);
            added += 1;
        } else if (keycls.typename === 'array') {
            if (self.args[destname] === undefined) {
                self.args[destname] = [];
            }
            self.args[destname].push(nextarg);
            added += 1;
        } else if (keycls.typename === 'string') {
            self.args[destname] = nextarg;
            added += 1;
        } else {
            errstr = util.format('unknown type (%s)', keycls.typename);
            throw new Error(errstr);
        }

        return added;
    };

    self.inner_set_value = function (keycls, value) {
        var reg;
        var valstr;
        if (keycls.typename === 'boolean') {
            if (typeof value !== 'boolean') {
                console.log('(%s) value not boolean', keycls.optdest);
                return;
            }
            if (self.args[keycls.optdest] === undefined) {
                self.args[keycls.optdest] = value;
            }
        } else if (keycls.typename === 'float') {
            reg = new RegExp('^[\\d]+\\.[\\d]*$', 'i');
            valstr = util.format('%s', value);
            if (typeof value !== 'number' || !reg.test(valstr)) {
                console.log('(%s) value (%s) not float', keycls.optdest, value);
                return;
            }
            if (self.args[keycls.optdest] === undefined) {
                self.args[keycls.optdest] = value;
            }
        } else if (keycls.typename === 'count' || keycls.typename === 'int') {
            reg = new RegExp('^[\\d]+$', 'i');
            valstr = util.format('%s', value);
            if (typeof value !== 'number' || !reg.test(valstr)) {
                console.log('(%s) value (%s) not integer', keycls.optdest, value);
                return;
            }
            if (self.args[keycls.optdest] === undefined) {
                self.args[keycls.optdest] = value;
            }
        } else if (keycls.typename === 'string') {
            if (typeof value !== 'string' && value !== null) {
                console.log('(%s) value (%s) not string', keycls.optdest, value);
                return;
            }
            if (self.args[keycls.optdest] === undefined) {
                self.args[keycls.optdest] = value;
            }
        } else if (keycls.typename === 'array') {
            if (!Array.isArray(value)) {
                console.log('(%s) value (%s) not array', keycls.optdest, value);
                return;
            }
            if (self.args[keycls.optdest] === undefined) {
                self.args[keycls.optdest] = value;
            }
        } else {
            console.log('(%s) value type(%s) not valid', keycls.optdest, keycls.typename);
            return;
        }

        return;
    };



    self.parse_shortopt = function (arg, nextarg, curparser) {
        var skip = 0;
        var i, j;
        var keycls;
        var shortopt;
        var added;
        if (curparser) {
            for (i = 1; i < arg.length; i += 1) {
                keycls = null;
                for (j = 0; j < curparser.flags.length; j += 1) {
                    shortopt = curparser.flags[j].shortopt;
                    if (shortopt !== null) {
                        if (shortopt[1] === arg[i]) {
                            keycls = curparser.flags[j];
                            break;
                        }
                    }
                }
                if (keycls === null) {
                    return -1;
                }

                added = self.handle_args_value(nextarg, keycls);
                if (added > 0 && keycls.shortopt !== arg) {
                    return -1;
                }
                skip += added;
            }
        } else {
            for (i = 1; i < arg.length; i += 1) {
                keycls = null;
                for (j = 0; j < self.flags.length; j += 1) {
                    shortopt = self.flags[j].shortopt;
                    if (shortopt && shortopt[1] === arg[i]) {
                        keycls = self.flags[j];
                        break;
                    }
                }
                if (keycls === null) {
                    return -1;
                }

                added = self.handle_args_value(nextarg, keycls);
                if (added > 0 && keycls.shortopt !== arg) {
                    return -1;
                }
                skip += added;
            }
        }

        return skip;
    };

    self.parse_longopt = function (arg, nextarg, curparser) {
        var getkeycls;

        getkeycls = null;
        if (curparser) {
            curparser.flags.forEach(function (elm) {
                if (elm.longopt === arg) {
                    getkeycls = elm;
                }
            });
        } else {
            self.flags.forEach(function (elm) {
                if (elm.longopt === arg) {
                    getkeycls = elm;
                }
            });
        }

        if (getkeycls === null) {
            return -1;
        }

        return self.handle_args_value(nextarg, getkeycls);

    };

    self.parse_command_line_inner = function (arglist) {
        var i, j;
        var curparser = null;
        var args;
        var curarg;
        var leftargs = [];
        var added = 0;
        var nextarg;
        var subnargskeycls;
        args = {};
        for (i = 0; i < arglist.length; i += 1) {
            curarg = arglist[i];
            added = 0;
            //tracelog.info('[%d] %s', i, curarg);
            nextarg = null;
            if ((i + 1) < arglist.length) {
                nextarg = arglist[(i + 1)];
            }

            if (curarg === '-h' || curarg === '--help') {
                self.print_help(0, null, curparser);
                self.error = 0;
                return self.args;
            }
            if (curarg === '--') {
                for (j = (i + 1); j < arglist.length; j += 1) {
                    leftargs.push(arglist[j]);
                }
                break;
            }
            if (curarg.length > 2 && curarg[0] === '-' && curarg[1] === '-') {
                added = self.parse_longopt(curarg, nextarg, curparser);
                if (added < 0) {
                    self.error = 1;
                    self.print_help(3, util.format('can not parse longopt(%s)', curarg), curparser);
                    return self.args;
                }
            } else if (curarg.length >= 2 && curarg[0] === '-' && curarg[1] !== '-') {
                added = self.parse_shortopt(curarg, nextarg, curparser);
                if (added < 0) {
                    self.error = 1;
                    self.print_help(3, util.format('can not parse shortopt (%s)', curarg), curparser);
                    return self.args;
                }
            } else {
                if (curparser === null) {
                    if (self.subparsers.length === 0) {
                        for (j = i; j < arglist.length; j += 1) {
                            leftargs.push(arglist[j]);
                        }
                        break;
                    }

                    for (j = 0; j < self.subparsers.length; j += 1) {
                        if (self.subparsers[j].cmdname === curarg) {
                            curparser = self.subparsers[j];
                            break;
                        }
                    }

                    if (curparser === null) {
                        self.print_help(3, util.format('can not find (%s) as subcommand', curarg), null);
                        self.error = 3;
                        return args;
                    }
                } else {
                    for (j = i; j < arglist.length; j += 1) {
                        leftargs.push(arglist[j]);
                    }
                    break;
                }
            }
            i += added;
            if (i > arglist.length) {
                self.error = 1;
                self.print_help(3, util.format('need args for (%s)', curarg), curparser);
                return self.args;
            }
        }

        if (self.subparsers.length > 0 && curparser === null) {
            self.print_help(3, util.format('you should specify a command'), curparser);
            self.error = 1;
            return self.args;
        }


        if (curparser) {
            self.args.subnargs = leftargs;
            self.args.subcommand = curparser.cmdname;
            /*now test for the subnargs*/
            subnargskeycls = curparser.keycls;
            if (subnargskeycls) {
                if (subnargskeycls.nargs === '+') {
                    if (leftargs.length === 0) {
                        self.print_help(3, util.format('need a args for (%s)', curparser.cmdname), curparser);
                        self.error = 1;
                        return self.args;
                    }
                } else if (subnargskeycls.nargs === '?') {
                    if (leftargs.length > 1) {
                        self.print_help(3, util.format('no more args than 1'), curparser);
                        self.error = 1;
                        return self.args;
                    }
                } else if (subnargskeycls.nargs !== '*') {
                    if (leftargs.length !== subnargskeycls.nargs) {
                        self.print_help(3, util.format('args count (%d) != need count %d', leftargs.length, subnargskeycls.nargs), curparser);
                        self.error = 1;
                        return self.args;
                    }
                }
            }

        } else {
            self.args.args = leftargs;
            subnargskeycls = self.keycls;

            if (subnargskeycls) {
                if (subnargskeycls.nargs === '+') {
                    if (leftargs.length === 0) {
                        self.print_help(3, util.format('need a args '), curparser);
                        self.error = 1;
                        return self.args;
                    }
                } else if (subnargskeycls.nargs === '?') {
                    if (leftargs.length > 1) {
                        self.print_help(3, util.format('no more args than 1'), curparser);
                        self.error = 1;
                        return self.args;
                    }
                } else if (subnargskeycls.nargs !== '*') {
                    if (leftargs.length !== subnargskeycls.nargs) {
                        self.print_help(3, util.format('args count (%d) != need count %d', leftargs.length, subnargskeycls.nargs), curparser);
                        self.error = 1;
                        return self.args;
                    }
                }
            }
        }

        return self.args;
    };

    self.add_json_file_subcommand = function (subparser) {
        var keycls;

        if (subparser) {
            keycls = keyparse.KeyParser(subparser.cmdname, 'json', null, true);
        } else {
            keycls = keyparse.KeyParser('', 'json', null, true);
        }
        return self.check_flag_insert(keycls, subparser);
    };

    self.add_args_command = function () {
        var keycls;
        if (self.subparsers.length === 0) {
            keycls = keyparse.KeyParser('', '$', '*', true);
            self.load_command_line_args('', keycls, null);
        } else {
            self.subparsers.forEach(function (subparser) {
                keycls = keyparse.KeyParser(subparser.cmdname, '$', '*', true);
                self.load_command_line_args('', keycls, subparser);
            });
        }
        return;
    };

    self.set_flag_value = function (key, value) {
        var i, j, curparser;
        var keycls;
        var optdest;
        for (i = 0; i < self.flags.length; i += 1) {
            keycls = self.flags[i];
            optdest = keycls.optdest;
            if (optdest === key) {
                self.inner_set_value(keycls, value);
                return;
            }
        }

        for (i = 0; i < self.subparsers.length; i += 1) {
            curparser = self.subparsers[i];
            for (j = 0; j < curparser.flags.length; j += 1) {
                keycls = curparser.flags[j];
                optdest = keycls.optdest;
                optdest = optdest.toLowerCase();
                if (optdest === key) {
                    self.inner_set_value(keycls, value);
                    return;
                }
            }
        }
        return;
    };

    self.args_environment_set = function () {
        var optdest;
        var envname, value, envstr;
        var envs;
        var i;
        envs = Object.keys(process.env);
        for (i = 0; i < envs.length; i += 1) {
            envname = envs[i];
            envstr = process.env[envname];
            try {
                value = eval(envstr);
                optdest = envname;
                optdest = optdest.toLowerCase();
                optdest = optdest.replace(/-/g, '_');
                self.set_flag_value(optdest, value);
            } catch (e) {
                envname = e;
            }
        }
        return;
    };
    self.load_json_file_inner = function (prefix, dict) {
        var keys;
        var curk, keyname, curv;
        var i;
        keys = Object.keys(dict);
        for (i = 0; i < keys.length; i += 1) {
            curk = '';
            if (prefix.length > 0) {
                curk += util.format('%s_', prefix);
            }
            curk += keys[i];
            keyname = keys[i];
            curv = dict[keyname];
            if (Array.isArray(curv)) {
                self.set_flag_value(curk, curv);
            } else if (typeof curv === 'object') {
                self.load_json_file_inner(curk, curv);
            } else {
                self.set_flag_value(curk, curv);
            }
        }
        return;
    };

    self.args_load_json = function (prefix, jsonfile) {
        var jsonvalue;
        var jsondata;
        try {
            jsondata = fs.readFileSync(jsonfile);
            jsonvalue = JSON.parse(jsondata);
        } catch (e) {
            jsonvalue = e;
            console.error('can not parse (%s) (%s)', jsonfile, JSON.stringify(e));
            self.error = 1;
            return;
        }
        self.load_json_file_inner(prefix, jsonvalue);
        return;
    };

    self.args_command_json_set = function () {
        if (self.args.json !== undefined) {
            self.args_load_json('', self.args.json);
        }
    };

    self.args_sub_command_json_set = function () {
        var optdest;
        if (typeof self.args.subcommand === 'string') {
            optdest = util.format('%s_json', self.args.subcommand);
            if (typeof self.args[optdest] === 'string') {
                self.args_load_json(self.args.subcommand, self.args[optdest]);
            }
        }
        return;
    };

    self.args_env_command_json_set = function () {
        var optdest;
        optdest = 'EXTARGSPARSE_JSON';
        if (typeof process.env[optdest] === 'string') {
            self.args_load_json('', process.env[optdest]);
        }
        return;
    };

    self.args_env_sub_command_json_set = function () {
        var optdest;
        var envstr;
        if (typeof self.args.subcommand === 'string') {
            optdest = util.format('%s_json', self.args.subcommand);
            optdest = optdest.toUpperCase();
            if (typeof process.env[optdest] === 'string') {
                envstr = process.env[optdest];
                self.args_load_json(self.args.subcommand, envstr);
            }
        }
        return;
    };

    self.args_set_default = function () {
        var i, j;
        var curparser;
        var keycls;
        for (i = 0; i < self.subparsers.length; i += 1) {
            curparser = self.subparsers[i];
            for (j = 0; j < curparser.flags.length; j += 1) {
                keycls = curparser.flags[j];
                self.inner_set_value(keycls, keycls.value);
            }
        }

        for (i = 0; i < self.flags.length; i += 1) {
            keycls = self.flags[i];
            self.inner_set_value(keycls, keycls.value);
        }
    };
    retparser.parse_command_line = function (arraylist, context) {
        var arglist = [];
        var i;
        var priority;
        var curparser;
        var keycls;

        if (arraylist === null || arraylist === undefined) {
            for (i = 2; i < process.argv.length; i += 1) {
                arglist.push(process.argv[i]);
            }
        } else {
            arglist = arraylist;
        }

        self.error = 0;
        self.args = {};
        /*we add sub command args for every*/
        self.add_args_command();
        self.parse_command_line_inner(arglist);

        for (i = 0; i < self.priority.length; i += 1) {
            priority = self.priority[i];
            self.set_priority_func[priority]();
        }

        self.args_set_default();

        /*now if we have the function so we call it*/
        if (self.args.subcommand !== undefined) {
            curparser = null;
            for (i = 0; i < self.subparsers.length; i += 1) {
                if (self.subparsers[i].cmdname === self.args.subcommand) {
                    curparser = self.subparsers[i];
                    break;
                }
            }

            if (curparser) {
                keycls = curparser.cmdkeycls;
                if (keycls.function !== null) {
                    call_args_function(keycls.function, null, context, self.args);
                }
            }
        }
        return self.args;
    };
    retparser.print_help = function (ec, fmt) {
        self.print_help(ec, fmt, null);
        return;
    };

    parser.mapfuncs = {
        args: self.load_command_line_args,
        boolean: self.load_command_line_boolean,
        array: self.load_command_line_array,
        float: self.load_command_line_float,
        int: self.load_command_line_int,
        string: self.load_command_line_str,
        command: self.load_command_line_command,
        prefix: self.load_command_line_prefix,
        count: self.load_command_line_count
    };

    parser.set_priority_func = {
        ENVIRONMENT_SET: self.args_environment_set,
        ENV_COMMAND_JSON_SET: self.args_env_command_json_set,
        ENV_SUB_COMMAND_JSON_SET: self.args_env_sub_command_json_set,
        COMMAND_JSON_SET: self.args_command_json_set,
        SUB_COMMAND_JSON_SET: self.args_sub_command_json_set
    };

    return retparser;
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

module.exports.ExtArgsParse = NewExtArgsParse;
module.exports.set_attr_self = set_attr_self;