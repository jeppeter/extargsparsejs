# extargsparse 
> _a extensible json directive command line libraries_

### Release History
* Nov 24th 2017 Release 1.0.0 

### a simple example

```js
var extargsparse  = require('extargsparse');
var parser,args;
var commandline=`
{
    "verbose|v##increment verbose mode##" : "+",
    "flag|f## flag set##" : false,
    "number|n" : 0,
    "list|l" : [],
    "string|s" : "string_var",
    "$" : "*"
}
`
parser = extargsparse.ExtArgsParse();
parser.load_command_line_string(commandline);
args = parser.parse_command_line();
console.log('args.verbose %d',args.verbose);
console.log('args.flag %s',args.flag);
console.log('args.number %d',args.number);
console.log('args.list %s',args.list);
console.log('args.string %s',args.string);
console.log('args.args %s',args.args);
```
> if you run the command in node simple.js  -vvvv -f -n 30 -l bar1 -l bar2 var1 var2

result
```shell
args.verbose 4
args.flag true
args.number 30
args.list ['bar1','bar2']
args.string string_var
args.args ['var1','var2']
```

### some complex example

```js
var extargsparse  = require('extargsparse');
var parser,args;
var commandline=`
{
    "verbose|v" : "+",
    "port|p" : 3000,
    "dep" : {
        "list|l" : [],
        "string|s" : "s_var",
        "$" : "+"
    }
}
`
parser = extargsparse.ExtArgsParse();
parser.load_command_line_string(commandline);
args = parser.parse_command_line(['-vvvv','-p','5000','dep','-l','arg1','--dep-list','arg2','cc','dd']);
console.log('args.verbose %d',args.verbose);
console.log('args.port %d',args.port);
console.log('args.subcommand %s',args.subcommand);
console.log('args.dep_list %s',args.dep_list);
console.log('args.dep_string %s',args.dep_string);
console.log('args.subnargs %s',args.subnargs);
```

> result is 
```shell
args.verbose  4
args.port 5000
args.subcommand dep
args.dep_list ['arg1','arg2']
args.subnargs ['cc','dd']
```
# multiple subcommand example

```js
var extargsparse  = require('extargsparse');
var parser,args;
var commandline=`
{
    "verbose|v" : "+",
    "port|p" : 3000,
    "dep" : {
        "list|l" : [],
        "string|s" : "s_var",
        "$" : "+"
    },
    "rdep" : {
       "list|L" : [],
       "string|S" : "s_rdep",
       "$" : 2
     }
}
`
parser = extargsparse.ExtArgsParse();
parser.load_command_line_string(commandline);
args = parser.parse_command_line(['-vvvv','-p','5000','rdep','-L','arg1','--rdep-list','arg2','cc','dd']);
console.log('args.verbose %d',args.verbose);
console.log('args.port %d',args.port);
console.log('args.subcommand %s',args.subcommand);
console.log('args.rdep_list %s',args.rdep_list);
console.log('args.rdep_string %s',args.rdep_string);
console.log('args.subnargs %s',args.subnargs);
```

> result is 

```shell
args.verbose 4
args.port 5000
args.subcommand rdep
args.rdep_list ['arg1','arg2']
args.rdep_string s_rdep
args.subnargs ['cc','dd']
```

# use multiple load command string

```js
var extargsparse  = require('extargsparse');
var parser,args;
var command1=`
    {
      "verbose|v" : "+",
      "port|p" : 3000,
      "dep" : {
        "list|l" : [],
        "string|s" : "s_var",
        "$" : "+"
      }
    }
`
var command2=`
    {
      "rdep" : {
        "list|L" : [],
        "string|S" : "s_rdep",
        "$" : 2
      }
    }
`

parser = extargsparse.ExtArgsParse();
parser.load_command_line_string(command1);
parser.load_command_line_string(command2);
args = parser.parse_command_line(['-p','7003','-vvvvv','rdep','-L','foo1','-S','new_var','zz','64']);
console.log('args.verbose %d',args.verbose);
console.log('args.port %d',args.port);
console.log('args.subcommand %s',args.subcommand);
console.log('args.rdep_list %s',args.rdep_list);
console.log('args.rdep_string %s',args.rdep_string);
console.log('args.subnargs %s',args.subnargs);
```
> result is

```shell
args.verbose 5
args.port 7003
args.subcommand rdep
args.rdep_list ['foo1']
args.rdep_string new_var
args.subnargs ['zz','64']
```

### callback handle function example
```js
var extargsparse = require('extargsparse');

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
```

> call shell
```shell
node callhdl.js
```

> output
```shell
verbose = 4
port = 5000
subcommand = dep
list = arg1,arg2
string = s_var
subnargs = cc,dd
context["base"] = basenum
```

### with extension flag example

```js
var extargsparse = require('extargsparse');

var commandline = `
{
    "verbose|v" : "+",
    "port|p+http" : 3000,
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
```
> run command
```shell
node extension.js
```

> output
```shell
verbose = 4
port = 5000
subcommand = dep
list = arg1,arg2
string = s_var
subnargs = cc,dd
```

### with extension flag bundle example
```js
var extargsparse = require('extargsparse');
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
```

> run command
```shell
node extensionbundle.js
```

> output
```js
verbose = 4
port = 5000
visual_mode = true
subcommand = dep
list = arg1,arg2
string = s_var
subnargs = cc,dd
```

### with complex flag set

```js
var extargsparse = require('extargsparse');
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
```

> run command
```shell
node complexflag.js
```

> output
```shell
verbose = 4
port = undefined
subcommand = dep
list = arg1,arg2
string = s_var
subnargs = cc,dd
```

### extension for help and long opt
```js
var extargsparse = require('extargsparse');
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
```

> run help
```shell
node opthandle.js +?
```

> output
```shell
extopthelp.js  [OPTIONS] [args...]

[OPTIONS]
    ++jsonfile     jsonfile     json input file to get the value set
    ++usage|+?                  to display this help information
    ++verbose|+v   verbose      verbose inc
    ++pair|+p      pair         [first] [second]
    ++even|+e      even         even set default()
    ++clr_CA_name  clr_CA_name  clr_CA_name set default(null)

```


> cc.json file
```json
{
    "even": ["good", "bad"]
}
```

```shell
node opthandle.js ++jsonfile cc.json ++pair cc ss rr +vvvv
```

> output
```shell
verbose [4]
pair (cc,ss)
args (rr)
clr_CA_name (null)
event (good)
```

###  extension attribute 

* opthelp 
 **   help format information string format like pair_help(keycls) keycls is the parse object to handle ,it can be 

* optparse
 **   parse function for opt 
     like
     def parse_opt(args,validx,keycls,params):
   *** args is the return value from the parse_command_line
       validx is the value index in the params
       keycls is the option object you can use optdest for the destination
       params is the command line all in
* jsonfunc
  ** json value set function for opt
     like
     def json_opt(args,keycls,value):
  ** args is the return value from the parse_command_line
     keycls is the options object you can use optdest for destination
     value is the value of json

### extension get example

```js
var extargsparse = require('extargsparse');
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
```     

> cmd
```shell
node extget.js
```

> output
```shell
[] opt --help
[] opt --json
[] opt --port
[] opt --verbose
[] subcmds dep,rdep
[dep] opt --dep-json
[dep] opt --dep-list
[dep] opt --dep-string
[dep] opt --help
[dep] subcmds
[rdep] opt --help
[rdep] opt --rdep-json
[rdep] opt --rdep-list
[rdep] opt --rdep-string
[rdep] subcmds
```
### no default help and no json to specify
> if you want no help or json to in the options ,just use option with 
> nohelpoption or nojsonoption

### no cmd with prefix 
> if you want no command prefix to add in the command ,please use option with
> cmdprefixadded = False give example

### flagnochange 
> if you set this true,
> it will not change the _ to - in the flag mode

```js
var extargsparse = require('extargsparse');

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
```

> command
```shell
node nojson.js rdep -h
```

> output
```shell
nojson.js  rdep [OPTIONS] args...
[OPTIONS]
    --help|-h            to display this help information
    --list|-l    list    list set default()
    --string|-s  string  string set default(s_rdep)
```

> command
```shell
node nojson.js rdep --list cc --list bb 222
```

> output
```shell
verbose [0]
subcommand [rdep]
list [cc,bb]
string [s_dep]
subnargs [222]
```

* all key is with value of dict will be flag
 **   like this 'flag|f' : true
     --flag or -f will set the False value for this ,default value is True
 **  like 'list|l' : [] 
     --list or -l will append to the flag value ,default is []

* if value is dict, the key is not start with special char ,it will be the sub command name 
  ** for example 'get' : {
       'connect|c' : 'http://www.google.com',
       'newone|N' : false
  } this will give the sub command with two flag (--get-connect or -c ) and ( --get-newone or -N ) default value is 'http://www.google.com' and False

* if value is dict , the key start with '$' it means the flag description dict 
  ** for example '$verbose|v' : {
    'value' : 0,
    'type' : '+',
    'nargs' : 0,
    'help' : 'verbose increment'
  }   it means --verbose or -v will be increment and default value 0 and need args is 0  help (verbose increment)

* if the value is dict ,the key start with '+' it means add more bundles of flags
  **  for example   '+http' : {
    'port|p' : 3000,
    'visual_mode|V' : false
  } --http-port or -p  and --http-visual-mode or -V will set the flags ,short form it will not affected

* if in flagmode , follows <.*> it will be set for shell output value
  ** for example '$verbose|v<verbosemode>' : '+'
    this will add change varname from verbose to verbosemode

* if the subcommand follows <.*> it will call function 
  **  for example   'dep<__main__.dep_handler>' : {
    'list|l' : [],
    'string|s' : 's_var',
    '$' : '+'
  }  the dep_handler will call __main__ it is the main package ,other packages will make the name of it ,and the 
     args is the only one add
)

* special flag '$' is for args in main command '$' for subnargs in sub command


* !*! the things between ! will be extended attribute for more use


* special flag --json for parsing args in json file in main command
* special flag '--%s-json'%(args.subcommand) for  subcommand for example
   ** --dep-json dep.json will set the json command for dep sub command ,and it will give the all omit the command
   for example  "dep<__main__.dep_handler>" : {
    "list|l" : [],
    "string|s" : "s_var",
    "$" : "+"
  }  
    in dep.json
    {
      "list" : ["jsonval1","jsonval2"],
      "string" : "jsonstring"
    }

*  you can specify the main command line to handle the json for example
   {
     "dep" : {
      "string" : "jsonstring",
      "list" : ["jsonlist1","jsonlist2"]
     },
     "port" : 6000,
     "verbose" : 4
   }

* you can specify the json file by environment value for main file json file the value is
   **EXTARGSPARSE_JSONFILE
      for subcommand json file is
      DEP_JSONFILE  DEP is the subcommand name uppercase

   ** by the environment variable can be set for main command
      EXTARGSPARSE_PORT  is for the main command -p|--port etc
      for sub command is for DEP_LIST for dep command --list


* note the priority of command line is  this can be change or omit by the extargsparse.ExtArgsParse(priority=[])
   **   command input 
   **   subcommand json file input extargsparse.SUB_COMMAND_JSON_SET
   **   command json file input extargsparse.COMMAND_JSON_SET
   **   environment variable input _if the common args not with any _ in the flag dest ,it will start with EXTARGS_  extargsparse.ENVIRONMENT_SET
   **   environment subcommand json file input extargsparse.ENV_SUB_COMMAND_JSON_SET
   **   environment json file input  extargsparse.ENV_COMMAND_JSON_SET
   **   default value input by the load string


* flag option key
   **  flagname the flagname of the value
   **  shortflag flag set for the short
   **  value  the default value of flag
   **  nargs it accept args "*" for any "?" 1 or 0 "+" equal or more than 1 , number is the number
   **  helpinfo for the help information

* flag format description
   **  if the key is flag it must with format like this 
           [$]?flagname|shortflag+prefix##helpinfo##
        $ is flag start character ,it must be the first character
        flagname name of the flag it is required
        shortflag is just after flagname with |,it is optional
        prefix is just after shortflag with + ,it is optional
        helpinfo is just after prefix with ## and end with ## ,it is optional ,and it must be last part

* command format description
  ** if the key is command ,it must with format like this
           cmdname<function>##helpinfo##
        cmdname is the command name
        function is just after cmdname ,it can be the optional ,it will be the call function name ,it include the packagename like '__main__.call_handler'
        helpinfo is just after function ,it between ## ## it is optional

* enable debug 
  ** you can specified the environment value EXTARGSPARSE_LOGLEVELV=DEBUG to enable the debug of extargsparse

* ExtArgsParse() input options now supported
  ** prog  program name default sys.argv[0]
  ** usage usage in the help first line
  ** description description for the command line handle
  ** epilog  post for help information
  ** version version number for current program
  ** errorhandler error handler default 'exit' other can be 'raise'
  ** helphandler default is None ,can be 'nohelp'

# Most Complex Example

```js
var extargsparse = require('extargsparse');
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
```

> result
```shell
args.verbose 3
args.port 9000
args.dep_list jsonval1,jsonval2
args.dep_string ee
args.http_visual_mode true
args.http_url http://www.yahoo.com
args.subcommand dep
args.subnargs ww
```
### extension mode see example see[extension get example](#extension-get-example)
> this is for use when other will use


# Rule
### init function extargsparse.ExtArgsParse(opt)
  *  options just have a priority if not set for the value set after command line parse value can be
    
      **  extargsparse.SUB_COMMAND_JSON_SET  get the sub command json in command line 
             For example ,if the subcommand is dep  . the --dep-json in the command will parse

      **  extargsparse.COMMAND_JSON_SET get the total json in command line
             it is in the --json in command

      **  extargsparse.ENVIRONMENT_SET  set the value from environment value
             every dest not with '_' will add  EXTARGS\_
             For example if verbose flag will be set EXTARGS_VERBOSE in environment and http_port flag will be set HTTP_PORT

      **  extargsparse.ENV_SUB_COMMAND_JSON_SET json file in subcommand as in    environment variable 
             For example subcommand is dep the environment variable for json file DEP_JSON and it will open the file and read the json value

      **  extargsparse.ENV_COMMAND_JSON_SET  json file in command as in environment variable it is EXTARGSPARSE_JSON

###  json file format
     **   --json 
```json     
     {
        "verbose" : 3,
        "http" : {
                "port" : 9000,
                "user" : "user1",
                "enable" : true
        }
     }
```
            it will set verbose http_port http_user http_enable value

      **  --http-json
```json
     {
         "port" : 3000,
         "user" : "user3",
         "enable" : false
     }
```
            it will set http_port http_user http_enable ,it will start every variable with http_  

### load_command_line_string
    **   this is the json format string 
    **   two mode are different ,command mode ,flag mode
    **   command mode ,key can be format like this "cmdname<cmdfunc>## cmd help ##"
          cmdname is the command name 
          cmdfunc is the call back function when command called ,it must be exported by the js file
          cmd help  is the help information to set
         value must be object 

     **   flag mode , key can be format like this "flagname|shortflag+flagprefix##flaghelp##"
           flagname is the flag name it must be more than 1 byte
           shortflag is short letter for flag it must be 1 byte
           flagprefix is prefix before flag 
           flaghelp is the flag help information

           value can be float ,int ,string ,array
           value is object has special case ,it only accept keywords
           ***  value   specify default value
           ***  nargs   it should not set
           ***  helpinfo information to display help  

     **   special flag '$'  it means for unhandle args ,it store in args.args in no subcommand set and subnargs in subcommand set
           it can be format like 
           '$' : '+'  means the args can accept 1 to n arguments
           '$' : '?'  means the args can accept 0 or 1 argument
           '$' : '*'  means the args can accept 0 to n arguments
           '$' : 3    number to set ,means the args can accept 3 arguments 
           
     **   every flag in subcommand will add subcommand prefix before it in optdest
           For example
```json
           {
              "dep" : {
                "port" : 999,
                "enable" : false
              }
           } 
```
           the flag is dep_port and dep_enable

### extargsparse.parse_command_line(arglist,context)
      **  arglist is the parse command line ,it can be null or undefined ,will use process.argv[2:]
      ** context is the subcommand call function call this variable see later example

### give total example

```js
var extargsparse = require('extargsparse');
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
```

> result
```shell
args.verbose 3
args.port 9000
args.dep_list jsonval1,jsonval2
args.dep_string ee
args.http_visual_mode true
args.http_url http://www.yahoo.com
args.subcommand dep
args.subnargs ww
context.typename extargsparse.ExtArgsParse
```