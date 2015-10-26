/* global vdom */

const VNode = vdom.VNode;
const VText = vdom.VText;

class WText {
  constructor(text){
    this._text = text;
  }
  _build(){
    return [new VText(this._text)];
  }
}

class Writer {
  constructor(parent, children = []){
    this._parent   = parent;
    this._children = children;
  }
  _build(){
    //FlatMap
    return this._children
      .map(c => c._build())
      .reduce((x,y) => x.concat(y), []);
  }
  append(/* w */){
    //Abstract
  }
  open(tagName){
    return new TagWriter(tagName, this);
  }
  text(text){
    return this.append(new WText(text));
  }
  close(){
    return this._parent.append(this);
  }
  //Control Flow
  $if(condition){
    return new IfWriter(condition, this);
  }
  each(array){
    const writers = array.map(() => new Writer(this));
    return new ArrayWriter(writers, this);
  }
}
class TagWriter extends Writer {
  constructor(tagName, parent, children = []){
    super(parent, children);
    this._tagName  = tagName;
  }
  _build(){
    return [new VNode(this._tagName, {}, super._build())];
  }
  append(writer){
    return new TagWriter(this._tagName, this._parent, this._children.concat([writer]));
  }
  run(){
    const vnode = this._build()[0];
    return vdom.create(vnode);
  }
}

// If/Else
class ConditionalWriter extends Writer {
  constructor(condition, parent, children = []){
    super(parent, children);
    this._condition = condition;
  }
  _build(){
    return this._condition ? super._build() : [];
  }
}
class IfWriter extends ConditionalWriter {
  append(writer){
    return new IfWriter(this._condition, this._parent, this._children.concat([writer]));
  }
  //Control Flow
  $else(){
    return new ElseWriter(!this._condition, this._parent.append(this));
  }
}
class ElseWriter extends ConditionalWriter {
  append(writer){
    return new ElseWriter(this._condition, this._parent, this._children.concat([writer]));
  }
}

//Each
class ArrayWriter extends Writer {
  constructor(array, parent, children = []){
    super(parent, children);
    this._array = array;
  }
  _build(){
    return transpose(this._children)
      .reduce((x,y) => x.concat(y), [])
      .map(c => c._build())
      .reduce((x,y) => x.concat(y), []);
  }
  append(writer){
    return new ArrayWriter(this._array, this._parent, this._children.concat([writer._array]));
  }
  open(tagName){
    const array = this._array
      .map(w => w.open(tagName));
    return new ArrayWriter(array, this, array);
  }
  text(text){
    const array = this._array
      .map(w => w.text(text));
    return new ArrayWriter(array, this._parent);
  }
  each(array){
    const writers = this._array.map(w => w.each(array));
    return new ArrayWriter(writers, this, writers);
  }
}

function transpose(array){
  return array[0]
    .map((_, c) => array.map(r => r[c]));
}


//Export
const v = function(){
  return new TagWriter('div');
};
