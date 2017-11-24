var extargsparse = require('../');
var commandline = `
{
    "verbose|v" : "+",
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

var dep_handler = function (args) {
    'use strict';
    console.log('verbose = %d', args.verbose);
    console.log('port = %s', args.http_port);
    console.log('subcommand = %s', args.subcommand);
    console.log('list = %s', args.dep_list);
    console.log('string = %s', args.dep_string);
    console.log('subnargs = %s', args.subnargs);
    process.exit(0);
    return;
};

exports.dep_handler = dep_handler;
var options;
var parser;
options = extargsparse.ExtArgsOption();
options.usage = ' sample commandline parser ';
parser = extargsparse.ExtArgsParse(options);
parser.load_command_line_string(commandline);
parser.parse_command_line(['-vvvv', '-p', '5000', 'dep', '-l', 'arg1', '-l', 'arg2', 'cc', 'dd']);