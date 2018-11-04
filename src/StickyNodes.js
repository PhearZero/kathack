/*
Copyright Alex Leone, David Nufer, David Truong, 2011-03-11. kathack.com

javascript:var i,s,ss=['http://kathack.com/js/kh.js','http://ajax.googleapis.com/ajax/libs/jquery/1.5.1/jquery.min.js'];for(i=0;i!=ss.length;i++){s=document.createElement('script');s.src=ss[i];document.body.appendChild(s);}void(0);

*/

import jQuery from 'jquery'
let BORDER_STYLE = '1px solid #bbb'

class StickyNodes {
  constructor () {
    this.domNodes = []
    this.grid = []
    this.GRIDX = 100
    this.GRIDY = 100
    /* eslint-disable */
    this.REPLACE_WORDS_IN = {
      a: 1, b: 1, big: 1, body: 1, cite: 1, code: 1, dd: 1, div: 1,
      dt: 1, em: 1, font: 1, h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1,
      i: 1, label: 1, legend: 1, li: 1, p: 1, pre: 1, small: 1,
      span: 1, strong: 1, sub: 1, sup: 1, td: 1, th: 1, tt: 1
    }
    /* eslint-enable */
  }

  addDomNode (el) {
    if (el !== undefined && el !== null) {
      el.khIgnore = true
      el.style.border = BORDER_STYLE
      this.domNodes.push(el)
    }
  }

  addWords (el) {
    let textEls = []
    const shouldAddChildren = (el) => {
      return el.tagName && this.REPLACE_WORDS_IN[el.tagName.toLowerCase()]
    }

    const buildTextEls = (el, shouldAdd) => {
      let i, len
      if (shouldAdd && el.nodeType === Node.TEXT_NODE &&
        el.nodeValue.trim().length > 0) {
        textEls.push(el)
        return
      }
      if (!el.childNodes || el.khIgnore) {
        return
      }
      shouldAdd = shouldAddChildren(el)
      for (i = 0, len = el.childNodes.length; i < len; i++) {
        buildTextEls(el.childNodes[i], shouldAdd)
      }
    }

    const wordsToSpans = (textEl) => {
      let p = textEl.parentNode,
        words = textEl.nodeValue.split(/\s+/),
        ws = textEl.nodeValue.split(/\S+/),
        i, n, len = Math.max(words.length, ws.length)
      /* preserve whitespace for pre tags. */
      if (ws.length > 0 && ws[0].length === 0) {
        ws.shift()
      }
      for (i = 0; i < len; i++) {
        if (i < words.length && words[i].length > 0) {
          n = document.createElement('span')
          n.innerHTML = words[i]
          p.insertBefore(n, textEl)
          this.addDomNode(n)
        }
        if (i < ws.length && ws[i].length > 0) {
          n = document.createTextNode(ws[i])
          p.insertBefore(n, textEl)
        }
      }
      p.removeChild(textEl)
    }

    buildTextEls(el, shouldAddChildren(el))
    textEls.map(wordsToSpans)
  }

  /* includes el. */
  addTagNames (el, tagNames) {
    let tname = el.tagName && el.tagName.toLowerCase(),
      i, j, els, len
    if (el.khIgnore) {
      return
    }
    if (tagNames.indexOf(tname) !== -1) {
      this.addDomNode(el)
    }
    if (!el.getElementsByTagName) {
      return
    }
    for (i = 0; i < tagNames.length; i++) {
      els = el.getElementsByTagName(tagNames[i])
      for (j = 0, len = els.length; j < len; j++) {
        if (!els[j].khIgnore) {
          this.addDomNode(els[j])
        }
      }
    }
  }

  finalize (docW, docH) {
    let xi, yi, i, len, startXI, startYI, el, go, off, w, h,
      endXI = Math.floor(docW / this.GRIDX) + 1,
      endYI = Math.floor(docH / this.GRIDY) + 1
    /* initialize grid. */
    this.grid = new Array(endXI)
    for (xi = 0; xi < endXI; xi++) {
      this.grid[xi] = new Array(endYI)
    }
    /* add nodes into grid. */
    for (i = 0, len = this.domNodes.length; i < len; i++) {
      el = this.domNodes[i]
      if (el.khPicked) {
        continue
      }
      off = jQuery(el).offset()
      w = jQuery(el).width()
      h = jQuery(el).height()
      go = {
        el: this.domNodes[i], /* dom element. */
        left: off.left,
        right: off.left + w,
        top: off.top,
        bottom: off.top + h,
        w: w,
        h: h,
        x: off.left + (w / 2), /* center x. */
        y: off.top + (h / 2), /* center y. */
        diag: Math.sqrt(((w * w) + (h * h)) / 4), /* center to corner */

        /* these are for removing ourselves from the grid. */
        arrs: [], /* which arrays we're in (grid[x][y]). */
        idxs: [] /* what indexes. */
      }
      startXI = Math.floor(go.left / this.GRIDX)
      startYI = Math.floor(go.top / this.GRIDY)
      endXI = Math.floor((go.left + go.w) / this.GRIDX) + 1
      endYI = Math.floor((go.top + go.h) / this.GRIDY) + 1
      for (xi = startXI; xi < endXI; xi++) {
        for (yi = startYI; yi < endYI; yi++) {
          if (this.grid[xi] === undefined) {
            this.grid[xi] = []
          }
          if (this.grid[xi][yi] === undefined) {
            this.grid[xi][yi] = [go]
          } else {
            this.grid[xi][yi].push(go)
          }
          go.arrs.push(this.grid[xi][yi])
          go.idxs.push(this.grid[xi][yi].length - 1)
        }
      }
    }
  }

  removeGridObj (go) {
    let i
    for (i = 0; i < go.arrs.length; i++) {
      go.arrs[i][go.idxs[i]] = undefined
    }
    go.el.style.visibility = 'hidden'
    go.el.khPicked = true
    delete go.arrs
    delete go.idxs
  }

  /**
   * cb(gridObj) -> boolean true if the object should be removed.
   */
  removeIntersecting (x, y, r, cb) {
    // console.log('remove intesecting', x, y, r, cb)
    let xi, yi, arr, i, r2 = r * r, go,
      startXI = Math.floor((x - r) / this.GRIDX),
      startYI = Math.floor((y - r) / this.GRIDY),
      endXI = Math.floor((x + r) / this.GRIDX) + 1,
      endYI = Math.floor((y + r) / this.GRIDY) + 1
    for (xi = startXI; xi < endXI; xi++) {
      if (this.grid[xi] === undefined) {
        continue
      }
      for (yi = startYI; yi < endYI; yi++) {
        arr = this.grid[xi][yi]
        if (arr === undefined) {
          continue
        }
        for (i = 0; i < arr.length; i++) {
          go = arr[i]
          if (typeof go === 'undefined') {
            console.log(arr, i)
          }
          if (go !== undefined && this.circleGridObjInt(x, y, r, r2, go) && cb(go)) {
            console.log('REMOVE ME!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
            this.removeGridObj(go)
          }
        }
      }
    }
  }

  circleGridObjInt (cx, cy, cr, cr2, go) {
    var dx, dy
    if (cx < go.left) {
      dx = go.left - cx
      if (cy < go.top) { /* zone 0. */
        dy = go.top - cy
        return ((dx * dx + dy * dy) <= cr2)
      } else if (cy <= go.bottom) { /* zone 3. */
        return (dx <= cr)
      } else { /* zone 6. */
        dy = cy - go.bottom
        return ((dx * dx + dy * dy) <= cr2)
      }
    } else if (cx <= go.right) {
      if (cy < go.top) { /* zone 1. */
        return ((go.top - cy) <= cr)
      } else if (cy <= go.bottom) { /* zone 4. */
        return true
      } else { /* zone 7. */
        return ((cy - go.bottom) <= cr)
      }
    } else {
      dx = cx - go.right
      if (cy < go.top) { /* zone 2. */
        dy = go.top - cy
        return ((dx * dx + dy * dy) <= cr2)
      } else if (cy <= go.bottom) { /* zone 5. */
        return (dx <= cr)
      } else { /* zone 9. */
        dy = cy - go.bottom
        return ((dx * dx + dy * dy) <= cr2)
      }
    }
  }
}

export default StickyNodes
