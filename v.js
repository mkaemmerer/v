/* global vdom, Bacon */

console.log(Bacon);
const VNode = vdom.VNode;
const VText = vdom.VText;

class Writer {
  constructor(parent, children = []){
    this._parent   = parent;
    this._children = children;
  }
  _build(){
    //Abstract
  }
  _buildChildren(){
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
  $if(condition){
    return new IfWriter(condition, this);
  }
}

class WText {
  constructor(text){
    this._text = text;
  }
  _build(){
    return [new VText(this._text)];
  }
}
class TagWriter extends Writer {
  constructor(tagName, parent, children = []){
    super(parent, children);
    this._tagName  = tagName;
  }
  _build(){
    return [new VNode(this._tagName, {}, this._buildChildren())];
  }
  run(){
    const vnode = this._build()[0];
    return vdom.create(vnode);
  }
  append(w){
    return new TagWriter(this._tagName, this._parent, this._children.concat([w]));
  }
}

// If/Else
class ConditionalWriter extends Writer {
  constructor(condition, parent, children = []){
    super(parent, children);
    this._condition = condition;
  }
  _build(){
    return this._condition ? this._buildChildren() : [];
  }
}
class IfWriter extends ConditionalWriter {
  $else(){
    return new ElseWriter(!this._condition, this._parent.append(this));
  }
  append(w){
    return new IfWriter(this._condition, this._parent, this._children.concat([w]));
  }
}
class ElseWriter extends ConditionalWriter {
  append(w){
    return new ElseWriter(this._condition, this._parent, this._children.concat([w]));
  }
}


//Export
const v = function(){
  return new TagWriter('div');
};
