/*
Copyright Alex Leone, David Nufer, David Truong, 2011-03-11. kathack.com

javascript:var i,s,ss=['http://kathack.com/js/kh.js','http://ajax.googleapis.com/ajax/libs/jquery/1.5.1/jquery.min.js'];for(i=0;i!=ss.length;i++){s=document.createElement('script');s.src=ss[i];document.body.appendChild(s);}void(0);

*/
import jQuery from 'jquery'

/**
 * PlayerBall
 */
class PlayerBall {
  /**
   * Create a new Player Ball with StickyNodes and attachs to
   * the Game container. Optionally takes a sound object
   * @param gameDiv {HTMLElement} The Game container to attach to
   * @param stickyNodes {StickyNode} An instance of StickyNodes
   * @param ballOpts {Object} The options from the form
   * @param sounds {Object} The audio player
   */
  constructor (gameDiv, stickyNodes, ballOpts, sounds) {
    this.x = 300
    this.y = 300
    this.vx = 0
    this.vy = 0
    this.radius = 20
    this.lastR = 0
    /** < optimization: only resize when necessary. */
    this.docW = 10000
    this.docH = 10000

    this.attached = []
    this.attachedDiv = document.createElement('div')
    /* div to put attached nodes into. */
    this.canvasEl = document.createElement('canvas')
    this.canvasCtx = undefined
    this.color = ballOpts.color

    this.accelTargetX = 0
    this.accelTargetY = 0
    this.accel = false

    this.VOL_MULT = ballOpts.VOL_MULT
    this.MAX_ATTACHED_VISIBLE = ballOpts.MAX_ATTACHED_VISIBLE
    this.CHECK_VOLS = ballOpts.CHECK_VOLS

    this.stickyNodes = stickyNodes
    this.gameDiv = gameDiv
    this.ballOpts = ballOpts
    this.sounds = sounds

    /**
     * which direction the ball is facing in the xy axis, in radians.
     * th: 0 is facing dead East
     * th: 1/2 PI is facing dead South
     * note that this is like regular th on a graph with y inverted.
     * Same rotation as css transform.
     */
    this.th = 0

    /**
     * Ball angle in the rotation axis / z plane, in radians.
     * phi: 0 is pointing in the direction the ball is rolling.
     * phi: 1/2 PI is pointing straight up (out of the page).
     * note that forward rotation means phi -= 0.1.
     */
    this.phi = 0

    this.CSS_TRANSFORM = null
    this.CSS_TRANSFORM_ORIGIN = null
    this.POSSIBLE_TRANSFORM_PREFIXES = ['-webkit-', '-moz-', '-o-', '-ms-', '']

    let i, d = document.createElement('div'), pre
    for (i = 0; i < this.POSSIBLE_TRANSFORM_PREFIXES.length; i++) {
      pre = this.POSSIBLE_TRANSFORM_PREFIXES[i]
      d.style.setProperty(pre + 'transform', 'rotate(1rad) scaleX(2)', null)
      if (d.style.getPropertyValue(pre + 'transform')) {
        this.CSS_TRANSFORM = pre + 'transform'
        this.CSS_TRANSFORM_ORIGIN = pre + 'transform-origin'
      }
    }
  }

  /**
   * Setup canvas and attach to Game container
   */
  init () {
    this.canvasEl.width = this.radius * 2
    this.canvasEl.height = this.radius * 2
    this.canvasEl.style.cssText = 'position: absolute; z-index: 500;'
    this.gameDiv.appendChild(this.canvasEl)
    this.canvasCtx = this.canvasEl.getContext('2d')
    this.gameDiv.appendChild(this.attachedDiv)
  }

  /**
   * Set X and Y state
   * @param sx {number} State of X
   * @param sy {number} State of Y
   */
  setXY (sx, sy) {
    this.x = sx
    this.y = sy
  }

  /**
   * Set The Document Size
   * @param w {number} Document Width
   * @param h {number} Document Height
   */
  setDocSize (w, h) {
    this.docW = w
    this.docH = h
  }

  /**
   * Enable/Disable Acceleration
   * @param bool
   */
  setAccel (bool) {
    this.accel = bool
  }

  /**
   * Set Acceleration Target
   * @param tx {number} Target X Acceleration
   * @param ty {number} Target Y Acceleration
   */
  setAccelTarget (tx, ty) {
    this.accelTargetX = tx
    this.accelTargetY = ty
  }

  /**
   * Get the volume of the PlayerBall
   * @returns {number}
   */
  getVol () {
    return (4 * Math.PI * this.radius * this.radius * this.radius / 3)
  }

  /**
   * Get GridObject Volume
   * @param go {GridObject} The GridObject
   * @returns {number}
   */
  gridObjVol (go) {
    return go.w * go.h * Math.min(go.w, go.h)
  }

  /**
   * Add the GridObject Volumne to the current PlayerBall Volume
   * @param go {GridObject} The GridObject
   */
  grow (go) {
    let newVol = this.getVol() + this.gridObjVol(go) * this.VOL_MULT
    this.radius = Math.pow(newVol * 3 / (4 * Math.PI), 1 / 3)
  }

  /**
   * Get the closest point to the PlayerBall
   * @param cx {number} Current X
   * @param cy {number} Current Y
   * @param go {GridObject} The GridObject
   * @returns {Array} Coordinates
   */
  getClosestPoint (cx, cy, go) {
    /* eslint-disable */
    var dx
    if (cx < go.left) {
      dx = go.left - cx
      if (cy < go.top) { /* zone 0. */
        return [go.left, go.top]
      } else if (cy <= go.bottom) { /* zone 3. */
        return [go.left, cy]
      } else { /* zone 6. */
        return [go.left, go.bottom]
      }
    } else if (cx <= go.right) {
      if (cy < go.top) { /* zone 1. */
        return [cx, go.top]
      } else if (cy <= go.bottom) { /* zone 4. */
        return [cx, cy]
      } else { /* zone 7. */
        return [cx, go.bottom]
      }
    } else {
      dx = cx - go.right
      if (cy < go.top) { /* zone 2. */
        return [go.right, go.top]
      } else if (cy <= go.bottom) { /* zone 5. */
        return [go.right, cy]
      } else { /* zone 9. */
        return [go.right, go.bottom]
      }
    }
    /* eslint-enabled */
  }

  /**
   * Attach GridObject to PlayerBall
   * @param go {GridObject} The GridObject
   */
  attachGridObj (go) {
    let attXY = this.getClosestPoint(this.x, this.y, go),
      dx = attXY[0] - this.x,
      dy = attXY[1] - this.y,
      r = Math.sqrt(dx * dx + dy * dy),
      attTh = 0 - this.th,
      offLeft = attXY[0] - go.left,
      offTop = attXY[1] - go.top,
      offTh = Math.atan2(dy, dx) - this.th,
      attX = r * Math.cos(offTh),
      attY = r * Math.sin(offTh),
      el = go.el.cloneNode(true),
      gojel = jQuery(go.el),
      newAtt = {
        el: el,
        attX: attX,
        attY: attY,
        attT: 'translate(' + Math.round(attX) + 'px,' +
          Math.round(attY) + 'px) ' +
          'rotate(' + attTh + 'rad)',
        r: r,
        offTh: offTh,
        offPhi: 0 - this.phi,
        diag: go.diag,
        removeR: r + go.diag,
        visible: false,
        display: gojel.css('display')
      }
    // console.log(gojel, this.CSS_TRANSFORM_ORIGIN)
    this.attached.push(newAtt)
    this.grow(go)
    el.style.position = 'absolute'
    el.style.left = (-offLeft) + 'px'
    el.style.top = (-offTop) + 'px'
    el.style.setProperty(this.CSS_TRANSFORM_ORIGIN,
      offLeft + 'px ' + offTop + 'px', null)
    el.style.display = 'none'
    /* copy computed styles from old object. */
    el.style.color = gojel.css('color')
    el.style.textDecoration = gojel.css('text-decoration')
    el.style.fontSize = gojel.css('font-size')
    el.style.fontWeight = gojel.css('font-weight')
    el.khIgnore = true
    this.attachedDiv.appendChild(el)
    // if (this.sounds) {
    //   this.sounds.play_pop()
    // }
  }

  /**
   * Returns true if the object should be removed from stickyNodes.
   * @param go {GridObject} The GridObject
   * @return {boolean} Flag for removal
   */
  removeIntCb (go) {
    if (this.CHECK_VOLS && this.gridObjVol(go) > this.getVol()) {
      return false
    }
    this.attachGridObj(go)
    return true
  }

  /**
   * Update the PlayerBall Physics
   */
  updatePhysics () {
    let oldX = this.x, oldY = this.y, dx, dy,
      bounce = false,
      accelTh
    if (this.accel) {
      accelTh = Math.atan2(this.accelTargetY - this.y, this.accelTargetX - this.x)
      this.vx += Math.cos(accelTh) * 0.5
      this.vy += Math.sin(accelTh) * 0.5
    } else {
      this.vx *= 0.95
      this.vy *= 0.95
    }
    this.x += this.vx
    this.y += this.vy
    /* bounce ball on edges of document. */
    if (this.x - this.radius < 0) {
      bounce = true
      this.x = this.radius + 1
      this.vx = -this.vx
    } else if (this.x + this.radius > this.docW) {
      bounce = true
      this.x = this.docW - this.radius - 1
      this.vx = -this.vx
    }
    if (this.y - this.radius < 0) {
      bounce = true
      this.y = this.radius + 1
      this.vy = -this.vy
    } else if (this.y + this.radius > this.docH) {
      bounce = true
      this.y = this.docH - this.radius - 1
      this.vy = -this.vy
    }
    if (this.vx !== 0 || this.vy !== 0) {
      this.th = Math.atan2(this.vy, this.vx)
      dx = this.x - oldX
      dy = this.y - oldY
      /* arclen = th * r,    so   th = arclen / r. */
      this.phi -= Math.sqrt(dx * dx + dy * dy) / this.radius
    }
    this.stickyNodes.removeIntersecting(this.x, this.y, this.radius, (go) => {
      return this.removeIntCb(go)
    })
    this.draw()
    if (bounce && this.sounds) {
      this.sounds.play_bounce()
    }
  }

  /**
   * Ball Renderer
   */
  drawBall () {
    var sx1, sy1, sx2, sy2, dx, dy, i, pct1, pct2, z1, z2
    /* move/resize canvas element. */
    this.canvasEl.style.left = (this.x - this.radius) + 'px'
    this.canvasEl.style.top = (this.y - this.radius) + 'px'
    if (this.radius !== this.lastR) {
      this.canvasEl.width = 2 * this.radius + 1
      this.canvasEl.height = 2 * this.radius + 1
      this.lastR = this.radius
    }
    /* draw white circle. */
    this.canvasCtx.clearRect(0, 0, 2 * this.radius, 2 * this.radius)
    this.canvasCtx.fillStyle = '#fff'
    this.canvasCtx.beginPath()
    this.canvasCtx.arc(this.radius, this.radius, this.radius - 1, 0, Math.PI * 2, true)
    this.canvasCtx.fill()
    /* draw outer border. */
    this.canvasCtx.strokeStyle = this.color
    this.canvasCtx.beginPath()
    this.canvasCtx.arc(this.radius, this.radius, this.radius - 1, 0, Math.PI * 2, true)
    this.canvasCtx.stroke()
    /* draw stripes. */
    this.canvasCtx.fillStyle = this.color
    sx1 = this.radius + this.radius * Math.cos(this.th + Math.PI / 16)
    sy1 = this.radius + this.radius * Math.sin(this.th + Math.PI / 16)
    sx2 = this.radius + this.radius * Math.cos(this.th - Math.PI / 16)
    sy2 = this.radius + this.radius * Math.sin(this.th - Math.PI / 16)
    dx = (this.radius + this.radius * Math.cos(this.th + Math.PI * 15 / 16)) - sx1
    dy = (this.radius + this.radius * Math.sin(this.th + Math.PI * 15 / 16)) - sy1
    for (i = 0; i < Math.PI * 2; i += Math.PI / 7) {
      pct1 = (-Math.cos(this.phi + i) + 1) / 2
      pct2 = (-Math.cos(this.phi + i + Math.PI / 32) + 1) / 2
      z1 = Math.sin(this.phi + i)
      z2 = Math.sin(this.phi + i + Math.PI / 32)
      if (z1 > 0 && z2 > 0) {
        this.canvasCtx.beginPath()
        this.canvasCtx.moveTo(sx1 + pct1 * dx, sy1 + pct1 * dy)
        this.canvasCtx.lineTo(sx1 + pct2 * dx, sy1 + pct2 * dy)
        this.canvasCtx.lineTo(sx2 + pct2 * dx, sy2 + pct2 * dy)
        this.canvasCtx.lineTo(sx2 + pct1 * dx, sy2 + pct1 * dy)
        this.canvasCtx.fill()
      }
    }
  }

  /**
   * Returns true if the attached object is roughly visible.
   * @param att {HTMLElement} Attached Object
   * @returns {boolean}
   */
  drawAttached (att) {
    let oth = this.th + att.offTh,
      ophi = this.phi + att.offPhi,
      ox = att.r * Math.cos(oth),
      oy = att.r * Math.sin(oth),
      dx = (att.r * Math.cos((this.th - att.offTh) + Math.PI)) - ox,
      dy = (att.r * Math.sin((this.th - att.offTh) + Math.PI)) - oy,
      pct = (-Math.cos(ophi) + 1) / 2,
      cx = ox + pct * dx,
      cy = oy + pct * dy,
      oz = att.r * Math.sin(ophi)
    if (oz < 0 && Math.sqrt(cx * cx + cy * cy) + att.diag < this.radius) {
      /* hidden behind circle. */
      if (att.visible) {
        att.visible = false
        att.el.style.display = 'none'
      }
      return false
    }
    /* attached node is visible. */
    if (!att.visible) {
      att.visible = true
      att.el.style.display = att.display
    }
    // att.el.style.zIndex = 500 + Math.round(oz)
    att.el.style.zIndex = (oz > 0) ? 501 : 499
    att.el.style.setProperty(
      this.CSS_TRANSFORM,
      'translate(' + this.x + 'px,' + this.y + 'px) ' +
      'rotate(' + this.th + 'rad) ' +
      'scaleX(' + Math.cos(ophi) + ') ' +
      att.attT, null)
    return true
  }

  /**
   * Remove attached element from PlayerBall
   * @param att {HTMLElement} Attached Object
   */
  onAttachedRemoved (att) {
    this.attachedDiv.removeChild(att.el)
    delete att.el
  }

  /**
   * Renderer
   */
  draw () {
    let i, att, numAttachedVisible = 0
    this.drawBall()
    for (i = this.attached.length; --i >= 0;) {
      att = this.attached[i]
      if (att.removeR < this.radius) {
        this.attached.splice(i, 1).map(a => this.onAttachedRemoved(a))
      } else if (this.drawAttached(att)) {
        if (++numAttachedVisible > this.MAX_ATTACHED_VISIBLE) {
          /* remove older items and stop. */
          this.attached.splice(0, i).map(a => this.onAttachedRemoved(a))
          break
        }
      }
    }
  }
}

export default PlayerBall
