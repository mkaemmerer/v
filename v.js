/* global vdom, Bacon */

const VNode = vdom.VNode;
const VText = vdom.VText;

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
  static fromArray(array){
    return new Arr(Bacon.constant(array));
  }
}

class WText {
  constructor(text){
    this._text = text;
  }
  _build(){
    const node = this._text
      .map(text => new VText(text));
    return Arr.of(node);
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
  open(tagName){
    return new TagWriter(tagName, this);
  }
  text(text){
    return this._append(new WText(cast(text)));
  }
  close(){
    return this._parent._append(this);
  }
  //Control Flow
  $if(condition){
    return new IfWriter(condition, this);
  }
  each(array){
    const children = Arr.fromArray(array).map(() => new Writer(this));
    return new ArrayWriter(this, children);
  }
}
class TagWriter extends Writer {
  constructor(tagName, parent, children = Arr.empty()){
    super(parent, children);
    this._tagName  = tagName;
  }
  _build(){
    const children = super._build();
    return children.withArray(cs =>
      new VNode(this._tagName, {}, cs)
    );
  }
  _append(writer){
    return new TagWriter(this._tagName, this._parent, this._children.append(writer));
  }
  run(){
    const vnode   = new VNode(this._tagName);
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
    return this._condition ? super._build() : Arr.empty();
  }
}
class IfWriter extends ConditionalWriter {
  _append(writer){
    return new IfWriter(this._condition, this._parent, this._children.append(writer));
  }
  //Control Flow
  $else(){
    return new ElseWriter(!this._condition, this._parent._append(this));
  }
}
class ElseWriter extends ConditionalWriter {
  _append(writer){
    return new ElseWriter(this._condition, this._parent, this._children.append(writer));
  }
}

//Each
class ArrayWriter extends Writer {
  _append(writer){
    const children = this._children.zip(writer._children, (w1,w2) =>
      w1._append(w2)
    );
    return new ArrayWriter(this._parent, children);
  }
  open(tagName){
    const children = this._children
      .map(w => w.open(tagName));
    return new ArrayWriter(this, children);
  }
  text(text){
    const children = this._children
      .map(w => w.text(text));
    return new ArrayWriter(this._parent, children);
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
  _append(writer){
    const children = this._children.zip(writer._children, (w1,w2) => {
      return w1._append(w2);
    });
    return new IfArrayWriter(this._parent, children);
  }
  $else(){
    const children = this._children.map(w => w.$else());
    return new ArrayWriter(this._parent._append(this), children);
  }
}


//Export
const v = function(){
  return new TagWriter('div');
};
