var extargsparse = require('../');
var commandline = `
{
    "verbose|v" : "+",
    "+http" : {
        "port|p" : 3000,
        "visual_mode|V" : false
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
    console.log('visual_mode = %s', args.http_visual_mode);
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
parser.parse_command_line(['-vvvv', '-p', '5000', '--http-visual-mode', 'dep', '-l', 'arg1', '--dep-list', 'arg2', 'cc', 'dd']);