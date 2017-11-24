var extargsparse = require('../');
var util = require('util');

var load_s_1 = function (parser) {
    'use strict';
    var load1 = `
    {
      "verbose|v" : "+",
      "port|p" : 3000,
      "dep" : {
        "list|l" : [],
        "string|s" : "s_var",
        "$" : "+"
      }
    }
`;
    parser.load_command_line_string(load1);
    return parser;
};

var load_s_2 = function (parser) {
    'use strict';
    var load2 = `
    {
      "rdep" : {
        "list|L" : [],
        "string|S" : "s_rdep",
        "$" : 2
      }
    }
`;
    parser.load_command_line_string(load2);
    return parser;
};

var debug_cmd_opts = function (parser, name) {
    'use strict';
    var opts;
    var opt;
    var idx;
    var subcmds;
    if (name === undefined || name === null) {
        name = '';
    }
    opts = parser.get_cmdopts(name);
    if (opts !== null) {
        for (idx = 0; idx < opts.length; idx += 1) {
            opt = opts[idx];
            if (opt.typename !== 'args') {
                console.log('[%s] opt %s', name, opt.longopt);
            }
        }
    }
    subcmds = parser.get_subcommands(name);
    if (subcmds !== null) {
        console.log('[%s] subcmds %s', name, subcmds);
    }
    return subcmds;
};
var debug_total;

var debug_total_c = function (parser, name) {
    'use strict';
    var subcmds;
    if (name === undefined || name === null) {
        name = '';
    }
    subcmds = debug_cmd_opts(parser, name);
    if (subcmds !== null && subcmds.length > 0) {
        var idx;
        var c;
        var cname;
        for (idx = 0; idx < subcmds.length; idx += 1) {
            c = subcmds[idx];
            cname = '';
            cname += util.format('%s', name);
            if (cname.length > 0) {
                cname += '.';
            }
            cname += c;
            debug_total(parser, cname);
        }
    }
    return;
};

debug_total = debug_total_c;

var parser;
parser = extargsparse.ExtArgsParse();
parser = load_s_1(parser);
parser = load_s_2(parser);
debug_total(parser);