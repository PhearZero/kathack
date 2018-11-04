/*
Copyright Alex Leone, David Nufer, David Truong, 2011-03-11. kathack.com

javascript:var i,s,ss=['http://kathack.com/js/kh.js','http://ajax.googleapis.com/ajax/libs/jquery/1.5.1/jquery.min.js'];for(i=0;i!=ss.length;i++){s=document.createElement('script');s.src=ss[i];document.body.appendChild(s);}void(0);

*/

import PlayerBall from './PlayerBall'
import jQuery from 'jquery'

/**
 * Game Class
 */
class Game {
  /**
   * Creates a new Game with Event bindings
   * @param gameDiv
   * @param stickyNodes
   * @param ballOpts
   */
  constructor (gameDiv, stickyNodes, ballOpts) {
    this.ballOpts = ballOpts
    this.player1 = new PlayerBall(gameDiv, stickyNodes, ballOpts, false)
    this.player1.init()
    this.player1.setXY(jQuery(document).width() / 2, jQuery(document).height() / 2)
    this.physicsInterval = false
    this.resizeInterval = false
  }

  init () {
    window.scrollTo(0, 200)

    this.onResize()

    /* touch events - always on? */
    document.addEventListener('touchstart', event => this.touchStart(event), true)
    document.addEventListener('touchmove', event => this.touchMove(event), true)
    document.addEventListener('touchend', event => this.touchEnd(event), true)

    if (this.ballOpts.MOUSEB !== -5) {
      /* mouse buttons */
      document.addEventListener('mousemove', event => this.mouseMove(event), true)
      document.addEventListener('mousedown', event => this.mouseDown(event), true)
      document.addEventListener('mouseup', event => this.mouseUp(event), true)

      if (this.ballOpts.MOUSEB === 0) {
        /* block click events. */
        document.addEventListener('click', event => this.click(event), true)
      } else if (this.ballOpts.MOUSEB === 2) {
        /* block right-click context menu. */
        document.addEventListener('contextmenu', event => this.preventDefault(event), true)
      }
    }
  }

  click (event) {
    if (event.button === 0) {
      return this.preventDefault(event)
    }
  }

  mouseMove (event) {
    this.player1.setAccelTarget(event.pageX, event.pageY)
  }

  mouseUp (event) {
    if (event.button === this.ballOpts.MOUSEB) {
      this.player1.setAccel(false)
      return this.preventDefault(event)
    }
  }

  mouseDown (event) {
    if (event.button === this.ballOpts.MOUSEB) {
      this.player1.setAccel(true)
      return this.preventDefault(event)
    }
  }

  touchEnd (event) {
    if (event.touches.length === 0) {
      this.player1.setAccel(false)
      return this.preventDefault(event)
    }
  }

  touchMove (event) {
    this.player1.setAccelTarget(event.touches[0].pageX,
      event.touches[0].pageY)
  }

  touchStart (event) {
    if (event.touches.length === 1) {
      this.player1.setAccel(true)
      return this.preventDefault(event)
    }
  }

  preventDefault (event) {
    event.preventDefault()
    event.returnValue = false
    return false
  }

  onResize () {
    this.player1.setDocSize(jQuery(document).width() - 5, jQuery(document).height() - 5)
  }

  stop () {
    if (this.physicsInterval && this.resizeInterval) {
      clearInterval(this.physicsInterval)
      clearInterval(this.resizeInterval)
    }
  }

  run () {
    this.physicsInterval = setInterval(() => {
      this.player1.updatePhysics()
    }, 25)
    this.resizeInterval = setInterval(() => {
      this.onResize()
    }, 1000)
  }
}

export default Game
