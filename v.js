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
  append(writer){
    return new Writer(this._parent, this._children.concat([writer]));
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
    const children = array.map(() => new Writer(this));
    return new ArrayWriter(this, children);
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
  append(writer){
    const children = zip(this._children, writer._children, (w1,w2) => {
      return w1.append(w2);
    });
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
    return new ArrayWriter(this, children);
  }
  $else(){
    const children = this._children.map(w => w.$else());
    return new ArrayWriter(this._parent.append(this), children);
  }
}

function zip(a1, a2, f){
  let ret = [];
  a1.forEach((_,i) => {
    ret.push(f(a1[i], a2[i]));
  });
  return ret;
}


//Export
const v = function(){
  return new TagWriter('div');
};
