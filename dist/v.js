/**
 * v
 * @version v0.0.1
 * @author Matt Kaemmerer <matthew.kaemmerer@gmail.com>
 * @license MIT
 */
'use strict';

var _get = function get(_x4, _x5, _x6) { var _again = true; _function: while (_again) { var object = _x4, property = _x5, receiver = _x6; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x4 = parent; _x5 = property; _x6 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

(function (root, factory) {
  /* global define */
  if (typeof define === 'function' && define.amd) {
    define(['baconjs', 'virtual-dom'], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require('baconjs'), require('virtual-dom'));
  } else {
    root.v = factory(root.Bacon, root.virtualDom);
  }
})(window, function (Bacon, vdom) {

  //Promote a value up to a Property if necessary
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

  return new Writer();
});
//# sourceMappingURL=data:application/json;base64,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QVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxVQUFBLENBQUM7aUJBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUM7U0FBQSxDQUFDLENBQUM7QUFDM0QsZUFBTyxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztPQUN0RDs7O1dBdEJHLFdBQVc7S0FBUyxNQUFNOztNQXdCMUIsYUFBYTtjQUFiLGFBQWE7O2FBQWIsYUFBYTs0QkFBYixhQUFhOztpQ0FBYixhQUFhOzs7OztpQkFBYixhQUFhOzthQUNaLGlCQUFFO0FBQ0wsWUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsVUFBQSxDQUFDO2lCQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUU7U0FBQSxDQUFDLENBQUM7QUFDcEQsZUFBTyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO09BQzFFOzs7V0FKRyxhQUFhO0tBQVMsV0FBVzs7QUFRdkMsU0FBTyxJQUFJLE1BQU0sRUFBRSxDQUFDO0NBQ3JCLENBQUMsQ0FBRSIsImZpbGUiOiJ2LmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKHJvb3QsIGZhY3RvcnkpIHtcbiAgLyogZ2xvYmFsIGRlZmluZSAqL1xuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKFsnYmFjb25qcycsICd2aXJ0dWFsLWRvbSddLCBmYWN0b3J5KTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkocmVxdWlyZSgnYmFjb25qcycpLCByZXF1aXJlKCd2aXJ0dWFsLWRvbScpKTtcbiAgfSBlbHNlIHtcbiAgICByb290LnYgPSBmYWN0b3J5KHJvb3QuQmFjb24sIHJvb3QudmlydHVhbERvbSk7XG4gIH1cbn0od2luZG93LCBmdW5jdGlvbihCYWNvbiwgdmRvbSkge1xuXG4gIC8vUHJvbW90ZSBhIHZhbHVlIHVwIHRvIGEgUHJvcGVydHkgaWYgbmVjZXNzYXJ5XG4gIGZ1bmN0aW9uIGNhc3QodmFsdWUsIGRhdGEpe1xuICAgIGlmKHZhbHVlIGluc3RhbmNlb2YgQmFjb24uRXZlbnRTdHJlYW0pIHsgcmV0dXJuIHZhbHVlLnRvUHJvcGVydHkoKTsgfVxuICAgIGlmKHZhbHVlIGluc3RhbmNlb2YgQmFjb24uUHJvcGVydHkpICAgIHsgcmV0dXJuIHZhbHVlOyB9XG4gICAgaWYodmFsdWUgaW5zdGFuY2VvZiBGdW5jdGlvbikgICAgICAgICAgeyByZXR1cm4gY2FzdCh2YWx1ZShkYXRhKSwgZGF0YSk7IH1cbiAgICByZXR1cm4gQmFjb24uY29uc3RhbnQodmFsdWUpO1xuICB9XG4gIGZ1bmN0aW9uIGNhc3RBbGwob2JqLCBkYXRhKXtcbiAgICBjb25zdCByZXQgPSB7fTtcbiAgICBmb3IobGV0IG5hbWUgaW4gb2JqKXtcbiAgICAgIHJldFtuYW1lXSA9IGNhc3Qob2JqW25hbWVdLCBkYXRhKTtcbiAgICB9XG4gICAgcmV0dXJuIEJhY29uLmNvbWJpbmVUZW1wbGF0ZShyZXQpO1xuICB9XG4gIC8vTW9kaWZ5IGEgcHJvcGVydGllcyBvYmplY3QgaW50byB0aGUgZm9ybWF0IG5lZWRlZCBieSB2aXJ0dWFsLWRvbVxuICBmdW5jdGlvbiBmaXhQcm9wcyhwcm9wcyl7XG4gICAgaWYocHJvcHMuY2hlY2tlZCA9PT0gZmFsc2UpeyBkZWxldGUgcHJvcHMuY2hlY2tlZDsgfVxuICAgIGxldCByZXQgPSB7YXR0cmlidXRlczogcHJvcHN9O1xuICAgIHJldC52YWx1ZSA9IHByb3BzLnZhbHVlO1xuICAgIHJldHVybiByZXQ7XG4gIH1cbiAgZnVuY3Rpb24gZGVmYXVsdHMob2JqMSwgb2JqMil7XG4gICAgZm9yKHZhciBuYW1lIGluIG9iajIpe1xuICAgICAgaWYoIW9iajEuaGFzT3duUHJvcGVydHkobmFtZSkpe1xuICAgICAgICBvYmoxW25hbWVdID0gb2JqMltuYW1lXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajE7XG4gIH1cblxuICAvL0Egd3JhcHBlciBmb3IgdGhlIHR5cGUgUHJvcGVydHlbQXJyYXlbeF1dXG4gIGNsYXNzIEFyciB7XG4gICAgY29uc3RydWN0b3IocHJvcGVydHkpe1xuICAgICAgdGhpcy5fcHJvcGVydHkgPSBwcm9wZXJ0eTtcbiAgICB9XG4gICAgX3dpdGhBcnJheShmKXtcbiAgICAgIGNvbnN0IHByb3AgPSB0aGlzLl9wcm9wZXJ0eS5tYXAoZik7XG4gICAgICByZXR1cm4gbmV3IEFycihwcm9wKTtcbiAgICB9XG4gICAgbWFwKGYpe1xuICAgICAgcmV0dXJuIHRoaXMuX3dpdGhBcnJheShhID0+IGEubWFwKGYpKTtcbiAgICB9XG4gICAgam9pbigpe1xuICAgICAgY29uc3QgcHJvcCA9IHRoaXMuX3Byb3BlcnR5XG4gICAgICAgIC5mbGF0TWFwTGF0ZXN0KGFyciA9PiB7XG4gICAgICAgICAgLy9Gb3JjZSBzdWJzY3JpcHRpb24gb24gaW5uZXIgc3RyZWFtc1xuICAgICAgICAgIEJhY29uLmNvbWJpbmVBc0FycmF5KGFyci5tYXAoYSA9PiBhLl9wcm9wZXJ0eSkpXG4gICAgICAgICAgICAudGFrZVVudGlsKHRoaXMuX3Byb3BlcnR5KVxuICAgICAgICAgICAgLm9uVmFsdWUoKCkgPT4gdm9pZCAwKTtcbiAgICAgICAgICByZXR1cm4gYXJyLnJlZHVjZSgoeCx5KSA9PiB4LmNvbmNhdCh5KSwgQXJyLmVtcHR5KCkpLl9wcm9wZXJ0eTtcbiAgICAgICAgfSlcbiAgICAgICAgLnRvUHJvcGVydHkoKTtcbiAgICAgIHJldHVybiBuZXcgQXJyKHByb3ApO1xuICAgIH1cbiAgICBmbGF0TWFwKGYpe1xuICAgICAgcmV0dXJuIHRoaXMubWFwKGYpLmpvaW4oKTtcbiAgICB9XG4gICAgYXBwZW5kKGl0ZW0pe1xuICAgICAgcmV0dXJuIHRoaXMuX3dpdGhBcnJheShhID0+IGEuY29uY2F0KFtpdGVtXSkpO1xuICAgIH1cbiAgICBjb25jYXQoYXJyKXtcbiAgICAgIGNvbnN0IHByb3AgPSB0aGlzLl9wcm9wZXJ0eS5jb21iaW5lKGFyci5fcHJvcGVydHksIChhMSxhMikgPT4gYTEuY29uY2F0KGEyKSk7XG4gICAgICByZXR1cm4gbmV3IEFycihwcm9wKTtcbiAgICB9XG4gICAgemlwKGFycjIsIGYpe1xuICAgICAgY29uc3QgcHJvcCA9IHRoaXMuX3Byb3BlcnR5LmNvbWJpbmUoYXJyMi5fcHJvcGVydHksIChhMSwgYTIpID0+IHtcbiAgICAgICAgbGV0IHJldCA9IFtdO1xuICAgICAgICBhMS5mb3JFYWNoKChfLGkpID0+IHtcbiAgICAgICAgICByZXQucHVzaChmKGExW2ldLCBhMltpXSkpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIG5ldyBBcnIocHJvcCk7XG4gICAgfVxuICAgIHN0YXRpYyBlbXB0eSgpe1xuICAgICAgcmV0dXJuIG5ldyBBcnIoQmFjb24uY29uc3RhbnQoW10pKTtcbiAgICB9XG4gICAgc3RhdGljIG9mKGl0ZW0pe1xuICAgICAgcmV0dXJuIG5ldyBBcnIoaXRlbS5tYXAoaSA9PiBbaV0pKTtcbiAgICB9XG4gIH1cblxuXG4gIGNsYXNzIFdyaXRlciB7XG4gICAgY29uc3RydWN0b3IoZGF0YSwgcGFyZW50LCBjaGlsZHJlbiA9IEFyci5lbXB0eSgpKXtcbiAgICAgIHRoaXMuX2RhdGEgICAgID0gZGF0YSB8fCB7fTtcbiAgICAgIHRoaXMuX2l0ZW0gICAgID0gdGhpcy5fZGF0YS5pdGVtO1xuICAgICAgdGhpcy5fcGFyZW50ICAgPSBwYXJlbnQ7XG4gICAgICB0aGlzLl9jaGlsZHJlbiA9IGNoaWxkcmVuO1xuICAgIH1cbiAgICBfYnVpbGQoKXtcbiAgICAgIHJldHVybiB0aGlzLl9jaGlsZHJlbi5mbGF0TWFwKGMgPT4gYy5fYnVpbGQoKSk7XG4gICAgfVxuICAgIF9hcHBlbmQod3JpdGVyKXtcbiAgICAgIHJldHVybiBuZXcgdGhpcy5jb25zdHJ1Y3Rvcih0aGlzLl9kYXRhLCB0aGlzLl9wYXJlbnQsIHRoaXMuX2NoaWxkcmVuLmFwcGVuZCh3cml0ZXIpKTtcbiAgICB9XG4gICAgb3Blbih0YWdOYW1lLCBwcm9wZXJ0aWVzID0ge30pe1xuICAgICAgY29uc3QgZGF0YSA9IGRlZmF1bHRzKHt0YWdOYW1lOiB0YWdOYW1lLCBwcm9wZXJ0aWVzOiBwcm9wZXJ0aWVzfSwgdGhpcy5fZGF0YSk7XG4gICAgICBpZih0YWdOYW1lID09PSAnc3ZnJyl7IGRhdGEubmFtZXNwYWNlID0gJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJzsgfVxuICAgICAgcmV0dXJuIG5ldyBUYWdXcml0ZXIoZGF0YSwgdGhpcyk7XG4gICAgfVxuICAgIHRleHQodGV4dCl7XG4gICAgICByZXR1cm4gdGhpcy5fYXBwZW5kKG5ldyBXVGV4dChjYXN0KHRleHQsIHRoaXMuX2l0ZW0pKSk7XG4gICAgfVxuICAgIGNsb3NlKCl7XG4gICAgICByZXR1cm4gdGhpcy5fcGFyZW50Ll9hcHBlbmQodGhpcyk7XG4gICAgfVxuICAgIC8vQ29udHJvbCBGbG93XG4gICAgJGlmKGNvbmRpdGlvbil7XG4gICAgICBjb25zdCBkYXRhID0gZGVmYXVsdHMoe2NvbmRpdGlvbjogY2FzdChjb25kaXRpb24sIHRoaXMuX2l0ZW0pfSwgdGhpcy5fZGF0YSk7XG4gICAgICByZXR1cm4gbmV3IElmV3JpdGVyKGRhdGEsIHRoaXMpO1xuICAgIH1cbiAgICAkZWxzZSgpe1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCckZWxzZSBjYWxsZWQgd2l0aG91dCBtYXRjaGluZyAkaWYnKTtcbiAgICB9XG4gICAgZWFjaChhcnJheSl7XG4gICAgICBjb25zdCBjaGlsZHJlbiA9IG5ldyBBcnIoY2FzdChhcnJheSwgdGhpcy5faXRlbSkpXG4gICAgICAgIC5tYXAoZCA9PiBuZXcgV3JpdGVyKGRlZmF1bHRzKHtpdGVtOiBkfSwgdGhpcy5fZGF0YSksIHRoaXMpKTtcbiAgICAgIHJldHVybiBuZXcgQXJyYXlXcml0ZXIodGhpcy5fZGF0YSwgdGhpcywgY2hpbGRyZW4pO1xuICAgIH1cbiAgfVxuXG4gIC8vVGV4dFxuICBjbGFzcyBXVGV4dCB7XG4gICAgY29uc3RydWN0b3IodGV4dCl7XG4gICAgICB0aGlzLl90ZXh0ID0gdGV4dDtcbiAgICB9XG4gICAgX2J1aWxkKCl7XG4gICAgICBjb25zdCBub2RlID0gdGhpcy5fdGV4dFxuICAgICAgICAubWFwKHRleHQgPT4gbmV3IHZkb20uVlRleHQodGV4dCkpO1xuICAgICAgcmV0dXJuIEFyci5vZihub2RlKTtcbiAgICB9XG4gIH1cblxuICAvL1RhZ3NcbiAgY2xhc3MgVGFnV3JpdGVyIGV4dGVuZHMgV3JpdGVyIHtcbiAgICBfYnVpbGQoKXtcbiAgICAgIGNvbnN0IHt0YWdOYW1lLCBwcm9wZXJ0aWVzLCBuYW1lc3BhY2UsIGl0ZW19ID0gdGhpcy5fZGF0YTtcbiAgICAgIGNvbnN0IGNoaWxkcmVuID0gc3VwZXIuX2J1aWxkKCkuX3Byb3BlcnR5O1xuICAgICAgY29uc3QgcHJvcHMgICAgPSBjYXN0QWxsKHByb3BlcnRpZXMsIGl0ZW0pO1xuXG4gICAgICByZXR1cm4gbmV3IEFycihjaGlsZHJlbi5jb21iaW5lKHByb3BzLCAoY3MsIHByb3BzKSA9PlxuICAgICAgICBuZXcgdmRvbS5WTm9kZSh0YWdOYW1lLCBmaXhQcm9wcyhwcm9wcyksIGNzLCB1bmRlZmluZWQsIG5hbWVzcGFjZSlcbiAgICAgICkpO1xuICAgIH1cbiAgICBydW4oKXtcbiAgICAgIGNvbnN0IHt0YWdOYW1lLCBuYW1lc3BhY2V9ID0gdGhpcy5fZGF0YTtcbiAgICAgIGNvbnN0IHZub2RlICAgPSBuZXcgdmRvbS5WTm9kZSh0YWdOYW1lLCB7fSwgW10sIHVuZGVmaW5lZCwgbmFtZXNwYWNlKTtcbiAgICAgIGNvbnN0IHRyZWVzICAgPSB0aGlzLl9idWlsZCgpLl9wcm9wZXJ0eTtcbiAgICAgIGNvbnN0IHBhdGNoZXMgPSB0cmVlcy5kaWZmKHZub2RlLCB2ZG9tLmRpZmYpO1xuXG4gICAgICBjb25zdCBub2RlICAgID0gdmRvbS5jcmVhdGUodm5vZGUpO1xuICAgICAgcGF0Y2hlcy5vblZhbHVlKHBhdGNoID0+IHtcbiAgICAgICAgdmRvbS5wYXRjaChub2RlLCBwYXRjaCk7XG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuICB9XG5cbiAgLy8gSWYvRWxzZVxuICBjbGFzcyBDb25kaXRpb25hbFdyaXRlciBleHRlbmRzIFdyaXRlciB7XG4gICAgX2J1aWxkKCl7XG4gICAgICBjb25zdCBvdXRwdXQgPSB0aGlzLl9kYXRhLmNvbmRpdGlvblxuICAgICAgICAuZmxhdE1hcExhdGVzdChjID0+IGMgPyBzdXBlci5fYnVpbGQoKSA6IEFyci5lbXB0eSgpKTtcbiAgICAgIHJldHVybiBBcnIub2Yob3V0cHV0KS5qb2luKCk7XG4gICAgfVxuICB9XG4gIGNsYXNzIElmV3JpdGVyIGV4dGVuZHMgQ29uZGl0aW9uYWxXcml0ZXIge1xuICAgICRlbHNlKCl7XG4gICAgICBjb25zdCBjb25kaXRpb24gPSB0aGlzLl9kYXRhLmNvbmRpdGlvbjtcbiAgICAgIGNvbnN0IGRhdGEgICAgICA9IGRlZmF1bHRzKHtjb25kaXRpb246IGNvbmRpdGlvbi5ub3QoKX0sIHRoaXMuX2RhdGEpO1xuICAgICAgcmV0dXJuIG5ldyBDb25kaXRpb25hbFdyaXRlcihkYXRhLCB0aGlzLl9wYXJlbnQuX2FwcGVuZCh0aGlzKSk7XG4gICAgfVxuICB9XG5cbiAgLy9FYWNoXG4gIGNsYXNzIEFycmF5V3JpdGVyIGV4dGVuZHMgV3JpdGVyIHtcbiAgICBfYXBwZW5kKHdyaXRlcil7XG4gICAgICBjb25zdCBjaGlsZHJlbiA9IHRoaXMuX2NoaWxkcmVuLnppcCh3cml0ZXIuX2NoaWxkcmVuLCAodzEsIHcyKSA9PiB3MS5fYXBwZW5kKHcyKSk7XG4gICAgICByZXR1cm4gbmV3IHRoaXMuY29uc3RydWN0b3IodGhpcy5fZGF0YSwgdGhpcy5fcGFyZW50LCBjaGlsZHJlbik7XG4gICAgfVxuICAgIG9wZW4odGFnTmFtZSwgcHJvcGVydGllcyA9IHt9KXtcbiAgICAgIGNvbnN0IGNoaWxkcmVuID0gdGhpcy5fY2hpbGRyZW5cbiAgICAgICAgLm1hcCh3ID0+IHcub3Blbih0YWdOYW1lLCBwcm9wZXJ0aWVzKSk7XG4gICAgICByZXR1cm4gbmV3IEFycmF5V3JpdGVyKHRoaXMuX2RhdGEsIHRoaXMsIGNoaWxkcmVuKTtcbiAgICB9XG4gICAgdGV4dCh0ZXh0KXtcbiAgICAgIGNvbnN0IGNoaWxkcmVuID0gdGhpcy5fY2hpbGRyZW5cbiAgICAgICAgLm1hcCh3ID0+IHcudGV4dCh0ZXh0KSk7XG4gICAgICByZXR1cm4gbmV3IEFycmF5V3JpdGVyKHRoaXMuX2RhdGEsIHRoaXMuX3BhcmVudCwgY2hpbGRyZW4pO1xuICAgIH1cbiAgICBlYWNoKGFycmF5KXtcbiAgICAgIGNvbnN0IGNoaWxkcmVuID0gdGhpcy5fY2hpbGRyZW4ubWFwKHcgPT4gdy5lYWNoKGFycmF5KSk7XG4gICAgICByZXR1cm4gbmV3IEFycmF5V3JpdGVyKHRoaXMuX2RhdGEsIHRoaXMsIGNoaWxkcmVuKTtcbiAgICB9XG4gICAgJGlmKGNvbmRpdGlvbil7XG4gICAgICBjb25zdCBjaGlsZHJlbiA9IHRoaXMuX2NoaWxkcmVuLm1hcCh3ID0+IHcuJGlmKGNvbmRpdGlvbikpO1xuICAgICAgcmV0dXJuIG5ldyBJZkFycmF5V3JpdGVyKHRoaXMuX2RhdGEsIHRoaXMsIGNoaWxkcmVuKTtcbiAgICB9XG4gIH1cbiAgY2xhc3MgSWZBcnJheVdyaXRlciBleHRlbmRzIEFycmF5V3JpdGVyIHtcbiAgICAkZWxzZSgpe1xuICAgICAgY29uc3QgY2hpbGRyZW4gPSB0aGlzLl9jaGlsZHJlbi5tYXAodyA9PiB3LiRlbHNlKCkpO1xuICAgICAgcmV0dXJuIG5ldyBBcnJheVdyaXRlcih0aGlzLl9kYXRhLCB0aGlzLl9wYXJlbnQuX2FwcGVuZCh0aGlzKSwgY2hpbGRyZW4pO1xuICAgIH1cbiAgfVxuXG4gIC8vRXhwb3J0XG4gIHJldHVybiBuZXcgV3JpdGVyKCk7XG59KSk7XG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
