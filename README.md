# Katamari Hack
Created by Alex Leone, David Nufer, and David Truong, March 2011. Ported to ES6 by Michael Feher

## How To:

Copy and paste this url into the location bar on any site that is not https:

```
javascript:var i,s,ss=['http://kathack.com/js/kh.js','http://ajax.googleapis.com/ajax/libs/jquery/1.5.1/jquery.min.js'];for(i=0;i!=ss.length;i++){s=document.createElement('script');s.src=ss[i];document.body.appendChild(s);}void(0);
```
(works best in chrome or firefox 4)


### What is this?
This is a "bookmarklet" that turns any page into Katamari Damacy. Try clicking the Katamari! link above.

This was the winner of the 2011 Yahoo HackU contest at University of Washington.

### How does it work?
Short version: css transforms (for things stuck to the katamari), canvas (drawing the katamari), and z-index (illusion of depth).

### Long version: 
The bookmarklet loads jQuery and kh.js into the current page. jQuery is used mostly for .offset() and .css().  kh.js is where all the action happens:

Splits all the text on the page into words/spans. (StickyNodes::addWords)
Builds a grid data structure so that intersections with elements can be found quickly (StickyNodes::finalize). Essentially grid[floor(x / 100)][floor(y / 100)] is a list of elements in a 100x100 pixel block. This should probably be an R-tree, but the hot-spot in this program is definitely in the rendering.
The ball and stripes are drawn in a canvas that gets moved around the page (i.e. position: absolute; left: x; top: y;). See PlayerBall::drawBall.
When an element is attached to the katamari, a clone is made. The original element is hidden. The new element is moved around by setting -webkit-transform. The transform rotates the element about the rolling axis of the katamari and scales the element to make it look like it's coming out of the page. See PlayerBall::drawAttached, transform_test.html, and transform_test2.html.



## Game Spec Runner

#### It can create StickyNodes on the current page

```javascript
stickyNodes = new _StickyNodes.default();

for (let i = 0, len = document.body.childNodes.length; i < len; i++) {
  let el = document.body.childNodes[i];
  stickyNodes.addTagNames(el, ['button', 'canvas', 'iframe', 'img', 'input', 'select', 'textarea']);
}

expect(stickyNodes.domNodes.length).to.equal(6);
```

#### It can create a new Game

```javascript
let gameDiv = document.createElement('div');
game = new _Game.default(gameDiv, stickyNodes, {
  color: '#ff0000',
  VOL_MULT: parseFloat(1.0),
  MAX_ATTACHED_VISIBLE: parseFloat(75),
  CHECK_VOLS: true,
  MOUSEB: parseInt(2)
});
expect(game.player1.color).to.equal('#ff0000');
```

#### It can run the game

```javascript
expect(game.init()).to.equal(undefined);
expect(game.run()).to.equal(undefined);
```

