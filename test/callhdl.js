var extargsparse = require('../');

var commandline = `
{
    "verbose|v" : "+",
    "port|p" : 3000,
    "dep<dep_handler>" : {
        "list|l" : [],
        "string|s" : "s_var",
        "$" : "+"
    }
}
`;

var dep_handler = function (args) {
    'use strict';
    var context = this;
    console.log('verbose = %d', args.verbose);
    console.log('port = %s', args.port);
    console.log('subcommand = %s', args.subcommand);
    console.log('list = %s', args.dep_list);
    console.log('string = %s', args.dep_string);
    console.log('subnargs = %s', args.subnargs);
    console.log('context["base"] = %s', context.base);
    process.exit(0);
    return;
};

exports.dep_handler = dep_handler;
var newContext = {};
var options;
var parser;
newContext.base = 'basenum';
options = extargsparse.ExtArgsOption();
parser = extargsparse.ExtArgsParse(options);
parser.load_command_line_string(commandline);
parser.parse_command_line(['-vvvv', '-p', '5000', 'dep', '-l', 'arg1', '-l', 'arg2', 'cc', 'dd'], newContext);