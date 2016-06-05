var util = require('util');
var assert = require('assert');
//var tracelog = require('../tracelog');

var set_words_access = function (words, self) {
    'use strict';
    words.forEach(function (elm) {
        var hasproperties;
        hasproperties = Object.getOwnPropertyNames(self);
        if (hasproperties.indexOf(elm) < 0) {
            Object.defineProperty(self, elm, {
                enumerable: true,
                get: function () {
                    return self.get_word(elm);
                },
                set: function (v) {
                    var errstr;
                    v = v;
                    errstr = util.format('can not set (%s)', elm);
                    throw new Error(errstr);
                }
            });
        }
    });
    return;
};

var get_value_type = function (value) {
    'use strict';
    var reg;
    var valstr;
    if (value === undefined || value === null) {
        return 'string';
    }

    if (Array.isArray(value)) {
        return 'array';
    }

    reg = new RegExp('^([\\d]+)$', 'i');
    if (typeof value === 'number') {
        valstr = util.format('%s', value);
        if (reg.test(valstr)) {
            return 'int';
        } else {
            return 'float';
        }
    }

    return typeof value;
};

function KeyParser(prefix, key, value, isflag) {
    'use strict';
    var dict;
    var self;
    var flagspecial = ['value', 'prefix'];
    var flagwords = ['flagname', 'helpinfo', 'shortflag', 'nargs'];
    var cmdwords = ['cmdname', 'function', 'helpinfo'];
    var otherwords = ['origkey', 'iscmd', 'isflag', 'typename'];
    var formwords = ['longopt', 'shortopt', 'optdest'];
    dict = {};
    self = {};

    self.helpexpr = new RegExp('##([^#]+)##$', 'i');
    self.cmdexpr = new RegExp('^([^\\#\\<\\>\\+\\$]+)', 'i');
    self.prefixexpr = new RegExp('\\+([^\\+\\#\\<\\>\\|\\$ \t]+)', 'i');
    self.funcexpr = new RegExp('<([^\\<\\>\\#\\$\\| \t]+)>', 'i');
    self.flagexpr = new RegExp('^([^\\<\\>\\#\\+\\$ \t]+)', 'i');
    self.mustflagexpr = new RegExp('^\\$([^\\$\\+\\#\\<\\>]+)', 'i');

    self.form_words = function (elm) {
        var errstr;
        var retstr = '';
        if (elm === 'longopt') {
            if (!dict.isflag || !dict.flagname || dict.typename === 'args') {
                errstr = util.format('can not set (%s) longopt', dict.origkey);
                throw new Error(errstr);
            }
            retstr += '--';
            if (dict.typename === 'boolean' && dict.value) {
                retstr += 'no-';
            }

            if (dict.prefix.length > 0) {
                retstr += util.format('%s_', dict.prefix);
            }
            retstr += dict.flagname;
            retstr = retstr.toLowerCase();
            retstr = retstr.replace(/_/g, '-');
            return retstr;
        }
        if (elm === 'shortopt') {
            if (!dict.isflag || !dict.flagname || dict.typename === 'args') {
                errstr = util.format('can not set (%s) shortopt', dict.origkey);
                throw new Error(errstr);
            }
            if (!dict.shortflag) {
                return null;
            }
            retstr += '-';
            retstr += dict.shortflag;
            return retstr;
        }
        if (elm === 'optdest') {
            if (!dict.isflag || !dict.flagname || dict.typename === 'args') {
                errstr = util.format('can not set (%s) shortopt', dict.origkey);
                throw new Error(errstr);
            }
            if (dict.prefix.length > 0) {
                retstr += util.format('%s_', dict.prefix);
            }

            retstr += dict.flagname;
            retstr = retstr.toLowerCase();
            retstr = retstr.replace(/-/g, '_');
            return retstr;
        }
        errstr = util.format('unknown word (%s)', elm);
        throw new Error(errstr);
    };

    self.get_word = function (elm) {
        var errstr;
        if (flagspecial.indexOf(elm) >= 0 || flagwords.indexOf(elm) >= 0 || cmdwords.indexOf(elm) >= 0 || otherwords.indexOf(elm) >= 0) {
            return dict[elm];
        }

        if (formwords.indexOf(elm) >= 0) {
            return self.form_words(elm);
        }


        errstr = util.format('unknown %s ', elm);
        throw new Error(errstr);
    };

    set_words_access(flagspecial, self);
    set_words_access(flagwords, self);
    set_words_access(otherwords, self);
    set_words_access(cmdwords, self);
    set_words_access(formwords, self);

    self.reset_value = function () {
        dict.value = null;
        dict.prefix = '';
        dict.flagname = null;
        dict.helpinfo = null;
        dict.shortflag = null;
        dict.nargs = null;
        dict.cmdname = null;
        dict.function = null;
        dict.origkey = key;
        dict.isflag = false;
        dict.iscmd = false;
        dict.typename = null;
        return self;
    };

    self.validate = function () {
        var errstr;
        if (dict.isflag) {
            assert(!dict.iscmd);
            if (dict.function !== null) {
                errstr = util.format('(%s) flag include function(%s)', dict.origkey, dict.function);
                throw new Error(errstr);
            }
            if (dict.typename === 'object' && dict.flagname !== null) {
                errstr = util.format('(%s) flag typename object', dict.origkey);
                throw new Error(errstr);
            }
            if (dict.typename !== get_value_type(dict.value) && dict.typename !== 'count' && dict.typename !== 'args') {
                errstr = util.format('(%s) (%s)not match typename(%s)', dict.origkey, dict.typename, get_value_type(dict.value));
                throw new Error(errstr);
            }

            if (dict.flagname === null) {
                if (dict.prefix.length === 0) {
                    errstr = util.format('(%s) not specified  prefix', dict.origkey);
                    throw new Error(errstr);
                }
                dict.typename = 'prefix';
                if (get_value_type(dict.value) !== 'object') {
                    errstr = util.format('(%s) prefix value is not typename(object)', dict.origkey);
                    throw new Error(errstr);
                }

                if (dict.helpinfo !== null) {
                    errstr = util.format('(%s) prefix should not have helpinfo', dict.origkey);
                    throw new Error(errstr);
                }

                if (dict.shortflag !== null) {
                    errstr = util.format('(%s) prefix should not have shortflag', dict.origkey);
                    throw new Error(errstr);
                }
            } else if (dict.flagname === '$') {
                dict.typename = 'args';
                if (dict.shortflag !== null) {
                    errstr = util.format('(%s) should not have shortflag', dict.origkey);
                    throw new Error(errstr);
                }
            } else {
                if (dict.flagname === null || dict.flagname.length <= 0) {
                    errstr = util.format('(%s) should specified flagname', dict.origkey);
                    throw new Error(errstr);
                }
            }

            if (dict.shortflag !== null) {
                if (dict.shortflag.length !== 1) {
                    errstr = util.format('(%s) shortflag not 1 length', dict.origkey);
                    throw new Error(errstr);
                }
            }

            if (dict.typename === 'boolean') {
                if (dict.nargs !== null && dict.nargs !== 0) {
                    errstr = util.format('(%s) nargs not 0', dict.origkey);
                    throw new Error(errstr);
                }
                dict.nargs = 0;
            } else if (dict.typename !== 'prefix' && dict.flagname !== '$' && dict.typename !== 'count') {
                if (dict.flagname !== '$' && dict.nargs !== 1 && dict.nargs !== null) {
                    errstr = util.format('(%s) should set nargs 1', dict.origkey);
                    throw new Error(errstr);
                }
                dict.nargs = 1;
            } else {
                if (dict.flagname === '$' && dict.nargs === null) {
                    /*we make sure it should be multiple to 0*/
                    dict.nargs = '*';
                }
            }
        } else {
            if (dict.cmdname === null || dict.cmdname.length === 0) {
                errstr = util.format('(%s) cmdname is null or 0 length', dict.origkey);
                throw new Error(errstr);
            }

            if (dict.shortflag !== null) {
                errstr = util.format('(%s) cmdname should not have shortflag', dict.origkey);
                throw new Error(errstr);
            }

            if (dict.nargs !== null) {
                errstr = util.format('(%s) cmdname should not have nargs', dict.origkey);
                throw new Error(errstr);
            }

            if (dict.typename !== 'object') {
                errstr = util.format('(%s) cmdname should value object', dict.origkey);
                throw new Error(errstr);
            }

            dict.prefix = dict.cmdname;
            dict.typename = 'command';
        }
        return self;
    };

    self.set_flag = function () {
        var errstr;
        var k, keys, i;
        var newprefix;
        dict.isflag = true;
        dict.iscmd = false;
        dict.origkey = key;
        if (typeof value !== 'object') {
            errstr = util.format('(%s) not object typename value', self.origkey);
            throw new Error(errstr);
        }

        if (value.value === undefined) {
            dict.value = null;
            dict.typename = 'string';
        }

        keys = Object.keys(value);
        for (i = 0; i < keys.length; i += 1) {
            k = keys[i];
            if (flagwords.indexOf(k) >= 0) {
                if (dict[k] !== null && dict[k] !== value[k]) {
                    errstr = util.format('(%s) key(%s) not set equal', dict.origkey, k);
                    throw new Error(errstr);
                }

                if (!(typeof value[k] === 'number' || typeof value[k] === 'string')) {
                    errstr = util.format('(%s) key(%s) not string or number', dict.origkey, k);
                    throw new Error(errstr);
                }
                dict[k] = value[k];
            } else if (flagspecial.indexOf(k) >= 0) {
                if (k === 'prefix') {
                    if (typeof value.prefix !== 'string' || value.prefix === null) {
                        errstr = util.format('(%s) prefix can not valid', dict.origkey);
                        throw new Error(errstr);
                    }
                    newprefix = '';
                    if (prefix.length > 0) {
                        newprefix += util.format('%s_', prefix);
                    }
                    newprefix += value.prefix;
                    dict.prefix = newprefix;
                } else if (k === 'value') {
                    if (get_value_type(value.value) === 'object') {
                        errstr = util.format('(%s) value is object', dict.origkey);
                        throw new Error(errstr);
                    }
                    dict.value = value.value;
                    dict.typename = get_value_type(value.value);
                }
            }
        }

        if (dict.prefix.length === 0 && prefix.length > 0) {
            dict.prefix = prefix;
        }
    };

    self.parse = function () {
        var errstr;
        var i;
        var m;
        var flags;
        var flagmod, cmdmod;
        var sarr;
        var newprefix;
        flagmod = false;
        cmdmod = false;
        dict.origkey = key;
        if (key.indexOf('$') >= 0) {
            if (key[0] !== '$') {
                errstr = util.format('(%s) has $ not at begin', dict.origkey);
                throw new Error(errstr);
            }

            for (i = 1; i < dict.origkey; i += 1) {
                if (dict.origkey[i] === '$') {
                    errstr = util.format('(%s) has $ for twice', dict.origkey);
                    throw new Error(errstr);
                }
            }
        }
        flags = null;

        if (isflag) {
            m = self.flagexpr.exec(dict.origkey);
            if (m !== undefined && m !== null && m.length > 1) {
                flags = m[1];
            }

            if (flags === null) {
                m = self.mustflagexpr.exec(dict.origkey);
                if (m !== undefined && m !== null && m.length > 1) {
                    flags = m[1];
                }
            }

            if (flags === null && dict.origkey[0] === '$') {
                dict.flagname = '$';
                flagmod = true;
            }

            if (flags !== null) {
                if (flags.indexOf('|') >= 0) {
                    sarr = flags.split('|');
                    if (sarr.length > 2 || sarr[0].length <= 1 || sarr[1].length !== 1) {
                        errstr = util.format('(%s) invalid flag format', dict.origkey);
                        throw new Error(errstr);
                    }
                    dict.flagname = sarr[0];
                    dict.shortflag = sarr[1];
                } else {
                    dict.flagname = flags;
                }
                flagmod = true;
            }

        } else {
            m = self.mustflagexpr.exec(dict.origkey);
            if (m !== undefined && m !== null && m.length > 1) {
                flags = m[1];
                if (flags.indexOf('|') >= 0) {
                    sarr = flags.split('|');
                    if (sarr.length > 2 || sarr[0].length <= 1 || sarr[1].length !== 1) {
                        errstr = util.format('(%s) invalid flag format', dict.origkey);
                        throw new Error(errstr);
                    }
                    dict.flagname = sarr[0];
                    dict.shortflag = sarr[1];
                } else {
                    dict.flagname = flags;
                }
                flagmod = true;
            } else if (dict.origkey[0] === '$') {
                dict.flagname = '$';
                flagmod = true;
            }

            m = self.cmdexpr.exec(dict.origkey);
            if (m !== null && m !== undefined && m.length > 1) {
                assert(!flagmod);
                if (m[1].indexOf('|') >= 0) {
                    flags = m[1];
                    if (flags.indexOf('|') >= 0) {
                        sarr = flags.split('|');
                        if (sarr.length > 2 || sarr[0].length <= 1 || sarr[1].length !== 1) {
                            errstr = util.format('(%s) invalid flag format', dict.origkey);
                            throw new Error(errstr);
                        }
                        dict.flagname = sarr[0];
                        dict.shortflag = sarr[1];
                    } else {
                        dict.flagname = flags;
                    }
                    flagmod = true;
                } else {
                    cmdmod = true;
                    dict.cmdname = m[1];
                }
            }
        }

        m = self.funcexpr.exec(dict.origkey);
        if (m !== undefined && m !== null && m.length > 1) {
            dict.function = m[1];
        }

        m = self.helpexpr.exec(dict.origkey);
        if (m !== undefined && m !== null && m.length > 1) {
            dict.helpinfo = m[1];
        }

        newprefix = '';
        if (prefix.length > 0) {
            newprefix += util.format('%s_', prefix);
        }

        m = self.prefixexpr.exec(dict.origkey);
        if (m !== undefined && m !== null && m.length > 1) {
            newprefix += m[1];
            dict.prefix = newprefix;
        } else {
            if (prefix.length > 0) {
                dict.prefix = prefix;
            }
        }

        if (flagmod) {
            dict.isflag = true;
            dict.iscmd = false;
        }
        if (cmdmod) {
            dict.isflag = false;
            dict.iscmd = true;
        }

        if (!flagmod && !cmdmod) {
            dict.isflag = true;
            dict.iscmd = false;
        }
        dict.value = value;
        dict.typename = get_value_type(value);
        if (cmdmod && dict.typename !== 'object') {
            /*flag mod is true we give the flag*/
            dict.isflag = true;
            dict.iscmd = false;
            dict.flagname = dict.cmdname;
            dict.cmdname = null;
        }

        if (dict.isflag && dict.typename === 'string' && dict.value === '+' && dict.flagname !== '$') {
            dict.typename = 'count';
            dict.value = 0;
            dict.nargs = 0;
        }

        if (dict.isflag && dict.flagname === '$' && dict.typename !== 'object') {
            if (dict.typename === 'string' && (dict.value === '+' || dict.value === '*' || dict.value === '?')) {
                dict.nargs = dict.value;
                dict.value = null;
                dict.typename = 'args';
            } else if (dict.typename === 'int') {
                dict.nargs = dict.value;
                dict.value = null;
                dict.typename = 'args';
            } else {
                errstr = util.format('(%s) not valid args description (%s) typename (%s)', dict.origkey, dict.value, dict.typename);
                throw new Error(errstr);
            }
        }

        if (dict.isflag && dict.typename === 'object' && dict.flagname !== null) {
            self.set_flag();
        }
        return self.validate();
    };

    self.init_fn = function () {
        return self.reset_value().parse();
    };

    return self.init_fn();
}

module.exports.KeyParser = KeyParser;
module.exports.get_value_type = get_value_type;