var extargsparse = require('../');
var fs = require('fs');
var mktemp = require('mktemp');

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


var write_file_callback = function (filetemp, filecon, callback) {
    'use strict';
    mktemp.createFile(filetemp, function (err, filename) {
        if (err !== undefined && err !== null) {
            throw err;
        }
        fs.writeFile(filename, filecon, function (err) {
            if (err !== undefined && err !== null) {
                throw err;
            }
            callback(filename);
        });
    });
};

var unlink_file_callback = function (filename, callback) {
    'use strict';
    fs.unlink(filename, function (err) {
        if (err !== undefined && err !== null) {
            throw err;
        }
        callback();
    });
};

var commandline = `
  {
    "verbose|v" : "+",
    "rollback|R" : true,
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
    "dep" : {
      "list|l" : [],
      "string|s" : "s_var",
      "$" : "+"
    }
  }
`;

setup_before();
write_file_callback('parseXXXXXX.json', '{ "http" : { "url" : "http://www.yahoo.com"} ,"dep":{"list" : ["jsonval1","jsonval2"],"string" : "jsonstring"},"port":6000,"verbose":3}\n', function (jsonfile) {
    'use strict';
    write_file_callback('parseXXXXXX.json', '{"list":["depjson1","depjson2"]}\n', function (depjsonfile) {
        var parser;
        var options;
        var depstrval;
        var depliststr;
        var httpvmstr;
        var args;
        depstrval = 'newval';
        depliststr = '["depenv1","depenv2"]';
        httpvmstr = "true";
        renew_variable('EXTARGSPARSE_JSON', jsonfile);
        renew_variable('DEP_JSON', depjsonfile);
        options = extargsparse.ExtArgsOption();
        options.priority = [extargsparse.ENV_COMMAND_JSON_SET, extargsparse.ENVIRONMENT_SET, extargsparse.ENV_SUB_COMMAND_JSON_SET];
        parser = extargsparse.ExtArgsParse(options);
        parser.load_command_line_string(commandline);
        renew_variable('DEP_STRING', depstrval);
        renew_variable('DEP_LIST', depliststr);
        renew_variable('HTTP_VISUAL_MODE', httpvmstr);
        args = parser.parse_command_line(['-p', '9000', '--no-rollback', 'dep', '--dep-string', 'ee', 'ww']);
        console.log('args.verbose %d', args.verbose);
        console.log('args.port %d', args.port);
        console.log('args.dep_list %s', args.dep_list);
        console.log('args.dep_string %s', args.dep_string);
        console.log('args.http_visual_mode %s', args.http_visual_mode);
        console.log('args.http_url %s', args.http_url);
        console.log('args.subcommand %s', args.subcommand);
        console.log('args.subnargs %s', args.subnargs);
        unlink_file_callback(jsonfile, function () {
            unlink_file_callback(depjsonfile, function () {
                process.exit(0);
            });
        });
    });
});