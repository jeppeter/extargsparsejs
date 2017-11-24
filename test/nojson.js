var extargsparse = require('../');

var commandline = `
  {
    "verbose|v" : "+",
    "dep" : {
      "list|l" : [],
      "string|s" : "s_dep",
      "$" : "*"
    },
    "rdep" : {
      "list|l" : [],
      "string|s" : "s_rdep",
      "$" : "+"
    }
  }
`;
var optstr = `
  {
    "nojsonoption" : true,
    "cmdprefixadded" : false
  }
`;
var options;
options = extargsparse.ExtArgsOption(optstr);
var parser;
parser = extargsparse.ExtArgsParse(options);
parser.load_command_line_string(commandline);
var args;
args = parser.parse_command_line();
console.log('verbose [%d]', args.verbose);
console.log('subcommand [%s]', args.subcommand);
console.log('list [%s]', args.list);
console.log('string [%s]', args.string);
console.log('subnargs [%s]', args.subnargs);