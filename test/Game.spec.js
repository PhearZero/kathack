/**
 * @jest-environment jsdom
 */
// Spy on scrollTo since not it's not implemented in jsdom
const scrollSpy = jest.fn()
global.scrollTo = scrollSpy
const chai = require('chai')
const expect = chai.expect

import m from 'mithril'

import Game from '@/Game.js'
import StickyNodes from '@/StickyNodes.js'

let stickyNodes, root, game
describe('Game Spec Runner', function () {
  beforeAll(() => {
    root = document.body
    m.render(root, [
      m('test', [
        m('h1', { class: 'title' }, 'My First App'),
        m('h1', { class: 'title' }, 'Great Things'),
        m('h1', { class: 'title' }, 'More Great Things'),
        m('h1', { class: 'title' }, 'Wow! Amazing!!'),
        m('h1', { class: 'title' }, 'Even Better!'),
        m('button', 'A button'),
        m('iframe', { src: 'http://example.com' }),
        m('img', { src: 'https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg' }),
        m('input'),
        m('select', { className: 'form-control' }, [m('option', 'One'), m('option', 'Two')]),
        m('textarea')
      ])
    ])
  })

  it('can create StickyNodes on the current page', () => {
    stickyNodes = new StickyNodes()
    for (let i = 0, len = document.body.childNodes.length; i < len; i++) {
      let el = document.body.childNodes[i]
      stickyNodes.addTagNames(el, [
        'button', 'canvas', 'iframe', 'img', 'input', 'select',
        'textarea'
      ])
    }

    expect(stickyNodes.domNodes.length).to.equal(6)
  })

  it('can create a new Game', () => {
    let gameDiv = document.createElement('div')
    game = new Game(gameDiv, stickyNodes, {
      color: '#ff0000',
      VOL_MULT: parseFloat(1.0),
      MAX_ATTACHED_VISIBLE: parseFloat(75),
      CHECK_VOLS: true,
      MOUSEB: parseInt(2)
    })

    expect(game.player1.color).to.equal('#ff0000')
  })

  it('can run the game', () => {
    expect(game.init()).to.equal(undefined)
    expect(game.run()).to.equal(undefined)
  })
})
