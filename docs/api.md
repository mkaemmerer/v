## API

#### Creating tags
```typescript
v.open(tagName: string, properties: Object<<string>>)
```
The open method creates a new DOM with the given tag name.
You can optionally pass a properties object to set attributes on the created tag.

Open returns a new `v` object, so that chaining calls to `open` will create *nested* tags.
You can think of `open('div')` as similar to the HTML snippet `<div>` --
until you close the div, tags you write afterwards will be children of the div.


```typescript
v.close()
```
The close method returns a new `v` object for the *parent* tag.
It can be thought of as *closing* the current tag, like you would by writing `</div>`.


By using `open` in combination with `close`, you can create DOM trees using a style that resembles the way you'd write HTML.
```javascript
  var list = v
    .open('div')
      .open('h1').text('A list of cool things').close()
      .open('ul')
        .open('li').text('Bacon').close()
        .open('li').text('virtual-dom').close()
        .open('li').text('v').close()
      .close()
    .close();

  /* Results in:
   * <div>
   *   <h1>A list of cool things</h1>
   *   <ul>
   *     <li>Bacon</li>
   *     <li>virtual-dom</li>
   *     <li>v</li>
   *   </ul>
   * </div>
   */
```


#### Creating text
```typescript
v.text(text: <<string>>)
```
Use `text` to insert escaped text into an element.


#### Control flow
```typescript
v.$if(condition: <<boolean>>)
```
Use `$if` to create tags only when the condition is true.


```typescript
v.$else()
```
Use `$else` following a call to `$if`, to create tags only when the condition is false.


```typescript
v.each(array: <<array>>)
```
Use the `each` method to iterate over an array, creating tags for each element.
Within an `each` block, you can use functions to access the current array element, when passing arguments to `text`, `$if`, etc.


#### Running
```typescript
v.run()
```

`run` returns a DOMElement for the structure you've declared using the other methods of `v` (`open`, `close`, etc.).
If you used any reactive properties to declare your virtual DOM structure, `run` will handle automatically patching the DOMElement for you, when any of your properties have changed.


#### Polymorphic &lt;&lt;Values&gt;&gt;
There are many methods in `v` that are polymorphic in some or all of their arguments.
These are marked with double angle brackets, i.e. `<<type>>`.
Polymorphic values allow you to pass in regular values, functions for accessing loop data, or `Bacon` properties interchangeably.

For example, a `<<string>>` can be any of the following:

* a `string` constant.
* a Bacon Property of `string`.
* a function `data -> string`, which should return a `string` when called with the current loop data.
