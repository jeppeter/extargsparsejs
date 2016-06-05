# extargsparse 
> _a extensible json directive command line libraries_

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