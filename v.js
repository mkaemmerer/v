/* global vdom, Bacon */

//Promote a value up to a Property if necessary
function cast(value){
  if(value instanceof Bacon.EventStream) { return value.toProperty(); }
  if(value instanceof Bacon.Property)    { return value; }
  return Bacon.constant(value);
}
function castAll(obj){
  const ret = {};
  for(let name in obj){
    ret[name] = cast(obj[name]);
  }
  return Bacon.combineTemplate(ret);
}
//Modify a properties object into the format needed by virtual-dom
function fixProps(props){
  if(props.checked === false){ delete props.checked; }
  let ret = {attributes: props};
  ret.value = props.value;
  return ret;
}
function defaults(obj1, obj2){
  for(var name in obj2){
    if(!obj1.hasOwnProperty(name)){
      obj1[name] = obj2[name];
    }
  }
  return obj1;
}

//A wrapper for the type Property[Array[x]]
class Arr {
  constructor(property){
    this._property = property;
  }
  _withArray(f){
    const prop = this._property.map(f);
    return new Arr(prop);
  }
  map(f){
    return this._withArray(a => a.map(f));
  }
  join(){
    const prop = this._property
      .flatMapLatest(arr => {
        //Force subscription on inner streams
        Bacon.combineAsArray(arr.map(a => a._property))
          .takeUntil(this._property)
          .onValue(() => void 0);
        return arr.reduce((x,y) => x.concat(y), Arr.empty())._property;
      })
      .toProperty();
    return new Arr(prop);
  }
  flatMap(f){
    return this.map(f).join();
  }
  append(item){
    return this._withArray(a => a.concat([item]));
  }
  concat(arr){
    const prop = this._property.combine(arr._property, (a1,a2) => a1.concat(a2));
    return new Arr(prop);
  }
  zip(arr2, f){
    const prop = this._property.combine(arr2._property, (a1, a2) => {
      let ret = [];
      a1.forEach((_,i) => {
        ret.push(f(a1[i], a2[i]));
      });
      return ret;
    });
    return new Arr(prop);
  }
  static empty(){
    return new Arr(Bacon.constant([]));
  }
  static of(item){
    return new Arr(item.map(i => [i]));
  }
}


class Writer {
  constructor(data, parent, children = Arr.empty()){
    this._data     = data;
    this._parent   = parent;
    this._children = children;
  }
  _build(){
    return this._children.flatMap(c => c._build());
  }
  _append(writer){
    return new this.constructor(this._data, this._parent, this._children.append(writer));
  }
  open(tagName, properties = {}){
    const data = defaults({tagName: tagName, properties: properties}, this._data);
    if(tagName === 'svg'){ data.namespace = 'http://www.w3.org/2000/svg'; }
    return new TagWriter(data, this);
  }
  text(text){
    return this._append(new WText(cast(text)));
  }
  close(){
    return this._parent._append(this);
  }
  //Control Flow
  $if(condition){
    const data = defaults({condition: cast(condition)}, this._data);
    return new IfWriter(data, this);
  }
  $else(){
    throw new Error('$else called without matching $if');
  }
  each(array){
    const children = new Arr(cast(array)).map(() => new Writer(this));
    return new ArrayWriter(this._data, this, children);
  }
}

//Text
class WText {
  constructor(text){
    this._text = text;
  }
  _build(){
    const node = this._text
      .map(text => new vdom.VText(text));
    return Arr.of(node);
  }
}

//Tags
class TagWriter extends Writer {
  _build(){
    const {tagName, properties, namespace} = this._data;
    const children = super._build()._property;
    const props    = castAll(properties);

    return new Arr(children.combine(props, (cs, props) =>
      new vdom.VNode(tagName, fixProps(props), cs, undefined, namespace)
    ));
  }
  run(){
    const {tagName, namespace} = this._data;
    const vnode   = new vdom.VNode(tagName, {}, [], undefined, namespace);
    const trees   = this._build()._property;
    const patches = trees.diff(vnode, vdom.diff);

    const node    = vdom.create(vnode);
    patches.onValue(patch => {
      vdom.patch(node, patch);
    });

    return node;
  }
}

// If/Else
class ConditionalWriter extends Writer {
  _build(){
    const output = this._data.condition
      .flatMapLatest(c => c ? super._build() : Arr.empty());
    return Arr.of(output).join();
  }
}
class IfWriter extends ConditionalWriter {
  $else(){
    const condition = this._data.condition;
    const data      = defaults({condition: condition.not()}, this._data);
    return new ConditionalWriter(data, this._parent._append(this));
  }
}

//Each
class ArrayWriter extends Writer {
  _append(writer){
    const children = this._children.zip(writer._children, (w1, w2) => w1._append(w2));
    return new this.constructor(this._data, this._parent, children);
  }
  open(tagName, properties = {}){
    const children = this._children
      .map(w => w.open(tagName, properties));
    return new ArrayWriter(this._data, this, children);
  }
  text(text){
    const children = this._children
      .map(w => w.text(text));
    return new ArrayWriter(this._data, this._parent, children);
  }
  each(array){
    const children = this._children.map(w => w.each(array));
    return new ArrayWriter(this._data, this, children);
  }
  $if(condition){
    const children = this._children.map(w => w.$if(condition));
    return new IfArrayWriter(this._data, this, children);
  }
}
class IfArrayWriter extends ArrayWriter {
  $else(){
    const children = this._children.map(w => w.$else());
    return new ArrayWriter(this._data, this._parent._append(this), children);
  }
}

//Export
const v = new Writer();
