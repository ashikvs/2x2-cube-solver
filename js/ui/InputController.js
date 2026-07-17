/**
 * @file InputController.js
 * @module ui/InputController
 *
 * Owns the sticker-color state of the editable faces and translates user clicks
 * into color changes. It knows about the DOM only through the
 * {@link module:ui/Renderer~Renderer} it is given, and it knows nothing about
 * validation or solving – it simply exposes the current colors on request.
 */

import { COLORS } from './Renderer.js';

/** The faces the user can edit (the Down face is fixed and solved). */
export const EDITABLE_FACES = Object.freeze(['U', 'R', 'F', 'L', 'B']);

/** All faces, including the locked Down face. */
export const ALL_FACES = Object.freeze(['U', 'R', 'F', 'D', 'L', 'B']);

/**
 * The starting (solved) colors for each face. Down is White, and the sides use
 * a standard opposite-color scheme so the app opens on a valid, solved cube.
 * @returns {Object<string, number[]>}
 */
function solvedColors() {
  return {
    U: [1, 1, 1, 1], // Yellow
    D: [0, 0, 0, 0], // White (locked)
    F: [2, 2, 2, 2], // Red
    B: [3, 3, 3, 3], // Orange
    L: [4, 4, 4, 4], // Blue
    R: [5, 5, 5, 5], // Green
  };
}

export class InputController {
  /**
   * @param {import('./Renderer.js').Renderer} renderer The view to paint into.
   * @param {() => void} [onChange] Called whenever a sticker color changes.
   */
  constructor(renderer, onChange = () => {}) {
    this.renderer = renderer;
    this.onChange = onChange;
    /** @type {Object<string, number[]>} */
    this.colors = solvedColors();
  }

  /**
   * Build the net and wire up click handling via event delegation.
   */
  init() {
    this.renderer.buildNet(ALL_FACES, new Set(['D']));
    this.renderer.paintAll(this.colors);
    this.renderer.net.addEventListener('click', (event) => this.handleClick(event));
  }

  /**
   * Cycle a sticker's color when its cell is clicked.
   * @param {MouseEvent} event
   */
  handleClick(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const face = target.dataset.face;
    const index = target.dataset.index;
    if (face === undefined || index === undefined) return;
    if (!EDITABLE_FACES.includes(face)) return;

    const i = Number(index);
    this.colors[face][i] = (this.colors[face][i] + 1) % COLORS.length;
    this.renderer.paintFace(face, this.colors[face]);
    this.onChange();
  }

  /**
   * A deep copy of the current sticker colors.
   * @returns {Object<string, number[]>}
   */
  getColors() {
    const copy = {};
    for (const face of ALL_FACES) copy[face] = this.colors[face].slice();
    return copy;
  }

  /**
   * Replace the current sticker colors and repaint. Used by the practice mode
   * to load a generated scramble into the net.
   * @param {Object<string, number[]>} facesColors face → `[TL,TR,BL,BR]` colors.
   */
  setColors(facesColors) {
    for (const face of ALL_FACES) {
      if (facesColors[face]) this.colors[face] = facesColors[face].slice();
    }
    this.renderer.paintAll(this.colors);
    this.onChange();
  }

  /**
   * Reset every face back to the solved cube.
   */
  reset() {
    this.colors = solvedColors();
    this.renderer.paintAll(this.colors);
    this.onChange();
  }
}
