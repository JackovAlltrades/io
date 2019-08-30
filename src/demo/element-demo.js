import {html, IoElement, Binding, IoStorage as $} from "../io.js";
import {IoThemeSingleton, IoThemeSingleton as mixin} from "../io-core.js";

const demoValues = {
  'demo:boolean': $('demo:boolean', true),
  'demo:string': $('demo:string', 'Hello io!'),
  'demo:leet': $('demo:leet', 1337),
  'demo:number': $('demo:number', 0),
  'demo:theme': IoThemeSingleton.bind('theme'),
};

export class IoElementDemo extends IoElement {
  static get Style() {
    return html`<style>
      :host {
        ${mixin.panel}
      }
      :host {
        position: relative;
      }
      :host > io-boolicon {
        z-index: 2;
        position: absolute;
        top: calc(calc(2 * var(--io-spacing)) + var(--io-border-width));
        right: calc(calc(2 * var(--io-spacing)) + var(--io-border-width));
      }
      :host > io-boolicon:not([value]):not(:hover) {
        opacity: 0.5;
      }
      :host > io-properties {
        align-self: stretch;
        padding: var(--io-spacing) 0;
        margin: var(--io-border-width);
        margin-right: var(--io-spacing);
        margin-bottom: calc(2 * var(--io-spacing));
      }
      :host > io-properties > :nth-child(2) {
        margin-right: calc(var(--io-item-height) + var(--io-spacing));
      }
      :host:not([expanded]) > .io-frame {
        margin-right: calc(var(--io-item-height) + calc(3 * var(--io-spacing)));
      }
    </style>`;
  }
  static get Properties() {
    return {
      element: {
        type: String,
        reflect: -1,
      },
      properties: {
        type: Object,
        reflect: -1,
      },
      width: {
        type: String,
        reflect: -1,
      },
      height: {
        type: String,
        reflect: -1,
      },
      config: {
        type: Object,
        reflect: -1,
      },
      expanded: {
        type: Boolean,
        reflect: 2,
      }
    };
  }
  _onPropSet(event) {
    if (this.properties[event.detail.property] !== undefined) {
      this.properties[event.detail.property] = event.detail.value;
    }
    this.dispatchEvent('object-mutated', {
      object: this.properties,
      property: event.detail.property,
      value: event.detail.value,
      oldValue: event.detail.oldValue,
    }, false, window);
  }
  propMutated(prop) {
    for (let p in this.properties) {
      if (typeof this.properties[p] === 'object') {
        this._bubbleMutation(this.properties[p], this.properties, this[prop]);
      }
    }
  }
  _bubbleMutation(object, parentObject, srcObject) {
    if (object instanceof Binding) return; // Unhack
    if (object === srcObject) {
      this.dispatchEvent('object-mutated', {
        object: parentObject,
      }, false, window);
    } else {
      for (let p in object) {
        if (typeof object[p] === 'object') {
          this._bubbleMutation(object[p], object, srcObject);
        }
      }
    }
  }
  changed() {
    for (let prop in this.properties) {
      if (this.properties[prop] === 'undefined') {
        this.properties[prop] = undefined;
      } else if (typeof this.properties[prop] === 'string') {
        // Unhack
        if (demoValues[this.properties[prop]] !== undefined) {
          this.properties[prop] = demoValues[this.properties[prop]];
        }
      }
      this.properties['on-' + prop + '-changed'] = this._onPropSet;
    }
    if (this.element) {
      const hasProps = !!Object.keys(this.properties).length;
      this.template([
        hasProps ? ['io-boolicon', {value: this.bind('expanded'), true: 'icons:gear', false: 'icons:gear'}] : null,
        (hasProps && this.expanded) ?
        ['io-properties', {value: this.properties, config: Object.assign({
            'type:number': ['io-number', {step: 0.00001}],
            'type:boolean': ['io-switch'],
          }, this.config)}] : null,
        ['div', {class: 'io-frame'}, [
          [this.element, Object.assign({'id': 'demo-element'}, this.properties)],
        ]],
       ]);
       if (this.$['demo-element']) {
         if (this.width) this.$['demo-element'].style.width = this.width;
         if (this.height) this.$['demo-element'].style.height = this.height;
       }
    } else {
      this.template([null]);
    }
  }
}

IoElementDemo.Register();