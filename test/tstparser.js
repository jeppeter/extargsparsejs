var extargsparse = require('../');
var test = require('tape');
var util = require('util');
var fs = require('fs');
var mktemp = require('mktemp');

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
    if (process.env[name] !== undefined) {
        delete process.env[name];
    }

    process.env[name] = value;
    return;
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

var call_args_function = function (args) {
    'use strict';
    var context = this;
    context.has_called_args = args.subcommand;
    return;
};
exports.call_args_function = call_args_function;

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
    mktemp.createFile('parseXXXXXX.json', function (err, depjsonfile) {
        t.equal(err, null, get_notice(t, 'createtemp'));
        fs.writeFile(depjsonfile, '{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"}\n', function (err2) {
            var parser, args;
            t.equal(err2, null, get_notice(t, util.format('write (%s)', depjsonfile)));
            parser = extargsparse.ExtArgsParse();
            parser.load_command_line_string(commandline);
            args = parser.parse_command_line(['-vvvv', '-p', '9000', 'dep', '--dep-json', depjsonfile, '--dep-string', 'ee', 'ww']);
            t.equal(args.verbose, 4, get_notice(t, 'verbose'));
            t.equal(args.port, 9000, get_notice(t, 'port'));
            t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand'));
            t.deepEqual(args.dep_list, ['jsonval1', 'jsonval2'], get_notice(t, 'dep_list'));
            t.equal(args.dep_string, 'ee', get_notice(t, 'dep_string'));
            t.deepEqual(args.subnargs, ['ww'], get_notice(t, 'subnargs'));
            fs.unlink(depjsonfile, function (err3) {
                t.equal(err3, null, get_notice(t, util.format('delete %s', depjsonfile)));
                t.end();
            });

        });
    });
});

test('A011', function (t) {
    'use strict';
    var commandline = `{"verbose|v" : "+","$port|p" : {"value" : 3000,"type" : "int","nargs" : 1 ,"helpinfo" : "port to connect"},"dep" : { "list|l" : [], "string|s" : "s_var","$" : "+"}}`;
    setup_before(t);
    mktemp.createFile('parseXXXXXX.json', function (err, depjsonfile) {
        t.equal(err, null, get_notice(t, 'create depjsonfile'));
        fs.writeFile(depjsonfile, '{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"}\n', function (err2) {
            var parser, args;
            t.equal(err2, null, get_notice(t, util.format('write %s', depjsonfile)));
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
            fs.unlink(depjsonfile, function (err3) {
                t.equal(err3, null, get_notice(t, util.format('delete (%s)', depjsonfile)));
                t.end();
            });

        });
    });
});

test('A012', function (t) {
    'use strict';
    var commandline = `{"verbose|v" : "+","$port|p" : { "value" : 3000, "type" : "int","nargs" : 1 ,"helpinfo" : "port to connect"},"dep" : {"list|l" : [],"string|s" : "s_var","$" : "+"}}`;
    setup_before(t);
    mktemp.createFile('parseXXXXXX.json', function (err, jsonfile) {
        t.equal(err, null, get_notice(t, 'make jsonfile'));
        fs.writeFile(jsonfile, '{"dep":{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"},"port":6000,"verbose":3}\n', function (err2) {
            var parser, args;
            t.equal(err2, null, get_notice(t, util.format('write (%s)', jsonfile)));
            parser = extargsparse.ExtArgsParse();
            parser.load_command_line_string(commandline);
            args = parser.parse_command_line(['-p', '9000', '--json', jsonfile, 'dep', '--dep-string', 'ee', 'ww']);
            t.equal(args.verbose, 3, get_notice(t, 'verbose'));
            t.equal(args.port, 9000, get_notice(t, 'port'));
            t.equal(args.subcommand, 'dep', get_notice(t, 'subcommand'));
            t.deepEqual(args.dep_list, ['jsonval1', 'jsonval2'], get_notice(t, 'dep_list'));
            t.equal(args.dep_string, 'ee', get_notice(t, 'dep_string'));
            t.deepEqual(args.subnargs, ['ww'], get_notice(t, 'subnargs'));
            fs.unlink(jsonfile, function (err3) {
                t.equal(err3, null, get_notice(t, util.format('delete (%s)', jsonfile)));
                t.end();
            });

        });
    });
});

test('A013', function (t) {
    'use strict';
    var commandline = `{"verbose|v" : "+","$port|p" : { "value" : 3000,"type" : "int", "nargs" : 1 , "helpinfo" : "port to connect"},"dep" : {"list|l" : [],"string|s" : "s_var","$" : "+"}}`;
    setup_before(t);
    mktemp.createFile('parseXXXXXX.json', function (err, jsonfile) {
        t.equal(err, null, get_notice(t, 'create jsonfile'));
        fs.writeFile(jsonfile, '{"dep":{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"},"port":6000,"verbose":3}\n', function (err2) {
            var parser, args;
            t.equal(err2, null, get_notice(t, util.format('write (%s)', jsonfile)));
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
            fs.unlink(jsonfile, function (err3) {
                t.equal(err3, null, get_notice(t, util.format('delete %s', jsonfile)));
                t.end();
            });


        });
    });
});

test('A014', function (t) {
    'use strict';
    var commandline = `{"verbose|v" : "+","$port|p" : {"value" : 3000,"type" : "int","nargs" : 1 ,"helpinfo" : "port to connect"},"dep" : {"list|l" : [],"string|s" : "s_var","$" : "+"}}`;
    setup_before(t);
    mktemp.createFile('parseXXXXXX.json', function (err, jsonfile) {
        t.equal(err, null, get_notice(t, 'create jsonfile'));
        fs.writeFile(jsonfile, '{"dep":{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"},"port":6000,"verbose":3}\n', function (err2) {
            t.equal(err2, null, get_notice(t, util.format('write jsonfile (%s)', jsonfile)));
            mktemp.createFile('parseXXXXXX.json', function (err3, depjsonfile) {
                t.equal(err3, null, get_notice(t, 'create depjsonfile'));
                fs.writeFile(depjsonfile, '{"list":["depjson1","depjson2"]}\n', function (err4) {
                    var parser, args;
                    t.equal(err4, null, get_notice(t, util.format('write depjsonfile (%s)', depjsonfile)));
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
                    fs.unlink(depjsonfile, function (err5) {
                        t.equal(err5, null, get_notice(t, util.format('delete depjsonfile(%s)', depjsonfile)));
                        fs.unlink(jsonfile, function (err6) {
                            t.equal(err6, null, get_notice(t, util.format('delete jsonfile(%s)', jsonfile)));
                            t.end();
                        });
                    });

                });
            });
        });
    });
});

test('A015', function (t) {
    'use strict';
    var commandline = `{"verbose|v" : "+","$port|p" : {"value" : 3000,"type" : "int","nargs" : 1 , "helpinfo" : "port to connect"},"dep" : {"list|l" : [],"string|s" : "s_var","$" : "+"}}`;
    setup_before(t);
    mktemp.createFile('parseXXXXXX.json', function (err, jsonfile) {
        t.equal(err, null, get_notice(t, 'create jsonfile'));
        fs.writeFile(jsonfile, '{"dep":{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"},"port":6000,"verbose":3}\n', function (err2) {
            t.equal(err2, null, get_notice(t, util.format('write jsonfile (%s)', jsonfile)));
            mktemp.createFile('parseXXXXXX.json', function (err3, depjsonfile) {
                t.equal(err3, null, get_notice(t, 'create depjsonfile'));
                fs.writeFile(depjsonfile, '{"list":["depjson1","depjson2"]}\n', function (err3) {
                    var parser, args;
                    t.equal(err3, null, get_notice(t, util.format('write depjsonfile(%s)', depjsonfile)));
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
                    fs.unlink(depjsonfile, function (err4) {
                        t.equal(err4, null, get_notice(t, util.format('delete depjsonfile (%s)', depjsonfile)));
                        fs.unlink(jsonfile, function (err5) {
                            t.equal(err5, null, get_notice(t, util.format('delete jsonfile (%s)', jsonfile)));
                            t.end();
                        });
                    });

                });
            });
        });
    });
});

test('A016', function (t) {
    'use strict';
    var commandline = `{"verbose|v" : "+","$port|p" : {"value" : 3000,"type" : "int","nargs" : 1 ,"helpinfo" : "port to connect"},"dep" : {"list|l" : [],"string|s" : "s_var","$" : "+"}}`;
    setup_before(t);
    mktemp.createFile('parseXXXXXX.json', function (err, jsonfile) {
        t.equal(err, null, get_notice(t, 'create jsonfile'));
        fs.writeFile(jsonfile, '{"dep":{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"},"port":6000,"verbose":3}\n', function (err2) {
            t.equal(err2, null, get_notice(t, util.format('write jsonfile(%s)', jsonfile)));
            mktemp.createFile('parseXXXXXX.jsonfile', function (err3, depjsonfile) {
                t.equal(err3, null, get_notice(t, 'create depjsonfile'));
                fs.writeFile(depjsonfile, '{"list":["depjson1","depjson2"]}\n', function (err4) {
                    var depstrval, depliststr, deplistval;
                    var parser, args;
                    t.equal(err4, null, get_notice(t, util.format('write depjsonfile(%s)', depjsonfile)));
                    depstrval = 'newval';
                    depliststr = '["depenv1","depenv2"]';
                    deplistval = eval(depliststr);
                    t.equal(err4, null, get_notice(t, util.format('write depjsonfile(%s)', depjsonfile)));
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
                    fs.unlink(depjsonfile, function (err5) {
                        t.equal(err5, null, get_notice(t, util.format('delete depjsonfile(%s)', depjsonfile)));
                        fs.unlink(jsonfile, function (err6) {
                            t.equal(err6, null, get_notice(t, util.format('delete jsonfile (%s)', jsonfile)));
                            t.end();
                        });
                    });

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
    mktemp.createFile('parseXXXXXX.jsonfile', function (err, jsonfile) {
        t.equal(err, null, get_notice(t, 'create jsonfile'));
        fs.writeFile(jsonfile, '{"dep":{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"},"port":6000,"verbose":3}\n', function (err2) {
            t.equal(err2, null, get_notice(t, util.format('write jsonfile(%s)', jsonfile)));
            mktemp.createFile('parseXXXXXX.json', function (err3, depjsonfile) {
                t.equal(err3, null, get_notice(t, 'create depjsonfile'));
                fs.writeFile(depjsonfile, '{"list":["depjson1","depjson2"]}\n', function (err4) {
                    var depstrval, depliststr;
                    var opt, parser, args;
                    depstrval = 'newval';
                    depliststr = '["depenv1","depenv2"]';
                    t.equal(err4, null, get_notice(t, util.format('write depjsonfile (%s)', depjsonfile)));
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
                    fs.unlink(jsonfile, function (err5) {
                        t.equal(err5, null, get_notice(t, util.format('delete jsonfile(%s)', jsonfile)));
                        fs.unlink(depjsonfile, function (err6) {
                            t.equal(err6, null, get_notice(t, util.format('delete depjsonfile(%s)', depjsonfile)));
                            t.end();
                        });
                    });
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