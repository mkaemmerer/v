/**
 * v
 * @version v0.0.1
 * @author Matt Kaemmerer <matthew.kaemmerer@gmail.com>
 * @license MIT
 */
;(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['baconjs', 'virtual-dom'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('baconjs'), require('virtual-dom'));
  } else {
    root.v = factory(root.Bacon, root.virtualDom);
  }
}(this, function(Bacon, vdom) {
  /* global vdom, Bacon */

  //Promote a value up to a Property if necessary
  'use strict';

  var _get = function get(_x4, _x5, _x6) { var _again = true; _function: while (_again) { var object = _x4, property = _x5, receiver = _x6; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x4 = parent; _x5 = property; _x6 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  function cast(_x7, _x8) {
    var _again2 = true;

    _function2: while (_again2) {
      var value = _x7,
          data = _x8;
      _again2 = false;

      if (value instanceof Bacon.EventStream) {
        return value.toProperty();
      }
      if (value instanceof Bacon.Property) {
        return value;
      }
      if (value instanceof Function) {
        _x7 = value(data);
        _x8 = data;
        _again2 = true;
        continue _function2;
      }
      return Bacon.constant(value);
    }
  }
  function castAll(obj, data) {
    var ret = {};
    for (var _name in obj) {
      ret[_name] = cast(obj[_name], data);
    }
    return Bacon.combineTemplate(ret);
  }
  //Modify a properties object into the format needed by virtual-dom
  function fixProps(props) {
    if (props.checked === false) {
      delete props.checked;
    }
    var ret = { attributes: props };
    ret.value = props.value;
    return ret;
  }
  function defaults(obj1, obj2) {
    for (var name in obj2) {
      if (!obj1.hasOwnProperty(name)) {
        obj1[name] = obj2[name];
      }
    }
    return obj1;
  }

  //A wrapper for the type Property[Array[x]]

  var Arr = (function () {
    function Arr(property) {
      _classCallCheck(this, Arr);

      this._property = property;
    }

    _createClass(Arr, [{
      key: '_withArray',
      value: function _withArray(f) {
        var prop = this._property.map(f);
        return new Arr(prop);
      }
    }, {
      key: 'map',
      value: function map(f) {
        return this._withArray(function (a) {
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
        return this._withArray(function (a) {
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
    function Writer(data, parent) {
      var children = arguments.length <= 2 || arguments[2] === undefined ? Arr.empty() : arguments[2];

      _classCallCheck(this, Writer);

      this._data = data || {};
      this._item = this._data.item;
      this._parent = parent;
      this._children = children;
    }

    //View

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
        return new this.constructor(this._data, this._parent, this._children.append(writer));
      }
    }, {
      key: 'open',
      value: function open(tagName) {
        var properties = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        var data = defaults({ tagName: tagName, properties: properties }, this._data);
        if (tagName === 'svg') {
          data.namespace = 'http://www.w3.org/2000/svg';
        }
        return new TagWriter(data, this);
      }
    }, {
      key: 'text',
      value: function text(_text) {
        return this._append(new WText(cast(_text, this._item)));
      }
    }, {
      key: 'view',
      value: function view(widget) {
        return this._append(new WView(cast(widget)));
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
        var data = defaults({ condition: cast(condition, this._item) }, this._data);
        return new IfWriter(data, this);
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

        var children = new Arr(cast(array, this._item)).map(function (d) {
          return new Writer(defaults({ item: d }, _this2._data), _this2);
        });
        return new ArrayWriter(this._data, this, children);
      }
    }]);

    return Writer;
  })();

  var WView = (function () {
    function WView(view) {
      _classCallCheck(this, WView);

      this._view = view;
    }

    //Text

    _createClass(WView, [{
      key: '_build',
      value: function _build() {
        return Arr.of(this._view);
      }
    }]);

    return WView;
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
          return new vdom.VText(text);
        });
        return Arr.of(node);
      }
    }]);

    return WText;
  })();

  var TagWriter = (function (_Writer) {
    _inherits(TagWriter, _Writer);

    function TagWriter() {
      _classCallCheck(this, TagWriter);

      _get(Object.getPrototypeOf(TagWriter.prototype), 'constructor', this).apply(this, arguments);
    }

    // If/Else

    _createClass(TagWriter, [{
      key: '_build',
      value: function _build() {
        var _data = this._data;
        var tagName = _data.tagName;
        var properties = _data.properties;
        var namespace = _data.namespace;
        var item = _data.item;

        var children = _get(Object.getPrototypeOf(TagWriter.prototype), '_build', this).call(this)._property;
        var props = castAll(properties, item);

        return new Arr(children.combine(props, function (cs, props) {
          return new vdom.VNode(tagName, fixProps(props), cs, undefined, namespace);
        }));
      }
    }, {
      key: 'run',
      value: function run() {
        var _data2 = this._data;
        var tagName = _data2.tagName;
        var namespace = _data2.namespace;

        var vnode = new vdom.VNode(tagName, {}, [], undefined, namespace);
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

    function ConditionalWriter() {
      _classCallCheck(this, ConditionalWriter);

      _get(Object.getPrototypeOf(ConditionalWriter.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(ConditionalWriter, [{
      key: '_build',
      value: function _build() {
        var _this3 = this;

        var output = this._data.condition.flatMapLatest(function (c) {
          return c ? _get(Object.getPrototypeOf(ConditionalWriter.prototype), '_build', _this3).call(_this3) : Arr.empty();
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

    //Each

    _createClass(IfWriter, [{
      key: '$else',
      value: function $else() {
        var condition = this._data.condition;
        var data = defaults({ condition: condition.not() }, this._data);
        return new ConditionalWriter(data, this._parent._append(this));
      }
    }]);

    return IfWriter;
  })(ConditionalWriter);

  var ArrayWriter = (function (_Writer3) {
    _inherits(ArrayWriter, _Writer3);

    function ArrayWriter() {
      _classCallCheck(this, ArrayWriter);

      _get(Object.getPrototypeOf(ArrayWriter.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(ArrayWriter, [{
      key: '_append',
      value: function _append(writer) {
        var children = this._children.zip(writer._children, function (w1, w2) {
          return w1._append(w2);
        });
        return new this.constructor(this._data, this._parent, children);
      }
    }, {
      key: 'open',
      value: function open(tagName) {
        var properties = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

        var children = this._children.map(function (w) {
          return w.open(tagName, properties);
        });
        return new ArrayWriter(this._data, this, children);
      }
    }, {
      key: 'text',
      value: function text(_text2) {
        var children = this._children.map(function (w) {
          return w.text(_text2);
        });
        return new ArrayWriter(this._data, this._parent, children);
      }
    }, {
      key: 'view',
      value: function view(widget) {
        var children = this._children.map(function (w) {
          return w.view(widget);
        });
        return new this.constructor(this._data, this._parent, children);
      }
    }, {
      key: 'each',
      value: function each(array) {
        var children = this._children.map(function (w) {
          return w.each(array);
        });
        return new ArrayWriter(this._data, this, children);
      }
    }, {
      key: '$if',
      value: function $if(condition) {
        var children = this._children.map(function (w) {
          return w.$if(condition);
        });
        return new IfArrayWriter(this._data, this, children);
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
      key: '$else',
      value: function $else() {
        var children = this._children.map(function (w) {
          return w.$else();
        });
        return new ArrayWriter(this._data, this._parent._append(this), children);
      }
    }]);

    return IfArrayWriter;
  })(ArrayWriter);

  var v = new Writer();
return v;
}));
