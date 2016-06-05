var extargsparse = require('../');
var mktemp = require('mktemp');
var fs = require('fs');

var dep_handler = function (args) {
    'use strict';
    var context = this;
    console.log('args.verbose %d', args.verbose);
    console.log('args.port %d', args.port);
    console.log('args.dep_list %s', args.dep_list);
    console.log('args.dep_string %s', args.dep_string);
    console.log('args.http_visual_mode %s', args.http_visual_mode);
    console.log('args.http_url %s', args.http_url);
    console.log('args.subcommand %s', args.subcommand);
    console.log('args.subnargs %s', args.subnargs);
    console.log('context.typename %s', context.typename);
    process.exit(0);
    return;
};

var delete_variable = function (name) {
    'use strict';
    if (process.env[name] !== undefined) {
        delete process.env[name];
    }
    return;
};

var setup_before = function () {
    'use strict';
    var keys;
    var i;
    var depreg, extargsreg, jsonreg;
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

var renew_variable = function (name, value) {
    'use strict';
    if (process.env[name] !== undefined) {
        delete process.env[name];
    }

    process.env[name] = value;
    return;
};


exports.dep_handler = dep_handler;

var commandline = ` {
        "verbose|v" : "+",
        "+http" : {
            "url|u" : "http://www.google.com",
            "visual_mode|V": false
        },
        "$port|p" : {
            "value" : 3000,
            "type" : "int",
            "nargs" : 1 ,
            "helpinfo" : "port to connect"
        },
        "dep<dep_handler>" : {
            "list|l" : [],
            "string|s" : "s_var",
            "$" : "+"
        }
    }
`;
var depjsonfile, jsonfile;
var depstrval, depliststr;
var httpvmstr;
var parser, opt;

httpvmstr = 'true';
depstrval = 'newval';
depliststr = '["depenv1","depenv2"]';
depjsonfile = mktemp.createFileSync('parseXXXXXX.json');
fs.writeFileSync(depjsonfile, '{"list":["depjson1","depjson2"]}\n');
jsonfile = mktemp.createFileSync('parseXXXXXX.json');
fs.writeFileSync(jsonfile, '{ "http" : { "url" : "http://www.yahoo.com"} ,"dep":{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"},"port":6000,"verbose":3}\n');
setup_before();
renew_variable('DEP_JSON', depjsonfile);
renew_variable('EXTARGSPARSE_JSON', jsonfile);
renew_variable('DEP_STRING', depstrval);
renew_variable('DEP_LIST', depliststr);
renew_variable('HTTP_VISUAL_MODE', httpvmstr);
opt = {};
opt.priority = [extargsparse.ENV_COMMAND_JSON_SET, extargsparse.ENVIRONMENT_SET, extargsparse.ENV_SUB_COMMAND_JSON_SET];
parser = extargsparse.ExtArgsParse(opt);
parser.load_command_line_string(commandline);
parser.typename = 'extargsparse.ExtArgsParse';
parser.parse_command_line(['-p', '9000', 'dep', '--dep-string', 'ee', 'ww'], parser);
console.error('can not be here');
process.exit(3);