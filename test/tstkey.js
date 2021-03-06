var test = require('tape');
var keyparse = require('../keyparse');
var util = require('util');

var get_notice = function (t, name) {
    'use strict';
    return util.format('%s %s', t.name, name);
};


var opt_fail_check = function (t, keycls) {
    'use strict';
    var val;
    var ok;
    var err;

    ok = false;
    try {
        val = keycls.longopt;
        val = val;
    } catch (e) {
        err = e;
        ok = true;
    }
    t.assert(ok, get_notice(t, 'longopt'));

    ok = false;
    try {
        val = keycls.shortopt;
    } catch (e2) {
        err = e2;
        ok = true;
    }

    t.assert(ok, get_notice(t, 'shortopt'));

    ok = false;
    try {
        val = keycls.optdest;
    } catch (e3) {
        err = e3;
        ok = true;
    }
    err = err;
    t.assert(ok, get_notice(t, 'optdest'));
    return t;
};



test('A001', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('', '$flag|f+type', 'string', false);
    t.equal(keycls.flagname, 'flag', get_notice(t, 'flag'));
    t.equal(keycls.longopt, '--type-flag', get_notice(t, 'longopt'));
    t.equal(keycls.shortopt, '-f', get_notice(t, 'shortopt'));
    t.equal(keycls.optdest, 'type_flag', get_notice(t, 'optdest'));
    t.equal(keycls.value, 'string', get_notice(t, 'value'));
    t.equal(keycls.typename, 'string', get_notice(t, 'typename'));
    t.equal(keycls.shortflag, 'f', get_notice(t, 'shortflag'));
    t.equal(keycls.prefix, 'type', get_notice(t, 'prefix'));
    t.end();
});

test('A002', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('', '$flag|f+type', [], true);
    t.equal(keycls.flagname, 'flag', get_notice(t, 'flagname'));
    t.equal(keycls.shortflag, 'f', get_notice(t, 'shortflag'));
    t.equal(keycls.prefix, 'type', get_notice(t, 'prefix'));
    t.equal(keycls.longopt, '--type-flag', get_notice(t, 'longopt'));
    t.equal(keycls.shortopt, '-f', get_notice(t, 'shortopt'));
    t.equal(keycls.optdest, 'type_flag', get_notice(t, 'optdest'));
    t.deepEqual(keycls.value, [], get_notice(t, 'value'));
    t.equal(keycls.typename, 'array', get_notice(t, 'typename'));
    t.equal(keycls.helpinfo, null, get_notice(t, 'helpinfo'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.isflag, true, get_notice(t, 'isflag'));
    t.equal(keycls.iscmd, false, get_notice(t, 'iscmd'));
    t.end();
});

test('A003', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('', 'flag|f', false, false);
    t.equal(keycls.flagname, 'flag', get_notice(t, 'flagname'));
    t.equal(keycls.shortflag, 'f', get_notice(t, 'shortflag'));
    t.equal(keycls.longopt, '--flag', get_notice(t, 'longopt'));
    t.equal(keycls.shortopt, '-f', get_notice(t, 'shortopt'));
    t.equal(keycls.optdest, 'flag', get_notice(t, 'optdest'));
    t.equal(keycls.value, false, get_notice(t, 'value'));
    t.equal(keycls.typename, 'boolean', get_notice(t, 'typename'));
    t.equal(keycls.prefix, '', get_notice(t, 'prefix'));
    t.equal(keycls.helpinfo, null, get_notice(t, 'helpinfo'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.isflag, true, get_notice(t, 'isflag'));
    t.equal(keycls.iscmd, false, get_notice(t, 'iscmd'));
    t.end();
});

test('A004', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('newtype', 'flag<flag.main>##help for flag##', {}, false);
    t.equal(keycls.cmdname, 'flag', get_notice(t, 'cmdname'));
    t.equal(keycls.function, 'flag.main', get_notice(t, 'function'));
    t.equal(keycls.typename, 'command', get_notice(t, 'typename'));
    t.equal(keycls.prefix, 'newtype', get_notice(t, 'prefix'));
    t.equal(keycls.helpinfo, 'help for flag', get_notice(t, 'helpinfo'));
    t.equal(keycls.flagname, null, get_notice(t, 'flagname'));
    t.equal(keycls.shortflag, null, get_notice(t, 'shortflag'));
    t.deepEqual(keycls.value, {}, get_notice(t, 'value'));
    t.equal(keycls.iscmd, true, get_notice(t, 'iscmd'));
    t.equal(keycls.isflag, false, get_notice(t, 'isflag'));
    opt_fail_check(t, keycls);
    t.end();
});

test('A005', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('', 'flag<flag.main>##help for flag##', '', true);
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.typename, 'string', get_notice(t, 'typename'));
    t.equal(keycls.prefix, '', get_notice(t, 'prefix'));
    t.equal(keycls.flagname, 'flag', get_notice(t, 'flagname'));
    t.equal(keycls.helpinfo, 'help for flag', get_notice(t, 'helpinfo'));
    t.equal(keycls.shortflag, null, get_notice(t, 'shortflag'));
    t.equal(keycls.value, '', get_notice(t, 'value'));
    t.equal(keycls.isflag, true, get_notice(t, 'isflag'));
    t.equal(keycls.iscmd, false, get_notice(t, 'iscmd'));
    t.equal(keycls.longopt, '--flag', get_notice(t, 'longopt'));
    t.equal(keycls.shortopt, null, get_notice(t, 'shortopt'));
    t.equal(keycls.optdest, 'flag', get_notice(t, 'optdest'));
    t.equal(keycls.varname, 'flag.main', get_notice(t, 'varname'));
    t.end();
});

test('A006', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('', 'flag+type<flag.main>##main', {
        new: false
    }, false);
    t.equal(keycls.cmdname, 'flag', get_notice(t, 'cmdname'));
    t.equal(keycls.prefix, 'type', get_notice(t, 'prefix'));
    t.equal(keycls.function, 'flag.main', get_notice(t, 'function'));
    t.equal(keycls.helpinfo, null, get_notice(t, 'helpinfo'));
    t.equal(keycls.flagname, null, get_notice(t, 'flagname'));
    t.equal(keycls.shortflag, null, get_notice(t, 'shortflag'));
    t.equal(keycls.isflag, false, get_notice(t, 'isflag'));
    t.equal(keycls.iscmd, true, get_notice(t, 'iscmd'));
    t.equal(keycls.typename, 'command', get_notice(t, 'typename'));
    t.deepEqual(keycls.value, {
        new: false
    }, get_notice(t, 'value'));
    opt_fail_check(t, keycls);
    t.end();
});

test('A007', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('', '+flag', {}, false);
    t.equal(keycls.prefix, 'flag', get_notice(t, 'flag'));
    t.deepEqual(keycls.value, {}, get_notice(t, 'value'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.shortflag, null, get_notice(t, 'shortflag'));
    t.equal(keycls.flagname, null, get_notice(t, 'flagname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.helpinfo, null, get_notice(t, 'helpinfo'));
    t.equal(keycls.isflag, true, get_notice(t, 'isflag'));
    t.equal(keycls.iscmd, false, get_notice(t, 'iscmd'));
    t.equal(keycls.typename, 'prefix', get_notice(t, 'typename'));
    opt_fail_check(t, keycls);
    t.end();
});

test('A008', function (t) {
    'use strict';
    var ok = false;
    try {
        keyparse.KeyParser('', '+flag## help ##', null, false);
    } catch (e) {
        ok = e;
        ok = true;
    }
    t.equal(ok, true, get_notice(t, 'flag without helpinfo'));
    t.end();
});

test('A009', function (t) {
    'use strict';
    var ok = false;
    try {
        keyparse.KeyParser('', '+flag<flag.main>', null, false);
    } catch (e) {
        ok = e;
        ok = true;
    }
    t.equal(ok, true, get_notice(t, 'flag without function'));
    t.end();
});

test('A010', function (t) {
    'use strict';
    var ok = false;
    try {
        keyparse.KeyParser('', 'flag|f2', null, false);
    } catch (e) {
        ok = e;
        ok = true;
    }
    t.equal(ok, true, get_notice(t, 'flag shortflag must 1 special size'));
    t.end();
});

test('A011', function (t) {
    'use strict';
    var ok = false;
    try {
        keyparse.KeyParser('', 'f|f2', null, false);
    } catch (e) {
        ok = e;
        ok = true;
    }
    t.equal(ok, true, get_notice(t, 'flag flag must > 1 size'));
    t.end();
});

test('A012', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('', '$flag|f<flag.main>', {}, false);
    t.equal(keycls.prefix, '', get_notice(t, 'prefix'));
    t.equal(keycls.value, null, get_notice(t, 'value'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.shortflag, 'f', get_notice(t, 'shortflag'));
    t.equal(keycls.flagname, 'flag', get_notice(t, 'flagname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.helpinfo, null, get_notice(t, 'helpinfo'));
    t.equal(keycls.isflag, true, get_notice(t, 'isflag'));
    t.equal(keycls.iscmd, false, get_notice(t, 'iscmd'));
    t.equal(keycls.typename, 'string', get_notice(t, 'typename'));
    t.equal(keycls.varname, 'flag.main', get_notice(t, 'varname'));
    t.equal(keycls.longopt, '--flag', get_notice(t, 'longopt'));
    t.equal(keycls.shortopt, '-f', get_notice(t, 'shortopt'));
    t.equal(keycls.optdest, 'flag', get_notice(t, 'optdest'));
    t.end();
});

test('A013', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('', '$flag|f+cc<flag.main>', null, false);
    t.equal(keycls.prefix, 'cc', get_notice(t, 'prefix'));
    t.equal(keycls.value, null, get_notice(t, 'value'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.shortflag, 'f', get_notice(t, 'shortflag'));
    t.equal(keycls.flagname, 'flag', get_notice(t, 'flagname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.helpinfo, null, get_notice(t, 'helpinfo'));
    t.equal(keycls.isflag, true, get_notice(t, 'isflag'));
    t.equal(keycls.iscmd, false, get_notice(t, 'iscmd'));
    t.equal(keycls.typename, 'string', get_notice(t, 'typename'));
    t.equal(keycls.varname, 'flag.main', get_notice(t, 'varname'));
    t.equal(keycls.longopt, '--cc-flag', get_notice(t, 'longopt'));
    t.equal(keycls.shortopt, '-f', get_notice(t, 'shortopt'));
    t.equal(keycls.optdest, 'cc_flag', get_notice(t, 'optdest'));
    t.end();
});

test('A014', function (t) {
    'use strict';
    var ok = false;
    try {
        keyparse.KeyParser('', 'c$', '', false);
    } catch (e) {
        ok = e;
        ok = true;
    }
    t.equal(ok, true, get_notice(t, '$ must at lead'));
    t.end();
});

test('A015', function (t) {
    'use strict';
    var ok = false;
    try {
        keyparse.KeyParser('', '$$', '', false);
    } catch (e) {
        ok = e;
        ok = true;
    }
    t.equal(ok, true, get_notice(t, '$ can not be twice'));
    t.end();
});

test('A016', function (t) {
    'use strict';
    var keycls;
    var jsonstr = `{"nargs":"+"}`;
    var jsonval;

    jsonval = JSON.parse(jsonstr);

    keycls = keyparse.KeyParser('', '$', jsonval, false);
    t.equal(keycls.flagname, '$', get_notice(t, 'flagname'));
    t.equal(keycls.prefix, '', get_notice(t, 'prefix'));
    t.equal(keycls.typename, 'args', get_notice(t, 'typename'));
    t.equal(keycls.value, null, get_notice(t, 'value'));
    t.equal(keycls.nargs, '+', get_notice(t, 'nargs'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.shortflag, null, get_notice(t, 'shortflag'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.helpinfo, null, get_notice(t, 'helpinfo'));
    t.equal(keycls.isflag, true, get_notice(t, 'isflag'));
    t.equal(keycls.iscmd, false, get_notice(t, 'iscmd'));
    opt_fail_check(t, keycls);
    t.end();
});

test('A017', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('type', 'flag+app## flag help ##', 3.3, false);
    t.equal(keycls.flagname, 'flag', get_notice(t, 'flagname'));
    t.equal(keycls.prefix, 'type_app', get_notice(t, 'prefix'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.shortflag, null, get_notice(t, 'shortflag'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.typename, 'float', get_notice(t, 'typename'));
    t.equal(keycls.value, 3.3, get_notice(t, 'value'));
    t.equal(keycls.longopt, '--type-app-flag', get_notice(t, 'longopt'));
    t.equal(keycls.shortopt, null, get_notice(t, 'shortopt'));
    t.equal(keycls.optdest, 'type_app_flag', get_notice(t, 'optdest'));
    t.equal(keycls.helpinfo, ' flag help ', get_notice(t, 'helpinfo'));
    t.equal(keycls.isflag, true, get_notice(t, 'isflag'));
    t.equal(keycls.iscmd, false, get_notice(t, 'iscmd'));
    t.end();
});

test('A018', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('', 'flag+app<flag.main>## flag help ##', {}, false);
    t.equal(keycls.flagname, null, get_notice(t, 'flagname'));
    t.equal(keycls.prefix, 'app', get_notice(t, 'prefix'));
    t.equal(keycls.cmdname, 'flag', get_notice(t, 'cmdname'));
    t.equal(keycls.shortflag, null, get_notice(t, 'shortflag'));
    t.equal(keycls.varname, null, get_notice(t, 'varname'));
    t.equal(keycls.typename, 'command', get_notice(t, 'command'));
    t.deepEqual(keycls.value, {}, get_notice(t, 'value'));
    t.equal(keycls.function, 'flag.main', get_notice(t, 'function'));
    t.equal(keycls.helpinfo, ' flag help ', get_notice(t, 'helpinfo'));
    t.equal(keycls.isflag, false, get_notice(t, 'isflag'));
    t.equal(keycls.iscmd, true, get_notice(t, 'iscmd'));
    opt_fail_check(t, keycls);
    t.end();
});

test('A019', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('', '$flag## flag help ##', {
        prefix: 'good',
        value: false
    }, false);
    t.equal(keycls.flagname, 'flag', get_notice(t, 'flagname'));
    t.equal(keycls.prefix, 'good', get_notice(t, 'prefix'));
    t.equal(keycls.value, false, get_notice(t, 'value'));
    t.equal(keycls.typename, 'boolean', get_notice(t, 'typename'));
    t.equal(keycls.helpinfo, ' flag help ', get_notice(t, 'helpinfo'));
    t.equal(keycls.nargs, 0, get_notice(t, 'nargs'));
    t.equal(keycls.shortflag, null, get_notice(t, 'shortflag'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.longopt, '--good-flag', get_notice(t, 'longopt'));
    t.equal(keycls.shortopt, null, get_notice(t, 'shortopt'));
    t.equal(keycls.optdest, 'good_flag', get_notice(t, 'optdest'));
    t.end();
});

test('A020', function (t) {
    'use strict';
    var ok = false;
    try {
        keyparse.KeyParser('', '$', null, false);
    } catch (e) {
        ok = e;
        ok = true;
    }
    t.equal(ok, true, get_notice(t, 'self args must be number or ?*+'));
    t.end();
});

test('A021', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('command', '$## self define ##', {
        nargs: '?',
        value: null
    }, false);
    t.equal(keycls.iscmd, false, get_notice(t, 'iscmd'));
    t.equal(keycls.isflag, true, get_notice(t, 'isflag'));
    t.equal(keycls.flagname, '$', get_notice(t, 'flagname'));
    t.equal(keycls.prefix, 'command', get_notice(t, 'prefix'));
    t.equal(keycls.shortflag, null, get_notice(t, 'shortflag'));
    t.equal(keycls.value, null, get_notice(t, 'value'));
    t.equal(keycls.typename, 'args', get_notice(t, 'typename'));
    t.equal(keycls.nargs, '?', get_notice(t, 'nargs'));
    t.equal(keycls.helpinfo, ' self define ');
    opt_fail_check(t, keycls);
    t.end();
});

test('A022', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('command', '+flag', {}, false);
    t.equal(keycls.prefix, 'command_flag', get_notice(t, 'prefix'));
    t.deepEqual(keycls.value, {}, get_notice(t, 'value'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.shortflag, null, get_notice(t, 'shortflag'));
    t.equal(keycls.flagname, null, get_notice(t, 'flagname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.helpinfo, null, get_notice(t, 'helpinfo'));
    t.equal(keycls.isflag, true, get_notice(t, 'isflag'));
    t.equal(keycls.iscmd, false, get_notice(t, 'iscmd'));
    t.equal(keycls.typename, 'prefix', get_notice(t, 'typename'));
    opt_fail_check(t, keycls);
    t.end();
});

test('A023', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('', '$flag## flag help ##', {
        prefix: 'good',
        value: 3.9,
        nargs: 1
    }, false);
    t.equal(keycls.flagname, 'flag', get_notice(t, 'flagname'));
    t.equal(keycls.prefix, 'good', get_notice(t, 'prefix'));
    t.equal(keycls.value, 3.9, get_notice(t, 'value'));
    t.equal(keycls.typename, 'float', get_notice(t, 'value'));
    t.equal(keycls.helpinfo, ' flag help ', get_notice(t, 'helpinfo'));
    t.equal(keycls.nargs, 1, get_notice(t, 'nargs'));
    t.equal(keycls.shortflag, null, get_notice(t, 'shortflag'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.longopt, '--good-flag', get_notice(t, 'longopt'));
    t.equal(keycls.shortopt, null, get_notice(t, 'shortopt'));
    t.equal(keycls.optdest, 'good_flag', get_notice(t, 'optdest'));
    t.end();
});

test('A024', function (t) {
    'use strict';
    var ok = false;
    try {
        keyparse.KeyParser('', '$flag## flag help ##', {
            prefix: 'good',
            value: false,
            nargs: 2
        }, false);
    } catch (e) {
        ok = e;
        ok = true;
    }
    t.equal(ok, true, get_notice(t, 'nargs can not be 2 in false'));
    t.end();
});

test('A026', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('dep', '$', '+', true);
    t.equal(keycls.flagname, '$', get_notice(t, 'flagname'));
    t.equal(keycls.prefix, 'dep', get_notice(t, 'prefix'));
    t.equal(keycls.value, null, get_notice(t, 'value'));
    t.equal(keycls.typename, 'args', get_notice(t, 'args'));
    t.equal(keycls.helpinfo, null, get_notice(t, 'helpinfo'));
    t.equal(keycls.nargs, '+', get_notice(t, 'nargs'));
    t.equal(keycls.shortflag, null, get_notice(t, 'shortflag'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.isflag, true, get_notice(t, 'isflag'));
    t.equal(keycls.iscmd, false, get_notice(t, 'iscmd'));
    opt_fail_check(t, keycls);
    t.end();
});

test('A027', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('dep', 'verbose|v', '+', false);
    t.equal(keycls.flagname, 'verbose', get_notice(t, 'flagname'));
    t.equal(keycls.shortflag, 'v', get_notice(t, 'shortflag'));
    t.equal(keycls.prefix, 'dep', get_notice(t, 'prefix'));
    t.equal(keycls.typename, 'count', get_notice(t, 'typename'));
    t.equal(keycls.value, 0, get_notice(t, 'value'));
    t.equal(keycls.helpinfo, null, get_notice(t, 'helpinfo'));
    t.equal(keycls.nargs, 0, get_notice(t, 'nargs'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.optdest, 'dep_verbose', get_notice(t, 'optdest'));
    t.equal(keycls.longopt, '--dep-verbose', get_notice(t, 'longopt'));
    t.equal(keycls.shortopt, '-v', get_notice(t, 'shortopt'));
    t.end();
});

test('A028', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('', 'verbose|v## new help info ##', '+', false);
    t.equal(keycls.flagname, 'verbose', get_notice(t, 'flagname'));
    t.equal(keycls.shortflag, 'v', get_notice(t, 'shortflag'));
    t.equal(keycls.prefix, '', get_notice(t, 'prefix'));
    t.equal(keycls.typename, 'count', get_notice(t, 'typename'));
    t.equal(keycls.value, 0, get_notice(t, 'value'));
    t.equal(keycls.helpinfo, ' new help info ', get_notice(t, 'helpinfo'));
    t.equal(keycls.nargs, 0, get_notice(t, 'nargs'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.optdest, 'verbose', get_notice(t, 'optdest'));
    t.equal(keycls.longopt, '--verbose', get_notice(t, 'longopt'));
    t.equal(keycls.shortopt, '-v', get_notice(t, 'shortopt'));
    t.equal(keycls.iscmd, false, get_notice(t, 'iscmd'));
    t.equal(keycls.isflag, true, get_notice(t, 'isflag'));
    t.end();
});

test('A029', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('', 'rollback|R## rollback not set ##', true, false);
    t.equal(keycls.flagname, 'rollback', get_notice(t, 'flagname'));
    t.equal(keycls.shortflag, 'R', get_notice(t, 'shortflag'));
    t.equal(keycls.prefix, '', get_notice(t, 'prefix'));
    t.equal(keycls.typename, 'boolean', get_notice(t, 'typename'));
    t.equal(keycls.value, true, get_notice(t, 'value'));
    t.equal(keycls.helpinfo, ' rollback not set ', get_notice(t, 'helpinfo'));
    t.equal(keycls.nargs, 0, get_notice(t, 'nargs'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.optdest, 'rollback', get_notice(t, 'optdest'));
    t.equal(keycls.longopt, '--no-rollback', get_notice(t, 'longopt'));
    t.equal(keycls.shortopt, '-R', get_notice(t, 'shortopt'));
    t.end();
});

test('A030', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('', '$', {
        value: [],
        nargs: "*",
        typename: "string"
    }, false);
    t.equal(keycls.flagname, '$', get_notice(t, 'flagname'));
    t.equal(keycls.nargs, '*', get_notice(t, 'flagname'));
    t.deepEqual(keycls.value, [], get_notice(t, 'value'));
    t.equal(keycls.typename, 'args', get_notice(t, 'typename'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.helpinfo, null, get_notice(t, 'helpinfo'));
    opt_fail_check(t, keycls);
    t.end();
});

test('A031', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('', '$', 2, false);
    t.equal(keycls.flagname, '$', get_notice(t, 'flagname'));
    t.equal(keycls.nargs, 2, get_notice(t, 'flagname'));
    t.deepEqual(keycls.value, null, get_notice(t, 'value'));
    t.equal(keycls.typename, 'args', get_notice(t, 'typename'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.helpinfo, null, get_notice(t, 'helpinfo'));
    opt_fail_check(t, keycls);
    t.end();
});

test('A032', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('', '$<numargs>', '+', false);
    t.equal(keycls.flagname, '$', get_notice(t, 'flagname'));
    t.equal(keycls.prefix, '', get_notice(t, 'prefix'));
    t.equal(keycls.value, null, get_notice(t, 'value'));
    t.equal(keycls.typename, 'args', get_notice(t, 'typename'));
    t.equal(keycls.helpinfo, null, get_notice(t, 'helpinfo'));
    t.equal(keycls.shortflag, null, get_notice(t, 'shortflag'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.varname, 'numargs', get_notice(t, 'varname'));
    opt_fail_check(t, keycls);
    t.end();
});

test('A033', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('', '$', '+', false);
    t.equal(keycls.flagname, '$', get_notice(t, 'flagname'));
    t.equal(keycls.prefix, '', get_notice(t, 'prefix'));
    t.equal(keycls.value, null, get_notice(t, 'value'));
    t.equal(keycls.typename, 'args', get_notice(t, 'typename'));
    t.equal(keycls.helpinfo, null, get_notice(t, 'helpinfo'));
    t.equal(keycls.nargs, '+', get_notice(t, 'nargs'));
    t.equal(keycls.shortflag, null, get_notice(t, 'shortflag'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.varname, 'args', get_notice(t, 'varname'));
    opt_fail_check(t, keycls);
    t.end();
});

test('A034', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('prefix', '$', '+', false);
    t.equal(keycls.flagname, '$', get_notice(t, 'flagname'));
    t.equal(keycls.prefix, 'prefix', get_notice(t, 'prefix'));
    t.equal(keycls.value, null, get_notice(t, 'value'));
    t.equal(keycls.typename, 'args', get_notice(t, 'typename'));
    t.equal(keycls.helpinfo, null, get_notice(t, 'helpinfo'));
    t.equal(keycls.nargs, '+', get_notice(t, 'nargs'));
    t.equal(keycls.shortflag, null, get_notice(t, 'shortflag'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.varname, 'subnargs', get_notice(t, 'varname'));
    opt_fail_check(t, keycls);
    t.end();
});

test('A035', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('prefix', '$<newargs>', '+', false);
    t.equal(keycls.flagname, '$', get_notice(t, 'flagname'));
    t.equal(keycls.prefix, 'prefix', get_notice(t, 'prefix'));
    t.equal(keycls.value, null, get_notice(t, 'value'));
    t.equal(keycls.typename, 'args', get_notice(t, 'typename'));
    t.equal(keycls.helpinfo, null, get_notice(t, 'helpinfo'));
    t.equal(keycls.nargs, '+', get_notice(t, 'nargs'));
    t.equal(keycls.shortflag, null, get_notice(t, 'shortflag'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.varname, 'newargs', get_notice(t, 'varname'));
    t.equal(keycls.attr, null, get_notice(t, 'attr'));
    opt_fail_check(t, keycls);
    t.end();
});

test('A036', function (t) {
    'use strict';
    var keycls;
    var attr;
    keycls = keyparse.KeyParser('prefix', '$<newargs>!func=args_opt_func;wait=cc!', '+', false);
    t.equal(keycls.flagname, '$', get_notice(t, 'flagname'));
    t.equal(keycls.prefix, 'prefix', get_notice(t, 'prefix'));
    t.equal(keycls.value, null, get_notice(t, 'value'));
    t.equal(keycls.typename, 'args', get_notice(t, 'typename'));
    t.equal(keycls.helpinfo, null, get_notice(t, 'helpinfo'));
    t.equal(keycls.nargs, '+', get_notice(t, 'nargs'));
    t.equal(keycls.shortflag, null, get_notice(t, 'shortflag'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.varname, 'newargs', get_notice(t, 'varname'));
    attr = keycls.attr;
    t.notEqual(attr, null, get_notice(t, 'attr'));
    t.equal(attr.func, 'args_opt_func', get_notice(t, 'attr.func'));
    t.equal(attr.wait, 'cc', get_notice(t, 'attr.wait'));
    opt_fail_check(t, keycls);
    t.end();
});

test('A037', function (t) {
    'use strict';
    var keycls;
    var attr;
    keycls = keyparse.KeyParser('prefix', 'help|h!func=args_opt_func;wait=cc!', null, false, true);
    t.equal(keycls.flagname, 'help', get_notice(t, 'flagname'));
    t.equal(keycls.prefix, 'prefix', get_notice(t, 'prefix'));
    t.equal(keycls.value, null, get_notice(t, 'value'));
    t.equal(keycls.typename, 'help', get_notice(t, 'typename'));
    t.equal(keycls.helpinfo, null, get_notice(t, 'helpinfo'));
    t.equal(keycls.nargs, 0, get_notice(t, 'nargs'));
    t.equal(keycls.shortflag, 'h', get_notice(t, 'shortflag'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.varname, 'prefix_help', get_notice(t, 'varname'));
    attr = keycls.attr;
    t.notEqual(attr, null, get_notice(t, 'attr'));
    t.equal(attr.func, 'args_opt_func', get_notice(t, 'attr.func'));
    t.equal(attr.wait, 'cc', get_notice(t, 'attr.wait'));
    t.equal(keycls.longopt, '--help', get_notice(t, 'longopt'));
    t.equal(keycls.shortopt, '-h', get_notice(t, 'shortopt'));
    t.end();
});

test('A038', function (t) {
    'use strict';
    var flag1;
    var flag2;
    flag1 = keyparse.KeyParser('prefix', 'help|h!func=args_opt_func;wait=cc!', null, false, true);
    flag2 = keyparse.KeyParser('prefix', 'help|h!func=args_opt_func;wait=cc!', null, false);
    t.notEqual(flag1.equals(flag2), true, get_notice(t, 'not equals'));
    flag1 = keyparse.KeyParser('prefix', 'help|h!func=args_opt_func;wait=cc!', null, false, true);
    flag2 = keyparse.KeyParser('prefix', 'help|h!func=args_opt_func;wait=cc!', null, false, true);
    t.equal(flag1.equals(flag2), true, get_notice(t, 'equals'));
    t.end();
});

test('A039', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('rdep', 'ip', {
        modules: [],
        '$<NARGS>': '+'
    }, false);
    t.equal(keycls.iscmd, true, get_notice(t, 'iscmd'));
    t.equal(keycls.cmdname, 'ip', get_notice(t, 'cmdname'));
    t.equal(keycls.prefix, 'rdep', get_notice(t, 'prefix'));
    keycls = keyparse.KeyParser('rdep_ip', 'modules', [], false);
    t.equal(keycls.isflag, true, get_notice(t, 'isflag'));
    t.deepEqual(keycls.value, [], get_notice(t, 'value'));
    t.equal(keycls.prefix, 'rdep_ip', get_notice(t, 'prefix'));
    t.equal(keycls.longopt, '--rdep-ip-modules', get_notice(t, 'longopt'));
    t.equal(keycls.shortopt, null, get_notice(t, 'shortopt'));
    t.equal(keycls.optdest, 'rdep_ip_modules', get_notice(t, 'optdest'));
    t.equal(keycls.varname, 'rdep_ip_modules', get_notice(t, 'varname'));
    t.end();
});

test('A040', function (t) {
    'use strict';
    var flag1;
    var flag2;
    flag1 = keyparse.KeyParser('prefix', 'json!func=args_opt_func;wait=cc!', null, false, false, true);
    flag2 = keyparse.KeyParser('prefix', 'json!func=args_opt_func;wait=cc!', null, false);
    t.notEqual(flag1.equals(flag2), true, get_notice(t, 'not equals'));
    flag1 = keyparse.KeyParser('prefix', 'json!func=args_opt_func;wait=cc!', null, false, false, true);
    flag2 = keyparse.KeyParser('prefix', 'json!func=args_opt_func;wait=cc!', null, false, false, true);
    t.equal(flag1.equals(flag2), true, get_notice(t, 'equals'));
    t.end();
});

test('A041', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('prefix', '$json', {
        nargs: 1,
        attr: {
            func: "args_opt_func",
            wait: "cc"
        }
    }, false);
    t.equal(keycls.prefix, 'prefix', get_notice(t, 'prefix'));
    t.equal(keycls.isflag, true, get_notice(t, 'isflag'));
    t.equal(keycls.attr.func, 'args_opt_func', get_notice(t, 'attr.func'));
    t.equal(keycls.attr.wait, 'cc', get_notice(t, 'attr.wait'));
    t.equal(keycls.flagname, 'json', get_notice(t, 'flagname'));
    t.equal(keycls.shortflag, null, get_notice(t, 'shortflag'));
    t.equal(keycls.longopt, '--prefix-json', get_notice(t, 'longopt'));
    t.equal(keycls.shortopt, null, get_notice(t, 'shortopt'));
    t.equal(keycls.optdest, 'prefix_json', get_notice(t, 'optdest'));
    t.equal(keycls.varname, 'prefix_json', get_notice(t, 'varname'));
    t.end();
});

test('A042', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('', 'main', {}, false);
    t.equal(keycls.prefix, 'main', get_notice(t, 'prefix'));
    t.equal(keycls.isflag, false, get_notice(t, 'isflag'));
    t.equal(keycls.iscmd, true, get_notice(t, 'iscmd'));
    t.equal(keycls.attr, null, get_notice(t, 'attr'));
    t.equal(keycls.cmdname, 'main', get_notice(t, 'cmdname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    opt_fail_check(t, keycls);
    t.end();
});

test('A043', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('', 'rollback|R## rollback not set ##', true, false, false, false, '++', '+');
    t.equal(keycls.flagname, 'rollback', get_notice(t, 'flagname'));
    t.equal(keycls.shortflag, 'R', get_notice(t, 'shortflag'));
    t.equal(keycls.prefix, '', get_notice(t, 'prefix'));
    t.equal(keycls.typename, 'boolean', get_notice(t, 'typename'));
    t.equal(keycls.value, true, get_notice(t, 'value'));
    t.equal(keycls.helpinfo, ' rollback not set ', get_notice(t, 'helpinfo'));
    t.equal(keycls.nargs, 0, get_notice(t, 'nargs'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.optdest, 'rollback', get_notice(t, 'optdest'));
    t.equal(keycls.varname, 'rollback', get_notice(t, 'varname'));
    t.equal(keycls.longopt, '++no-rollback', get_notice(t, 'longopt'));
    t.equal(keycls.shortopt, '+R', get_notice(t, 'shortopt'));
    t.end();
});


test('A044', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('', 'rollback|R## rollback not set ##', true, false, false, false, '++', '+');
    t.equal(keycls.flagname, 'rollback', get_notice(t, 'flagname'));
    t.equal(keycls.shortflag, 'R', get_notice(t, 'shortflag'));
    t.equal(keycls.prefix, '', get_notice(t, 'prefix'));
    t.equal(keycls.typename, 'boolean', get_notice(t, 'typename'));
    t.equal(keycls.value, true, get_notice(t, 'value'));
    t.equal(keycls.helpinfo, ' rollback not set ', get_notice(t, 'helpinfo'));
    t.equal(keycls.nargs, 0, get_notice(t, 'nargs'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.optdest, 'rollback', get_notice(t, 'optdest'));
    t.equal(keycls.varname, 'rollback', get_notice(t, 'varname'));
    t.equal(keycls.longopt, '++no-rollback', get_notice(t, 'longopt'));
    t.equal(keycls.shortopt, '+R', get_notice(t, 'shortopt'));
    t.equal(keycls.longprefix, '++', get_notice(t, 'longprefix'));
    t.equal(keycls.shortprefix, '+', get_notice(t, 'shortprefix'));
    t.end();
});

test('A045', function (t) {
    'use strict';
    var keycls;
    keycls = keyparse.KeyParser('', 'crl_CA_compromise', false, false, false, false, '++', '+', true);
    t.equal(keycls.flagname, 'crl_CA_compromise', get_notice(t, 'flagname'));
    t.equal(keycls.shortflag, null, get_notice(t, 'shortflag'));
    t.equal(keycls.prefix, '', get_notice(t, 'prefix'));
    t.equal(keycls.typename, 'boolean', get_notice(t, 'typename'));
    t.equal(keycls.value, false, get_notice(t, 'value'));
    t.equal(keycls.helpinfo, null, get_notice(t, 'helpinfo'));
    t.equal(keycls.nargs, 0, get_notice(t, 'nargs'));
    t.equal(keycls.cmdname, null, get_notice(t, 'cmdname'));
    t.equal(keycls.function, null, get_notice(t, 'function'));
    t.equal(keycls.optdest, 'crl_CA_compromise', get_notice(t, 'optdest'));
    t.equal(keycls.varname, 'crl_CA_compromise', get_notice(t, 'varname'));
    t.equal(keycls.longopt, '++crl_CA_compromise', get_notice(t, 'longopt'));
    t.equal(keycls.shortopt, null, get_notice(t, 'shortopt'));
    t.equal(keycls.longprefix, '++', get_notice(t, 'longprefix'));
    t.equal(keycls.shortprefix, '+', get_notice(t, 'shortprefix'));
    t.end();
});

test('A046', function (t) {
    'use strict';
    var prefix = '';
    var key = util.format('%s##json input file to get the value set##', 'json');
    var value = null;
    var keycls = keyparse.KeyParser(prefix, key, value, false, false, true, '++', '+');
    t.equal(keycls.flagname, 'json', get_notice(t, 'flagname'));
    t.equal(keycls.shortflag, null, get_notice(t, 'shortflag'));
    t.end();
});