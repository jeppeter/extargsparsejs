var extargsparse = require('../');
var util = require('util');

var commandline = `
  {
    "verbose|v" : "+",
    "pair|p!optparse=pair_parse;opthelp=pair_help!" : [],
    "even|e!jsonfunc=single_2_jsonfunc!" : [],
    "clr_CA_name" : null,
    "$" : "*"
  }
`;

var pair_parse = function (args, validx, keycls, params) {
    'use strict';
    var val;
    if ((validx + 1) >= params.length) {
        throw new Error(util.format('need 2 args for [++pair|+p]'));
    }
    val = args[keycls.optdest];
    if (val === undefined || val === null) {
        val = [];
    }
    val.push(params[validx]);
    val.push(params[(validx + 1)]);
    args[keycls.optdest] = val;
    return 2;
};
exports.pair_parse = pair_parse;

var pair_help = function (keycls) {
    'use strict';
    keycls = keycls;
    return '[first] [second]';
};

exports.pair_help = pair_help;

var single_2_jsonfunc = function (args, keycls, value) {
    'use strict';
    var setvalue;
    var idx;
    if (!Array.isArray(value)) {
        throw new Error(util.format('not list value'));
    }
    setvalue = [];
    idx = 0;
    while (idx < value.length) {
        setvalue.push(value[idx]);
        idx += 2;
    }
    args[keycls.optdest] = setvalue;
    return;
};

exports.single_2_jsonfunc = single_2_jsonfunc;

var options;
var parser;
var args;
options = extargsparse.ExtArgsOption();
options.longprefix = '++';
options.shortprefix = '+';
options.jsonlong = 'jsonfile';
options.helplong = 'usage';
options.helpshort = '?';
options.flagnochange = true;
parser = extargsparse.ExtArgsParse(options);
parser.load_command_line_string(commandline);
args = parser.parse_command_line();
console.log('verbose [%d]', args.verbose);
console.log('pair (%s)', args.pair);
console.log('args (%s)', args.args);
console.log('clr_CA_name (%s)', args.clr_CA_name);
console.log('event (%s)', args.even);