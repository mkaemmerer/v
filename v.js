/* global vdom, Bacon */

//Promote a value up to a Property if necessary
function cast(value){
  if(value instanceof Bacon.EventStream) { return value.toProperty(); }
  if(value instanceof Bacon.Property)    { return value; }
  return Bacon.constant(value);
}

//A wrapper for the type Property[Array[x]]
class Arr {
  constructor(property){
    this._property = property;
  }
  withArray(f){
    const prop = this._property.map(f);
    return new Arr(prop);
  }
  map(f){
    return this.withArray(a => a.map(f));
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
    return this.withArray(a => a.concat([item]));
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
  constructor(parent, children = Arr.empty()){
    this._parent   = parent;
    this._children = children;
  }
  _build(){
    return this._children.flatMap(c => c._build());
  }
  _append(writer){
    return new Writer(this._parent, this._children.append(writer));
  }
  open(tagName, properties = {}){
    return new TagWriter(tagName, properties, this);
  }
  text(text){
    return this._append(new WText(cast(text)));
  }
  view(widget){
    return this._append(new WView(cast(widget)));
  }
  close(){
    return this._parent._append(this);
  }
  //Control Flow
  $if(condition){
    return new IfWriter(cast(condition), this);
  }
  $else(){
    throw new Error('$else called without matching $if');
  }
  each(array){
    const children = new Arr(cast(array)).map(() => new Writer(this));
    return new ArrayWriter(this, children);
  }
}

//View
class WView {
  constructor(view){
    this._view = view;
  }
  _build(){
    return Arr.of(this._view);
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
  constructor(tagName, properties, parent, children = Arr.empty()){
    super(parent, children);
    this._tagName    = tagName;
    this._properties = properties;

    //Rename properties for virtual dom
    if(this._properties['class']){ this._properties.className = this._properties['class']; }
  }
  _build(){
    const children = super._build();
    return children.withArray(cs =>
      new vdom.VNode(this._tagName, this._properties, cs)
    );
  }
  _append(writer){
    return new TagWriter(this._tagName, this._properties, this._parent, this._children.append(writer));
  }
  run(){
    const vnode   = new vdom.VNode(this._tagName);
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
  constructor(condition, parent, children = Arr.empty()){
    super(parent, children);
    this._condition = condition;
  }
  _build(){
    const output = this._condition
      .flatMapLatest(c => c ? super._build() : Arr.empty());
    return Arr.of(output).join();
  }
  _append(writer){
    return new this.constructor(this._condition, this._parent, this._children.append(writer));
  }
}
class IfWriter extends ConditionalWriter {
  $else(){
    return new ConditionalWriter(this._condition.not(), this._parent._append(this));
  }
}

//Each
class ArrayWriter extends Writer {
  _append(writer){
    const children = this._children.zip(writer._children, (w1, w2) => w1._append(w2));
    return new this.constructor(this._parent, children);
  }
  open(tagName, properties = {}){
    const children = this._children
      .map(w => w.open(tagName, properties));
    return new ArrayWriter(this, children);
  }
  text(text){
    const children = this._children
      .map(w => w.text(text));
    return new this.constructor(this._parent, children);
  }
  view(widget){
    const children = this._children
      .map(w => w.view(widget));
    return new this.constructor(this._parent, children);
  }
  each(array){
    const children = this._children.map(w => w.each(array));
    return new ArrayWriter(this, children);
  }
  $if(condition){
    const children = this._children.map(w => w.$if(condition));
    return new IfArrayWriter(this, children);
  }
}
class IfArrayWriter extends ArrayWriter {
  $else(){
    const children = this._children.map(w => w.$else());
    return new ArrayWriter(this._parent._append(this), children);
  }
}


//Export
const v = new Writer();
