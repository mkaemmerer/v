# V

`v` is a domain specific language for creating [virtual-dom](https://github.com/Matt-Esch/virtual-dom) nodes.
It features a clean interface for dealing with control flow like if/else, and looping,
and integrates with [Bacon](https://github.com/baconjs/bacon.js) to automatically handle patching the DOM.


## Examples

Creating a static list:
```javascript
var e = v
  .open('div')
    .open('h1').text('A list of cool things').close()
    .open('ul')
      .open('li').text('Bacon').close()
      .open('li').text('virtual-dom').close()
      .open('li').text('v').close()
    .close()
  .run();

document.body.appendChild(e);
```

Creating a dynamic clock:
```javascript
let time    = Bacon.fromPoll(1000, () => new Date());
let hours   = time.map(d => d.getHours());
let minutes = time.map(d => d.getMinutes());
let seconds = time.map(d => d.getSeconds());

let e = v
  .open('div', {'class': 'clock'})
    .open('span', {'class': 'clock_hours'})
      .text(hours)
    .close()

    .text(':')

    .open('span', {'class': 'clock_minutes'})
      .text(minutes)
    .close()

    .text(':')

    .open('span', {'class': 'clock_seconds'})
      .text(seconds)
    .close()
  .run();

document.body.appendChild(e);
```


## Learning `v`

* [API Docs](docs/api.md)
* [More examples](examples)


## Get it
TODO: register on npm (find a name that isn't taken)

There are three ways you can use `v`:

As a commonjs module
```javascript
var v = require('v');
```

As an amd module:
```javascript
define(['v'], function(v){
  //...
});
```

From `window`. If you are not using a module loader, `v` is exported to `window`, so it is still available using a &lt;script&gt; tag. Make sure you load `Bacon` and `virtualDom` before `v`.
```javascript
var v = window.v;
```


## Comparing `v` to `h`

#### Control flow
If you've used virtual-dom
Compared to `h`, `v` has a much cleaner interface for handling control flow logic.

[TODO: example using 'h', and using 'v']

#### Functional Reactive Programming
`v` 💖 `Bacon`!

`v` is built to take advantage of functional reactive programming.
Rather than defining your templates as snapshots in time, `v` encourages you view your templates as *elements that evolve over time*. (i.e. think `Property<data> -> Property<VTree>`, instead of `data -> VTree`).

You can also use `v` to automatically patch your elements as their inputs update, using `run`.
This way, you avoid the imperative "create -> diff -> patch" dance that you usually have to do when using `virtual-dom`.
