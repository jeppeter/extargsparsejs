var keyparse = require('./keyparse');
var util = require('util');
var fs = require('fs');

var call_args_function = function (funcname, args, context) {
    'use strict';
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

    Function.prototype.call.call(reqpkg[fname], context, args);
    return args;
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

set_property_value(exports, 'COMMAND_SET', 'COMMAND_SET');
set_property_value(exports, 'SUB_COMMAND_JSON_SET', 'SUB_COMMAND_JSON_SET');
set_property_value(exports, 'COMMAND_JSON_SET', 'COMMAND_JSON_SET');
set_property_value(exports, 'ENVIRONMENT_SET', 'ENVIRONMENT_SET');
set_property_value(exports, 'ENV_SUB_COMMAND_JSON_SET', 'ENV_SUB_COMMAND_JSON_SET');
set_property_value(exports, 'ENV_COMMAND_JSON_SET', 'ENV_COMMAND_JSON_SET');
set_property_value(exports, 'DEFAULT_SET', 'DEFAULT_SET');

function NewExtArgsParse(option) {
    'use strict';
    var parser = {};
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
    //tracelog.info('argv (%s)', process.argv);
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

    self.check_flag_insert = function (keycls, curparser) {
        var idx;
        var curflag;
        if (curparser) {
            for (idx = 0; idx < curparser.flags.length; idx += 1) {
                curflag = curparser.flags[idx];
                if (curflag.optdest === keycls.optdest) {
                    return false;
                }
            }
            curparser.flags.push(keycls);
        } else {
            for (idx = 0; idx < self.flags.length; idx += 1) {
                curflag = self.flags[idx];
                if (curflag.optdest === keycls.optdest) {
                    return false;
                }
            }
            self.flags.push(keycls);
        }
        return true;
    };

    self.check_flag_insert_mustsucc = function (keycls, curparser) {
        var inserted;
        var errstr;

        inserted = self.check_flag_insert(keycls, curparser);
        if (!inserted) {
            errstr = util.format('(%s) has inserted', keycls.optdest);
            throw new Error(errstr);
        }
        return inserted;
    };

    self.load_command_line_args = function (prefix, keycls, curparser) {
        prefix = prefix;
        if (curparser) {
            if (curparser.keycls !== null) {
                return false;
            }
            curparser.keycls = keycls;
            return true;
        }

        if (self.keycls !== null) {
            return false;
        }
        self.keycls = keycls;
        return true;
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
                return cursubparser;
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
                    call_args_function(keycls.function, self.args, context);
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