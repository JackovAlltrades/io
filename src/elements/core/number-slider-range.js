import {IoElement} from '../../io.js';
import './slider.js';

export class IoNumberSliderRange extends IoElement {
  static get Style() {
    return /* css */`
    :host {
      display: flex;
      align-self: stretch;
      justify-self: stretch;
    }
    :host > io-number {
      flex: 0 0 calc(2 * var(--io-item-height));
    }
    :host > io-slider-range {
      margin-left: var(--io-spacing);
      margin-right: var(--io-spacing);
      flex: 1 1 calc(2 * var(--io-item-height));
      min-width: calc(2 * var(--io-item-height));
    }
    `;
  }
  static get Properties() {
    return {
      value: {
        type: Array,
        value: [0, 0],
        observe: true,
      },
      step: 0.01,
      conversion: 1,
      min: 0,
      max: 1,
      exponent: 1,
    };
  }
  _onNumberSet(event) {
    const item = event.composedPath()[0];
    if (item == this.$.number0) this.value[0] = event.detail.value;
    if (item == this.$.number1) this.value[1] = event.detail.value;
    event.detail.value = this.value;
    this.dispatchEvent('value-set', event.detail, false);
  }
  _onSliderSet() {
    this.value = event.detail.value;
    this.dispatchEvent('value-set', event.detail, false);
  }
  changed() {
    this.template([
      ['io-number', {
        id: 'number0',
        value: this.value[0],
        step: this.step,
        conversion: this.conversion,
        label: this.label,
        'on-value-set': this._onNumberSet,
      }],
      ['io-slider-range', {
        id: 'slider',
        // TODO: conversion
        value: this.value, // * this.conversion
        step: this.step, // * this.conversion,
        min: this.min, // * this.conversion,
        max: this.max, // * this.conversion,
        exponent: this.exponent,
        label: this.label,
        'on-value-set': this._onSliderSet,
      }],
      ['io-number', {
        id: 'number1',
        value: this.value[1],
        step: this.step,
        conversion: this.conversion,
        label: this.label,
        'on-value-set': this._onNumberSet,
      }],
    ]);
  }
}

IoNumberSliderRange.Register();
