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

var environ_key_set = function (keyname) {
    'use strict';
    if (process.env[keyname] === undefined || process.env[keyname] === null) {
        return false;
    }
    return true;
};

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
    exprstr = util.format('^\\s+%s', opt.longopt);
    if (opt.shortopt !== null) {
        exprstr += util.format('|%s', opt.shortopt);
    }
    exprstr += '\\s+';
    if (opt.nargs !== 0) {
        exprstr += util.format('%s', opt.optdest);
    }
    exprstr += '.*';
    return assert_string_expr(lines, exprstr);
};

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