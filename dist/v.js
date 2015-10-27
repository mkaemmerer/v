/**
 * vdom
 * @version v0.0.1
 * @author Matt Kaemmerer <matthew.kaemmerer@gmail.com>
 * @license MIT
 */
;(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['baconjs', 'virtual-dom'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('baconjs'), require('virutal-dom'));
  } else {
    root.v = factory(root.Bacon, root.virtualDom);
  }
}(this, function(Bacon, vdom) {
  /* global vdom, Bacon */

  'use strict';

  var _get = function get(_x6, _x7, _x8) { var _again = true; _function: while (_again) { var object = _x6, property = _x7, receiver = _x8; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x6 = parent; _x7 = property; _x8 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  var VNode = vdom.VNode;
  var VText = vdom.VText;

  //Promote a value up to a Property if necessary
  function cast(value) {
    if (value instanceof Bacon.EventStream) {
      return value.toProperty();
    }
    if (value instanceof Bacon.Property) {
      return value;
    }
    return Bacon.constant(value);
  }

  //A wrapper for the type Property[Array[x]]

  var Arr = (function () {
    function Arr(property) {
      _classCallCheck(this, Arr);

      this._property = property;
    }

    _createClass(Arr, [{
      key: 'withArray',
      value: function withArray(f) {
        var prop = this._property.map(f);
        return new Arr(prop);
      }
    }, {
      key: 'map',
      value: function map(f) {
        return this.withArray(function (a) {
          return a.map(f);
        });
      }
    }, {
      key: 'join',
      value: function join() {
        var _this = this;

        var prop = this._property.flatMapLatest(function (arr) {
          //Force subscription on inner streams
          Bacon.combineAsArray(arr.map(function (a) {
            return a._property;
          })).takeUntil(_this._property).onValue(function () {
            return void 0;
          });
          return arr.reduce(function (x, y) {
            return x.concat(y);
          }, Arr.empty())._property;
        }).toProperty();
        return new Arr(prop);
      }
    }, {
      key: 'flatMap',
      value: function flatMap(f) {
        return this.map(f).join();
      }
    }, {
      key: 'append',
      value: function append(item) {
        return this.withArray(function (a) {
          return a.concat([item]);
        });
      }
    }, {
      key: 'concat',
      value: function concat(arr) {
        var prop = this._property.combine(arr._property, function (a1, a2) {
          return a1.concat(a2);
        });
        return new Arr(prop);
      }
    }, {
      key: 'zip',
      value: function zip(arr2, f) {
        var prop = this._property.combine(arr2._property, function (a1, a2) {
          var ret = [];
          a1.forEach(function (_, i) {
            ret.push(f(a1[i], a2[i]));
          });
          return ret;
        });
        return new Arr(prop);
      }
    }], [{
      key: 'empty',
      value: function empty() {
        return new Arr(Bacon.constant([]));
      }
    }, {
      key: 'of',
      value: function of(item) {
        return new Arr(item.map(function (i) {
          return [i];
        }));
      }
    }]);

    return Arr;
  })();

  var Writer = (function () {
    function Writer(parent) {
      var children = arguments.length <= 1 || arguments[1] === undefined ? Arr.empty() : arguments[1];

      _classCallCheck(this, Writer);

      this._parent = parent;
      this._children = children;
    }

    //Text

    _createClass(Writer, [{
      key: '_build',
      value: function _build() {
        return this._children.flatMap(function (c) {
          return c._build();
        });
      }
    }, {
      key: '_append',
      value: function _append(writer) {
        return new Writer(this._parent, this._children.append(writer));
      }
    }, {
      key: 'open',
      value: function open(tagName) {
        var properties = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        return new TagWriter(tagName, properties, this);
      }
    }, {
      key: 'text',
      value: function text(_text) {
        return this._append(new WText(cast(_text)));
      }
    }, {
      key: 'close',
      value: function close() {
        return this._parent._append(this);
      }

      //Control Flow
    }, {
      key: '$if',
      value: function $if(condition) {
        return new IfWriter(cast(condition), this);
      }
    }, {
      key: '$else',
      value: function $else() {
        throw new Error('$else called without matching $if');
      }
    }, {
      key: 'each',
      value: function each(array) {
        var _this2 = this;

        var children = new Arr(cast(array)).map(function () {
          return new Writer(_this2);
        });
        return new ArrayWriter(this, children);
      }
    }]);

    return Writer;
  })();

  var WText = (function () {
    function WText(text) {
      _classCallCheck(this, WText);

      this._text = text;
    }

    //Tags

    _createClass(WText, [{
      key: '_build',
      value: function _build() {
        var node = this._text.map(function (text) {
          return new VText(text);
        });
        return Arr.of(node);
      }
    }]);

    return WText;
  })();

  var TagWriter = (function (_Writer) {
    _inherits(TagWriter, _Writer);

    function TagWriter(tagName, properties, parent) {
      var children = arguments.length <= 3 || arguments[3] === undefined ? Arr.empty() : arguments[3];

      _classCallCheck(this, TagWriter);

      _get(Object.getPrototypeOf(TagWriter.prototype), 'constructor', this).call(this, parent, children);
      this._tagName = tagName;
      this._properties = properties;
    }

    // If/Else

    _createClass(TagWriter, [{
      key: '_build',
      value: function _build() {
        var _this3 = this;

        var children = _get(Object.getPrototypeOf(TagWriter.prototype), '_build', this).call(this);
        return children.withArray(function (cs) {
          return new VNode(_this3._tagName, {}, cs);
        });
      }
    }, {
      key: '_append',
      value: function _append(writer) {
        return new TagWriter(this._tagName, this._properties, this._parent, this._children.append(writer));
      }
    }, {
      key: 'run',
      value: function run() {
        var vnode = new VNode(this._tagName);
        var trees = this._build()._property;
        var patches = trees.diff(vnode, vdom.diff);

        var node = vdom.create(vnode);
        patches.onValue(function (patch) {
          vdom.patch(node, patch);
        });

        return node;
      }
    }]);

    return TagWriter;
  })(Writer);

  var ConditionalWriter = (function (_Writer2) {
    _inherits(ConditionalWriter, _Writer2);

    function ConditionalWriter(condition, parent) {
      var children = arguments.length <= 2 || arguments[2] === undefined ? Arr.empty() : arguments[2];

      _classCallCheck(this, ConditionalWriter);

      _get(Object.getPrototypeOf(ConditionalWriter.prototype), 'constructor', this).call(this, parent, children);
      this._condition = condition;
    }

    _createClass(ConditionalWriter, [{
      key: '_build',
      value: function _build() {
        var _this4 = this;

        var output = this._condition.flatMapLatest(function (c) {
          return c ? _get(Object.getPrototypeOf(ConditionalWriter.prototype), '_build', _this4).call(_this4) : Arr.empty();
        });
        return Arr.of(output).join();
      }
    }]);

    return ConditionalWriter;
  })(Writer);

  var IfWriter = (function (_ConditionalWriter) {
    _inherits(IfWriter, _ConditionalWriter);

    function IfWriter() {
      _classCallCheck(this, IfWriter);

      _get(Object.getPrototypeOf(IfWriter.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(IfWriter, [{
      key: '_append',
      value: function _append(writer) {
        return new IfWriter(this._condition, this._parent, this._children.append(writer));
      }

      //Control Flow
    }, {
      key: '$else',
      value: function $else() {
        return new ElseWriter(this._condition.not(), this._parent._append(this));
      }
    }]);

    return IfWriter;
  })(ConditionalWriter);

  var ElseWriter = (function (_ConditionalWriter2) {
    _inherits(ElseWriter, _ConditionalWriter2);

    function ElseWriter() {
      _classCallCheck(this, ElseWriter);

      _get(Object.getPrototypeOf(ElseWriter.prototype), 'constructor', this).apply(this, arguments);
    }

    //Each

    _createClass(ElseWriter, [{
      key: '_append',
      value: function _append(writer) {
        return new ElseWriter(this._condition, this._parent, this._children.append(writer));
      }
    }]);

    return ElseWriter;
  })(ConditionalWriter);

  function appendArray(a1, a2) {
    return a1._children.zip(a2._children, function (w1, w2) {
      return w1._append(w2);
    });
  }

  var ArrayWriter = (function (_Writer3) {
    _inherits(ArrayWriter, _Writer3);

    function ArrayWriter() {
      _classCallCheck(this, ArrayWriter);

      _get(Object.getPrototypeOf(ArrayWriter.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(ArrayWriter, [{
      key: '_append',
      value: function _append(writer) {
        var children = appendArray(this, writer);
        return new ArrayWriter(this._parent, children);
      }
    }, {
      key: 'open',
      value: function open(tagName) {
        var properties = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        var children = this._children.map(function (w) {
          return w.open(tagName, properties);
        });
        return new ArrayWriter(this, children);
      }
    }, {
      key: 'text',
      value: function text(_text2) {
        var children = this._children.map(function (w) {
          return w.text(_text2);
        });
        return new ArrayWriter(this._parent, children);
      }
    }, {
      key: 'each',
      value: function each(array) {
        var children = this._children.map(function (w) {
          return w.each(array);
        });
        return new ArrayWriter(this, children);
      }
    }, {
      key: '$if',
      value: function $if(condition) {
        var children = this._children.map(function (w) {
          return w.$if(condition);
        });
        return new IfArrayWriter(this, children);
      }
    }]);

    return ArrayWriter;
  })(Writer);

  var IfArrayWriter = (function (_ArrayWriter) {
    _inherits(IfArrayWriter, _ArrayWriter);

    function IfArrayWriter() {
      _classCallCheck(this, IfArrayWriter);

      _get(Object.getPrototypeOf(IfArrayWriter.prototype), 'constructor', this).apply(this, arguments);
    }

    //Export

    _createClass(IfArrayWriter, [{
      key: '_append',
      value: function _append(writer) {
        var children = appendArray(this, writer);
        return new IfArrayWriter(this._parent, children);
      }
    }, {
      key: '$else',
      value: function $else() {
        var children = this._children.map(function (w) {
          return w.$else();
        });
        return new ArrayWriter(this._parent._append(this), children);
      }
    }]);

    return IfArrayWriter;
  })(ArrayWriter);

  var v = function v() {
    return new TagWriter('div');
  };
return v;
}));
