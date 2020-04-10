import { IoNode, IoElement, Binding } from './io.js';

// TODO: test different value types

class EmulatedLocalStorage {
  get permited() {
    try {
      return self.localStorage.getItem('io-storage-user-permitted');
    } catch (error) {
      console.warn('IoStorage: Cannot access localStorage. Check browser privacy settings!');
    }
    return undefined;
  }
  set permited(value) {
    try {
      self.localStorage.setItem('io-storage-user-permitted', value);
      const permited = self.localStorage.getItem('io-storage-user-permitted');
      if (permited === 'true') {
        for (let i in this.store) {
          self.localStorage.setItem(i, this.store[i]);
          delete this.store[i];
        }
        console.log('IoStorage: Saved localStorage state.');
      }
    } catch (error) {
      console.warn('IoStorage: Cannot access localStorage. Check browser privacy settings!');
    }
  }
  constructor() {
    Object.defineProperty(this, 'store', {value: {}, writable: true});
    Object.defineProperty(this, 'warned', {value: false, writable: true});
  }
  setItem(key, value) {
    if (this.permited === 'true') {
      self.localStorage.setItem(key, value);
    } else {
      this.store[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      if (!this.warned) {
        if (this.permited === 'false') {
          console.warn('IoStorage: localStorage permission denied by user.');
        } else {
          console.warn('IoStorage: localStorage pending permission by user.');
        }
        this.warned = true;
      }
      if (key === 'io-storage-user-permitted') {
        this.permited = this.store[key];
      }
    }
  }
  getItem(key) {
    if (this.permited === 'true') {
      return self.localStorage.getItem(key);
    } else {
      return this.store[key];
    }
  }
  removeItem(key) {
    if (this.permited === 'true') {
      return self.localStorage.removeItem(key);
    } else {
      delete this.store[key];
    }
  }
  clear() {
    if (this.permited === 'true') {
      return self.localStorage.clear();
    } else {
      this.store = {};
    }
  }
}

const localStorage = new EmulatedLocalStorage();

const nodes = {};
let hashes = {};

const parseHashes = function() {
  return self.location.hash.substr(1).split('&').reduce(function (result, item) {
    const parts = item.split('=');
    result[parts[0]] = parts[1];
    return result;
  }, {});
};

const getHashes = function() {
  hashes = parseHashes();
  for (let hash in hashes) {
    if (nodes[hash]) {
      if (nodes[hash] !== '') {
        const hashValue = hashes[hash].replace(/%20/g, ' ');
        if (!isNaN(hashValue)) {
          nodes[hash].value = JSON.parse(hashValue);
        } else if (hashValue === 'true' || hashValue === 'false') {
          nodes[hash].value = JSON.parse(hashValue);
        } else {
          nodes[hash].value = hashValue;
        }
      }
    }
  }
  for (let node in nodes) {
    if (nodes[node].storage === 'hash' && !hashes[node]) {
      nodes[node].value = nodes[node].default;
    }
  }
};

const setHashes = function(force) {
  let hashString = '';
  for (let node in nodes) {
    if ((nodes[node].storage === 'hash' || force) && nodes[node].value !== undefined && nodes[node].value !== '' && nodes[node].value !== nodes[node].default) {
      if (typeof nodes[node].value === 'string') {
        hashString += node + '=' + nodes[node].value + '&';
      } else {
        hashString += node + '=' + JSON.stringify(nodes[node].value) + '&';
      }
    }
  }
  for (let hash in hashes) {
    if (hash && !nodes[hash]) {
      hashString += hash + '=' + hashes[hash] + '&';
    }
  }
  hashString = hashString.slice(0, -1);
  self.location.hash = hashString;
  if (!self.location.hash) history.replaceState({}, document.title, self.location.pathname + self.location.search);
};

self.addEventListener('hashchange', getHashes, false);
getHashes();

class IoStorage extends IoNode {
  static get Properties() {
    return {
      key: String,
      value: undefined,
      default: undefined,
      storage: undefined,
    };
  }
  constructor(props) {
    super(Object.assign({default: props.value}, props));
    if (props.key) nodes[props.key] = nodes[props.key] || this;
    this.binding = this.bind('value');
    this.getStorageValue();
    this.connect(window);
  }
  getStorageValue() {
    switch (this.storage) {
      case 'hash': {
        if (hashes[this.key] !== undefined) {
          const hashValue = hashes[this.key].replace(/%20/g, ' ');
          try {
            this.value = JSON.parse(hashValue);
          } catch (e) {
            this.value = hashValue;
          }
        } else {
          this.value = this.default;
        }
        break;
      }
      case 'local': {
        const key = self.location.pathname !== '/' ? self.location.pathname + this.key : this.key;
        const localValue = localStorage.getItem(key);
        if (localValue !== null && localValue !== undefined) {
          this.value = JSON.parse(localValue);
        } else {
          this.value = this.default;
        }
        break;
      }
      default: {
        this.value = this.default;
      }
    }
  }
  valueChanged() {
    switch (this.storage) {
      case 'hash': {
        setHashes();
        break;
      }
      case 'local': {
        const key = self.location.pathname !== '/' ? self.location.pathname + this.key : this.key;
        if (this.value === null || this.value === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(this.value));
        }
        break;
      }
    }
  }
}

IoStorage.Register();

const IoStorageFactory = function(props) {
  if (props && typeof props === 'string') {
    props = {key: props};
  }
  if (props && props.key && nodes[props.key]) {
    if (props.storage) nodes[props.key].storage = props.storage;
    if (props.value !== undefined) nodes[props.key].default = props.value;
    return nodes[props.key].binding;
  }
  return new IoStorage(props).binding;
};

Object.defineProperty(IoStorageFactory, 'permitted', {
  get: () => {
    return localStorage.permited;
  },
  set: (value) => {
    localStorage.permited = value;
  }
});

const themePropDefaults =  {
  cssSpacing: 2,
  cssBorderRadius: 3,
  cssBorderWidth: 1,
  cssStrokeWidth: 1,
  cssLineHeight: 22,
  cssItemHeight: 0, // automatically calculated
  cssFontSize: 14,
};

const themeDBDefaults = {
  light: Object.assign({
    cssBackgroundColor: [0.95, 0.95, 0.95, 1],
    cssBackgroundColorLight: [1, 1, 1, 1],
    cssBackgroundColorDark: [0.84, 0.84, 0.84, 1],
    cssBackgroundColorField: [0.92, 0.92, 0.92, 1],
    cssColor: [0.16, 0.16, 0.16, 1],
    cssColorError: [0.91, 0.5, 0.5, 1],
    cssColorLink: [0.2, 0.75, 0.2, 1],
    cssColorFocus: [0.3, 0.6, 1, 1],
    cssColorField: [0, 0, 0, 1],
    cssColorNumber: [0.12, 0.64, 1, 1],
    cssColorString: [0.95, 0.25, 0.1, 1],
    cssColorBoolean: [0.82, 0.35, 0.75, 1],
    cssColorBorder: [0.7, 0.7, 0.7, 1],
    cssColorBorderLight: [1, 1, 1, 1],
    cssColorBorderDark: [0.6, 0.6, 0.6, 1],
    cssColorGradientStart: [0.9, 0.9, 0.9, 1],
    cssColorGradientEnd: [0.75, 0.75, 0.75, 1],
    cssColorShadow: [0, 0, 0, 0.2],
  }, themePropDefaults),
  dark: Object.assign({
    cssBackgroundColor: [0.164, 0.164, 0.164, 1],
    cssBackgroundColorLight: [0.22, 0.22, 0.22, 1],
    cssBackgroundColorDark: [0.25, 0.25, 0.25, 1],
    cssBackgroundColorField: [0.137, 0.137, 0.137, 1],
    cssColor: [0.823, 0.823, 0.823, 1],
    cssColorError: [1, 0.376, 0.062, 1],
    cssColorLink: [0.75, 0.9, 0.59, 1],
    cssColorFocus: [0.3, 0.82, 1.4, 1],
    cssColorField: [0.75, 0.75, 0.75, 1],
    cssColorNumber: [0.125, 0.64, 1, 1],
    cssColorString: [0.94, 0.25, 0.086, 1],
    cssColorBoolean: [0.82, 0.35, 0.75, 1],
    cssColorBorder: [0.3, 0.3, 0.3, 1],
    cssColorBorderLight: [0.4, 0.4, 0.4, 1],
    cssColorBorderDark: [0, 0, 0, 1],
    cssColorGradientStart: [1, 1, 1, 0.1],
    cssColorGradientEnd: [0, 0, 0, 0.2],
    cssColorShadow: [0, 0, 0, 0.2],
  }, themePropDefaults),
};


const themeDB = IoStorageFactory({value: JSON.parse(JSON.stringify(themeDBDefaults)), storage: 'local', key: 'themeDB'});

class IoTheme extends IoElement {
  static get Style() {
    return /* css */`
    --io-item: {
      align-self: flex-start;
      display: inline-block;
      cursor: pointer;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
      overflow: hidden;
      text-overflow: ellipsis;
      flex-wrap: nowrap;
      white-space: nowrap;
      box-sizing: border-box;
      line-height: var(--io-line-height);
      height: var(--io-item-height);
      font-size: var(--io-font-size);
      border-radius: var(--io-border-radius);
      border: var(--io-border);
      border-color: transparent;
      color: var(--io-color);
      background-color: transparent;
      background-image: none;
      padding: var(--io-spacing);
      transition: background-color 0.25s;
    }
    --io-panel: {
      display: flex;
      flex-direction: column;
      align-self: stretch;
      justify-self: stretch;
      border-radius: calc(var(--io-border-radius) + var(--io-spacing));
      border: var(--io-border);
      border-color: var(--io-color-border-outset);
      color: var(--io-color-field);
      background-color: var(--io-background-color-dark);
      padding: var(--io-spacing);
    }
    --io-content: {
      display: flex;
      flex-direction: column;
      align-self: stretch;
      justify-self: stretch;
      flex: 1 1 auto;
      overflow-x: hidden;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      -webkit-tap-highlight-color: transparent;
    }
    --io-row: {
      display: flex;
      flex: 1 1;
      flex-direction: row;
      align-self: stretch;
      justify-self: stretch;
    }
    --io-column: {
      display: flex;
      flex: 1 1;
      flex-direction: column;
      align-self: stretch;
      justify-self: stretch;
    }
    --io-table2: {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-gap: var(--io-spacing);
    }
    --io-table3: {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-gap: var(--io-spacing);
    }
    --io-table4: {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      grid-gap: var(--io-spacing);
    }
    --io-table5: {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      grid-gap: var(--io-spacing);
    }
    `;
  }
  static get Properties() {
    const isDarkMode = !!window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = IoStorageFactory({value: isDarkMode ? 'dark' : 'light', storage: 'local', key: 'theme'});
    const vars = themeDB.value[theme.value];
    return {
      theme: theme,
      //
      cssSpacing: vars.cssSpacing,
      cssBorderRadius: vars.cssBorderRadius,
      cssBorderWidth: vars.cssBorderWidth,
      cssStrokeWidth: vars.cssStrokeWidth,
      cssLineHeight: vars.cssLineHeight,
      cssItemHeight: vars.cssItemHeight,
      cssFontSize: vars.cssFontSize,
      cssBackgroundColor: {value: vars.cssBackgroundColor, observe: true},
      cssBackgroundColorLight: {value: vars.cssBackgroundColorLight, observe: true},
      cssBackgroundColorDark: {value: vars.cssBackgroundColorDark, observe: true},
      cssBackgroundColorField: {value: vars.cssBackgroundColorField, observe: true},
      cssColor: {value: vars.cssColor, observe: true},
      cssColorError: {value: vars.cssColorError, observe: true},
      cssColorLink: {value: vars.cssColorLink, observe: true},
      cssColorFocus: {value: vars.cssColorFocus, observe: true},
      cssColorField: {value: vars.cssColorField, observe: true},
      cssColorNumber: {value: vars.cssColorNumber, observe: true},
      cssColorString: {value: vars.cssColorString, observe: true},
      cssColorBoolean: {value: vars.cssColorBoolean, observe: true},
      cssColorBorder: {value: vars.cssColorBorder, observe: true},
      cssColorBorderLight: {value: vars.cssColorBorderLight, observe: true},
      cssColorBorderDark: {value: vars.cssColorBorderDark, observe: true},
      cssColorGradientStart: {value: vars.cssColorGradientStart, observe: true},
      cssColorGradientEnd: {value: vars.cssColorGradientEnd, observe: true},
      cssColorShadow: {value: vars.cssColorShadow, observe: true},
      //
      lazy: true,
    };
  }
  constructor(props) {
    super(props);
    this.variablesElement = document.createElement('style');
    this.variablesElement.setAttribute('id', 'io-theme-variables');
    document.head.appendChild(this.variablesElement);
  }
  _toCss(rgba) {
    const r = Math.floor(rgba[0] * 255);
    const g = Math.floor(rgba[1] * 255);
    const b = Math.floor(rgba[2] * 255);
    if (rgba[3] !== undefined) {
      return `rgba(${r}, ${g}, ${b}, ${rgba[3]})`;
    } else {
      return `rgb(${r}, ${g}, ${b})`;
    }
  }
  reset() {
    themeDB.value = Object.assign({}, JSON.parse(JSON.stringify(themeDBDefaults)));
    this.themeChanged();
  }
  themeChanged() {
    const vars = themeDB.value[this.theme];
    this.setProperties({
      cssSpacing: vars.cssSpacing,
      cssBorderRadius: vars.cssBorderRadius,
      cssBorderWidth: vars.cssBorderWidth,
      cssStrokeWidth: vars.cssStrokeWidth,
      cssLineHeight: vars.cssLineHeight,
      cssItemHeight: vars.cssItemHeight,
      cssFontSize: vars.cssFontSize,
      cssBackgroundColor: vars.cssBackgroundColor,
      cssBackgroundColorLight: vars.cssBackgroundColorLight,
      cssBackgroundColorDark: vars.cssBackgroundColorDark,
      cssBackgroundColorField: vars.cssBackgroundColorField,
      cssColor: vars.cssColor,
      cssColorError: vars.cssColorError,
      cssColorLink: vars.cssColorLink,
      cssColorFocus: vars.cssColorFocus,
      cssColorField: vars.cssColorField,
      cssColorNumber: vars.cssColorNumber,
      cssColorString: vars.cssColorString,
      cssColorBoolean: vars.cssColorBoolean,
      cssColorBorder: vars.cssColorBorder,
      cssColorBorderLight: vars.cssColorBorderLight,
      cssColorBorderDark: vars.cssColorBorderDark,
      cssColorGradientStart: vars.cssColorGradientStart,
      cssColorGradientEnd: vars.cssColorGradientEnd,
      cssColorShadow: vars.cssColorShadow,
    });
  }
  changed() {
    this.__properties.cssItemHeight.value = this.cssLineHeight + 2 * (this.cssSpacing + this.cssBorderWidth);
    this.variablesElement.innerHTML = /* css */`
      body {
        --io-spacing: ${this.cssSpacing}px;
        --io-border-radius: ${this.cssBorderRadius}px;
        --io-border-width: ${this.cssBorderWidth}px;
        --io-stroke-width: ${this.cssStrokeWidth}px;
        --io-line-height: ${this.cssLineHeight}px;
        --io-item-height: ${this.cssItemHeight}px;
        --io-font-size: ${this.cssFontSize}px;

        --io-background-color: ${this._toCss(this.cssBackgroundColor)};
        --io-background-color-highlight: ${this._toCss(this.cssBackgroundColorLight)};
        --io-background-color-dark: ${this._toCss(this.cssBackgroundColorDark)};
        --io-background-color-field: ${this._toCss(this.cssBackgroundColorField)};

        --io-color: ${this._toCss(this.cssColor)};
        --io-color-error: ${this._toCss(this.cssColorError)};
        --io-color-link: ${this._toCss(this.cssColorLink)};
        --io-color-focus: ${this._toCss(this.cssColorFocus)};
        --io-color-field: ${this._toCss(this.cssColorField)};
        --io-color-number: ${this._toCss(this.cssColorNumber)};
        --io-color-string: ${this._toCss(this.cssColorString)};
        --io-color-boolean: ${this._toCss(this.cssColorBoolean)};
        --io-color-border: ${this._toCss(this.cssColorBorder)};
        --io-color-border-light: ${this._toCss(this.cssColorBorderLight)};
        --io-color-border-dark: ${this._toCss(this.cssColorBorderDark)};
        --io-color-gradient-start: ${this._toCss(this.cssColorGradientStart)};
        --io-color-gradient-end: ${this._toCss(this.cssColorGradientEnd)};
        --io-color-shadow: ${this._toCss(this.cssColorShadow)};


        --io-border: var(--io-border-width) solid var(--io-color-border);
        --io-border-error: var(--io-border-width) solid var(--io-color-error);
        --io-color-border-inset: var(--io-color-border-dark) var(--io-color-border-light) var(--io-color-border-light) var(--io-color-border-dark);
        --io-color-border-outset: var(--io-color-border-light) var(--io-color-border-dark) var(--io-color-border-dark) var(--io-color-border-light);

        --io-gradient-button: linear-gradient(180deg, var(--io-color-gradient-start), var(--io-color-gradient-end) 100%);
        --io-gradient-error: repeating-linear-gradient(135deg, transparent, var(--io-color-error) 1px, var(--io-color-error) 4px, transparent 6px);

        --io-shadow: 2px 2px 6px var(--io-color-shadow),
                     1px 1px 1px var(--io-color-shadow);
        --io-shadow-inset: 1px 1px 2px inset var(--io-color-shadow);
        --io-shadow-outset: -1px -1px 2px inset var(--io-color-shadow);
      }
    `;

    const vars = themeDB.value[this.theme];
    for (let prop in this.__properties) {
      if (prop.startsWith('css')) {
        vars[prop] = this.__properties[prop].value;
      }
    }
    themeDB.value = Object.assign({}, themeDB.value);
    // TODO: consider removing (required for gl updates in theme demo)

    this.dispatchEvent('object-mutated', {object: this}, false, window);
  }
}
IoTheme.Register();

const IoThemeSingleton = new IoTheme();
IoThemeSingleton.connect();

class IoItem extends IoElement {
  static get Style() {
    return /* css */`
    :host {
      @apply --io-item;
    }
    :host[selected] {
      color: var(--io-color-link);
      background-color: var(--io-background-color-highlight);
    }
    :host:focus {
      z-index: 200;
      position: relative;
      text-overflow: inherit;
      border-color: var(--io-color-focus);
      outline-color: var(--io-color-focus);
    }
    `;
  }
  static get Properties() {
    return {
      value: undefined,
      selected: {
        type: Boolean,
        reflect: true,
      },
      tabindex: 0,
    };
  }
  static get Listeners() {
    return {
      'focus': '_onFocus',
      'pointerdown': '_onPointerdown',
      'click': '_onClick',
    };
  }
  constructor(props) {
    super(props);
    Object.defineProperty(this, '_textNode', {value: document.createTextNode(''), writable: true});
    this.appendChild(this._textNode);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('blur', this._onBlur);
    this.removeEventListener('keydown', this._onKeydown);
    this.removeEventListener('keyup', this._onKeydown);
    this.removeEventListener('pointermove', this._onPointermove);
    this.removeEventListener('pointerleave', this._onPointerleave);
    this.removeEventListener('pointerup', this._onPointerup);
  }
  _onFocus() {
    this.addEventListener('blur', this._onBlur);
    this.addEventListener('keydown', this._onKeydown);
    this.addEventListener('keyup', this._onKeyup);
  }
  _onBlur() {
    this.removeEventListener('blur', this._onBlur);
    this.removeEventListener('keydown', this._onKeydown);
    this.removeEventListener('keyup', this._onKeyup);
  }
  _onPointerdown(event) {
    event.preventDefault();
    this.addEventListener('pointermove', this._onPointermove);
    this.addEventListener('pointerleave', this._onPointerleave);
    this.addEventListener('pointerup', this._onPointerup);
  }
  _onPointermove() {}
  _onPointerleave() {
    this.removeEventListener('pointermove', this._onPointermove);
    this.removeEventListener('pointerleave', this._onPointerleave);
    this.removeEventListener('pointerup', this._onPointerup);
  }
  _onPointerup() {
    this.removeEventListener('pointermove', this._onPointermove);
    this.removeEventListener('pointerleave', this._onPointerleave);
    this.removeEventListener('pointerup', this._onPointerup);
    this.focus();
  }
  _onClick() {
    this.dispatchEvent('item-clicked', {value: this.value, label: this.label}, true);
  }
  _onKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this._onClick(event);
    }
    else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.focusTo('left');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusTo('up');
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.focusTo('right');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusTo('down');
    }
  }
  _onKeyup() {}
  getCaretPosition() {
    let position = 0;
    const selection = window.getSelection();
    if (selection.rangeCount) {
      const range = selection.getRangeAt(0);
      const selected = range.toString().length;
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(this);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      position = preCaretRange.toString().length - selected;
    }
    return position;
  }
  setCaretPosition(position){
    if (!position) return;
    const sel = window.getSelection();
    const range = document.createRange();
    range.setStart(this.firstChild, position);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  changed() {
    let label;
    if (this.label) {
      label = this.label;
      this.title = this.label;
    } else {
      let valueText;
      if (this.value && typeof this.value === 'object') {
        valueText = `${this.value.constructor.name}` + (this.value instanceof Array ? `(${this.value.length})` : '');
      } else {
        valueText = String(this.value);
      }
      this.title = valueText;
      label = valueText;
    }
    this.textNode = label;
  }
}

IoItem.Register();

// TODO: test and documentation

class IoContent extends IoElement {
  static get Style() {
    return /* css */`
    :host {
      @apply --io-content;
    }
    :host:not([expanded]) {
      display: none;
    }
    `;
  }
  static get Properties() {
    return {
      elements: {
        type: Array,
        observe: true,
      },
      expanded: {
        type: Boolean,
        reflect: 1,
      },
      cache: Boolean,
    };
  }
  changed() {
    // TODO: cache outside DOM and disconnect!
    if (this.expanded) {
      this.template([this.elements]);
    } else if (!this.cache) {
      this.template([null]);
    }
  }
}

IoContent.Register();

const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl', {antialias: false, premultipliedAlpha: true});
gl.imageSmoothingEnabled = false;

gl.getExtension('OES_standard_derivatives');

gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
gl.disable(gl.DEPTH_TEST);

const positionBuff = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuff);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,0.0,-1,-1,0.0,1,-1,0.0,1,1,0.0]), gl.STATIC_DRAW);
gl.bindBuffer(gl.ARRAY_BUFFER, null);

const uvBuff = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, uvBuff);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,1,0,0,1,0,1,1]), gl.STATIC_DRAW);
gl.bindBuffer(gl.ARRAY_BUFFER, null);

const indexBuff = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuff);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([3,2,1,3,1,0]), gl.STATIC_DRAW);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuff);

const shadersCache = new WeakMap();
let currentProgram;

class IoGl extends IoElement {
  static get Style() {
    return /* css */`
    :host {
      position: relative;
      overflow: hidden !important;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
      box-sizing: border-box;
    }
    :host > .io-gl-canvas {
      position: absolute;
      top: 0;
      left: 0;
      border-radius: calc(var(--io-border-radius) - var(--io-border-width));
      pointer-events: none;
      /* image-rendering: pixelated; */
    }
    `;
  }
  static get Properties() {
    return {
      size: [0, 0],
      color: {
        value: [1, 1, 1, 1],
        observe: true,
      },
      pxRatio: 1,
      css: {
        type: Object,
        observe: true,
      },
    };
  }
  static get Vert() {
    return /* glsl */`
      attribute vec3 position;
      attribute vec2 uv;
      varying vec2 vUv;

      void main(void) {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }\n\n`;
  }
  static get GlUtils() {
    return /* glsl */`
    #ifndef saturate
      #define saturate(v) clamp(v, 0., 1.)
    #endif

    vec2 translate(vec2 samplePosition, vec2 xy){
      return samplePosition - vec2(xy.x, xy.y);
    }
    vec2 translate(vec2 samplePosition, float x, float y){
      return samplePosition - vec2(x, y);
    }
    float circle(vec2 samplePosition, float radius){
      return saturate((length(samplePosition) - radius) * uPxRatio);
    }
    float rectangle(vec2 samplePosition, vec2 halfSize){
      vec2 edgeDistance = abs(samplePosition) - halfSize;
      float outside = length(max(edgeDistance, 0.));
      float inside = min(max(edgeDistance.x, edgeDistance.y), 0.);
      return saturate((outside + inside) * uPxRatio); // TODO: check
    }
    float grid(vec2 samplePosition, float gridWidth, float gridHeight, float lineWidth) {
      vec2 sp = samplePosition / vec2(gridWidth, gridHeight);
      float linex = abs(fract(sp.x - 0.5) - 0.5) * 2.0 / abs(max(dFdx(sp.x), dFdy(sp.x))) - lineWidth;
      float liney = abs(fract(sp.y - 0.5) - 0.5) * 2.0 / abs(max(dFdy(sp.y), dFdx(sp.y))) - lineWidth;
      return saturate(min(linex, liney));
    }
    float checker(vec2 samplePosition, float size) {
      vec2 checkerPos = floor(samplePosition / size);
      float checkerMask = mod(checkerPos.x + mod(checkerPos.y, 2.0), 2.0);
      return checkerMask;
    }\n\n`;
  }
  static get Frag() {
    return /* glsl */`
      varying vec2 vUv;
      void main(void) {
        vec2 position = uSize * vUv;
        float gridWidth = 8. * uPxRatio;
        float lineWidth = 1. * uPxRatio;
        float gridShape = grid(position, gridWidth, gridWidth, lineWidth);
        gl_FragColor = mix(vec4(vUv, 0.0, 1.0), uColor, gridShape);
      }\n\n`;
  }
  initPropertyUniform(name, property) {
    if (property.notify) {
      switch (property.type) {
        case Boolean:
          return 'uniform int ' + name + ';\n';
        case Number:
          return 'uniform float ' + name + ';\n';
        case Array:
          this._vecLengths[name] = property.value.length;
          return 'uniform vec' + property.value.length + ' ' + name + ';\n';
      }
      // TODO: implement matrices.
    }
    return '';
  }
  initShader() {
    let frag = `
    #extension GL_OES_standard_derivatives : enable
    precision highp float;\n`;

    for (let name in this.css.__properties) {
      const property = this.css.__protoProperties[name];
      frag += this.initPropertyUniform(name, property);
    }

    frag += '\n';

    for (let prop in this.__properties) {
      const name = 'u' + prop.charAt(0).toUpperCase() + prop.slice(1);
      const property = this.__protoProperties[prop];
      frag += this.initPropertyUniform(name, property);
    }

    for (let i = this.__protochain.length; i--;) {
      const constructor = this.__protochain[i].constructor;
      const glUtilsProp = Object.getOwnPropertyDescriptor(constructor, 'GlUtils');
      if (glUtilsProp && glUtilsProp.get) {
        frag += constructor.GlUtils;
      }
    }

    const vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, this.constructor.Vert);
    gl.compileShader(vertShader);

    if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
      let compilationLog = gl.getShaderInfoLog(vertShader);
      console.error('IoGl [Vertex Shader] ' + this.localName + ' error:');
      console.warn(compilationLog);
    }

    const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, frag + this.constructor.Frag);
    gl.compileShader(fragShader);

    if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
      let compilationLog = gl.getShaderInfoLog(fragShader);
      console.error('IoGl [Frament Shader] ' + this.localName + ' error:');
      console.warn(compilationLog);
    }

    const shader = gl.createProgram();
    gl.attachShader(shader, vertShader);
    gl.attachShader(shader, fragShader);

    return shader;
  }
  constructor(props) {
    super(props);

    this.css = IoThemeSingleton;

    // TODO: improve code clarity
    this._vecLengths = {};
    for (let name in this.css.__properties) {
      const property = this.css.__protoProperties[name];
      if (property.notify && property.type === Array) {
        this._vecLengths[name] = property.value.length;
      }
    }
    for (let prop in this.__properties) {
      const name = 'u' + prop.charAt(0).toUpperCase() + prop.slice(1);
      const property = this.__protoProperties[prop];
      if (property.notify && property.type === Array) {
        this._vecLengths[name] = property.value.length;
      }
    }

    if (shadersCache.has(this.constructor)) {
      this._shader = shadersCache.get(this.constructor);
    } else {
      this._shader = this.initShader();
      shadersCache.set(this.constructor, this._shader);
    }

    gl.linkProgram(this._shader);

    const position = gl.getAttribLocation(this._shader, 'position');
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuff);
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(position);

    const uv = gl.getAttribLocation(this._shader, 'uv');
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuff);
    gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(uv);

    this.render = this.render.bind(this);

    // this.template([['img', {id: 'canvas'}]]);
    // this.$.canvas.onload = () => { this.$.canvas.loading = false; };

    this.template([['canvas', {id: 'canvas', class: 'io-gl-canvas'}]]);
    this.$.canvas.ctx = this.$.canvas.getContext('2d');

    this.updateCssUniforms();
  }
  onResized() {
    // TODO: consider optimizing
    const pxRatio = window.devicePixelRatio;
    const rect = this.getBoundingClientRect();
    const style = window.getComputedStyle(this);
    const bw = parseInt(style.borderRightWidth) + parseInt(style.borderLeftWidth);
    const bh = parseInt(style.borderTopWidth) + parseInt(style.borderBottomWidth);

    // TODO: confirm and test
    const width = Math.max(0, Math.floor(rect.width - bw));
    const height = Math.max(0, Math.floor(rect.height - bh));

    const hasResized = (width !== this.size[0] || height !== this.size[1] || pxRatio !== this.pxRatio);

    if (hasResized) {
      this.$.canvas.style.width = Math.floor(width) + 'px';
      this.$.canvas.style.height = Math.floor(height) + 'px';

      this.$.canvas.width = Math.floor(width * pxRatio);
      this.$.canvas.height = Math.floor(height * pxRatio);

      this.setProperties({
        size: [width, height],
        pxRatio: pxRatio,
      });
    }
  }
  cssMutated() {
    this.updateCssUniforms();
    this.requestAnimationFrameOnce(this.render);
  }
  changed() {
    // TODO: unhack when ResizeObserver is available in Safari
    if (!window.ResizeObserver) {
      setTimeout(() => {
        this.onResized();
        this.requestAnimationFrameOnce(this.render);
      });
    } else {
      this.requestAnimationFrameOnce(this.render);
    }
  }
  render() {
    const width = this.size[0] * this.pxRatio;
    const height = this.size[1] * this.pxRatio;

    if (!width || !height) return;

    this.setShaderProgram();

    // TODO: dont brute-force uniform update.
    for (let p in this.__properties) {
      const name = 'u' + p.charAt(0).toUpperCase() + p.slice(1);
      this.updatePropertyUniform(name, this.__properties[p]);
    }

    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    // gl.clearColor(0, 0, 0, 1);
    // gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

    // this.$.canvas.src = canvas.toDataURL('image/png', 0.9);
    // this.$.canvas.loading = true;

    // this.$.canvas.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.$.canvas.ctx.drawImage(canvas, 0, 0);
  }
  setShaderProgram() {
    if (currentProgram !== this._shader) {
      currentProgram = this._shader;
      gl.useProgram(this._shader);
    }
  }
  updatePropertyUniform(name, property) {
    this.setShaderProgram();
    if (property.notify) {
      this.setUniform(name, property.type, property.value);
    }
  }
  updateCssUniforms() {
    for (let name in this.css.__properties) {
      this.updatePropertyUniform(name, this.css.__properties[name]);
    }
  }
  setUniform(name, type, value) {
    const uniform = gl.getUniformLocation(this._shader, name);
    let _c;
    switch (type) {
      case Boolean:
        gl.uniform1i(uniform, value ? 1 : 0);
        break;
      case Number:
        gl.uniform1f(uniform, value !== undefined ? value : 1);
        break;
      case Array:
        _c = [0, 1, 2, 3];
        if (!(value instanceof Array) && typeof value === 'object') {
          if (value.x !== undefined) _c = ['x', 'y', 'z', 'w'];
          else if (value.r !== undefined) _c = ['r', 'g', 'b', 'a'];
          else if (value.h !== undefined) _c = ['h', 's', 'v', 'a'];
          else if (value.c !== undefined) _c = ['c', 'm', 'y', 'k'];
        }
        switch (this._vecLengths[name]) {
          case 2:
            if (value === undefined) {
              gl.uniform2f(uniform, 0, 0);
              break;
            }
            gl.uniform2f(uniform,
                value[_c[0]] !== undefined ? value[_c[0]] : 1,
                value[_c[1]] !== undefined ? value[_c[1]] : 1);
            break;
          case 3:
            if (value === undefined) {
              gl.uniform3f(uniform, 0, 0, 0);
              break;
            }
            gl.uniform3f(uniform,
                value[_c[0]] !== undefined ? value[_c[0]] : 1,
                value[_c[1]] !== undefined ? value[_c[1]] : 1,
                value[_c[2]] !== undefined ? value[_c[2]] : 1);
            break;
          case 4:
            if (value === undefined) {
              gl.uniform4f(uniform, 0, 0, 0, 0);
              break;
            }
            gl.uniform4f(uniform,
                value[_c[0]] !== undefined ? value[_c[0]] : 1,
                value[_c[1]] !== undefined ? value[_c[1]] : 1,
                value[_c[2]] !== undefined ? value[_c[2]] : 1,
                value[_c[3]] !== undefined ? value[_c[3]] : 1);
                break;
        }
        break;
    }
  }
}

IoGl.Register();

class IoButton extends IoItem {
  static get Style() {
    return /* css */`
    :host {
      text-align: center;
      border: var(--io-border);
      border-color: var(--io-color-border-outset);
      background-color: var(--io-background-color-dark);
      background-image: var(--io-gradient-button);
      padding-left: calc(2 * var(--io-spacing));
      padding-right: calc(2 * var(--io-spacing));
    }
    :host[pressed] {
      border: var(--io-border);
      border-color: var(--io-color-border-inset);
    }
    `;
  }
  static get Properties() {
    return {
      action: Function,
      value: undefined,
      pressed: {
        type: Boolean,
        reflect: true,
      },
      label: 'Button',
      icon: '',
      role: 'button',
    };
  }
  _onPointerdown(event) {
    super._onPointerdown(event);
    this.pressed = true;
  }
  _onPointerleave(event) {
    super._onPointerleave(event);
    this.pressed = false;
  }
  _onPointerup(event) {
    super._onPointerup(event);
    this.pressed = false;
  }
  _onKeydown(event) {
    super._onKeydown(event);
    if (event.key === 'Enter' || event.key === ' ') {
      this.pressed = true;
    }
  }
  _onKeyup(event) {
    super._onKeyup(event);
    this.pressed = false;
  }
  _onClick() {
    super._onClick();
    if (typeof this.action === 'function') this.action(this.value);
  }
}

IoButton.Register();

class IoBoolean extends IoItem {
  static get Style() {
    return /* css */`
    :host[aria-invalid] {
      border: var(--io-border-error);
      background-image: var(--io-gradient-error);
    }
    `;
  }
  static get Properties() {
    return {
      label: 'Boolean',
      value: {
        type: Boolean,
        reflect: 1,
      },
      true: 'true',
      false: 'false',
      role: 'switch',
    };
  }
  _onClick() {
    this.toggle();
  }
  toggle() {
    this.set('value', !this.value);
  }
  valueChanged() {
    this.setAttribute('value', Boolean(this.value));
  }
  changed() {
    this.title = this.label;
    this.textNode = this.value ? this.true : this.false;
  }
  setAria() {
    super.setAria();
    this.setAttribute('aria-checked', String(!!this.value));
    this.setAttribute('aria-invalid', typeof this.value !== 'boolean' ? 'true' : false);
  }
}

IoBoolean.Register();

const IoIconsetDB = {};

class IoIconset extends IoNode {
  registerIcons(name, svg) {
    const stagingElement = document.createElement('div');
    stagingElement.innerHTML = svg;
    stagingElement.querySelectorAll('[id]').forEach(icon => {
      IoIconsetDB[name] = IoIconsetDB[name] || {};
      IoIconsetDB[name][icon.id] = icon.outerHTML;
    });
  }
  getIcon(icon) {
    const iconset = IoIconsetDB[icon.split(':')[0]];
    if (iconset) {
      const id = icon.split(':')[1];
      if (iconset[id]) {
        const group = iconset[id].replace(' id="', ' class="icon-id-');
        return `<svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet">${group}</svg>`;
      }
    }
    return '<svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet"></svg>';
  }
}

IoIconset.Register();

const IoIconsetSingleton = new IoIconset();

const icons = /* html */`
<svg><g id="io"><ellipse fill="#83A61E" cx="5.4" cy="12.1" rx="3.4" ry="3.4"/><path fill="#646464" d="M16.3,17.7c-3.1,0-5.6-2.6-5.6-5.6s2.6-5.6,5.6-5.6s5.6,2.6,5.6,5.6S19.3,17.7,16.3,17.7z M16.3,8.8c-1.8,0-3.3,1.5-3.3,3.2s1.5,3.2,3.3,3.2s3.3-1.5,3.3-3.2S18.1,8.8,16.3,8.8z"/></g><g id="io_logo"><path fill="#646464" d="M19.5,12.7c0.3-0.3,0.3-0.9,0-1.2l-0.7-0.7l-2.6-2.6c-0.3-0.3-0.3-0.9,0-1.2c0.3-0.3,0.9-0.3,1.2,0l3.8,3.8c0.7,0.7,0.7,1.8,0,2.6l-3.8,3.8c-0.3,0.3-0.9,0.3-1.2,0c-0.3-0.3-0.3-0.9,0-1.2"/><path fill="#646464" d="M4.3,12.7c-0.3-0.3-0.3-0.9,0-1.2L5,10.8l2.6-2.6c0.3-0.3,0.3-0.9,0-1.2C7.3,6.7,6.7,6.7,6.4,7l-3.8,3.8c-0.7,0.7-0.7,1.8,0,2.6l3.8,3.8c0.3,0.3,0.9,0.3,1.2,0s0.3-0.9,0-1.2"/><ellipse fill="#83A61E" cx="8.4" cy="12.1" rx="1.7" ry="1.7"/><path fill="#646464" d="M13.9,14.9c-1.6,0-2.8-1.2-2.8-2.8s1.2-2.8,2.8-2.8s2.8,1.2,2.8,2.8S15.4,14.9,13.9,14.9z M13.9,10.4c-0.9,0-1.7,0.7-1.7,1.7c0,0.9,0.7,1.7,1.7,1.7c0.9,0,1.7-0.7,1.7-1.7C15.5,11.2,14.8,10.4,13.9,10.4z"/></g><g <g id="unlink"><path d="M3.9,12c0-1.7,1.4-3.2,3.2-3.2h4V7H7c-2.7,0-5,2.2-5,5s2.2,5,5,5h4v-1.9H7C5.2,15.1,3.9,13.7,3.9,12z M17,7h-4.1v1.9H17c1.7,0,3.2,1.4,3.2,3.2s-1.4,3.2-3.2,3.2h-4.1v1.9H17c2.7,0,5-2.2,5-5S19.8,7,17,7z"/></g><g id="link"><path d="M3.9,12c0-1.7,1.4-3.2,3.2-3.2h4V7H7c-2.7,0-5,2.2-5,5s2.2,5,5,5h4v-1.9H7C5.2,15.1,3.9,13.7,3.9,12z M8,13h8.1v-2H8V13z M17,7h-4.1v1.9H17c1.7,0,3.2,1.4,3.2,3.2s-1.4,3.2-3.2,3.2h-4.1v1.9H17c2.7,0,5-2.2,5-5S19.8,7,17,7z"/></g><g id="gear"><path d="M21.3,14.6L19.2,13c0-0.3,0.1-0.6,0.1-1c0-0.3,0-0.6-0.1-1l2.1-1.7c0.2-0.2,0.2-0.4,0.1-0.6l-1.9-3.4c-0.1-0.2-0.3-0.2-0.6-0.2l-2.4,1c-0.5-0.3-1.1-0.7-1.7-1l-0.3-2.7c0-0.2-0.2-0.4-0.4-0.4h-4C9.8,2.3,9.5,2.4,9.5,2.7L9.1,5.3C8.5,5.5,8,5.8,7.5,6.3l-2.4-1c-0.2-0.1-0.5,0-0.7,0.2L2.5,8.8C2.4,9.1,2.4,9.3,2.6,9.5l2.1,1.7c0,0.3-0.1,0.6-0.1,1s0,0.6,0.1,1l-2.1,1.7c-0.2,0.2-0.2,0.4-0.1,0.6l1.9,3.4C4.5,19,4.7,19,5,19l2.4-1c0.5,0.4,1.1,0.7,1.7,1l0.4,2.7c0,0.2,0.3,0.4,0.6,0.4H14c0.2,0,0.4-0.2,0.5-0.4l0.3-2.7c0.6-0.2,1.2-0.5,1.7-1l2.4,1c0.2,0.1,0.4,0,0.6-0.2l1.9-3.4C21.6,15.1,21.5,14.8,21.3,14.6z M11.9,15.6c-2,0-3.7-1.7-3.7-3.7s1.7-3.6,3.7-3.6s3.7,1.7,3.7,3.7S13.9,15.6,11.9,15.6z"/></g><g id="less"><path d="M6.6,20.3L8.3,22l3.7-4l3.7,4l1.7-1.7l-5.3-5.7L6.6,20.3z M17.3,3.8l-1.7-1.7l-3.7,4l-3.7-4L6.6,3.8l5.3,5.7L17.3,3.8z"/></g><g id="more"><path d="M11.9,5.3l3.7,3.5l1.7-1.6L12,2.1L6.6,7.2l1.7,1.6L11.9,5.3z M11.9,18.9l-3.7-3.5L6.6,17l5.3,5.1l5.3-5.1l-1.7-1.6L11.9,18.9z"/></g><g id="code"><path d="M9.4,16.6L4.8,12l4.6-4.6L8,6.1l-6,6l6,6L9.4,16.6z M14.5,16.6l4.6-4.6l-4.6-4.6L15.9,6l6,6l-6,6L14.5,16.6z"/></g><g id="tune"><path d="M2,17.6v2.2h6.6v-2.2H2z M2,4.3v2.2h11V4.3H2z M13,22v-2.2h8.9v-2.2H13v-2.2h-2.2V22H13z M6.4,8.7V11H2v2.2h4.4v2.2h2.2V8.7H6.4z M21.9,13.1v-2.2h-11v2.2H21.9z M15.3,8.7h2.2V6.5h4.4V4.3h-4.4V2.1h-2.2V8.7z"/></g><g id="unlock"><path d="M11.9,17.3c1,0,1.9-0.8,1.9-1.9s-0.8-1.9-1.9-1.9S10,14.3,10,15.4S11,17.3,11.9,17.3z M17.6,8.7h-0.9V6.8c-0.1-2.6-2.2-4.7-4.7-4.7S7.3,4.3,7.3,6.8H9c0-1.7,1.3-2.9,2.9-2.9s2.9,1.3,2.9,2.9v1.9H6.4c-1.1,0-1.9,0.8-1.9,1.9v9.5c0,1.1,0.8,1.9,1.9,1.9h11.2c1,0,1.9-0.8,1.9-1.9v-9.5C19.4,9.6,18.6,8.7,17.6,8.7z M17.6,20.1H6.4v-9.5h11.2V20.1z"/></g><g id="lock"><path d="M11.9,17.3c1,0,1.9-0.8,1.9-1.9s-0.8-1.9-1.9-1.9S10,14.3,10,15.4S11,17.3,11.9,17.3z M17.6,8.7h-0.9V6.8c-0.1-2.6-2.2-4.7-4.7-4.7S7.3,4.3,7.3,6.8v1.9H6.4c-1.1,0-1.9,0.8-1.9,1.9v9.5c0,1.1,0.8,1.9,1.9,1.9h11.2c1,0,1.9-0.8,1.9-1.9v-9.5C19.4,9.6,18.6,8.7,17.6,8.7z M9,6.8c0-1.7,1.3-2.9,2.9-2.9s2.9,1.3,2.9,2.9v1.9H9V6.8z M17.6,20.1H6.4v-9.5h11.2V20.1z"/></g><g id="more_horizontal"><path d="M4.5,9.6C3.1,9.6,2,10.7,2,12.1s1.1,2.5,2.5,2.5S7,13.5,7,12.1S5.9,9.6,4.5,9.6z M19.4,9.6c-1.4,0-2.5,1.1-2.5,2.5s1.1,2.5,2.5,2.5s2.5-1.1,2.5-2.5S20.8,9.6,19.4,9.6z M11.9,9.6c-1.4,0-2.5,1.1-2.5,2.5s1.1,2.5,2.5,2.5s2.5-1.1,2.5-2.5S13.4,9.6,11.9,9.6z"/></g><g id="more_vertical"><path d="M11.9,7.1c1.4,0,2.5-1.1,2.5-2.5s-1.1-2.5-2.5-2.5S9.5,3.2,9.5,4.6S10.5,7.1,11.9,7.1z M11.9,9.6c-1.4,0-2.5,1.1-2.5,2.5s1.1,2.5,2.5,2.5s2.5-1.1,2.5-2.5S13.4,9.6,11.9,9.6z M11.9,17.1c-1.4,0-2.5,1.1-2.5,2.5s1.1,2.5,2.5,2.5s2.5-1.1,2.5-2.5S13.4,17.1,11.9,17.1z"/></g><g id="chevron_left"><path d="M18.1,4.4l-2.3-2.3l-10,10l10,10l2.3-2.3l-7.6-7.6L18.1,4.4z"/></g><g id="chevron_up"><path d="M11.9,5.9l-10,10l2.3,2.3l7.6-7.6l7.6,7.6l2.3-2.3L11.9,5.9z"/></g><g id="chevron_down"><path d="M4.3,5.9l7.6,7.6l7.6-7.6l2.3,2.3l-10,10L2,8.2L4.3,5.9z"/></g><g id="chevron_right"><path d="M5.8,19.7l7.6-7.6L5.8,4.4l2.3-2.3l10,10l-10,10L5.8,19.7z"/></g><g id="arrow_left"><path d="M21.9,10.8H6.7l7-7L12,2.1l-10,10l10,10l1.7-1.7l-7-7h15.2V10.8z"/></g><g id="arrow_down"><path d="M21.9,12.1l-1.7-1.7l-7,7V2.1h-2.5v15.2l-7-7L2,12.1l10,10L21.9,12.1z"/></g><g id="arrow_up"><path d="M2,12.1l1.7,1.7l7-7V22h2.5V6.8l7,7l1.7-1.7l-10-10L2,12.1z"/></g><g id="arrow_right"><path d="M2,13.3h15.2l-7,7l1.7,1.7l10-10l-10-10l-1.7,1.7l7,7H2V13.3z"/></g><g id="arrow_end"><polygon points="7.6,3.8 14.6,10.8 2,10.8 2,13.3 14.6,13.3 7.6,20.3 9.4,22 19.3,12.1 9.4,2.1 "/><rect x="19.4" y="2.1" width="2.5" height="19.9"/></g><g id="arrow_home"><polygon points="16.3,20.3 9.3,13.3 21.9,13.3 21.9,10.8 9.3,10.8 16.3,3.8 14.5,2.1 4.6,12.1 14.5,22 "/><rect x="2" y="2.1" width="2.5" height="19.9"/></g><g id="chevron_end"><path d="M2,4.4L9.6,12L2,19.7L4.3,22l10-10L4.3,2L2,4.4z M18.6,2.1h3.3V22h-3.3V2.1z"/></g><g id="chevron_home"><path d="M21.9,19.7l-7.6-7.6l7.6-7.6l-2.3-2.3l-10,10l10,10L21.9,19.7z M5.3,22H2V2.1h3.3V22z"/></g><g id="check"><path d="M8.3,16.5l-4.7-4.7L2,13.3l6.3,6.3L21.9,6.1l-1.6-1.6L8.3,16.5z"/></g><g id="close"><path d="M21.9,4.1l-2-2l-8,8l-8-8l-2,2l8,8l-8,8l2,2l8-8l8,8l2-2l-8-8L21.9,4.1z"/></g><g id="circle"><path d="M11.9,2.1c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10S17.4,2.1,11.9,2.1z M11.9,20c-4.4,0-8-3.6-8-8s3.6-8,8-8s8,3.6,8,8S16.4,20,11.9,20z"/></g><g id="circle_minus"><path d="M7,11.1v2h10v-2C16.9,11.1,7,11.1,7,11.1z M11.9,2.1c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10S17.4,2.1,11.9,2.1z M11.9,20c-4.4,0-8-3.6-8-8s3.6-8,8-8s8,3.6,8,8S16.4,20,11.9,20z"/></g><g id="circle_plus"><path d="M12.9,7.1h-2v4H7v2h4v4h2v-4h4v-2h-4v-4H12.9z M11.9,2.1c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10S17.4,2.1,11.9,2.1z M11.9,20c-4.4,0-8-3.6-8-8s3.6-8,8-8s8,3.6,8,8S16.4,20,11.9,20z"/></g><g id="circle_close"><path d="M14.5,8.1l-2.6,2.6L9.4,8.1L8,9.5l2.6,2.6L8,14.6L9.4,16l2.6-2.6l2.6,2.6l1.4-1.4L13.4,12L16,9.4L14.5,8.1z M11.9,2.1c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10S17.4,2.1,11.9,2.1z M11.9,20c-4.4,0-8-3.6-8-8s3.6-8,8-8s8,3.6,8,8S16.4,20,11.9,20z"/></g><g id="circle_triangle_right"><path d="M11.9,2.1c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10S17.4,2.1,11.9,2.1z M11.9,20c-4.4,0-8-3.6-8-8s3.6-8,8-8s8,3.6,8,8S16.4,20,11.9,20z"/><polygon points="10,16.6 15.9,12.1 10,7.6 "/></g><g id="circle_triangle_down"><path d="M21.9,12.1c0-5.5-4.5-10-10-10S2,6.6,2,12.1s4.5,10,10,10S21.9,17.5,21.9,12.1z M4,12.1c0-4.4,3.6-8,8-8s8,3.6,8,8s-3.6,8-8,8S4,16.5,4,12.1z"/><polygon points="7.5,10.1 11.9,16.1 16.4,10.1 "/></g><g id="circle_triangle_left"><path d="M11.9,22c5.5,0,10-4.5,10-10s-4.5-10-10-10S2,6.6,2,12.1S6.5,22,11.9,22z M11.9,4.1c4.4,0,8,3.6,8,8s-3.6,8-8,8s-8-3.6-8-8S7.5,4.1,11.9,4.1z"/><polygon points="13.9,7.6 8,12.1 13.9,16.6 "/></g><g id="circle_triangle_up"><path d="M2,12.1c0,5.5,4.5,10,10,10s10-4.5,10-10s-4.5-10-10-10S2,6.6,2,12.1z M19.9,12.1c0,4.4-3.6,8-8,8s-8-3.6-8-8s3.6-8,8-8S19.9,7.7,19.9,12.1z"/><polygon points="16.4,14.1 11.9,8.1 7.5,14.1 "/></g><g id="triangle_right"><polygon points="9.1,16.5 14.9,12 9.1,7.5 "/></g><g id="triangle_down"><polygon points="7.6,9 11.9,15 16.5,9 "/></g><g id="triangle_left"><polygon points="14.9,7.5 9.1,12 14.9,16.5 "/></g><g id="triangle_up"><polygon points="16.5,15 11.9,9 7.6,15 "/></g><g id="circle_pause"><path d="M9,16.1h2v-8H9V16.1z M11.9,2.1c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10S17.4,2.1,11.9,2.1z M11.9,20c-4.4,0-8-3.6-8-8s3.6-8,8-8s8,3.6,8,8S16.4,20,11.9,20z M12.9,16.1h2v-8h-2V16.1z"/></g><g id="circle_info"><path d="M11,17.1h2v-6h-2V17.1z M11.9,2.1c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10S17.4,2.1,11.9,2.1z M11.9,20c-4.4,0-8-3.6-8-8s3.6-8,8-8s8,3.6,8,8S16.4,20,11.9,20z M11,9.1h2v-2h-2C11,7.1,11,9.1,11,9.1z"/></g><g id="circle_warning"><path d="M11,15.1h2v2h-2V15.1z M11,7.1h2v6h-2V7.1z M11.9,2.1c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10S17.4,2.1,11.9,2.1z M11.9,20c-4.4,0-8-3.6-8-8s3.6-8,8-8s8,3.6,8,8S16.4,20,11.9,20z"/></g><g id="circle_help"><path d="M11,18h2v-2h-2C11,16.1,11,18,11,18z M11.9,2.1c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10S17.4,2.1,11.9,2.1z M11.9,20c-4.4,0-8-3.6-8-8s3.6-8,8-8s8,3.6,8,8S16.4,20,11.9,20z M11.9,6.1c-2.2,0-4,1.8-4,4h2c0-1.1,0.9-2,2-2s2,0.9,2,2c0,2-3,1.8-3,5h2c0-2.3,3-2.5,3-5C15.9,7.9,14.1,6.1,11.9,6.1z"/></g><g id="circle_checked"><path d="M11.9,7.1c-2.8,0-5,2.2-5,5s2.2,5,5,5s5-2.2,5-5S14.8,7.1,11.9,7.1z M11.9,2.1c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10S17.4,2.1,11.9,2.1z M11.9,20c-4.4,0-8-3.6-8-8s3.6-8,8-8s8,3.6,8,8S16.4,20,11.9,20z"/></g><g id="circle_location"><path d="M20,11.2c-0.4-3.8-3.4-6.8-7.1-7.1v-2H11V4c-3.8,0.3-6.8,3.3-7.1,7.1H2V13h1.9c0.4,3.8,3.4,6.8,7.1,7.1V22h1.8v-1.9c3.8-0.4,6.8-3.4,7.1-7.1h1.9v-1.8C21.9,11.2,20,11.2,20,11.2z M11.9,18.4c-3.6,0-6.3-2.8-6.3-6.3s2.7-6.3,6.3-6.3s6.3,2.8,6.3,6.3S15.5,18.4,11.9,18.4z"/></g><g id="circle_location_checked"><path d="M11.9,8.4c-2,0-3.7,1.7-3.7,3.7s1.7,3.7,3.7,3.7s3.7-1.7,3.7-3.7S13.9,8.4,11.9,8.4z M20,11.2c-0.4-3.8-3.4-6.8-7.1-7.1v-2H11V4c-3.8,0.3-6.8,3.3-7.1,7.1H2V13h1.9c0.4,3.8,3.4,6.8,7.1,7.1V22h1.8v-1.9c3.8-0.4,6.8-3.4,7.1-7.1h1.9v-1.8C21.9,11.2,20,11.2,20,11.2z M11.9,18.4c-3.6,0-6.3-2.8-6.3-6.3s2.7-6.3,6.3-6.3s6.3,2.8,6.3,6.3S15.5,18.4,11.9,18.4z"/></g><g id="circle_fill"><path d="M11.9,2.1c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10S17.4,2.1,11.9,2.1z"/></g><g id="circle_fill_checked"><path d="M11.9,2.1c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10S17.4,2.1,11.9,2.1z M10,17.1l-5-5l1.4-1.4l3.6,3.6l7.6-7.6L19,8.1L10,17.1z"/></g><g id="circle_fill_minus"><path d="M11.9,2.1c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10S17.4,2.1,11.9,2.1z M16.9,13.1H7v-2h10v2H16.9z"/></g><g id="circle_fill_plus"><path d="M11.9,2.1c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10S17.4,2.1,11.9,2.1z M16.9,13.1h-4v4h-2v-4H7v-2h4v-4h2v4h4v2H16.9z"/></g><g id="circle_fill_arrow_down"><path d="M21.9,12.1c0-5.5-4.5-10-10-10S2,6.6,2,12.1s4.5,10,10,10S21.9,17.5,21.9,12.1z M7.5,10.1h9l-4.5,6L7.5,10.1z"/></g><g id="circle_fill_arrow_left"><path d="M11.9,22c5.5,0,10-4.5,10-10s-4.5-10-10-10S2,6.6,2,12.1S6.5,22,11.9,22z M13.9,7.6v9l-6-4.5L13.9,7.6z"/></g><g id="circle_fill_arrow_up"><path d="M2,12.1c0,5.5,4.5,10,10,10s10-4.5,10-10s-4.5-10-10-10S2,6.6,2,12.1z M16.4,14.1h-9l4.5-6L16.4,14.1z"/></g><g id="circle_fill_arrow_right"><path d="M11.9,2.1c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10S17.4,2.1,11.9,2.1z M10,16.6v-9l6,4.5L10,16.6z"/></g><g id="circle_fill_pause"><path d="M11.9,2.1c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10S17.4,2.1,11.9,2.1z M11,16.1H9v-8h2V16.1z M14.9,16.1h-2v-8h2V16.1z"/></g><g id="circle_fill_info"><path d="M11.9,2.1c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10S17.4,2.1,11.9,2.1z M12.9,17.1h-2v-6h2V17.1z M12.9,9.1h-2v-2h2C12.9,7.1,12.9,9.1,12.9,9.1z"/></g><g id="circle_fill_warning"><path d="M11.9,2.1c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10S17.4,2.1,11.9,2.1z M12.9,17.1h-2v-2h2V17.1z M12.9,13.1h-2v-6h2C12.9,7.1,12.9,13.1,12.9,13.1z"/></g><g id="circle_fill_help"><path d="M11.9,2.1c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10S17.4,2.1,11.9,2.1z M12.9,19h-2v-2h2C12.9,17.1,12.9,19,12.9,19z M15,11.4l-0.9,0.9c-0.8,0.7-1.2,1.3-1.2,2.8h-2v-0.6c0-1.1,0.4-2.1,1.2-2.8l1.2-1.3c0.4-0.3,0.6-0.8,0.6-1.4C14,8,13.1,7.1,12,7.1s-2,0.9-2,2H8c0-2.2,1.8-4,4-4s4,1.8,4,4C15.9,10,15.5,10.7,15,11.4z"/></g><g id="circle_fill_group"><path d="M11.9,2.1c-5.5,0-10,4.5-10,10s4.5,10,10,10s10-4.5,10-10S17.4,2.1,11.9,2.1z M8,17.5c-1.4,0-2.5-1.1-2.5-2.5s1.1-2.5,2.5-2.5s2.5,1.1,2.5,2.5S9.4,17.5,8,17.5z M9.5,8.1c0-1.4,1.1-2.5,2.5-2.5s2.5,1.1,2.5,2.5s-1.1,2.5-2.5,2.5S9.5,9.5,9.5,8.1z M15.9,17.5c-1.4,0-2.5-1.1-2.5-2.5s1.1-2.5,2.5-2.5s2.5,1.1,2.5,2.5S17.3,17.5,15.9,17.5z"/></g><g id="box"><path d="M19.7,4.3v15.5H4.2V4.3H19.7 M19.7,2.1H4.2C3,2.1,2,3.1,2,4.3v15.5C2,21,3,22,4.2,22h15.5c1.2,0,2.2-1,2.2-2.2V4.3C21.9,3.1,20.9,2.1,19.7,2.1z"/></g><g id="box_fill"><path d="M19.7,2.1H4.2C3,2.1,2,3.1,2,4.3v15.5C2,21,3,22,4.2,22h15.5c1.2,0,2.2-1,2.2-2.2V4.3C21.9,3.1,20.9,2.1,19.7,2.1z"/></g><g id="box_fill_checked"><path d="M19.7,2.1H4.2C3,2.1,2,3.1,2,4.3v15.5C2,21,3,22,4.2,22h15.5c1.2,0,2.2-1,2.2-2.2V4.3C21.9,3.1,20.9,2.1,19.7,2.1z M9.8,17.6l-5.5-5.5l1.6-1.6l4,4l8.3-8.4l1.6,1.5L9.8,17.6z"/></g><g id="box_fill_minus"><path d="M19.7,2.1H4.2C3,2.1,2,3.1,2,4.3v15.5C2,21,3,22,4.2,22h15.5c1.2,0,2.2-1,2.2-2.2V4.3C21.9,3.1,20.9,2.1,19.7,2.1z M17.5,13.1H6.4v-2.2h11L17.5,13.1L17.5,13.1z"/></g><path id="box_fill_plus" d="M19.7,2.1H4.2C3,2.1,2,3.1,2,4.3v15.5C2,21,3,22,4.2,22h15.5c1.2,0,2.2-1,2.2-2.2V4.3C21.9,3.1,20.9,2.1,19.7,2.1z M17.5,13.1h-4.4v4.4h-2.2v-4.4H6.4v-2.2h4.4V6.5H13v4.4h4.4L17.5,13.1L17.5,13.1z"/><g id="box_fill_gear"><path d="M11.9,9.8c-1.2,0-2.2,1-2.2,2.2s1,2.2,2.2,2.2s2.2-1,2.2-2.2S13.2,9.8,11.9,9.8z M19.7,2.1H4.2C3,2.1,2,3.1,2,4.3v15.5C2,21,3,22,4.2,22h15.5c1.2,0,2.2-1,2.2-2.2V4.3C21.9,3.1,20.9,2.1,19.7,2.1z M17.8,12.1c0,0.2,0,0.5-0.1,0.7l1.7,1.2c0.2,0.1,0.2,0.3,0.1,0.5l-1.6,2.7c-0.1,0.2-0.3,0.2-0.5,0.2l-1.9-0.7c-0.4,0.3-0.8,0.6-1.3,0.7L14,19.5c0,0.2-0.2,0.3-0.4,0.3h-3.1c-0.2,0-0.3-0.2-0.4-0.3l-0.2-2.1C9.4,17.2,9,17,8.6,16.7l-1.9,0.7c-0.2,0.1-0.4,0-0.5-0.2l-1.5-2.7c-0.1-0.2-0.1-0.4,0.1-0.5l1.7-1.2c-0.1-0.2-0.1-0.5-0.1-0.7s0-0.5,0.1-0.7l-1.7-1.2C4.4,9.9,4.4,9.7,4.5,9.6l1.6-2.7c0.1-0.2,0.2-0.3,0.4-0.2l1.9,0.7c0.4-0.3,0.8-0.6,1.3-0.7L10,4.6c0-0.2,0.2-0.3,0.4-0.3h3.1c0.2,0,0.3,0.2,0.4,0.3l0.2,2.1c0.5,0.2,0.9,0.4,1.3,0.7l1.9-0.7c0.2-0.1,0.4,0,0.5,0.2l1.6,2.7c0.1,0.2,0.1,0.4-0.1,0.5l-1.7,1.2C17.8,11.6,17.8,11.8,17.8,12.1z"/></g><g id="box_focus"><path d="M4.2,15.4H2v4.4C2,21,3,22,4.2,22h4.4v-2.2H4.2V15.4z M4.2,4.3h4.4V2.1H4.2C3,2.1,2,3.1,2,4.3v4.4h2.2V4.3z M19.7,2.1h-4.4v2.2h4.4v4.4h2.2V4.3C21.9,3.1,20.9,2.1,19.7,2.1z M19.7,19.8h-4.4V22h4.4c1.2,0,2.2-1,2.2-2.2v-4.4h-2.2V19.8z M11.9,7.7c-2.4,0-4.4,2-4.4,4.4s2,4.4,4.4,4.4s4.4-2,4.4-4.4S14.4,7.7,11.9,7.7z M11.9,14.3c-1.2,0-2.2-1-2.2-2.2s1-2.2,2.2-2.2s2.2,1,2.2,2.2S13.2,14.3,11.9,14.3z"/></g><g id="rows"><path d="M20.8,13.1H3.1c-0.6,0-1.1,0.5-1.1,1.1v6.6C2,21.5,2.5,22,3.1,22H21c0.6,0,1.1-0.5,1.1-1.1v-6.6C21.9,13.6,21.4,13.1,20.8,13.1z M20.8,2.1H3.1C2.5,2.1,2,2.6,2,3.2v6.6c0,0.6,0.5,1.1,1.1,1.1H21c0.6,0,1.1-0.5,1.1-1.1V3.2C21.9,2.6,21.4,2.1,20.8,2.1z"/></g><g id="columns"><path d="M6.2,2.1H3.1C2.5,2.1,2,2.8,2,3.5v17.1C2,21.4,2.5,22,3.1,22h3.2c0.6,0,1.1-0.7,1.1-1.4V3.5C7.2,2.8,6.7,2.1,6.2,2.1z M20.8,2.1h-3.2c-0.6,0-1.1,0.7-1.1,1.4v17.1c0,0.7,0.5,1.4,1.1,1.4h3.2c0.6,0,1.1-0.7,1.1-1.4V3.5C21.9,2.8,21.4,2.1,20.8,2.1z M13.5,2.1h-3.2c-0.6,0-1.1,0.7-1.1,1.4v17.1c0,0.7,0.5,1.4,1.1,1.4h3.2c0.6,0,1.1-0.7,1.1-1.4V3.5C14.6,2.8,14.1,2.1,13.5,2.1z"/></g><g id="dashboard"><path d="M2,13.1h8.9v-11H2V13.1z M2,22h8.9v-6.6H2V22z M13,22h8.9V11H13V22z M13,2.1v6.6h8.9V2.1H13z"/></g><g id="layer_add"><path d="M4,6.1H2v14c0,1.1,0.9,2,2,2h14v-2H4V6.1z M19.9,2.1H8c-1.1,0-2,0.9-2,2v12c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2v-12C21.9,3,21,2.1,19.9,2.1z M18.9,11.1h-4v4h-2v-4H9v-2h4v-4h2v4h4C18.9,9.1,18.9,11.1,18.9,11.1z"/></g><g id="layer_remove"><path d="M4,6.1H2v14c0,1.1,0.9,2,2,2h14v-2H4V6.1z"/><path d="M19.9,2.1H8c-1.1,0-2,0.9-2,2v12c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2v-12C21.9,3,21,2.1,19.9,2.1z M18.9,11.1H9v-2h10v2H18.9z"/></g><g id="layer_to_back"><path d="M8.6,6.5H6.4v2.2h2.2V6.5L8.6,6.5z M8.6,11H6.4v2.2h2.2V11C8.5,11,8.6,11,8.6,11z M8.6,2.1c-1.2,0-2.2,1-2.2,2.2h2.2V2.1L8.6,2.1z M13,15.4h-2.2v2.2H13C13,17.5,13,15.4,13,15.4z M19.8,2.1v2.2H22C21.9,3.1,20.9,2.1,19.8,2.1z M13,2.1h-2.2v2.2H13V2.1z M8.6,17.6v-2.2H6.4C6.4,16.6,7.4,17.6,8.6,17.6z M19.8,13.1H22V11h-2.2V13.1z M19.8,8.7H22V6.5h-2.2V8.7z M19.8,17.6c1.2,0,2.2-1,2.2-2.2h-2.2V17.6z M4.1,6.5H2v13.3C2,21,3,22,4.1,22h13.3v-2.2H4.1C4.1,19.9,4.1,6.5,4.1,6.5z M15.3,4.3h2.2V2.1h-2.2V4.3z M15.3,17.6h2.2v-2.2h-2.2V17.6z"/></g><g id="layer_to_front"><path d="M2,13.1h2.2V11H2V13.1z M2,17.6h2.2v-2.2H2V17.6z M4.1,22v-2.2H2C2,21,3,22,4.1,22z M2,8.7h2.2V6.5H2V8.7z M15.3,22h2.2v-2.2h-2.2V22z M19.8,2.1H8.6c-1.2,0-2.2,1-2.2,2.2v11.1c0,1.2,1,2.2,2.2,2.2h11c1.2,0,2.2-1,2.2-2.2V4.3C21.9,3.1,20.9,2.1,19.8,2.1z M19.8,15.4H8.6V4.3h11L19.8,15.4L19.8,15.4z M10.9,22H13v-2.2h-2.2C10.9,19.9,10.9,22,10.9,22z M6.4,22h2.2v-2.2H6.4V22z"/></g><g id="layer_image"><path d="M21.9,16.1v-12c0-1.1-0.9-2-2-2H8c-1.1,0-2,0.9-2,2v12c0,1.1,0.9,2,2,2h12C21,18,21.9,17.1,21.9,16.1z M11,12.1l2,2.7l3-3.7l4,5H8L11,12.1z M2,6.1v14c0,1.1,0.9,2,2,2h14v-2H4v-14C4,6.1,2,6.1,2,6.1z"/></g><g id="image"><path d="M21.9,19.8V4.3c0-1.2-1-2.2-2.2-2.2H4.2C3,2.1,2,3.1,2,4.3v15.5C2,21,3,22,4.2,22h15.5C20.9,22,21.9,21,21.9,19.8z M8,13.7l2.7,3.3l3.9-5l5,6.6H4.2L8,13.7z"/></g><g id="label_fill"><path d="M17.3,5.6c-0.4-0.5-1-0.9-1.7-0.9H4.1C2.9,4.8,2,5.7,2,6.8v10.5c0,1.2,0.9,2.1,2.1,2.1h11.5c0.7,0,1.3-0.3,1.7-0.9l4.6-6.4L17.3,5.6z"/></g><g id="label"><path d="M17.3,5.6c-0.4-0.5-1-0.9-1.7-0.9H4.1C2.9,4.7,2,5.6,2,6.8v10.5c0,1.2,0.9,2.1,2.1,2.1h11.5c0.7,0,1.3-0.3,1.7-0.9l4.6-6.3L17.3,5.6z M15.6,17.3H4.1V6.8h11.5l3.7,5.2L15.6,17.3z"/></g><g id="backspace"><path d="M20.3,4.8H7.8c-0.6,0-1,0.2-1.3,0.7L2,12.1l4.5,6.6c0.3,0.4,0.7,0.7,1.3,0.7h12.5c0.9,0,1.7-0.7,1.7-1.7V6.3C21.9,5.4,21.2,4.8,20.3,4.8z M17.8,15l-1.2,1.2l-3-2.9l-3,2.9L9.5,15l3-2.9l-3-2.9L10.6,8l3,2.9l3-2.9l1.2,1.2l-3,2.9L17.8,15z"/></g><g id="redo"><path d="M18.3,11.2c-1.8-1.6-4.2-2.6-6.7-2.6c-4.6,0-8.3,3-9.7,7.1l2.2,0.7c1-3.1,4-5.3,7.4-5.3c1.9,0,3.7,0.7,5,1.8l-3.6,3.6h9V7.7L18.3,11.2z"/></g><g id="undo"><path d="M12.2,8.6c-2.6,0-4.9,1-6.7,2.6L2,7.7v8.8h8.8L7.2,13c1.3-1.2,3.1-1.8,5-1.8c3.4,0,6.3,2.2,7.4,5.3l2.2-0.8C20.6,11.6,16.8,8.6,12.2,8.6z"/></g><g id="reload"><path d="M19,5c-1.8-1.7-4.3-2.9-7.1-2.9c-5.5,0-10,4.5-10,10s4.5,10,10,10c4.7,0,8.6-3.2,9.6-7.5H19c-1,2.9-3.8,5-7.1,5c-4.2,0-7.5-3.3-7.5-7.5s3.3-7.5,7.5-7.5c2.1,0,3.9,0.8,5.2,2.2l-4,4h8.7V2.1L19,5z"/></g><g id="grid_fill"><path d="M4,8.1h4v-4H4V8.1z M10,20h4v-4h-4V20z M4,20h4v-4H4V20z M4,14.1h4v-4H4V14.1z M10,14.1h4v-4h-4V14.1z M15.9,4.1v4h4v-4C19.9,4.1,15.9,4.1,15.9,4.1z M10,8.1h4v-4h-4V8.1z M15.9,14.1h4v-4h-4V14.1z M15.9,20h4v-4h-4V20z"/></g><g id="grid"><path d="M19.9,2.1H4c-1.1,0-2,0.9-2,2V20c0,1.1,0.9,2,2,2h15.9c1.1,0,2-0.9,2-2V4.1C21.9,3,21,2.1,19.9,2.1z M8,20H4v-4h4C8,16.1,8,20,8,20z M8,14.1H4v-4h4V14.1z M8,8.1H4v-4h4C8,4.1,8,8.1,8,8.1z M13.9,20h-4v-4h4C13.9,16.1,13.9,20,13.9,20z M13.9,14.1h-4v-4h4V14.1z M13.9,8.1h-4v-4h4C13.9,4.1,13.9,8.1,13.9,8.1z M19.9,20h-4v-4h4C19.9,16.1,19.9,20,19.9,20z M19.9,14.1h-4v-4h4V14.1z M19.9,8.1h-4v-4h4C19.9,4.1,19.9,8.1,19.9,8.1z"/></g><g id="search"><path d="M16.2,14.6h-0.9L15,14.3c1.1-1.2,1.7-2.9,1.7-4.7c0-4.1-3.2-7.3-7.3-7.3S2.1,5.5,2.1,9.6s3.2,7.3,7.3,7.3c1.8,0,3.5-0.7,4.7-1.7l0.3,0.3v0.9L20,22l1.7-1.7L16.2,14.6z M9.5,14.6c-2.8,0-5.1-2.2-5.1-5.1s2.2-5.1,5.1-5.1s5.1,2.2,5.1,5.1S12.2,14.6,9.5,14.6z"/></g><g id="zoom_in"><path d="M16.2,14.6h-0.9L15,14.3c1.1-1.2,1.7-3,1.7-4.7c0-4.1-3.2-7.3-7.3-7.3S2.1,5.5,2.1,9.6s3.2,7.3,7.3,7.3c1.8,0,3.5-0.7,4.7-1.7l0.3,0.3v0.9L20,22l1.7-1.7L16.2,14.6z M9.5,14.6c-2.8,0-5.1-2.2-5.1-5.1s2.2-5.1,5.1-5.1s5.1,2.2,5.1,5.1S12.2,14.6,9.5,14.6z M12.2,10.1H10v2.2H8.9v-2.2H6.6V9h2.2V6.8H10V9h2.2V10.1L12.2,10.1z"/></g><g id="zoom_out"><path d="M16.2,14.6h-0.9L15,14.3c1.1-1.2,1.7-3,1.7-4.7c0-4.1-3.2-7.3-7.3-7.3S2.1,5.5,2.1,9.6s3.2,7.3,7.3,7.3c1.8,0,3.5-0.7,4.7-1.7l0.3,0.3v0.9L20,22l1.7-1.7L16.2,14.6z M9.5,14.6c-2.8,0-5.1-2.2-5.1-5.1s2.2-5.1,5.1-5.1s5.1,2.2,5.1,5.1S12.2,14.6,9.5,14.6z M6.6,9h5.6v1.2H6.6V9z"/></g><g id="fullscreen"><path d="M4.8,14.9H2V22h7.1v-2.8H4.8V14.9z M2,9.2h2.8V4.9H9V2.1H2V9.2z M19.1,19.2h-4.2V22H22v-7.1h-2.8v4.3H19.1z M14.8,2.1v2.8H19v4.2h2.9v-7H14.8z"/></g><g id="fullscreen_off"><path d="M2,17.8h4.2V22H9v-7.1H2V17.8z M6.2,6.3H2v2.8h7.1v-7H6.2V6.3z M14.8,22h2.8v-4.2h4.3V15h-7.1C14.8,15,14.8,22,14.8,22z M17.7,6.3V2.1h-2.8v7.1H22V6.3H17.7z"/></g><g id="color_palette"><path d="M11.9,2.1c-5.5,0-10,4.5-10,10s4.5,10,10,10c0.9,0,1.7-0.7,1.7-1.7c0-0.4-0.2-0.8-0.4-1.1c-0.2-0.3-0.4-0.7-0.4-1.1c0-0.9,0.7-1.7,1.7-1.7h2c3.1,0,5.6-2.5,5.6-5.6C21.9,6.1,17.4,2.1,11.9,2.1z M5.9,12.1c-0.9,0-1.7-0.7-1.7-1.7S5,8.7,5.9,8.7s1.7,0.7,1.7,1.7S6.8,12.1,5.9,12.1z M9.2,7.7C8.3,7.7,7.5,6.9,7.5,6s0.7-1.7,1.7-1.7S10.9,5,10.9,6S10.1,7.7,9.2,7.7z M14.7,7.7C13.8,7.7,13,6.9,13,6s0.7-1.7,1.7-1.7c0.9,0,1.7,0.7,1.7,1.7S15.6,7.7,14.7,7.7z M18,12.1c-0.9,0-1.7-0.7-1.7-1.7S17,8.7,18,8.7s1.7,0.7,1.7,1.7S18.9,12.1,18,12.1z"/></g><g id="color_picker"><path d="M21.6,5L19,2.4c-0.4-0.4-1.2-0.4-1.6,0l-3.5,3.5l-2.1-2.2l-1.6,1.6l1.6,1.6L2,16.8V22h5.2l9.9-9.9l1.6,1.6l1.6-1.6L18.1,10l3.5-3.5C22,6.2,22,5.4,21.6,5z M6.3,19.8l-2.2-2.2l9-8.9l2.2,2.2L6.3,19.8z"/></g><g id="trash"><path d="M5.3,19.8c0,1.2,1,2.2,2.2,2.2h8.9c1.2,0,2.2-1,2.2-2.2V6.5H5.3V19.8z M19.7,3.2h-3.9l-1.1-1.1H9.2L8,3.2H4.2v2.2h15.5V3.2L19.7,3.2z"/></g><g id="trash_empty"><path d="M5.3,19.8c0,1.2,1,2.2,2.2,2.2h8.9c1.2,0,2.2-1,2.2-2.2V6.5H5.3V19.8z M8,11.9l1.6-1.5l2.3,2.3l2.3-2.3l1.6,1.6l-2.3,2.3l2.3,2.3l-1.6,1.6l-2.3-2.4l-2.3,2.3L8,16.6l2.3-2.3L8,11.9z M15.9,3.2l-1.2-1.1H9.2L8,3.2H4.2v2.2h15.5V3.2H15.9z"/></g><g id="developer"><path d="M21.9,9V6.9h-2v-2c0-1.2-0.9-2.1-2-2.1H4c-1.1,0-2,0.9-2,2.1v14.4c0,1.2,0.9,2.1,2,2.1h13.9c1.1,0,2-0.9,2-2.1v-2.1H22v-2.1h-2V13h2v-2h-2V9H21.9z M17.9,19.2H4V4.9h13.9V19.2L17.9,19.2z M6,13.1h5v4.1H6V13.1z M11.9,6.9h4V10h-4V6.9z M6,6.9h5V12H6V6.9z M11.9,11.1h4v6.1h-4V11.1z"/></g><g id="hub"><path d="M17.5,16.5L13,12.1V8.6c1.3-0.5,2.2-1.7,2.2-3.2c0-1.8-1.5-3.3-3.3-3.3S8.6,3.6,8.6,5.4c0,1.4,0.9,2.7,2.2,3.2v3.5l-4.4,4.4H2V22h5.6v-3.4l4.4-4.7l4.4,4.7V22H22v-5.6h-4.5V16.5z"/></g><g id="camera"><path d="M9.4,10.6l4.7-8.2c-0.7-0.2-1.4-0.2-2.2-0.2C9.5,2.2,7.3,3,5.6,4.4L9.4,10.6L9.4,10.6z M21.4,9.1c-0.9-2.9-3.2-5.2-6-6.3l-3.7,6.3H21.4z M21.8,10.1h-7.5l0.2,0.5l4.7,8.2c1.7-1.7,2.7-4.2,2.7-6.7C21.9,11.4,21.8,10.7,21.8,10.1z M8.5,12.1L4.6,5.3C3,7.1,2,9.5,2,12.1c0,0.7,0.1,1.3,0.2,2h7.5L8.5,12.1z M2.5,15.1c0.9,2.9,3.2,5.2,6,6.3l3.7-6.3C12.2,15.1,2.5,15.1,2.5,15.1z M13.7,15.1l-3.9,6.7C10.5,22,11.2,22,12,22c2.4,0,4.6-0.8,6.3-2.2l-3.7-6.3C14.6,13.5,13.7,15.1,13.7,15.1z"/></g><g id="camera_alt"><circle cx="11.9" cy="13.1" r="3.2"/><path d="M9,3.1l-1.8,2H4c-1.1,0-2,0.9-2,2v12c0,1.1,0.9,2,2,2h15.9c1.1,0,2-0.9,2-2v-12c0-1.1-0.9-2-2-2h-3.2l-1.8-2C14.9,3.1,9,3.1,9,3.1z M11.9,18c-2.7,0-5-2.2-5-5s2.2-5,5-5s5,2.2,5,5S14.7,18,11.9,18z"/></g><g id="film"><path d="M13.9,5.9c0-1.1-0.9-1.9-2-1.9H11V3c0-0.5-0.4-0.9-0.9-0.9H6.2C5.7,2.1,5.3,2.5,5.3,3v0.9H4.4c-1.1,0-1.9,0.8-1.9,1.9V20c0,1.1,0.8,1.9,1.9,1.9H12c1.1,0,1.9-0.8,1.9-1.9h7.6V5.9H13.9z M11.9,18.2H10v-1.9h1.9V18.2z M11.9,9.7H10V7.8h1.9V9.7z M15.8,18.2h-1.9v-1.9h1.9V18.2z M15.8,9.7h-1.9V7.8h1.9V9.7z M19.5,18.2h-1.9v-1.9h1.9V18.2z M19.5,9.7h-1.9V7.8h1.9V9.7z"/></g><g id="visibility"><path d="M12,5.3c-4.5,0-8.3,2.8-9.9,6.7c1.5,3.9,5.4,6.7,9.9,6.7s8.3-2.8,9.9-6.7C20.3,8,16.5,5.3,12,5.3z M12,16.5c-2.5,0-4.5-2-4.5-4.5s2-4.5,4.5-4.5s4.5,2,4.5,4.5S14.5,16.5,12,16.5z M12,9.2c-1.5,0-2.7,1.2-2.7,2.7s1.2,2.7,2.7,2.7s2.7-1.2,2.7-2.7S13.5,9.2,12,9.2z"/></g><g id="visibility_off"><path d="M12,7.4c2.5,0,4.5,2,4.5,4.5c0,0.6-0.1,1.2-0.3,1.7l2.7,2.7c1.3-1.2,2.4-2.6,3.1-4.2c-1.6-4.1-5.4-6.8-9.9-6.8c-1.2,0-2.5,0.2-3.6,0.7l1.9,1.9C10.9,7.5,11.5,7.4,12,7.4z M3.1,4.9l2,2.1l0.4,0.4C4,8.6,2.8,10.2,2.1,11.9c1.6,4,5.4,6.7,9.9,6.7c1.4,0,2.7-0.2,3.9-0.7l0.4,0.4L19,21l1.2-1.2L4.1,3.8L3.1,4.9z M8,9.9l1.4,1.4c-0.1,0.2-0.1,0.4-0.1,0.6c0,1.5,1.2,2.7,2.7,2.7c0.2,0,0.4,0,0.6-0.1L14,16c-0.6,0.3-1.2,0.5-2,0.5c-2.5,0-4.5-2-4.5-4.5C7.5,11.2,7.7,10.5,8,9.9z M11.9,9.2l2.8,2.8v-0.2C14.7,10.4,13.4,9.2,11.9,9.2L11.9,9.2z"/></g><g id="layers"><path d="M11.9,19.5l-7.3-5.7L3,15l8.9,7l9-7l-1.6-1.2L11.9,19.5z M11.9,17l7.3-5.7l1.7-1.2l-9-6.9l-9,7l1.6,1.2L11.9,17z"/></g><g id="layers_off"><path d="M19.7,16l1.2-0.9l-1.4-1.4l-1.2,0.9L19.7,16z M19.3,11.3l1.7-1.2l-9-7L9,5.3l7.8,7.8C16.9,13.1,19.3,11.3,19.3,11.3z M3.3,2.1L2,3.3l4.2,4.2L2.9,10l1.6,1.2l7.3,5.7l2.1-1.6l1.4,1.4L12,19.4l-7.3-5.7l-1.6,1.2l8.9,7l4.9-3.8l3.7,3.7l1.2-1.2L3.3,2.1z"/></g><g id="hamburger"><path d="M20.9,9.1H3.2c-0.6,0-1.1,0.3-1.1,0.7V14c0,0.4,0.5,0.8,1.1,0.8h17.9c0.6,0,1.1-0.3,1.1-0.7V9.9C22,9.4,21.5,9.1,20.9,9.1z M20.9,2.1H3.2c-0.6,0-1.1,0.3-1.1,0.7V7c0,0.4,0.5,0.7,1.1,0.7h17.9c0.6,0,1.1-0.3,1.1-0.7V2.8C22,2.4,21.5,2.1,20.9,2.1z M20.9,16.5H3.2c-0.6,0-1.1,0.3-1.1,0.7v4.2c0,0.4,0.5,0.7,1.1,0.7h17.9c0.6,0,1.1-0.3,1.1-0.7v-4.2C22,16.8,21.5,16.5,20.9,16.5z"/></g></svg>`;

IoIconsetSingleton.registerIcons('icons', icons);

class IoBoolicon extends IoBoolean {
  static get Style() {
    return /* css */`
    :host {
      width: var(--io-item-height);
      height: var(--io-item-height);
      fill: var(--io-color, currentcolor);
      padding: 0;
    }
    :host[stroke] {
      stroke: var(--io-background-color, currentcolor);
      stroke-width: var(--io-stroke-width);
    }
    :host > svg {
      pointer-events: none;
      width: 100%;
      height: 100%;
    }
    :host > svg > g {
      transform-origin: 0px 0px;
    }
    :host[aria-invalid] {
      border: var(--io-border-error);
      background-image: var(--io-gradient-error);
    }
    `;
  }
  static get Properties() {
    return {
      true: 'icons:box_fill_checked',
      false: 'icons:box',
      stroke: {
        value: false,
        reflect: 1,
      },
    };
  }
  changed() {
    this.title = this.label;
    this.innerHTML = IoIconsetSingleton.getIcon(this.value ? this.true : this.false);
  }
  setAria() {
    super.setAria();
    this.setAttribute('aria-checked', String(!!this.value));
    this.setAttribute('aria-invalid', typeof this.value !== 'boolean' ? 'true' : false);
  }
}

IoBoolicon.Register();

class IoSwitch extends IoBoolean {
  static get Style() {
    return /* css */`
    :host {
      position: relative;
      width: calc(1.5 * var(--io-item-height));
    }
    :host:before {
      display: inline-block;
      box-sizing: border-box;
      position: absolute;
      content: '';
      top: var(--io-spacing);
      left: 0;
      width: calc(100% - calc(2 * var(--io-border-width)));
      height: var(--io-line-height);
      border-radius: var(--io-line-height);
      border: var(--io-border);
      border-color: var(--io-color-border-inset);
      background-color: var(--io-background-color-dark);
      box-shadow: var(--io-shadow-inset);
      transition: background-color 0.4s;
    }
    :host:after {
      display: inline-block;
      box-sizing: border-box;
      position: absolute;
      content: '';
      top: calc(var(--io-border-width) + var(--io-spacing));
      left: var(--io-border-width);
      height: calc(var(--io-line-height) - calc(2 * var(--io-border-width)));
      width: calc(var(--io-line-height) - calc(2 * var(--io-border-width)));
      background-color: var(--io-background-color-dark);
      border: var(--io-border);
      border-color: var(--io-color-border-outset);
      border-radius: var(--io-line-height);
      transition-timing-function: ease-in-out;
      transition: left 0.25s;
    }
    :host[value]:after {
      background-color: rgba(80, 210, 355, 0.75);
      left: calc(calc(100% - var(--io-line-height)) - var(--io-border-width));
    }
    :host[aria-invalid] {
      border: var(--io-border-error);
      background-image: var(--io-gradient-error);
    }
    :host:hover:before,
    :host[display="switch"][value]:not([aria-invalid]):before {
      background-color: var(--io-background-color);
    }
    :host:focus:before,
    :host:focus:after {
      border-color: var(--io-color-focus);
    }
    :host:focus {
      outline-color: var(--io-color-focus);
    }
    `;
  }
  changed() {
    this.title = this.label;
  }
  setAria() {
    super.setAria();
    this.setAttribute('aria-checked', String(!!this.value));
    this.setAttribute('aria-invalid', typeof this.value !== 'boolean' ? 'true' : false);
    this.setAttribute('aria-label', this.label);
  }
}

IoSwitch.Register();

class IoString extends IoItem {
  static get Style() {
    return /* css */`
    :host {
      cursor: text;
      user-select: text;
      -webkit-user-select: text;
      -webkit-touch-callout: default;
      min-width: var(--io-item-height);
      border-color: var(--io-color-border-inset);
      color: var(--io-color-field);
      background-color: var(--io-background-color-field);
      box-shadow: var(--io-shadow-inset);
    }
    :host:before,
    :host:after {
      content: ' ';
      white-space: pre;
      visibility: hidden;
    }
    :host[aria-invalid] {
      border: var(--io-border-error);
      background-image: var(--io-gradient-error);
    }
    `;
  }
  static get Properties() {
    return {
      live: Boolean,
      value: String,
      contenteditable: true,
      role: 'textbox',
    };
  }
  _setFromTextNode() {
    const textNode = this.textNode;
    if (typeof this.value === 'string' && textNode !== String(this.value)) {
      this.set('value', textNode);
    }
  }
  _tryParseFromTextNode() {
    const textNode = this.textNode;
    try {
      const value = JSON.parse(textNode.replace(/[\t\n\r ]+/g, ' '));
      this.set('value', value);
    } catch (error) {
      console.warn('IoString: Cannot parse value', textNode);
      console.error(error);
      this._setFromTextNode();
    }
  }
  _onBlur(event) {
    super._onBlur(event);
    this.removeEventListener('blur', this._onBlur);
    this.removeEventListener('keydown', this._onKeydown);
    this._setFromTextNode();
    this.scrollTop = 0;
    this.scrollLeft = 0;
  }
  _onPointerdown() {
    this.addEventListener('pointermove', this._onPointermove);
    this.addEventListener('pointerup', this._onPointerup);
  }
  _onPointermove() {}
  _onPointerup() {
    this.removeEventListener('pointermove', this._onPointermove);
    this.removeEventListener('pointerup', this._onPointerup);
    if (document.activeElement !== this) {
      this.focus();
      this.setCaretPosition(this.textNode.length);
    }
  }
  _onKeyup(event) {
    super._onKeyup(event);
    if (this.live) {
      const carretPosition = this.getCaretPosition();
      this._setFromTextNode();
      this.setCaretPosition(carretPosition);
    }
  }
  _onKeydown(event) {
    const rng = window.getSelection().getRangeAt(0);
    const start = rng.startOffset;
    const end = rng.endOffset;
    const length = this.childNodes[0] ? this.childNodes[0].length : 0;
    const rngInside = rng.startContainer === rng.endContainer && (rng.startContainer === this.childNodes[0] || rng.startContainer === this);

    if (event.key == 'Enter') {
      event.preventDefault();
      if (event.shiftKey) {
        this._tryParseFromTextNode();
      } else {
        this._setFromTextNode();
      }
    } else if (event.key == 'ArrowLeft') {
      if (event.ctrlKey || (rngInside && start === end && start === 0)) {
        event.preventDefault();
        this.focusTo('left');
      }
    } else if (event.key == 'ArrowUp') {
      if (event.ctrlKey || (rngInside && start === end && start === 0)) {
        event.preventDefault();
        this.focusTo('up');
      }
    } else if (event.key == 'ArrowRight') {
      if (event.ctrlKey || (rngInside && start === end && start === length)) {
        event.preventDefault();
        this.focusTo('right');
      }
    } else if (event.key == 'ArrowDown') {
      if (event.ctrlKey || (rngInside && start === end && start === length)) {
        event.preventDefault();
        this.focusTo('down');
      }
    }
  }
  changed() {
    this.title = this.label;
    this.textNode = String(this.value).replace(new RegExp(' ', 'g'), '\u00A0');
  }
  setAria() {
    super.setAria();
    this.setAttribute('aria-invalid', (typeof this.value !== 'string') ? 'true' : false);
  }
}

IoString.Register();

let lastFocus = null;
{
  window.addEventListener('focusin', () => {
    lastFocus = document.activeElement;
  }, {capture: false});
  window.addEventListener('blur', () => {
    setTimeout(() => {
      if (document.activeElement === document.body) {
        lastFocus = null;
      }
    });
  }, {capture: true});
}

class IoLayer extends IoElement {
  static get Style() {
    return /* css */`
    :host {
      display: block;
      visibility: hidden;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      z-index: 100000;
      user-select: none;
      overflow: hidden;
      pointer-events: none;
      touch-action: none;
      opacity: 0;
      transition: opacity 0.25s;
      background: transparent;
    }
    :host[expanded] {
      pointer-events: all;
      visibility: visible;
      opacity: 1;
      /* background: rgba(0,0,0,0.2); */
    }
    :host > * {
      position: absolute;
      touch-action: none;
    }
    `;
  }
  static get Properties() {
    return {
      expanded: {
        value: false,
        reflect: 1,
      },
    };
  }
  static get Listeners() {
    return {
      'pointerup': '_onPointerup',
      'contextmenu': '_onContextmenu',
      'focusin': '_onFocusIn',
      'scroll': '_onScroll',
      'wheel': '_onScroll',
      'mousedown': 'stopPropagation',
      'mouseup': 'stopPropagation',
      'mousemove': 'stopPropagation',
      'touchstart': 'stopPropagation',
      'touchmove': 'stopPropagation',
      'touchend': 'stopPropagation',
      'keydown': 'stopPropagation',
      'keyup': 'stopPropagation',
    };
  }
  constructor(props) {
    super(props);
    Object.defineProperty(this, 'x', {value: 0, writable: true});
    Object.defineProperty(this, 'y', {value: 0, writable: true});
  }
  stopPropagation(event) {
    event.stopPropagation();
  }
  _onPointerup(event) {
    if (event.composedPath()[0] === this) {
      this.requestAnimationFrameOnce(this._collapse);
    }
  }
  _collapse() {
    this.expanded = false;
  }
  _onContextmenu(event) {
    event.preventDefault();
  }
  _onFocusIn(event) {
    event.stopPropagation();
  }
  _onScroll(event) {
    if (event.composedPath()[0] === this) {
      this.requestAnimationFrameOnce(this._collapse);
    }
  }
  nudgeDown(element, x, y, elemRect, force) {
    x = Math.max(0, Math.min(x, window.innerWidth - elemRect.width));
    if (y + elemRect.height < window.innerHeight || force) {
      element.style.left = x + 'px';
      element.style.top = y + 'px';
      return true;
    }
    return false;
  }
  nudgeUp(element, x, y, elemRect, force) {
    x = Math.max(0, Math.min(x, window.innerWidth - elemRect.width));
    if (y - elemRect.height > 0 || force) {
      element.style.left = x + 'px';
      element.style.top = y - elemRect.height + 'px';
      return true;
    }
    return false;
  }
  nudgeRight(element, x, y, elemRect, force) {
    if (x + elemRect.width < window.innerWidth || force) {
      element.style.left = x + 'px';
      element.style.top = Math.min(y, window.innerHeight - elemRect.height) + 'px';
      return true;
    }
    return false;
  }
  nudgeLeft(element, x, y, elemRect, force) {
    if (x - elemRect.width > 0 || force) {
      element.style.left = x - elemRect.width + 'px';
      element.style.top = Math.min(y, window.innerHeight - elemRect.height) + 'px';
      return true;
    }
    return false;
  }
  nudgePointer(element, x, y, elemRect) {
    element.style.left = Math.max(0, Math.min(x, window.innerWidth - elemRect.width)) + 'px';
    element.style.top = Math.max(0, Math.min(y, window.innerHeight - elemRect.height)) + 'px';
    return true;
  }
  setElementPosition(element, direction, srcRect) {
    const elemRect = element.getBoundingClientRect();
    const left = srcRect.left;
    const top = srcRect.top;
    const right = srcRect.right;
    const bottom = srcRect.bottom;
    const bottomToHeight = window.innerHeight - bottom;
    const rightToWidth = window.innerWidth - right;
    switch (direction) {
      case 'pointer':
        this.nudgePointer(element, this.x + 5, this.y + 5, elemRect);
        break;
      case 'top':
        this.nudgeUp(element, left, top, elemRect) ||
        this.nudgeDown(element, left, bottom, elemRect) ||
        this.nudgeUp(element, left, top, elemRect, top > bottomToHeight) ||
        this.nudgeDown(element, left, bottom, elemRect, top <= bottomToHeight);
        break;
      case 'left':
        this.nudgeLeft(element, left, top, elemRect) ||
        this.nudgeRight(element, right, top, elemRect) ||
        this.nudgeLeft(element, left, top, elemRect, left > rightToWidth) ||
        this.nudgeRight(element, right, top, elemRect, left <= rightToWidth);
        break;
      case 'bottom':
        this.nudgeDown(element, left, bottom, elemRect) ||
        this.nudgeUp(element, left, top, elemRect) ||
        this.nudgeDown(element, left, bottom, elemRect, bottomToHeight > top) ||
        this.nudgeUp(element, left, top, elemRect, bottomToHeight <= top);
        break;
      case 'right':
      default:
        this.nudgeRight(element, right, top, elemRect) ||
        this.nudgeLeft(element, left, top, elemRect) ||
        this.nudgeRight(element, right, top, elemRect, rightToWidth > left) ||
        this.nudgeLeft(element, left, top, elemRect, rightToWidth <= left);
        break;
    }
  }
  appendChild(child) {
    super.appendChild(child);
    child.addEventListener('expanded-changed', this.onChildExpanded);
    this.onChildExpanded();
  }
  removeChild(child) {
    super.removeChild(child);
    child.removeEventListener('expanded-changed', this.onChildExpanded);
    this.onChildExpanded();
  }
  onChildExpanded() {
    this.requestAnimationFrameOnce(this.onChildExpandedDelayed);
  }
  onChildExpandedDelayed() {
    for (let i = this.children.length; i--;) {
      if (this.children[i].expanded) {
        this.expanded = true;
        return;
      }
    }
    this.requestAnimationFrameOnce(this._collapse);
  }
  expandedChanged() {
    if (!this.expanded) {
      for (let i = this.children.length; i--;) {
        this.children[i].expanded = false;
      }
      if (lastFocus) lastFocus.focus();
    }
  }
}

IoLayer.Register();

const IoLayerSingleton = new IoLayer();
document.body.appendChild(IoLayerSingleton);

let lastFocus$1 = null;
{
  window.addEventListener('focusin', () => {
    lastFocus$1 = document.activeElement;
  }, {capture: false});
  window.addEventListener('blur', () => {
    setTimeout(() => {
      if (document.activeElement === document.body) {
        lastFocus$1 = null;
      }
    });
  }, {capture: true});
}

class IoLadderStep extends IoItem {
  static get Style() {
    return /* css */`
    :host {
      pointer-events: all;
      display: inline-block;
      cursor: ew-resize;
      text-align: center;
      background-color: var(--io-background-color-highlight);
      color: var(--io-color);
      align-self: stretch;
      touch-action: none;
      width: 6em;
    }
    :host:before {
      float: left;
      content: '<';
      opacity: 0.25;
    }
    :host:after {
      float: right;
      content: '>';
      opacity: 0.25;
    }
    `;
  }
  static get Properties() {
    return {
      role: 'spinbutton',
      type: {
        value: 'number',
        reflect: 1,
      },
    };
  }
  _onKeydown(event) {
    let stepMove = 0;
    if (event.key === 'Escape' || event.key === ' ') {
      this.dispatchEvent('ladder-step-collapse', {}, true);
    } else if (event.key === 'ArrowLeft' || event.key === 'Backspace') {
      event.preventDefault();
      stepMove = this.value * -1;
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.focusTo('up');
    } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
      event.preventDefault();
      stepMove = this.value * 1;
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.focusTo('down');
    }
    if (stepMove !== 0) {
      this.dispatchEvent('ladder-step-change', {step: Number(stepMove.toFixed(5)), round: event.shiftKey}, true);
      this.setAttribute('aria-valuenow', this.parentElement.value);
    }
  }
  _onPointerdown(event) {
    this.setPointerCapture(event.pointerId);
    this.addEventListener('pointermove', this._onPointermove);
    this.addEventListener('pointerup', this._onPointerup);
    this._startX = event.clientX;
  }
  _onPointermove(event) {
    const deltaX = event.clientX - this._startX;
    if (Math.abs(deltaX) > 5) {
      const expMove = Math.pow(deltaX / 5, 2) * deltaX < 0 ? -1: 1;
      const roundMove = deltaX > 0 ? Math.floor(expMove) : Math.ceil(expMove);
      let stepMove = this.value * roundMove;
      this._startX = event.clientX;
      this.dispatchEvent('ladder-step-change', {step: Number(stepMove.toFixed(5)), round: event.shiftKey}, true);
    }
  }
  _onPointerup(event) {
    this.releasePointerCapture(event.pointerId);
    this.removeEventListener('pointermove', this._onPointermove);
    this.removeEventListener('pointerup', this._onPointerup);
    this.dispatchEvent('ladder-step-collapse', {}, true);
  }
  setAria() {
    super.setAria();
    this.setAttribute('aria-valuemax', this.parentElement.max);
    this.setAttribute('aria-valuemin', this.parentElement.min);
    this.setAttribute('aria-valuenow', this.parentElement.value);
  }
}

IoLadderStep.Register();

class IoLadder extends IoElement {
  static get Style() {
    return /* css */`
    :host {
      position: relative;
      pointer-events: none;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
      display: flex;
      flex-direction: column;
    }
    :host:not([expanded]) {
      visibility: hidden;
    }
    :host:not([expanded]) > io-ladder-step {
      opacity: 0.5;
    }
    :host > io-ladder-step:nth-child(-n+5) {
      box-shadow: 0 -1px 4px rgba(0,0,0,0.2);
    }
    :host > io-ladder-step:nth-child(n+6) {
      box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    }
    :host > .io-up1,
    :host > .io-down1{
      z-index: 4;
      transition: opacity 0.1s, transform 0.1s;
    }
    :host > .io-up2,
    :host > .io-down2 {
      z-index: 3;
      opacity: 0.8;
      transition: opacity 0.2s, transform 0.2s;
    }
    :host:not([expanded]) > .io-up4 {
      transform: translateY(calc(3 * var(--io-item-height)));
    }
    :host:not([expanded]) > .io-up3 {
      transform: translateY(calc(2 * var(--io-item-height)));
    }
    :host:not([expanded]) > .io-up2 {
      transform: translateY(calc(1 * var(--io-item-height)));
    }
    :host:not([expanded]) > .io-down2 {
      transform: translateY(calc(-1 * var(--io-item-height)));
    }
    :host:not([expanded]) > .io-down3 {
      transform: translateY(calc(-2 * var(--io-item-height)));
    }
    :host:not([expanded]) > .io-down4 {
      transform: translateY(calc(-3 * var(--io-item-height)));
    }
    :host > .io-up3,
    :host > .io-down3 {
      z-index: 2;
      opacity: 0.6;
      transition: opacity 0.4s, transform 0.4s;
    }
    :host > .io-up4,
    :host > .io-down4 {
      z-index: 1;
      opacity: 0.4;
      transition: opacity 0.8s, transform 0.8s;
    }
    :host > io-ladder-step:hover,
    :host > io-ladder-step:focus {
      background-color: var(--io-background-color-highlight);
      border-color: var(--io-color-focus);
      transition: opacity 0.2s;
      opacity: 1;
    }
    :host > .io-ladder-empty {
      height: var(--io-item-height);
    }
    :host > .io-ladder-center {
      height: calc(1.5 * var(--io-item-height));
    }
    `;
  }
  static get Properties() {
    return {
      src: HTMLElement,
      conversion: 1,
      expanded: {
        type: Boolean,
        reflect: 1,
      },
      min: -Infinity,
      max: Infinity,
      step: 0.0001,
      role: 'list',
    };
  }
  static get Listeners() {
    return {
      'ladder-step-change': '_onLadderStepChange',
      'ladder-step-collapse': '_onLadderStepCollapse',
      'focusin': '_onFocusIn',
    };
  }
  get value() {
    return this.src ? this.src.value : 0;
  }
  _onFocusIn(event) {
    event.stopPropagation();
  }
  _onFocusTo(event) {
    event.stopPropagation();
    const srcStep = event.composedPath()[0];
    const src = this.src;
    const dir = event.detail.dir;
    if (src) {
      if ((srcStep === this.querySelector('.io-up1') && dir === 'down') ||
          (srcStep === this.querySelector('.io-down1') && dir === 'up')) {
        src.focus();
        src.selectionStart = src.selectionEnd = src.textNode.length;
        return;
      }
    }
    super._onFocusTo(event);
  }
  _onLadderStepChange(event) {
    const src = this.src;
    if (this.src) {
      const step = event.detail.step;
      const value = event.detail.round ? (Math.round(this.value / step) * step) : this.value;
      let newValue = Math.min(this.max, Math.max(this.min, value + step));
      newValue = Number(newValue.toFixed(5));
      src.set('value', newValue);
    }
  }
  _onLadderStepCollapse() {
    this.set('expanded', false);
  }
  srcChanged() {
    const src = this.src;
    if (src) this.setProperties({
      min: src.min,
      max: src.max,
      step: src.step,
      conversion: src.conversion,
    });
  }
  expandedChanged() {
    const src = this.src;
    if (this.expanded) {
      if (src) {
        const rect = src.getBoundingClientRect();
        // NOTE: layerRect fix for Safari zoom.
        const layerRect = IoLayerSingleton.getBoundingClientRect();
        this.style.top = rect.bottom - layerRect.top + 'px';
        this.style.left = rect.left - layerRect.left + 'px';
        this.style.position = 'absolute';
        this.style.marginTop = 'calc(-5.25 * var(--io-item-height))';
      } else {
        this.removeAttribute('style');
      }
    } else {
      if (src && src._pointerType !== 'touch') {
        src.focus();
      } else if (lastFocus$1) {
        lastFocus$1.focus();
      }
    }
    this.dispatchEvent('expanded', {value: this.expanded}, true);
  }
  changed() {
    const range = this.max - this.min;
    const hiddenItem = ['span', {class: 'io-ladder-empty'}];

    // TODO: unhack
    let step = this.step / 10000;
    while (step < .1) step = step * 10;

    const upStep4 = 10000 * step;
    const upStep3 = 1000 * step;
    const upStep2 = 100 * step;
    const upStep1 = 10 * step;
    const downStep1 = 1 * step;
    const downStep2 = .1 * step;
    const downStep3 = .01 * step;
    const downStep4 = .001 * step;

    const upLabel4 = Number((upStep4 * this.conversion).toFixed(6));
    const upLabel3 = Number((upStep3 * this.conversion).toFixed(6));
    const upLabel2 = Number((upStep2 * this.conversion).toFixed(6));
    const upLabel1 = Number((upStep1 * this.conversion).toFixed(6));
    const downLabel1 = Number((downStep1 * this.conversion).toFixed(6));
    const downLabel2 = Number((downStep2 * this.conversion).toFixed(6));
    const downLabel3 = Number((downStep3 * this.conversion).toFixed(6));
    const downLabel4 = Number((downStep4 * this.conversion).toFixed(6));

    this.template([
      (range >= upStep4) ? ['io-ladder-step', {class: 'io-up4', value: upStep4, label: upLabel4}] : hiddenItem,
      (range >= upStep3) ? ['io-ladder-step', {class: 'io-up3', value: upStep3, label: upLabel3}] : hiddenItem,
      (range >= upStep2) ? ['io-ladder-step', {class: 'io-up2', value: upStep2, label: upLabel2}] : hiddenItem,
      (range >= upStep1) ? ['io-ladder-step', {class: 'io-up1', value: upStep1, label: upLabel1}] : hiddenItem,
      ['span', {class: 'io-ladder-center'}],
      (this.step <= downStep1) ? ['io-ladder-step', {class: 'io-down1', value: downStep1, label: downLabel1}] : hiddenItem,
      (this.step <= downStep2) ? ['io-ladder-step', {class: 'io-down2', value: downStep2, label: downLabel2}] : hiddenItem,
      (this.step <= downStep3) ? ['io-ladder-step', {class: 'io-down3', value: downStep3, label: downLabel3}] : hiddenItem,
      (this.step <= downStep4) ? ['io-ladder-step', {class: 'io-down4', value: downStep4, label: downLabel4}] : hiddenItem,
    ]);

    const steps = this.querySelectorAll('io-ladder-step');
    for (let i = steps.length; i--;) steps[i].setAria();
  }
}

IoLadder.Register();

const IoLadderSingleton = new IoLadder();
IoLayerSingleton.appendChild(IoLadderSingleton);

class IoNumber extends IoItem {
  static get Style() {
    return /* css */`
    :host {
      cursor: text;
      user-select: text;
      -webkit-user-select: text;
      -webkit-touch-callout: default;
      min-width: var(--io-item-height);
      border-color: var(--io-color-border-inset);
      color: var(--io-color-field);
      background-color: var(--io-background-color-field);
      box-shadow: var(--io-shadow-inset);
    }
    :host:before,
    :host:after {
      content: ' ';
      white-space: pre;
      visibility: hidden;
    }
    :host:before {
      content: '-';
    }
    :host:not([positive]):before {
      content: ' ';
    }
    :host[aria-invalid] {
      border: var(--io-border-error);
      background-image: var(--io-gradient-error);
    }
    `;
  }
  static get Properties() {
    return {
      value: Number,
      conversion: 1,
      step: 0.001,
      min: -Infinity,
      max: Infinity,
      ladder: false,
      contenteditable: true,
      role: 'textbox',
      type: {
        value: 'number',
        reflect: 1,
      },
      pattern: {
        value: 'pattern="[0-9]*"',
        reflect: 1,
      },
      inputmode: {
        value: 'numeric',
        reflect: 1,
      },
      spellcheck: {
        value: 'false',
        reflect: 1,
      },
    };
  }
  constructor(props) {
    super(props);
    Object.defineProperty(this, '_pointer', {value: 'touch', writable: true});
  }
  _onPointerdown(event) {
    if (this._pointer === 'touch') event.preventDefault();
    this.addEventListener('pointermove', this._onPointermove);
    this.addEventListener('pointerup', this._onPointerup);
    if (document.activeElement === this && event.button === 0) return;
    this._pointer = event.pointerType;
  }
  _onPointerup(event) {
    this.removeEventListener('pointermove', this._onPointermove);
    this.removeEventListener('pointerup', this._onPointerup);
    if (this.ladder || event.button === 1) {
      if (this._pointer === 'touch') {
        event.preventDefault();
        document.activeElement.blur();
      } else {
        if (document.activeElement !== this) {
          this.focus();
          this.setCaretPosition(this.textNode.length);
        }
      }
      this._expandLadder();
    } else {
      if (document.activeElement !== this) {
        this.focus();
        this.setCaretPosition(this.textNode.length);
      }
    }
  }
  _onFocus(event) {
    super._onFocus(event);
    if (this._pointer === 'touch') {
      IoLadderSingleton.expanded = false;
    }
  }
  _onBlur(event) {
    super._onBlur(event);
    this._setFromTextNode();
    this.scrollTop = 0;
    this.scrollLeft = 0;
    // TODO: unhack race condition
    setTimeout(() => {
      if (!(document.activeElement.parentElement === IoLadderSingleton)) {
        IoLadderSingleton.expanded = false;
      }
    });
  }
  _expandLadder() {
    IoLadderSingleton.src = this;
    IoLadderSingleton.expanded = true;
  }
  _onKeydown(event) {
    const rng = window.getSelection().getRangeAt(0);
    const start = rng.startOffset;
    const end = rng.endOffset;
    const length = this.childNodes[0] ? this.childNodes[0].length : 0;
    const rngInside = rng.startContainer === rng.endContainer && (rng.startContainer === this.childNodes[0] || rng.startContainer === this);

    if (event.which === 27 || event.which === 13 || event.which === 32) { //  esc || enter || space
      event.preventDefault();
      this._setFromTextNode();
    } else if (event.which === 36) { // home
      this.textNode = this.min;
      this._setFromTextNode();
    } else if (event.which === 35) { // end
      this.textNode = this.max;
      this._setFromTextNode();
    } else if (event.which === 33) { // pgup
      const valueNumber = Number(this.textNode);
      if (typeof valueNumber == 'number' && !isNaN(valueNumber) && Math.abs(valueNumber) < Infinity) {
        this.textNode = Number(this.textNode) + this.step;
      } else {
        this.textNode = this.step;
      }
      this._setFromTextNode();
    } else if (event.which === 34) { // pgdown
      const valueNumber = Number(this.textNode);
      if (typeof valueNumber == 'number' && !isNaN(valueNumber) && Math.abs(valueNumber) < Infinity) {
        this.textNode = Number(this.textNode) - this.step;
      } else {
        this.textNode = -this.step;
      }
      this._setFromTextNode();
    } else if (event.which === 37) { // left
      if (event.ctrlKey || (rngInside && start === end && start === 0)) {
        event.preventDefault();
        this.focusTo('left');
      }
    } else if (event.which === 38) { // up
      if (IoLadderSingleton.expanded) {
        const upStep = IoLadderSingleton.querySelector('.io-up1');
        if (upStep) upStep.focus();
      } else if (event.ctrlKey || (rngInside && start === end && start === 0)) {
        event.preventDefault();
        this.focusTo('up');
      }
    } else if (event.which === 39) { // right
      if (event.ctrlKey || (rngInside && start === end && start === length)) {
        event.preventDefault();
        this.focusTo('right');
      }
    } else if (event.which === 40) { // down
      if (IoLadderSingleton.expanded) {
        const downStep = IoLadderSingleton.querySelector('.io-down1');
        if (downStep) downStep.focus();
      } else if (event.ctrlKey || (rngInside && start === end && start === length)) {
        event.preventDefault();
        this.focusTo('down');
      }
    }
  }
  _onKeyup(event) {
    if (event.which === 17) { // ctrl
      this._expandLadder();
    } else if (event.which === 27 || event.which === 13 || event.which === 32) { // esc || enter || space
      IoLayerSingleton.expanded = false;
    }
  }
  _setFromTextNode() {
    let valueText = this.textNode;
    let valueNumber = Number(valueText) / this.conversion;
    valueNumber = Math.min(this.max, Math.max(this.min, valueNumber));
    valueNumber = Math.round(valueNumber / this.step) * this.step;
    let d = Math.max(0, Math.min(100, -Math.floor(Math.log(this.step) / Math.LN10)));
    valueNumber = Number(valueNumber.toFixed(d));
    if (!isNaN(valueNumber)) this.set('value', valueNumber);
    else this.textNode = 'NaN';
  }
  changed() {
    this.title = this.label;
    let value = this.value;
    let valueText;
    if (typeof value == 'number' && !isNaN(value)) {
      value *= this.conversion;
      let d = -Math.floor(Math.log(this.step * this.conversion) / Math.LN10);
      d = Math.max(0, Math.min(100, d));
      value = value.toFixed(d);
      valueText = Number(String(value));
    } else {
      valueText = 'NaN';
    }
    this.textNode = valueText;
    this.setAttribute('positive', this.value >= 0);
  }
  setAria() {
    super.setAria();
    this.setAttribute('aria-invalid', (typeof this.value !== 'number' || isNaN(this.value)) ? 'true' : false);
  }
}

IoNumber.Register();

class IoSlider extends IoGl {
  static get Style() {
    return /* css */`
    :host {
      cursor: ns-resize;
      box-sizing: border-box;
      border: var(--io-border);
      border-radius: var(--io-border-radius);
      border-color: var(--io-color-border-inset);
      min-width: var(--io-item-height);
      min-height: var(--io-item-height);
      align-self: stretch;
      justify-self: stretch;
    }
    :host[horizontal] {
      cursor: ew-resize;
    }
    :host[aria-invalid] {
      border: var(--io-border-error);
      background-image: var(--io-gradient-error);
    }
    :host[aria-invalid] > .io-gl-canvas {
      opacity: 0.5;
    }
    :host:focus {
      border-color: var(--io-color-focus);
      outline-color: var(--io-color-focus);
    }
    `;
  }
  static get Properties() {
    return {
      value: 0,
      step: 0.01,
      min: 0,
      max: 1,
      exponent: 1,
      horizontal: {
        value: true,
        reflect: 1,
      },
      noscroll: false,
      role: 'slider',
      tabindex: 0,
      lazy: true,
    };
  }
  static get Listeners() {
    return {
      'focus': '_onFocus',
      'contextmenu': '_onContextmenu',
      'pointerdown': '_onPointerdown',
      'touchstart': '_onTouchstart',
    };
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('blur', this._onBlur);
    this.removeEventListener('keydown', this._onKeydown);
    this.removeEventListener('pointermove', this._onPointermove);
    this.removeEventListener('pointerup', this._onPointerup);
    this.removeEventListener('touchstart', this._onTouchstart);
    this.removeEventListener('touchmove', this._onTouchmove);
    this.removeEventListener('touchend', this._onTouchend);
  }
  _onFocus() {
    this.addEventListener('blur', this._onBlur);
    this.addEventListener('keydown', this._onKeydown);
  }
  _onBlur() {
    this.removeEventListener('blur', this._onBlur);
    this.removeEventListener('keydown', this._onKeydown);
  }
  _onContextmenu(event) {
    event.preventDefault();
  }
  _onTouchstart(event) {
    this.addEventListener('touchmove', this._onTouchmove);
    this.addEventListener('touchend', this._onTouchend);
    this._x = event.changedTouches[0].clientX;
    this._y = event.changedTouches[0].clientY;
    this._active = this.noscroll ? 1 : -1;
  }
  _onTouchmove(event) {
    const dx = Math.abs(this._x - event.changedTouches[0].clientX);
    const dy = Math.abs(this._y - event.changedTouches[0].clientY);
    if (this._active === -1) {
      if (this.horizontal) {
        if (dx > 3 && dx > dy) {
          this._active = (dx > dy && dy < 10) ? 1 : 0;
        }
      } else {
        if (dy > 3 && dy > dx) {
          this._active = (dy > dx && dx < 10) ? 1 : 0;
        }
      }
    }
    if (this._active !== 1) return;
    event.preventDefault();
  }
  _onTouchend() {
    this.removeEventListener('touchmove', this._onTouchmove);
    this.removeEventListener('touchend', this._onTouchend);
  }
  _onPointerdown(event) {
    this.setPointerCapture(event.pointerId);
    this.addEventListener('pointermove', this._onPointermove);
    this.addEventListener('pointerup', this._onPointerup);
  }
  _onPointermove(event) {
    if (event.pointerType !== 'touch') this._active = 1;
    this.throttle(this._onPointermoveThrottled, event, true);
  }
  _onPointerup() {
    this.releasePointerCapture(event.pointerId);
    this.removeEventListener('pointermove', this._onPointermove);
    this.removeEventListener('pointerup', this._onPointerup);
  }
  _getPointerCoord(event) {
    const rect = this.getBoundingClientRect();
    const x = Math.pow(Math.max(0, Math.min(1, (event.clientX - rect.x) / rect.width)), this.exponent);
    const y = Math.pow(Math.max(0, Math.min(1, 1 - (event.clientY - rect.y) / rect.height)), this.exponent);
    return [x, y];
  }
  _getValueFromCoord(coord) {
    let value = this.min * (1 - coord) + this.max * coord;
    value = Math.min(this.max, Math.max(this.min, value));
    return Math.round(value / this.step) * this.step;
  }
  _getCoordFromValue(value) {
    return (value - this.min) / (this.max - this.min);
  }
  _onPointermoveThrottled(event) {
    if (this._active === 1) {
      if (document.activeElement !== this ) this.focus();
      const p = this._getPointerCoord(event);
      let _x = this._getValueFromCoord(p[0]);
      let _y = this._getValueFromCoord(p[1]);
      this._setValue(this.horizontal ? _x : _y, this.horizontal ? _y : _x);
    }
  }
  _setValue(x) {
    this.set('value', Number(x.toFixed(5)));
  }
  _onKeydown(event) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (!event.shiftKey) this.focusTo('left');
      else this._setDecrease();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!event.shiftKey) this.focusTo('up');
      else this._setIncrease();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (!event.shiftKey) this.focusTo('right');
      else this._setIncrease();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!event.shiftKey) this.focusTo('down');
      else this._setDecrease();
    } else if (event.key === 'PageUp' || event.key === '+') {
      event.preventDefault();
      this._setIncrease();
    } else if (event.key === 'PageDown' || event.key === '-') {
      event.preventDefault();
      this._setDecrease();
    } else if (event.key === 'Home') {
      event.preventDefault();
      this._setMin();
    } else if (event.key === 'PageDown') {
      event.preventDefault();
      this._setMax();
    }
  }
  // TODO: round to step
  _setIncrease() {
    let value = this.value + this.step;
    value = Math.min(this.max, Math.max(this.min, value));
    this._setValue(value);
  }
  _setDecrease() {
    let value = this.value - this.step;
    value = Math.min(this.max, Math.max(this.min, value));
    this._setValue(value);
  }
  _setMin() {
    let value = this.min;
    value = Math.min(this.max, Math.max(this.min, value));
    this._setValue(value);
  }
  _setMax() {
    let value = this.max;
    value = Math.min(this.max, Math.max(this.min, value));
    this._setValue(value);
  }
  // TODO: consider moving or standardizing.
  changed() {
    super.changed();
  }
  setAria() {
    super.setAria();
    this.setAttribute('aria-invalid', isNaN(this.value) ? 'true' : false);
    this.setAttribute('aria-valuenow', isNaN(this.value) ? 0 : this.value);
    this.setAttribute('aria-valuemin', this.min);
    this.setAttribute('aria-valuemax', this.max);
    // this.setAttribute('aria-valuestep', this.step);
  }
  static get GlUtils() {
    return /* glsl */`
    vec4 paintSlider(vec2 position, vec2 sliderStart, vec2 sliderEnd, float knobRadius, float slotWidth, vec3 color) {
      vec4 slotColor = mix(cssColor, cssBackgroundColorField, 0.125);
      vec4 sliderColor = vec4(0.0);
      float stroke = cssStrokeWidth;

      vec2 startPos = translate(position, sliderStart);
      vec2 endPos = translate(position, sliderEnd);
      vec2 slotCenter = (startPos + endPos) / 2.;
      float slotSpan = abs(startPos.x - endPos.x) / 2.0;

      float strokeShape = min(min(
        circle(startPos, knobRadius + stroke + stroke),
        rectangle(slotCenter, vec2(slotSpan, slotWidth + stroke + stroke))),
        circle(endPos, knobRadius + stroke + stroke)
      );
      sliderColor = mix(vec4(slotColor.rgb, 1.0), sliderColor, strokeShape);

      float fillShape = min(min(
        circle(startPos, knobRadius + stroke),
        rectangle(slotCenter, vec2(slotSpan, slotWidth + stroke))),
        circle(endPos, knobRadius + stroke)
      );
      sliderColor = mix(vec4(cssBackgroundColor.rgb, 1.0), sliderColor, fillShape);

      float colorShape = min(min(
        circle(startPos, knobRadius),
        rectangle(slotCenter, vec2(slotSpan, slotWidth))),
        circle(endPos, knobRadius)
      );
      sliderColor = mix(vec4(color, 1.0), sliderColor, colorShape);

      return sliderColor;
    }
    \n\n`;
  }
  static get Frag() {
    return /* glsl */`
    #extension GL_OES_standard_derivatives : enable

    varying vec2 vUv;

    void main(void) {
      vec3 finalColor = cssBackgroundColorField.rgb;

      vec2 size = uHorizontal == 1 ? uSize : uSize.yx;
      vec2 uv = uHorizontal == 1 ? vUv : vUv.yx;
      vec2 position = size * uv;


      float stepInPx = size.x / ((uMax - uMin) / uStep);
      vec4 stepColorBg = mix(cssColor, cssBackgroundColorField, 0.75);

      float lineWidth = cssStrokeWidth;
      if (stepInPx > lineWidth * 2.0) {
        // TODO: grid with exponent
        float gridWidth = size.x / ((uMax - uMin) / uStep);
        float gridOffset = mod(uMin, uStep) / (uMax - uMin) * size.x;
        vec2 expPosition = size * vec2(pow(uv.x, uExponent), uv.y);
        float gridShape = grid(translate(expPosition, - gridOffset, size.y / 2.), gridWidth, size.y + lineWidth * 2.0, lineWidth);
        finalColor.rgb = mix(stepColorBg.rgb, finalColor.rgb, gridShape);
      }

      vec4 slotGradient = mix(cssColorFocus, cssColorLink, uv.x);
      float knobRadius = cssItemHeight * 0.125;
      float slotWidth = cssItemHeight * 0.125;

      float valueInRange = (uValue - uMin) / (uMax - uMin);
      float sign = valueInRange < 0.0 ? -1.0 : 1.0;
      valueInRange = abs(pow(valueInRange, 1./uExponent)) * sign;

      vec2 sliderStart = vec2(0.0, size.y * 0.5);
      vec2 sliderEnd = vec2(size.x * min(2.0, max(-1.0, (valueInRange))), size.y * 0.5);

      vec4 slider = paintSlider(position, sliderStart, sliderEnd, knobRadius, slotWidth, slotGradient.rgb);
      finalColor = mix(finalColor.rgb, slider.rgb, slider.a);

      gl_FragColor = vec4(finalColor, 1.0);
    }`;
  }
}

IoSlider.Register();

class IoSliderRange extends IoSlider {
  static get Properties() {
    return {
      value: {
        type: Array,
        value: [0, 0],
        observe: true,
      },
    };
  }
  _onPointerdown(event) {
    super._onPointerdown(event);
    const p = this._getPointerCoord(event);
    const c0 = this._getCoordFromValue(Math.min(this.max, Math.max(this.min, this.value[0])));
    const c1 = this._getCoordFromValue(Math.min(this.max, Math.max(this.min, this.value[1])));
    if (this.horizontal) {
      this._index = Math.abs(c0 - p[0]) < Math.abs(c1 - p[0]) ? 0 : 1;
    } else {
      this._index = Math.abs(c0 - p[1]) < Math.abs(c1 - p[1]) ? 0 : 1;
    }
  }
  _onPointermoveThrottled(event) {
    if (this._active === 1) {
      if (document.activeElement !== this ) this.focus();
      const p = this._getPointerCoord(event);
      let v0 = this._getValueFromCoord(p[0]);
      let v1 = this._getValueFromCoord(p[1]);
      if (this._index === 0) {
        this._setValue(this.horizontal ? v0 : v1, this.value[1]);
      } else if (this._index === 1) {
        this._setValue(this.value[0], this.horizontal ? v0 : v1);
      }
    }
  }
  _setValue(x, y) {
    this.set('value', [Number(x.toFixed(5)), Number(y.toFixed(5))]);
  }
  _onKeydown(event) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (!event.shiftKey) this.focusTo('left');
      else this._setDecrease();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!event.shiftKey) this.focusTo('up');
      else this._setIncrease();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (!event.shiftKey) this.focusTo('right');
      else this._setIncrease();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!event.shiftKey) this.focusTo('down');
      else this._setDecrease();
    } else if (event.key === 'PageUp' || event.key === '+') {
      event.preventDefault();
      this._setIncrease();
    } else if (event.key === 'PageDown' || event.key === '-') {
      event.preventDefault();
      this._setDecrease();
    } else if (event.key === 'Home') {
      event.preventDefault();
      this._setMin();
    } else if (event.key === 'PageDown') {
      event.preventDefault();
      this._setMax();
    }
  }
  // TODO: round to step
  _setIncrease() {
    let x = this.value[0] + this.step;
    let y = this.value[1] + this.step;
    x = Math.min(this.max, Math.max(this.min, x));
    y = Math.min(this.max, Math.max(this.min, y));
    this._setValue(x, y);
  }
  _setDecrease() {
    let x = this.value[0] - this.step;
    let y = this.value[1] - this.step;
    x = Math.min(this.max, Math.max(this.min, x));
    y = Math.min(this.max, Math.max(this.min, y));
    this._setValue(x, y);
  }
  _setMin() {
    let x = this.min;
    let y = this.min;
    x = Math.min(this.max, Math.max(this.min, x));
    y = Math.min(this.max, Math.max(this.min, y));
    this._setValue(x, y);
  }
  _setMax() {
    let x = this.max;
    let y = this.max;
    x = Math.min(this.max, Math.max(this.min, x));
    y = Math.min(this.max, Math.max(this.min, y));
    this._setValue(x, y);
  }
  setAria() {
    super.setAria();
    this.setAttribute('aria-invalid', (this.value instanceof Array && this.value.length === 2) ? false : 'true');
    this.setAttribute('aria-valuemin', this.min);
    this.setAttribute('aria-valuemax', this.max);
    this.setAttribute('aria-valuestep', this.step);
  }
  static get Frag() {
    return /* glsl */`
    #extension GL_OES_standard_derivatives : enable

    varying vec2 vUv;

    void main(void) {
      vec3 finalColor = cssBackgroundColorField.rgb;

      vec2 size = uHorizontal == 1 ? uSize : uSize.yx;
      vec2 uv = uHorizontal == 1 ? vUv : vUv.yx;
      vec2 position = size * uv;


      float stepInPx = size.x / ((uMax - uMin) / uStep);
      vec4 stepColorBg = mix(cssColor, cssBackgroundColorField, 0.75);

      float lineWidth = cssStrokeWidth;
      if (stepInPx > lineWidth * 2.0) {
        // TODO: grid with exponent
        float gridWidth = size.x / ((uMax - uMin) / uStep);
        float gridOffset = mod(uMin, uStep) / (uMax - uMin) * size.x;
        vec2 expPosition = size * vec2(pow(uv.x, uExponent), uv.y);
        float gridShape = grid(translate(expPosition, - gridOffset, size.y / 2.), gridWidth, size.y + lineWidth * 2.0, lineWidth);
        finalColor.rgb = mix(stepColorBg.rgb, finalColor.rgb, gridShape);
      }

      float knobRadius = cssItemHeight * 0.25;
      float slotWidth = cssItemHeight * 0.125;

      float valueInRangeStart = (uValue[0] - uMin) / (uMax - uMin);
      float signStart = valueInRangeStart < 0.0 ? -1.0 : 1.0;
      valueInRangeStart = abs(pow(valueInRangeStart, 1./uExponent)) * signStart;

      float valueInRangeEnd = (uValue[1] - uMin) / (uMax - uMin);
      float signEnd = valueInRangeEnd < 0.0 ? -1.0 : 1.0;
      valueInRangeEnd = abs(pow(valueInRangeEnd, 1./uExponent)) * signEnd;

      float grad = 0.5;
      if (valueInRangeEnd > valueInRangeStart) {
        grad = (uv.x - valueInRangeStart) / max(valueInRangeEnd - valueInRangeStart, 0.01);
      } else if (valueInRangeEnd < valueInRangeStart) {
        grad = 1.0 - (uv.x - valueInRangeEnd) / max(valueInRangeStart - valueInRangeEnd, 0.01);
      }
      vec4 slotGradient = mix(cssColorFocus, cssColorLink, saturate(grad));

      vec2 sliderStart = vec2(size.x * min(2.0, max(-1.0, (valueInRangeStart))), size.y * 0.5);
      vec2 sliderEnd = vec2(size.x * min(2.0, max(-1.0, (valueInRangeEnd))), size.y * 0.5);

      vec4 slider = paintSlider(position, sliderStart, sliderEnd, knobRadius, slotWidth, slotGradient.rgb);
      finalColor = mix(finalColor.rgb, slider.rgb, slider.a);

      gl_FragColor = vec4(finalColor, 1.0);
    }`;
  }
}

IoSliderRange.Register();

class IoNumberSlider extends IoElement {
  static get Style() {
    return /* css */`
    :host {
      display: flex;
      align-self: stretch;
      justify-self: stretch;
    }
    :host > io-number {
      flex: 0 0 calc(2 * var(--io-item-height));
      margin-right: var(--io-spacing);
    }
    :host > io-slider {
      flex: 1 1 calc(2 * var(--io-item-height));
      min-width: calc(2 * var(--io-item-height));
    }
    `;
  }
  static get Properties() {
    return {
      value: 0,
      step: 0.01,
      conversion: 1,
      min: 0,
      max: 1,
      exponent: 1,
    };
  }
  _onNumberSet(event) {
    this.value = event.detail.value;
    this.dispatchEvent('value-set', event.detail, false);
  }
  _onSliderSet(event) {
    event.detail.value = event.detail.value / this.conversion;
    this.value = event.detail.value;
    this.dispatchEvent('value-set', event.detail, false);
  }
  changed() {
    this.template([
      ['io-number', {
        id: 'number',
        value: this.value,
        step: this.step,
        conversion: this.conversion,
        label: this.label,
        'on-value-set': this._onNumberSet,
      }],
      ['io-slider', {
        id: 'slider',
        value: this.value * this.conversion,
        step: this.step * this.conversion,
        min: this.min * this.conversion,
        max: this.max * this.conversion,
        exponent: this.exponent,
        label: this.label,
        'on-value-set': this._onSliderSet,
      }]
    ]);
  }
}

IoNumberSlider.Register();

class IoNumberSliderRange extends IoElement {
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

class IoIcon extends IoElement {
  static get Style() {
    return /* css */`
    :host {
      @apply --io-item;
    }
    :host {
      width: var(--io-item-height);
      height: var(--io-item-height);
      border: 0;
      padding: 0;
      fill: var(--io-color, currentcolor);
    }
    :host[stroke] {
      stroke: var(--io-background-color, currentcolor);
      stroke-width: var(--io-stroke-width);
    }
    :host > svg {
      width: 100%;
      height: 100%;
    }
    :host > svg > g {
      pointer-events: none;
      transform-origin: 0px 0px;
    }
    `;
  }
  static get Properties() {
    return {
      icon: {
        value: '',
        reflect: -1,
      },
      label: {
        value: '',
        reflect: 1,
      },
      stroke: {
        value: false,
        reflect: 1,
      },
    };
  }
  iconChanged() {
    this.innerHTML = IoIconsetSingleton.getIcon(this.icon);
  }
}

IoIcon.Register();

const rects = new WeakMap();

class IoMenuOptions extends IoElement {
  static get Style() {
    return /* css */`
    :host {
      @apply --io-panel;
      box-sizing: border-box;
      align-self: flex-start;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      white-space: nowrap;
      user-select: none;
      background-image: none;
      padding: 0;
      opacity: 1;
      transition: opacity 0.25s;
      overflow-y: auto !important;
      padding: var(--io-spacing);
    }
    :host > io-menu-item {
      align-self: stretch;
      flex: 0 0 auto;
    }
    :host[inlayer] {
      box-shadow: var(--io-shadow);
    }
    :host[inlayer]:not([expanded]) {
      visibility: hidden;
      opacity: 0;
    }
    :host[horizontal] {
      flex-direction: row;
      align-self: stretch;
      justify-self: stretch;
      flex-wrap: nowrap;
      padding: 0 var(--io-spacing);
    }
    :host[horizontal] > io-menu-item {
      border-left-width: 0;
      border-right-width: 0;
      padding: var(--io-spacing) calc(0.5 * var(--io-line-height));
    }
    :host:not([horizontal]) > io-menu-item > * {
      min-width: 0.5em;
      padding: 0 var(--io-spacing);
    }
    :host[horizontal] > io-menu-item > .io-menu-hint,
    :host[horizontal] > io-menu-item > .io-menu-more {
      display: none;
    }
    :host[horizontal] > io-menu-item.io-hamburger {
      margin-left: auto;
    }
    :host[horizontal] > io-menu-item.io-hamburger[hidden] {
      display: inline-block;
      width: 0;
      padding: 0;
      border: 0;
      overflow: hidden;
      visibility: hidden;
    }
    :host > io-string {
      align-self: stretch;
      flex: 0 0 auto;
      min-width: 8em;
    }
    :host > io-string:empty:before {
      content: ' 🔍';
      white-space: pre;
      visibility: visible;
      opacity: 0.33;
    }
    `;
  }
  static get Properties() {
    return {
      value: {
        value: null,
        notify: true,
      },
      options: {
        type: Array,
        observe: true,
      },
      expanded: {
        value: false,
        reflect: 1,
      },
      horizontal: {
        type: Boolean,
        reflect: 1,
      },
      position: 'right',
      selectable: Boolean,
      searchable: Boolean,
      search: String,
      overflow: {
        type: Boolean,
        reflect: 1,
      },
      inlayer: {
        type: Boolean,
        reflect: 1,
      },
      slotted: Array,
      $parent: HTMLElement,
      _rects: Array,
      role: 'listbox',
    };
  }
  static get Listeners() {
    return {
      'item-clicked': '_onItemClicked',
      'touchstart': '_stopPropagation',
    };
  }
  connectedCallback() {
    super.connectedCallback();
    this.inlayer = this.parentElement === IoLayerSingleton;
  }
  _onItemClicked(event) {
    const item = event.composedPath()[0];
    const d = event.detail;
    if (item.localName == 'io-string') {
      event.stopImmediatePropagation();
      return;
    }
    if (item !== this) {
      event.stopImmediatePropagation();
      if (d.value !== undefined && d.selectable !== false) this.set('value', d.value);
      this.dispatchEvent('item-clicked', d, true);
      this.requestAnimationFrameOnce(this._collapse);
    }
  }
  // Prevents IoLayer from stopping scroll in clipped options
  _stopPropagation(event) {
    event.stopPropagation();
  }
  onResized() {
    this.requestAnimationFrameOnce(this._setOverflow);
  }
  _setOverflow() {
    const buttons = this.querySelectorAll('io-menu-item:not(.io-hamburger)');
    if (this.horizontal) {
      const hamburger = this.querySelector('.io-hamburger');
      if (!buttons.length) return;

      let end = this.getBoundingClientRect().right;
      let overflow = false;
      let last = Infinity;
      hamburger.hidden = true;
      const hamburgerOptions = [];

      for (let i = buttons.length; i--;) {
        const r = buttons[i].getBoundingClientRect();
        const rect = rects.get(buttons[i]) || {right: 0, width: 0};
        if (r.right !== 0 && r.width !== 0)  {
          rect.right = r.right;
          rect.width = r.width;
          rects.set(buttons[i], rect);
        }

        if (hamburger.hidden && overflow) {
          hamburger.hidden = false;
          end -= hamburger.getBoundingClientRect().width;
        }

        if (buttons[i].selected) {
          end -= rect.width;
          buttons[i].hidden = false;
          continue;
        }

        last = Math.min(last, rect.right);
        if (last < end) {
          buttons[i].hidden = false;
        } else {
          buttons[i].hidden = true;
          hamburgerOptions.push(buttons[i].option);
          overflow = true;
        }
      }
      hamburger.option = {options: hamburgerOptions};
      this.overflow = overflow;
    } else {
      for (let i = buttons.length; i--;) {
        buttons[i].hidden = false;
      }
    }
  }
  _collapse() {
    const focusSearch = this.selectable && !!this.search && !this.inlayer;
    this.setProperties({
      search: '',
      expanded: false,
    });
    if (focusSearch) this.$.search.focus();
  }
  expandedChanged() {
    if (this.expanded) {
      this.inlayer = this.parentElement === IoLayerSingleton;
      if (this.inlayer && this.$parent) {
        this._expandedChangedLazy();
        // TODO: unhack incorrect this.rect on first expand.
        this.throttle(this._expandedChangedLazy, null, true);
      }
    } else {
      this.style.top = null;
      this.style.height = null;
      this.style.touchAction = null;
      this.scrollTop = 0;
      this.search = '';
    }
  }
  searchChanged() {
    if (this.inlayer && this.$parent) {
      this.requestAnimationFrameOnce(this._clipHeight);
    }
  }
  _expandedChangedLazy() {
    const pRect = this.$parent.getBoundingClientRect();
    IoLayerSingleton.setElementPosition(this, this.position, pRect);
    this._clipHeight();
    this.searchable = !!this.style.height;
  }
  _clipHeight() {
    this.scrollTop = 0;
    if (!this.firstChild) return;

    const rectTop = this.firstChild.getBoundingClientRect().top;
    const rectBottom = this.lastChild.getBoundingClientRect().bottom;
    const rectHeight = rectBottom - rectTop;

    if (rectTop < 0) {
      this.style.top = '0px';
      this.style.height = (rectHeight + rectTop)  + 'px';
      this.style.touchAction = 'pan-y';
    } else if (rectBottom > window.innerHeight) {
      this.style.height = (window.innerHeight - rectTop)  + 'px';
      this.style.touchAction = 'pan-y';
    } else {
      this.style.height = null;
      this.style.touchAction = null;
    }
  }
  get _options() {
    if (this.search) {
      const s = this.search.toLowerCase();
      const options = this.filterObjects(this.options, o => {
        if (!!o.value || !!o.action) {
          if (String(o.value).toLowerCase().search(s) !== -1) return true;
          if (o.label && o.label.toLowerCase().search(s) !== -1) return true;
          if (o.hint && o.hint.toLowerCase().search(s) !== -1) return true;
        }
      });
      return options.length ? options : [{label: 'No matches'}];
    }
    return this.options;
  }
  changed() {
    const itemDirection = this.horizontal ? 'bottom' : 'right';
    const elements = [];
    if (this.searchable) {
      elements.push(['io-string', {id: 'search', value: this.bind('search'), live: true}]);
    }
    if (this._options) {
      elements.push(...[this._options.map(option =>
        ['io-menu-item', {
          $parent: this,
          option: option,
          value: this.value,
          direction: itemDirection,
          selectable: this.selectable,
          lazy: false,
        }]
      )]);
    }
    if (this.horizontal) {
      elements.splice(0, 0, ...this.slotted);
      elements.push(['io-menu-item', {
        label: '☰',
        title: 'select tab',
        value: this.value,
        selectable: this.selectable,
        class: 'io-hamburger',
        lazy: false,
      }]);
    }
    this.template(elements);
    this.requestAnimationFrameOnce(this._setOverflow);
  }
}

IoMenuOptions.Register();

// TODO: fix and improve keyboard navigation in all cases.

class IoMenuItem extends IoItem {
  static get Style() {
    return /* css */`
    :host {
      display: flex;
      flex: 0 0 auto;
      flex-direction: row;
      padding: var(--io-spacing);
      border-radius: 0;
      background: none;
      border: var(--io-border-width) solid transparent;
      background-color: transparent;
      border-color: transparent;
    }
    :host > * {
      overflow: visible;
      pointer-events: none;
    }
    :host > :empty {
      display: none;
    }
    :host > :not(:empty) {
      padding: 0 var(--io-spacing);
    }
    :host > .io-menu-icon {
      width: var(--io-line-height);
      height: var(--io-line-height);
    }
    :host > .io-menu-label {
      flex: 1 1 auto;
      text-overflow: ellipsis;
    }
    :host > .io-menu-hint {
      opacity: 0.25;
    }
    :host[hasmore]:after {
      content: '▸';
    }
    :host[selected][direction="top"],
    :host[selected][direction="bottom"] {
      border-bottom-color: var(--io-color-link);
    }
    :host[selected][direction="right"],
    :host[selected][direction="left"] {
      border-left-color: var(--io-color-link);
    }
    `;
  }
  static get Properties() {
    return {
      option: {
        type: Object,
      },
      expanded: {
        value: false,
        reflect: 1,
      },
      direction: {
        value: 'bottom',
        reflect: 1,
      },
      $parent: HTMLElement,
      $options: HTMLElement,
      selectable: false,
      lazy: true,
    };
  }
  static get Listeners() {
    return {
      'click': 'preventDefault',
    };
  }
  preventDefault(event) {
    event.stopPropagation();
    event.preventDefault();
  }
  get _options() {
    return this._option.options;
  }
  get _option() {
    if (this.option && typeof this.option === 'object') {
      return this.option;
    } else {
      // TODO: reconsider using only object types.
      return {value: this.option};
    }
  }
  get _selectable() {
    return this.selectable && this._option.selectable !== false;
  }
  get _action() {
    return this._option.action;
  }
  get _value() {
    return this._option.value;
  }
  get _icon() {
    return this._option.icon || '';
  }
  get _label() {
    const valueText = (this._option.value !== undefined) ? String(this._option.value) : '';
    return this.label || this._option.label || valueText || '';
  }
  get _hint() {
    return this._option.hint || '';
  }
  get _selected() {
    if (!this.selectable || this._option.selectable === false) return false;
    if (this._option.selected || this._option.value === this.value) {
      return true;
    }
    return !!this.filterObject(this._options || {}, (o) => { return o === this.value || o.value === this.value; });
  }
  get inlayer() {
    return this.$parent && this.$parent.inlayer;
  }
  connectedCallback() {
    super.connectedCallback();
    if (this.$options) IoLayerSingleton.appendChild(this.$options);
    if (!this.inlayer) IoLayerSingleton.addEventListener('pointermove', this._onLayerPointermove);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.$options && this.$options.inlayer) IoLayerSingleton.removeChild(this.$options);
    IoLayerSingleton.removeEventListener('pointermove', this._onLayerPointermove);
  }
  _onClick() {
    const selectable = this._value !== undefined && this._selectable;
    const actionable = typeof this._action === 'function';
    if (selectable || actionable) {
      if (selectable) this.set('value', this._value, true);
      if (actionable) this._action.apply(null, [this._value]);
      this.dispatchEvent('item-clicked', {value: this._value, action: this._action, selectable: this._selectable}, true);
      this.requestAnimationFrameOnce(this._collapse);
    } else if (!this.expanded && this._options) this.expanded = true;
  }
  _onItemClicked(event) {
    const item = event.composedPath()[0];
    const d = event.detail;
    if (item !== this) {
      event.stopImmediatePropagation();
      const selectable = d.value !== undefined && d.selectable;
      if (selectable) this.set('value', d.value);
      this.dispatchEvent('item-clicked', d, true);
    }
    if (this.expanded) this.requestAnimationFrameOnce(this._collapse);
  }
  _onPointerdown(event) {
    event.stopPropagation();
    event.preventDefault(); // Prevents focus
    this.setPointerCapture(event.pointerId);
    this.addEventListener('pointermove', this._onPointermove);
    this.addEventListener('pointerup', this._onPointerup);
    if (this.expanded || event.pointerType === 'mouse' || this.inlayer) {
      this.focus();
      if (this._options) this.expanded = true;
    }
    hovered = this;
    hoveredParent = this.parentElement;
    // TODO: Safari temp fix for event.movement = 0
    this._x = event.clientX;
    this._y = event.clientY;
  }
  _onPointermove(event) {
    event.stopPropagation();
    if (!this.expanded && event.pointerType === 'touch' && !this.inlayer) {
      return;
    }
    const clipped = !!this.$parent && !!this.$parent.style.height;
    if (event.pointerType === 'touch' && clipped) {
      return;
    }

    // TODO: Safari temp fix for event.movement = 0
    const movementX = event.clientX - this._x;
    const movementY = event.clientY - this._y;
    this._x = event.clientX;
    this._y = event.clientY;

    IoLayerSingleton.x = event.clientX;
    IoLayerSingleton.y = event.clientY;
    clearTimeout(this.__timeoutOpen);
    hovered = this._gethovered(event);
    if (hovered) {
      const v = Math.abs(movementY) - Math.abs(movementX);
      const h = hovered.parentElement.horizontal;
      if (hoveredParent !== hovered.parentElement) {
        hoveredParent = hovered.parentElement;
        this._expandHovered();
      } else if (h ? v < -0.5 : v > 0.5) {
        this._expandHovered();
      } else {
        this.__timeoutOpen = setTimeout(() => {
          this._expandHovered();
        }, 100);
      }
    }
  }
  _gethovered(event) {
    const items = getElementDescendants(getRootElement(this));
    for (let i = items.length; i--;) {
      if (isPointerAboveItem(event, items[i])) return items[i];
    }
  }
  _expandHovered() {
    if (hovered) {
      hovered.focus();
      if (hovered._options) {
        if (hovered.$options) {
          const descendants = getElementDescendants(hovered.$options);
          for (let i = descendants.length; i--;) {
            descendants[i].expanded = false;
          }
        }
        hovered.expanded = true;
      }
    }
  }
  _onLayerPointermove(event) {
    if (this.expanded) this._onPointermove(event);
  }
  _onPointerup(event, options) {
    event.stopPropagation();
    this.removeEventListener('pointermove', this._onPointermove);
    this.removeEventListener('pointerup', this._onPointerup);
    const item = this._gethovered(event);
    const nocollapse = options && options.nocollapse;
    if (item) {
      item.focus();
      item._onClick(event);
    } else {
      if (!nocollapse) {
        this.requestAnimationFrameOnce(this._collapseRoot);
      }
    }
  }
  _onKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this._onClick(event);
      return;
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.requestAnimationFrameOnce(this._collapseRoot);
      return;
    }

    let command = '';
    if (this.direction === 'left' || this.direction === 'right') {
      if (event.key === 'ArrowUp') command = 'prev';
      if (event.key === 'ArrowRight') command = 'in';
      if (event.key === 'ArrowDown') command = 'next';
      if (event.key === 'ArrowLeft') command = 'out';
    } else {
      if (event.key === 'ArrowUp') command = 'out';
      if (event.key === 'ArrowRight') command = 'next';
      if (event.key === 'ArrowDown') command = 'in';
      if (event.key === 'ArrowLeft') command = 'prev';
    }
    if (this.inlayer && event.key === 'Tab') command = 'next';

    const siblings = this.$parent ? [...this.$parent.children] : [];
    const index = siblings.indexOf(this);
    if (command && (this.inlayer || this.expanded)) {
      event.preventDefault();
      switch (command) {
        case 'prev': {
          const prev = siblings[(index + siblings.length - 1) % (siblings.length)];
          this.expanded = false;
          if (prev) {
            if (prev._options) prev.expanded = true;
            prev.focus();
          }
          break;
        }
        case 'next': {
          const next = siblings[(index + 1) % (siblings.length)];
          this.expanded = false;
          if (next) {
            if (next._options) next.expanded = true;
            next.focus();
          }
          break;
        }
        case 'in':
          if (this.$options && this.$options.children.length) this.$options.children[0].focus();
          break;
        case 'out':
          this.expanded = false;
          if (this.$parent && this.$parent.$parent) {
            this.$parent.$parent.focus();
          }
          break;
      }
    } else {
      super._onKeydown(event);
    }
  }
  _collapse() {
    this.expanded = false;
  }
  _collapseRoot() {
    getRootElement(this).expanded = false;
  }
  expandedChanged() {
    if (this.expanded) {
      if (!this.$options) {
        this.$options = new IoMenuOptions({
          $parent: this,
          expanded: this.bind('expanded'),
          'on-item-clicked': this._onItemClicked,
        });
      }
      if (this.$options && this.$options.parentElement !== IoLayerSingleton) {
        IoLayerSingleton.appendChild(this.$options);
      }
      const items = getElementDescendants(getRootElement(this));
      const ancestors = getElementAncestors(this);
      for (let i = items.length; i--;) {
        if (ancestors.indexOf(items[i]) === -1) {
          items[i].expanded = false;
        }
      }
      if (this.$options) {
        const descendants = getElementDescendants(this.$options);
        for (let i = descendants.length; i--;) {
          descendants[i].expanded = false;
        }
      }
    } else {
      const descendants = getElementDescendants(this);
      for (let i = descendants.length; i--;) {
        descendants[i].expanded = false;
      }
    }
  }
  changed() {
    this.__properties.selected.value = this._selected;
    this.setAttribute('selected', this._selected);
    this.setAttribute('hasmore', !!this._options && this.direction === 'right');
    this.template([
      this._icon.search(':') != -1 ? ['io-icon', {icon: this._icon, class: 'io-menu-icon'}] : ['span', {class: 'io-menu-icon'}, this._icon],
      ['span', {class: 'io-menu-label'}, this._label],
      ['span', {class: 'io-menu-hint'}, this._hint],
    ]);
    if (this.$options && this.expanded) {
      this.$options.setProperties({
        value: this.value,
        options: this._options,
        selectable: this._selectable,
        position: this.direction,
      });
    }
  }
}

IoMenuItem.Register();

function getElementDescendants(element) {
  const descendants = [];
  let items = [];
  // TODO: unhack
  if ('io-menu-item, io-option-menu'.search(element.localName) !== -1) {
    descendants.push(element);
    if (element.$options) {
      items = element.$options.querySelectorAll('io-menu-item, io-option-menu');
    }
  } else if (element.localName === 'io-context-menu') {
    if (element.$options) {
      items = element.$options.querySelectorAll('io-menu-item, io-option-menu');
    }
  } else {
    items = element.querySelectorAll('io-menu-item, io-option-menu');
  }
  for (let i = items.length; i--;) {
    descendants.push(items[i]);
    if (items[i].expanded) descendants.push(...getElementDescendants(items[i]));
  }
  return descendants;
}

function getElementAncestors(element) {
  let item = element;
  const ancestors = [element];
  while (item && item.$parent) {
    item = item.$parent;
    if (item) ancestors.push(item);
  }
  return ancestors;
}

function getRootElement(element) {
  let root = element;
  while (root && root.$parent) {
    root = root.$parent;
  }
  return root;
}

function isPointerAboveItem(event, element) {
  const r = element.getBoundingClientRect();
  const x = event.clientX;
  const y = event.clientY;
  if (['io-menu-item', 'io-option-menu'].indexOf(element.localName) !== -1) {
    if (!element.inlayer || element.parentElement.expanded) {
      const hovered = (
        r.top <= y &&
        r.bottom >= y &&
        r.left <= x &&
        r.right >= x
        );
      return hovered;
    }
  }
}

let hovered;
let hoveredParent;

// TODO: fix tab-out without collapse

class IoOptionMenu extends IoMenuItem {
  static get Style() {
    return /* css */`
    :host {
      display: inline-block;
      text-align: center;
      border-radius: var(--io-border-radius);
      border: var(--io-border);
      border-color: var(--io-color-border-outset);
      background-color: var(--io-background-color-dark);
      background-image: var(--io-gradient-button);
      padding-left: calc(2 * var(--io-spacing));
      padding-right: calc(2 * var(--io-spacing));
    }
    :host {
      text-align: left;
    }
    `;
  }
  static get Properties() {
    return {
      value: {
        reflect: -1,
      },
      selectable: true,
      options: {
        type: Array,
        reflect: -1,
        observe: true,
      },
      icon: '▾',
      role: 'button',
      lazy: false,
    };
  }
  get _options() {
    return this.options;
  }
  get _label() {
    const valueText = (this.value !== undefined) ? String(this.value) : '';
    return this.label || valueText || '';
  }
  changed() {
    let valueText = '';
    if (this.options) {
      const option = this.options.find(option => {return option.value === this.value;});
      if (option) {
        if (option.label) {
          valueText = option.label;
        } else if (typeof option.value === 'object') {
          valueText = `${option.value.constructor.name}` + (option.value instanceof Array ? `(${option.value.length})` : '');
        } else {
          valueText = String(option.value);
        }
      }
    }
    if (!valueText) valueText = this._label;
    if (this.icon) {
      valueText = this.icon + '  ' + valueText;
    }

    this.title = valueText;
    this.textNode = valueText;

    this.setAttribute('aria-haspopup', 'listbox');
    this.setAttribute('aria-expanded', String(this.expanded));

    if (this.expanded) {
      this.$options.setProperties({
        value: this.value,
        options: this.options,
        selectable: this.selectable,
        position: this.direction,
      });
    }
  }
}

IoOptionMenu.Register();

class IoContextMenu extends IoElement {
  static get Properties() {
    return {
      value: null,
      options: {
        type: Array,
        observe: true,
      },
      expanded: Boolean,
      position: 'pointer',
      button: 0,
      selectable: false,
      $options: HTMLElement,
    };
  }
  connectedCallback() {
    super.connectedCallback();
    IoLayerSingleton.addEventListener('pointermove', this._onLayerPointermove);
    this._parent = this.parentElement;
    this._parent.style.userSelect = 'none';
    this._parent.style.webkitUserSelect = 'none';
    this._parent.style.webkitTouchCallout = 'default';
    this._parent.addEventListener('pointerdown', this._onPointerdown);
    this._parent.addEventListener('click', this._onClick);
    this._parent.addEventListener('contextmenu', this._onContextmenu);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.$options) IoLayerSingleton.removeChild(this.$options);
    IoLayerSingleton.removeEventListener('pointermove', this._onLayerPointermove);
    this._parent.style.userSelect = null;
    this._parent.style.webkitUserSelect = null;
    this._parent.style.webkitTouchCallout = null;
    this._parent.removeEventListener('pointerdown', this._onPointerdown);
    this._parent.removeEventListener('contextmenu', this._onContextmenu);
    this._parent.removeEventListener('pointermove', this._onPointermove);
    this._parent.removeEventListener('pointerup', this._onPointerup);
    this._parent.removeEventListener('click', this._onClick);
    delete this._parent;
  }
  getBoundingClientRect() {
    return this._parent.getBoundingClientRect();
  }
  _onItemClicked(event) {
    const item = event.composedPath()[0];
    const d = event.detail;
    if (item !== this) {
      event.stopImmediatePropagation();
      if (d.value !== undefined && d.selectable !== false) this.set('value', d.value);
      this.dispatchEvent('item-clicked', d, true);
      this.requestAnimationFrameOnce(this._collapse);
    }
  }
  _onContextmenu(event) {
    if (this.button === 2) event.preventDefault();
  }
  _onPointerdown(event) {
    IoLayerSingleton.x = event.clientX;
    IoLayerSingleton.y = event.clientY;
    this._parent.addEventListener('pointermove', this._onPointermove);
    this._parent.addEventListener('pointerup', this._onPointerup);
    clearTimeout(this._contextTimeout);
    if (event.pointerType !== 'touch') {
      if (event.button === this.button) {
        this.expanded = true;
      }
    } else {
      // iOS Safari contextmenu event emulation.
      event.preventDefault();
      this._contextTimeout = setTimeout(() => {
        this.expanded = true;
      }, 150);
    }
  }
  _onPointermove(event) {
    clearTimeout(this._contextTimeout);
    if (this.expanded && this.$options) {
      const item = this.$options.querySelector('io-menu-item');
      if (item) item._onPointermove(event);
    }
  }
  _onPointerup(event) {
    clearTimeout(this._contextTimeout);
    if (this.expanded && this.$options) {
      const item = this.$options.querySelector('io-menu-item');
      if (item) item._onPointerup(event, {nocollapse: true});
    }
    this._parent.removeEventListener('pointermove', this._onPointermove);
    this._parent.removeEventListener('pointerup', this._onPointerup);
  }
  _onLayerPointermove(event) {
    if (this.expanded) this._onPointermove(event);
  }
  _onClick(event) {
    if (event.button === this.button && event.button !== 2) this.expanded = true;
  }
  _collapse() {
    this.expanded = false;
  }
  expandedChanged() {
    if (this.expanded) {
      if (!this.$options) {
        this.$options = new IoMenuOptions({
          $parent: this,
          'on-item-clicked': this._onItemClicked,
        });
      }
      if (this.$options.parentElement !== IoLayerSingleton) {
        IoLayerSingleton.appendChild(this.$options);
      }
      this.$options.setProperties({
        value: this.bind('value'),
        expanded: this.bind('expanded'),
        options: this.options,
        selectable: this.selectable,
        position: this.position,
      });
    } else {
      const descendants = getElementDescendants(this);
      for (let i = descendants.length; i--;) {
        descendants[i].expanded = false;
      }
    }
  }
}

IoContextMenu.Register();

class IoVector extends IoElement {
  static get Style() {
    return /* css */`
    :host {
      display: flex;
      flex-direction: row;
      align-self: stretch;
      justify-self: stretch;
    }
    :host > io-number {
      width: inherit;
      flex: 1 1;
    }
    :host > *:not(:last-child) {
      margin-right: var(--io-spacing);
    }
    :host > io-boolean {
      width: var(--io-line-height) !important;
    }
    `;
  }
  static get Properties() {
    return {
      value: {
        value: [0, 0, 0, 0],
        observe: true,
      },
      conversion: 1,
      step: 0.001,
      min: -Infinity,
      max: Infinity,
      linkable: false,
      linked: false,
      components: {
        type: Array,
        notify: false,
      },
    };
  }
  _onValueSet(event) {
    const item = event.composedPath()[0];
    const c = item.id;
    const value = event.detail.value;
    const oldValue = event.detail.oldValue;
    this.value[c] = value;
    if (this.linked) {
      const change = value / oldValue;
      for (let i in this.components) {
        const p = this.components[i];
        if (oldValue === 0) {
          this.value[p] = value;
        } else if (p !== c) {
          this.value[p] *= change;
        }
      }
    }
    // TODO: test
    const detail = {object: this.value, property: this.linked ? null : c, value: value, oldValue: oldValue};
    this.dispatchEvent('object-mutated', detail, false, window);
  }
  valueChanged() {
    this.components = Object.keys(this.value).filter(key => typeof this.value[key] === 'number');
  }
  changed() {
    const elements = [];
    for (let i in this.components) {
      const c = this.components[i];
      if (this.value[c] !== undefined) {
        elements.push(['io-number', {
          id: c,
          value: this.value[c],
          conversion: this.conversion,
          step: this.step,
          min: this.min,
          max: this.max,
          ladder: true,
          'on-value-set': this._onValueSet
        }]);
      }
    }
    elements.push(this.getSlotted());
    this.template(elements);
  }
  getSlotted() {
    return this.linkable ? ['io-boolicon', {value: this.bind('linked'), true: 'icons:link', false: 'icons:unlink'}] : null;
  }
}

IoVector.Register();

class IoMatrix extends IoElement {
  static get Style() {
    return /* css */`
    :host {
      display: grid;
      align-self: stretch;
      justify-self: stretch;
      grid-gap: var(--io-spacing);
    }
    :host[columns="4"] {
      grid-template-columns: repeat(4, 1fr);
    }
    :host[columns="3"] {
      grid-template-columns: repeat(3, 1fr);
    }
    :host[columns="2"] {
      grid-template-columns: repeat(2, 1fr);
    }
    :host > io-number {
      width: inherit;
    }
    `;
  }
  static get Properties() {
    return {
      value: {
        value: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        observe: true,
      },
      step: 0.001,
      components: {
        type: Array,
        notify: false,
      },
      columns: {
        value: 4,
        reflect: 1,
      },
    };
  }
  _onValueSet(event) {
    if (event.detail.object) return; // TODO: unhack
    const item = event.composedPath()[0];
    const c = item.id;
    const value = event.detail.value;
    const oldValue = event.detail.oldValue;
    this.value[c] = value;
    const detail = {object: this.value, property: c, value: value, oldValue: oldValue};
    this.dispatchEvent('object-mutated', detail, false, window);
  }
  valueChanged() {
    let c;
    if (this.value.length === 4) {
      c = [0, 1, 2, 3];
      this.columns = 2;
    }
    if (this.value.length === 9) {
      c = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      this.columns = 3;
    }
    if (this.value.length === 16) {
      c = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
      this.columns = 4;
    }
    this.components = c;
  }
  changed() {
    const elements = [];
    for (let i in this.components) {
      const c = this.components[i];
      if (this.value[c] !== undefined) {
        elements.push(['io-number', {
          id: c,
          value: this.value[c],
          step: this.step,
          'on-value-set': this._onValueSet
        }]);
      }
    }
    this.template(elements);
  }
}

IoMatrix.Register();

// TODO: display read only as non-editable

class Config {
    constructor(prototypes) {
      for (let i = 0; i < prototypes.length; i++) {
        this.registerConfig(prototypes[i].constructor.Config || {});
      }
    }
    registerConfig(config) {
      for (let c in config) {
        this[c] = this[c] || [];
        this[c] = [config[c][0] || this[c][0], Object.assign(this[c][1] || {}, config[c][1] || {})];
      }
    }
    getConfig(object, customConfig) {
      const keys = Object.getOwnPropertyNames(object);
      // const keys = Object.keys(object);
      const prototypes = [];

      let proto = object.__proto__;
      while (proto) {
        prototypes.push(proto.constructor.name);
        // keys.push(...Object.getOwnPropertyNames(proto));
        keys.push(...Object.keys(proto));
        proto = proto.__proto__;
      }

      const protoConfigs = {};

      for (let i in this) {
        const cfg = i.split('|');
        if (cfg.length === 1) cfg.splice(0, 0, 'Object');
        if (prototypes.indexOf(cfg[0]) !== -1) protoConfigs[cfg[1]] = this[i];
      }

      for (let i in customConfig) {
        const cfg = i.split('|');
        if (cfg.length === 1) cfg.splice(0, 0, 'Object');
        if (prototypes.indexOf(cfg[0]) !== -1) {
            protoConfigs[cfg[1]] = customConfig[i];
        }
      }

      const config = {};

      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const value = object[k] instanceof Binding ? object[k].value : object[k]; // TODO: Unhack demovalues
        // const value = object[k]

        const type = value === null ? 'null' : typeof value;
        const cstr = (value != undefined && value.constructor) ? value.constructor.name : 'null';

        if (type == 'function') continue;

        const typeStr = 'type:' + type;
        const cstrStr = 'constructor:' + cstr;
        const keyStr = k.replace('type:', '').replace('constructor:', '');

        config[k] = null;

        if (protoConfigs[typeStr]) config[k] = protoConfigs[typeStr];
        if (protoConfigs[cstrStr]) config[k] = protoConfigs[cstrStr];
        if (protoConfigs[keyStr]) config[k] = protoConfigs[keyStr];
      }

      return config;
    }
}

class Groups {
    constructor(prototypes) {
      for (let i = 0; i < prototypes.length; i++) {
        this.registerGroups(prototypes[i].constructor.Groups || {});
      }
    }
    registerGroups(groups) {
      for (let g in groups) {
        this[g] = this[g] || [];
        this[g] = [...this[g], ...groups[g]];
      }
    }
    getGroups(object, customGroups, keys, doAdvanced = false) {
      const prototypes = [];

      let proto = object.__proto__;
      while (proto) {
        prototypes.push(proto.constructor.name);
        proto = proto.__proto__;
      }
      const protoGroups = {};

      for (let i in this) {
        const grp = i.split('|');
        if (grp.length === 1) grp.splice(0, 0, 'Object');
        grp[1] = grp[1].split(':');
        if (prototypes.indexOf(grp[0]) !== -1) {
          const advanced = grp[1][1] === 'advanced';
          if (!advanced || doAdvanced) {
            protoGroups[grp[1][0]] = protoGroups[grp[1][0]] || [];
            for (let j = 0; j < this[i].length; j++) {
              const propName = this[i][j];
              if (typeof propName == 'string' && propName.startsWith('constructor:')) {
                const constructorName = propName.replace('constructor:', '');
                for (let k = 0; k < keys.length; k++) {
                  if (object[keys[k]] && object[keys[k]].constructor.name == constructorName) {
                    protoGroups[grp[1][0]].push(keys[k]);
                  }
                }
              } else if (typeof propName == 'string' && propName.startsWith('type:')) {
                const typeName = propName.replace('type:', '');
                for (let k = 0; k < keys.length; k++) {
                  if (object[keys[k]] && typeof object[keys[k]] == typeName) {
                    protoGroups[grp[1][0]].push(keys[k]);
                  }
                }
              } else {
                protoGroups[grp[1][0]].push(propName);
              }
            }
          }
        }
      }

      for (let i in customGroups) {
        const grp = i.split('|');
        if (grp.length === 1) grp.splice(0, 0, 'Object');
        grp[1] = grp[1].split(':');
        if (prototypes.indexOf(grp[0]) !== -1) {
          const advanced = grp[1][1] === 'advanced';
          if (!advanced || doAdvanced) {
            protoGroups[grp[1][0]] = protoGroups[grp[1][0]] || [];
            protoGroups[grp[1][0]].push(...customGroups[i]);
          }
        }
      }

      const groups = {};
      const assigned = [];

      for (let g in protoGroups) {
        groups[g] = groups[g] || [];
        for (let gg in protoGroups[g]) {
          const gKey = protoGroups[g][gg];
          const reg = new RegExp(gKey);

          for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            if (typeof gKey === 'string') {
              if (k == gKey && assigned.indexOf(k) == -1) {
                groups[g].push(k);
                assigned.push(k);
              }
            } else if (typeof gKey === 'object') {
              // Regex
              if (reg.exec(k) && assigned.indexOf(k) == -1) {
                groups[g].push(k);
                assigned.push(k);
              }
            }
          }
        }
      }


      if (assigned.length === 0) {
        groups['properties'] = keys;
      } else if (doAdvanced) {
        groups['advanced'] = groups['advanced'] || [];
        for (let i = 0; i < keys.length; i++) {
          if (assigned.indexOf(keys[i]) === -1) groups['advanced'].push(keys[i]);
        }
      }

      for (let group in groups) {
        if (groups[group].length === 0) delete groups[group];
      }

      delete groups.hidden;


      return groups;
    }
}

class Widgets {
  constructor(prototypes) {
    for (let i = 0; i < prototypes.length; i++) {
      this.registerWidgets(prototypes[i].constructor.Widgets || {});
    }
  }
  registerWidgets(widgets) {
    for (let g in widgets) {
      this[g] = this[g] || [];
      this[g] = [...this[g], ...widgets[g]];
    }
  }
  getWidgets(object) {
    const prototypes = [];

    let proto = object.__proto__;
    while (proto) {
      prototypes.push(proto.constructor.name);
      proto = proto.__proto__;
    }

    let mainWidget = null;
    const groupWidgets = {};

    for (let i in this) {
      const id = i.split('|');
      const cstr = id[0];
      const grp = id[1];
      if (prototypes.indexOf(cstr) !== -1) {
        const widget = this[i];
        widget[1] = widget[1] || {};
        if (widget[1].$value) {
          widget[1].value = object[widget[1].$value];
        } else {
          widget[1].value = object;
        }
        if (grp) groupWidgets[grp] = widget;
        else mainWidget = widget;
      }
    }

    return {
      main: mainWidget,
      groups: groupWidgets,
    };

  }
}

class IoBreadcrumbs extends IoElement {
  static get Style() {
    return /* css */`
    :host {
      display: flex;
      flex: 0 0 auto;
      flex-direction: row;
      align-self: stretch;
      justify-self: stretch;
      border-radius: var(--io-border-radius);
      border: var(--io-border);
      border-color: var(--io-color-border-inset);
      padding: var(--io-spacing);
      color: var(--io-color-field);
      background-color: var(--io-background-color-field);
      overflow-x: hidden;
    }
    :host > io-item:hover {
      text-decoration: underline;
    }
    :host > io-item:first-of-type {
      overflow: visible;
      text-overflow: clip;
      margin-left: var(--io-spacing);
    }
    :host > io-item:last-of-type {
      overflow: visible;
      text-overflow: clip;
      margin-right: var(--io-spacing);
    }
    :host > io-item:not(:first-of-type):before {
      content: '>';
      margin: 0 var(--io-spacing);
      padding: 0 var(--io-spacing) 0 0;
      opacity: 0.25;
    }
    `;
  }
  static get Properties() {
    return {
      value: Object,
      selected: null,
      options: {
        type: Array,
        observe: true,
      },
    };
  }
  _onClick(event) {
    this.set('selected', this.options[event.detail.value]);
  }
  valueChanged() {
    this.options.length = 0;
    this.options.push(this.value);
  }
  selectedChanged() {
    const index = this.options.indexOf(this.selected);
    if (index !== -1) {
      this.options.length = index + 1;
    } else {
      this.options.push(this.selected);
    }
  }
  changed() {
    const elements = [];
    for (let i = 0; i < this.options.length; i++) {
      elements.push(['io-item', {
        value: i,
        label: getLabel(this.options[i]),
        'on-item-clicked': this._onClick,
      }]);
    }
    this.template(elements);
  }
}

IoBreadcrumbs.Register();

function getLabel(object) {
  if (object instanceof Array) {
    return String(`${object.constructor.name} (${object.length})`);
  } else if (typeof object === 'object') {
    return String(`${object.constructor.name}`);
  } else {
    return String(object);
  }
}

class IoInspector extends IoElement {
  static get Style() {
    return /* css */`
    :host {
      @apply --io-column;
    }
    :host > * {
      flex-shrink: 0;
    }
    :host > .inspector-header {
      margin-bottom: var(--io-spacing);
      flex-grow: 0;
    }
    :host > .inspector-header > io-breadcrumbs {
      flex: 1 1;
    }
    :host > .inspector-header > io-boolicon {
      width: calc(var(--io-spacing) + var(--io-item-height));
      align-self: stretch;
      height: auto;
    }
    :host > .inspector-header > io-boolicon:not([value]) {
      opacity: 0.25;
    }
    :host > .inspector-header > io-string {
      margin: 0 var(--io-spacing);
      padding: calc(2 * var(--io-spacing));
      align-self: stretch;
      height: auto;
    }
    :host > .inspector-header > io-string:focus {
      width: 6em;
    }
    :host > .inspector-header > io-string:empty:before {
      content: ' 🔍';
      white-space: pre;
      visibility: visible;
      opacity: 0.33;
    }
    :host > io-collapsable > io-boolean,
    :host > io-object > io-boolean {
      text-transform: capitalize;
    }
    :host > io-object > io-properties {
      border-radius: var(--io-border-radius);
      background-color: var(--io-background-color) !important;
      border: var(--io-border);
      border-color: var(--io-color-border-inset);
      box-shadow: var(--io-shadow-inset);
      padding: var(--io-spacing);
      overflow: hidden;
    }
    :host > io-object > io-properties:not([horizontal])[labeled] {
      grid-template-columns: minmax(6em, min-content) minmax(12em, 1fr);
    }
    :host > io-object > io-properties:not([horizontal])[labeled] > span.io-item {
      text-align: right;
    }
    :host io-properties > io-item.select {
      color: var(--io-color-link);
    }
    :host io-properties > io-item.select:hover {
      text-decoration: underline;
    }
    `;
  }
  static get Properties() {
    return {
      value: {
        type: Object,
        observe: true,
      },
      selected: {
        type: Object,
        observe: true,
      },
      search: String,
      advanced: false,
      groups: Object,
      config: Object,
      widgets: Object,
      autoExpand: ['main', 'properties'],
    };
  }
  static get Listeners() {
    return {
      'item-clicked': '_onItemClicked',
    };
  }
  constructor(props) {
    super(props);
    Object.defineProperty(this, 'uuid', {value: null, writable: true});
  }
  _onItemClicked(event) {
    event.stopPropagation();
    const value = event.detail.value;
    const item = event.composedPath()[0];
    if (value && typeof value === 'object' && item.classList.contains('select')) {
      this.set('selected', value);
    }
  }
  valueChanged() {
    this.selected = this.value;
  }
  advancedChanged() {
    delete this._currentCfgLen;
  }
  selectedMutated() {
    clearTimeout(this._cfgTimeout);
    this._cfgTimeout = setTimeout(()=>{
      this._changed();
    }, 1000/10);
  }
  _getConfig() {
    this._config = this.__proto__.__config.getConfig(this.selected, this.config);
  }
  _getGroups() {
    this._groups = this.__proto__.__groups.getGroups(this.selected, this.groups, Object.getOwnPropertyNames(this._config), this.advanced);
  }
  _getWidgets() {
    this._widgets = this.__proto__.__widgets.getWidgets(this.selected, this.widgets);
  }
  _getAll() {
    const propLength = Object.getOwnPropertyNames(this.selected).length;
    if (!this._config || this.selected !== this._currentCfgObj || propLength !== this._currentCfgLen) {
      this._currentCfgObj = this.selected;
      this._currentCfgLen = propLength;
      this._getConfig();
      this._getGroups();
      this._getWidgets();
    }
  }
  changed() {
    this.advanced = IoStorageFactory({value: false, storage: 'local', key: 'inspector-show-advanced'});
    this._changedThrottled();
  }
  _changedThrottled() {
    this.throttle(this._changed, null, true);
  }
  _changed() {
    this._getAll();
    this.uuid = genUUID(this.selected);
    const elements = [
      ['div', {class: 'inspector-header io-row io-panel'}, [
        ['io-breadcrumbs', {value: this.value, selected: this.bind('selected'), trim: true}],
        ['io-string', {id: 'search', value: this.bind('search'), live: true}],
        ['io-boolicon', {value: this.bind('advanced'), true: 'icons:less', false: 'icons:more'}],
      ]],
      this._widgets.main ? this._widgets.main : null
    ];

    for (let group in this._widgets.groups) {
      if (!this._groups[group]) {
        const autoExpanded = this.autoExpand.indexOf(group) !== -1;
        elements.push(
          ['io-collapsable', {
            label: group,
            expanded: IoStorageFactory({value: autoExpanded, storage: 'local', key: this.uuid + '-' + group}),
            elements: [this._widgets.groups[group]] || [],
            class: 'io-panel',
          }]
        );
      }
    }

    for (let group in this._groups) {
      const autoExpanded = this.autoExpand.indexOf(group) !== -1;
      elements.push(
        ['io-object', {
          label: group,
          expanded: IoStorageFactory({value: autoExpanded, storage: 'local', key: this.uuid + '-' + group}),
          value: this.selected,
          properties: this._groups[group],
          config: this._config,
          slotted: this._widgets.groups[group] || [],
        }],
      );
    }
    this.template(elements);
  }
  static get Config() {
    return {
      'type:object': ['io-item', {class: 'select'}],
      'type:null': ['io-item', {class: 'select'}],
    };
  }
  static get Groups() {
    return {
      'Object|hidden': [/^_/],
      // TODO
      'HTMLElement|main': ['localName', 'tagName', 'nodeName', /class/i, /attribute/i],
      'HTMLElement|hidden': [/^on/, /^[A-Z0-9_]*$/, 'childElementCount'],
      'HTMLElement|content': [/content/i, /inner/i, /outer/i],
      'HTMLElement|display': [/width/i, /height/i, /top/i, /left/i, /scroll/i, /style/i],
      'HTMLElement|hierarchy': [/parent/i, /child/i, /element/i, /root/i, /slot/i, /sibling/i, /document/i],
    };
  }
  static get Widgets() {
    return {
      // 'Object': ['io-item', {label: 'This is a main widget'}],
      // 'Object|main': ['io-item', {label: 'This is a main group widget'}],
    };
  }
}

function genUUID(object) {
  let UUID = 'io-object-collapse-state-' + object.constructor.name;
  UUID += '-' + object.guid || object.uuid || object.id || '';
  const props = JSON.stringify(Object.keys(object));
  let hash = 0;
  for (let i = 0; i < props.length; i++) {
    hash = ((hash << 5) - hash) + props.charCodeAt(i);
    hash |= 0;
  }
  hash = (-hash).toString(16);
  UUID += '-' + hash;
  return UUID;
}

IoInspector.Register = function() {
  IoElement.Register.call(this);
  Object.defineProperty(this.prototype, '__config', {value: new Config(this.prototype.__protochain)});
  Object.defineProperty(this.prototype, '__groups', {value: new Groups(this.prototype.__protochain)});
  Object.defineProperty(this.prototype, '__widgets', {value: new Widgets(this.prototype.__protochain)});
};

IoInspector.RegisterConfig = function(config) {
  this.prototype.__config.registerConfig(config);
};

IoInspector.RegisterGroups = function(groups) {
  this.prototype.__groups.registerGroups(groups);
};

IoInspector.RegisterWidgets = function(widgets) {
  this.prototype.__widgets.registerWidgets(widgets);
};

IoInspector.Register();

IoInspector.RegisterGroups({
  'Array|main': [/^[0-9]+$/],
});

class IoProperties extends IoElement {
  static get Style() {
    return /* css */`
    :host {
      display: grid;
      grid-gap: var(--io-spacing);
      justify-self: stretch;
      justify-items: start;
      white-space: nowrap;
    }
    :host[horizontal] {
      grid-auto-flow: column;
      grid-template-rows: auto;
    }
    :host[horizontal][labeled] {
      grid-template-rows: auto auto;
    }
    :host:not([horizontal]) {
      grid-template-columns: auto;
    }
    :host:not([horizontal])[labeled] {
      display: grid;
      grid-template-columns: min-content minmax(4em, 1fr);
    }
    :host > span.io-item {
      max-width: 8em !important;
      width: 100%;
    }
    :host:not([horizontal]) > * {
      max-width: 100%;
    }
    :host > :first-child {
      grid-column: span 2;
      width: 100%;
    }
    :host > io-object {}
    :host > io-object {
      padding: 0;
      border: var(--io-border);
      border-radius: var(--io-border-radius);
      border-color: transparent;
      background-color: transparent;
      background-image: none;
    }
    :host > io-object,
    :host > io-properties,
    :host > io-number,
    :host > io-string {
      width: auto;
      justify-self: stretch;
    }
    :host io-properties {
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }
    `;
  }
  static get Properties() {
    return {
      labeled: {
        value: true,
        reflect: 1,
      },
      horizontal: {
        value: false,
        reflect: 1,
      },
      value: {
        type: Object,
        observe: true,
      },
      properties: Array,
      slotted: Array,
      config: Object,
    };
  }
  static get Config() {
    return {
      'type:string': ['io-string', {}],
      'type:number': ['io-number', {step: 0.0000001}],
      'type:boolean': ['io-boolean', {}],
      'type:object': ['io-object', {}],
      'type:null': ['io-string', {}],
      'type:undefined': ['io-string', {}],
    };
  }
  _onValueSet(event) {
    if (event.detail.object) return; // TODO: unhack/remove?
    const item = event.composedPath()[0];
    if (item === this) return;
    event.stopImmediatePropagation();
    const prop = item.id;
    if (prop !== null && event.detail.property === 'value') {
      const value = event.detail.value;
      const oldValue = event.detail.oldValue;
      this.value[prop] = value;
      const detail = {object: this.value, property: prop, value: value, oldValue: oldValue};
      this.dispatchEvent('object-mutated', detail, false, window); // TODO: test
    }
  }
  _getConfig() {
    const propLength = Object.getOwnPropertyNames(this.value).length;
    if (!this._config || this.config !== this._currentConfig || this.value !== this._currentValue || propLength !== this._currentLength) {
      this._currentConfig = this.config;
      this._currentValue = this.value;
      this._currentLength = propLength;
      this._config = this.__proto__.__config.getConfig(this.value, this.config);
      return this._config;
    }
    return this._config;
  }
  valueMutated() {
    // TODO implement debounce
    this._changedThrottled();
    clearTimeout(this._cfgTimeout);
    this._cfgTimeout = setTimeout(()=>{
      this._updateChildren();
    }, 1000/10);
  }
  // TODO: unhack?
  _updateChildren() {
    const all = this.querySelectorAll(':scope > *, io-properties > *');
    const subobjects = this.filterObjects(this.value, o => typeof o === 'object', 1);
    for (let i = 0; i < all.length; i++) {
      const child = all[i];
      if (typeof child.value === 'object') {
        if (subobjects.indexOf(child.value) !== -1) {
          if (child.changed) child.changed();
        }
      }
    }
  }
  changed() {
    this._changedThrottled();
  }
  _changedThrottled() {
    this.throttle(this._changed, null); // TODO: consider async
  }
  _changed() {
    this._config = this._getConfig();

    const config = this._config;
    const elements = [];
    const properties = this.properties.length ? this.properties : Object.keys(config);

    if (this.slotted.length) {
      elements.push(this.slotted);
    } else {
      elements.push(['slotted-dummy']);
    }

    for (let i = 0; i < properties.length; i++) {
      const c = properties[i];
      if (!this.properties.length || this.properties.indexOf(c) !== -1) {
        const tag = config[c][0];
        const protoConfig = config[c][1];
        const label = config[c].label || c;
        const itemConfig = {title: label, id: c, value: this.value[c], 'on-value-set': this._onValueSet};
        itemConfig.config = this.config;
        elements.push(
          this.labeled ? ['span', {class: 'io-item'}, label + ':'] : null,
          [tag, Object.assign(itemConfig, protoConfig)],
        );
      }
    }
    this.template(elements);
  }
}

IoProperties.Register = function() {
  IoElement.Register.call(this);
  Object.defineProperty(this.prototype, '__config', {value: new Config(this.prototype.__protochain)});
};

IoProperties.RegisterConfig = function(config) {
  this.prototype.__config.registerConfig(config);
};

IoProperties.Register();

class IoObject extends IoElement {
  static get Style() {
    return /* css */`
    :host {
      @apply --io-panel;
    }
    :host > io-boolean {
      align-self: stretch;
    }
    :host > io-boolean:before {
      display: inline-block;
      width: 1.125em;
      content: "▸"
    }
    :host > io-boolean[value]:before {
      content: "▾";
    }
    :host > :nth-child(n+2) {
      margin-top: var(--io-spacing);
    }
    `;
  }
  static get Properties() {
    return {
      value: Object,
      properties: Array,
      config: Object,
      labeled: true,
      label: {
        reflect: 1,
      },
      expanded: {
        type: Boolean,
        reflect: 1,
      },
      slotted: Array,
      role: 'region',
    };
  }
  changed() {
    const label = this.label || this.value.constructor.name;
    const elements = [['io-boolean', {true: label, false: label, value: this.bind('expanded')}]];
    if (this.expanded) {
      elements.push(['io-properties', {
        value: this.value,
        properties: this.properties,
        config: this.config,
        labeled: this.labeled,
        slotted: this.slotted,
      }]);
    }
    this.template(elements);
    this.setAttribute('aria-expanded', String(this.expanded));
  }
}

IoObject.Register();

/**@License
 * Copyright (c) 2011-2016 Heather Arthur <fayearthur@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/* MIT license */
/* eslint-disable no-mixed-operators */

// NOTE: conversions should only return primitive values (i.e. arrays, or
//       values that give correct `typeof` results).
//       do not use box values types (i.e. Number(), String(), etc.)


const convert = {
	rgb: {channels: 3, labels: 'rgb'},
	hsl: {channels: 3, labels: 'hsl'},
	hsv: {channels: 3, labels: 'hsv'},
	hwb: {channels: 3, labels: 'hwb'},
	cmyk: {channels: 4, labels: 'cmyk'},
	xyz: {channels: 3, labels: 'xyz'},
	lab: {channels: 3, labels: 'lab'},
	lch: {channels: 3, labels: 'lch'},
	hex: {channels: 1, labels: ['hex']},
	ansi16: {channels: 1, labels: ['ansi16']},
	ansi256: {channels: 1, labels: ['ansi256']},
	hcg: {channels: 3, labels: ['h', 'c', 'g']},
	apple: {channels: 3, labels: ['r16', 'g16', 'b16']},
	gray: {channels: 1, labels: ['gray']}
};

// Hide .channels and .labels properties
for (const model of Object.keys(convert)) {
	if (!('channels' in convert[model])) {
		throw new Error('missing channels property: ' + model);
	}

	if (!('labels' in convert[model])) {
		throw new Error('missing channel labels property: ' + model);
	}

	if (convert[model].labels.length !== convert[model].channels) {
		throw new Error('channel and label counts mismatch: ' + model);
	}

	const {channels, labels} = convert[model];
	delete convert[model].channels;
	delete convert[model].labels;
	Object.defineProperty(convert[model], 'channels', {value: channels});
	Object.defineProperty(convert[model], 'labels', {value: labels});
}

convert.rgb.hsl = function (rgb) {
	const r = rgb[0] / 255;
	const g = rgb[1] / 255;
	const b = rgb[2] / 255;
	const min = Math.min(r, g, b);
	const max = Math.max(r, g, b);
	const delta = max - min;
	let h;
	let s;

	if (max === min) {
		h = 0;
	} else if (r === max) {
		h = (g - b) / delta;
	} else if (g === max) {
		h = 2 + (b - r) / delta;
	} else if (b === max) {
		h = 4 + (r - g) / delta;
	}

	h = Math.min(h * 60, 360);

	if (h < 0) {
		h += 360;
	}

	const l = (min + max) / 2;

	if (max === min) {
		s = 0;
	} else if (l <= 0.5) {
		s = delta / (max + min);
	} else {
		s = delta / (2 - max - min);
	}

	return [h, s * 100, l * 100];
};

convert.rgb.hsv = function (rgb) {
	let rdif;
	let gdif;
	let bdif;
	let h;
	let s;

	const r = rgb[0] / 255;
	const g = rgb[1] / 255;
	const b = rgb[2] / 255;
	const v = Math.max(r, g, b);
	const diff = v - Math.min(r, g, b);
	const diffc = function (c) {
		return (v - c) / 6 / diff + 1 / 2;
	};

	if (diff === 0) {
		h = 0;
		s = 0;
	} else {
		s = diff / v;
		rdif = diffc(r);
		gdif = diffc(g);
		bdif = diffc(b);

		if (r === v) {
			h = bdif - gdif;
		} else if (g === v) {
			h = (1 / 3) + rdif - bdif;
		} else if (b === v) {
			h = (2 / 3) + gdif - rdif;
		}

		if (h < 0) {
			h += 1;
		} else if (h > 1) {
			h -= 1;
		}
	}

	return [
		h * 360,
		s * 100,
		v * 100
	];
};

convert.rgb.hwb = function (rgb) {
	const r = rgb[0];
	const g = rgb[1];
	let b = rgb[2];
	const h = convert.rgb.hsl(rgb)[0];
	const w = 1 / 255 * Math.min(r, Math.min(g, b));

	b = 1 - 1 / 255 * Math.max(r, Math.max(g, b));

	return [h, w * 100, b * 100];
};

convert.rgb.cmyk = function (rgb) {
	const r = rgb[0] / 255;
	const g = rgb[1] / 255;
	const b = rgb[2] / 255;

	const k = Math.min(1 - r, 1 - g, 1 - b);
	const c = (1 - r - k) / (1 - k) || 0;
	const m = (1 - g - k) / (1 - k) || 0;
	const y = (1 - b - k) / (1 - k) || 0;

	return [c * 100, m * 100, y * 100, k * 100];
};

convert.rgb.xyz = function (rgb) {
	let r = rgb[0] / 255;
	let g = rgb[1] / 255;
	let b = rgb[2] / 255;

	// Assume sRGB
	r = r > 0.04045 ? (((r + 0.055) / 1.055) ** 2.4) : (r / 12.92);
	g = g > 0.04045 ? (((g + 0.055) / 1.055) ** 2.4) : (g / 12.92);
	b = b > 0.04045 ? (((b + 0.055) / 1.055) ** 2.4) : (b / 12.92);

	const x = (r * 0.4124) + (g * 0.3576) + (b * 0.1805);
	const y = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
	const z = (r * 0.0193) + (g * 0.1192) + (b * 0.9505);

	return [x * 100, y * 100, z * 100];
};

convert.rgb.lab = function (rgb) {
	const xyz = convert.rgb.xyz(rgb);
	let x = xyz[0];
	let y = xyz[1];
	let z = xyz[2];

	x /= 95.047;
	y /= 100;
	z /= 108.883;

	x = x > 0.008856 ? (x ** (1 / 3)) : (7.787 * x) + (16 / 116);
	y = y > 0.008856 ? (y ** (1 / 3)) : (7.787 * y) + (16 / 116);
	z = z > 0.008856 ? (z ** (1 / 3)) : (7.787 * z) + (16 / 116);

	const l = (116 * y) - 16;
	const a = 500 * (x - y);
	const b = 200 * (y - z);

	return [l, a, b];
};

convert.hsl.rgb = function (hsl) {
	const h = hsl[0] / 360;
	const s = hsl[1] / 100;
	const l = hsl[2] / 100;
	let t2;
	let t3;
	let val;

	if (s === 0) {
		val = l * 255;
		return [val, val, val];
	}

	if (l < 0.5) {
		t2 = l * (1 + s);
	} else {
		t2 = l + s - l * s;
	}

	const t1 = 2 * l - t2;

	const rgb = [0, 0, 0];
	for (let i = 0; i < 3; i++) {
		t3 = h + 1 / 3 * -(i - 1);
		if (t3 < 0) {
			t3++;
		}

		if (t3 > 1) {
			t3--;
		}

		if (6 * t3 < 1) {
			val = t1 + (t2 - t1) * 6 * t3;
		} else if (2 * t3 < 1) {
			val = t2;
		} else if (3 * t3 < 2) {
			val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
		} else {
			val = t1;
		}

		rgb[i] = val * 255;
	}

	return rgb;
};

convert.hsl.hsv = function (hsl) {
	const h = hsl[0];
	let s = hsl[1] / 100;
	let l = hsl[2] / 100;
	let smin = s;
	const lmin = Math.max(l, 0.01);

	l *= 2;
	s *= (l <= 1) ? l : 2 - l;
	smin *= lmin <= 1 ? lmin : 2 - lmin;
	const v = (l + s) / 2;
	const sv = l === 0 ? (2 * smin) / (lmin + smin) : (2 * s) / (l + s);

	return [h, sv * 100, v * 100];
};

convert.hsv.rgb = function (hsv) {
	const h = hsv[0] / 60;
	const s = hsv[1] / 100;
	let v = hsv[2] / 100;
	const hi = Math.floor(h) % 6;

	const f = h - Math.floor(h);
	const p = 255 * v * (1 - s);
	const q = 255 * v * (1 - (s * f));
	const t = 255 * v * (1 - (s * (1 - f)));
	v *= 255;

	switch (hi) {
		case 0:
			return [v, t, p];
		case 1:
			return [q, v, p];
		case 2:
			return [p, v, t];
		case 3:
			return [p, q, v];
		case 4:
			return [t, p, v];
		case 5:
			return [v, p, q];
	}
};

convert.hsv.hsl = function (hsv) {
	const h = hsv[0];
	const s = hsv[1] / 100;
	const v = hsv[2] / 100;
	const vmin = Math.max(v, 0.01);
	let sl;
	let l;

	l = (2 - s) * v;
	const lmin = (2 - s) * vmin;
	sl = s * vmin;
	sl /= (lmin <= 1) ? lmin : 2 - lmin;
	sl = sl || 0;
	l /= 2;

	return [h, sl * 100, l * 100];
};

// http://dev.w3.org/csswg/css-color/#hwb-to-rgb
convert.hwb.rgb = function (hwb) {
	const h = hwb[0] / 360;
	let wh = hwb[1] / 100;
	let bl = hwb[2] / 100;
	const ratio = wh + bl;
	let f;

	// Wh + bl cant be > 1
	if (ratio > 1) {
		wh /= ratio;
		bl /= ratio;
	}

	const i = Math.floor(6 * h);
	const v = 1 - bl;
	f = 6 * h - i;

	if ((i & 0x01) !== 0) {
		f = 1 - f;
	}

	const n = wh + f * (v - wh); // Linear interpolation

	let r;
	let g;
	let b;
	/* eslint-disable max-statements-per-line,no-multi-spaces */
	switch (i) {
		default:
		case 6:
		case 0: r = v;  g = n;  b = wh; break;
		case 1: r = n;  g = v;  b = wh; break;
		case 2: r = wh; g = v;  b = n; break;
		case 3: r = wh; g = n;  b = v; break;
		case 4: r = n;  g = wh; b = v; break;
		case 5: r = v;  g = wh; b = n; break;
	}
	/* eslint-enable max-statements-per-line,no-multi-spaces */

	return [r * 255, g * 255, b * 255];
};

convert.cmyk.rgb = function (cmyk) {
	const c = cmyk[0] / 100;
	const m = cmyk[1] / 100;
	const y = cmyk[2] / 100;
	const k = cmyk[3] / 100;

	const r = 1 - Math.min(1, c * (1 - k) + k);
	const g = 1 - Math.min(1, m * (1 - k) + k);
	const b = 1 - Math.min(1, y * (1 - k) + k);

	return [r * 255, g * 255, b * 255];
};

convert.xyz.rgb = function (xyz) {
	const x = xyz[0] / 100;
	const y = xyz[1] / 100;
	const z = xyz[2] / 100;
	let r;
	let g;
	let b;

	r = (x * 3.2406) + (y * -1.5372) + (z * -0.4986);
	g = (x * -0.9689) + (y * 1.8758) + (z * 0.0415);
	b = (x * 0.0557) + (y * -0.2040) + (z * 1.0570);

	// Assume sRGB
	r = r > 0.0031308
		? ((1.055 * (r ** (1.0 / 2.4))) - 0.055)
		: r * 12.92;

	g = g > 0.0031308
		? ((1.055 * (g ** (1.0 / 2.4))) - 0.055)
		: g * 12.92;

	b = b > 0.0031308
		? ((1.055 * (b ** (1.0 / 2.4))) - 0.055)
		: b * 12.92;

	r = Math.min(Math.max(0, r), 1);
	g = Math.min(Math.max(0, g), 1);
	b = Math.min(Math.max(0, b), 1);

	return [r * 255, g * 255, b * 255];
};

convert.xyz.lab = function (xyz) {
	let x = xyz[0];
	let y = xyz[1];
	let z = xyz[2];

	x /= 95.047;
	y /= 100;
	z /= 108.883;

	x = x > 0.008856 ? (x ** (1 / 3)) : (7.787 * x) + (16 / 116);
	y = y > 0.008856 ? (y ** (1 / 3)) : (7.787 * y) + (16 / 116);
	z = z > 0.008856 ? (z ** (1 / 3)) : (7.787 * z) + (16 / 116);

	const l = (116 * y) - 16;
	const a = 500 * (x - y);
	const b = 200 * (y - z);

	return [l, a, b];
};

convert.lab.xyz = function (lab) {
	const l = lab[0];
	const a = lab[1];
	const b = lab[2];
	let x;
	let y;
	let z;

	y = (l + 16) / 116;
	x = a / 500 + y;
	z = y - b / 200;

	const y2 = y ** 3;
	const x2 = x ** 3;
	const z2 = z ** 3;
	y = y2 > 0.008856 ? y2 : (y - 16 / 116) / 7.787;
	x = x2 > 0.008856 ? x2 : (x - 16 / 116) / 7.787;
	z = z2 > 0.008856 ? z2 : (z - 16 / 116) / 7.787;

	x *= 95.047;
	y *= 100;
	z *= 108.883;

	return [x, y, z];
};

convert.lab.lch = function (lab) {
	const l = lab[0];
	const a = lab[1];
	const b = lab[2];
	let h;

	const hr = Math.atan2(b, a);
	h = hr * 360 / 2 / Math.PI;

	if (h < 0) {
		h += 360;
	}

	const c = Math.sqrt(a * a + b * b);

	return [l, c, h];
};

convert.lch.lab = function (lch) {
	const l = lch[0];
	const c = lch[1];
	const h = lch[2];

	const hr = h / 360 * 2 * Math.PI;
	const a = c * Math.cos(hr);
	const b = c * Math.sin(hr);

	return [l, a, b];
};

convert.rgb.ansi16 = function (args, saturation = null) {
	const [r, g, b] = args;
	let value = saturation === null ? convert.rgb.hsv(args)[2] : saturation; // Hsv -> ansi16 optimization

	value = Math.round(value / 50);

	if (value === 0) {
		return 30;
	}

	let ansi = 30
		+ ((Math.round(b / 255) << 2)
		| (Math.round(g / 255) << 1)
		| Math.round(r / 255));

	if (value === 2) {
		ansi += 60;
	}

	return ansi;
};

convert.hsv.ansi16 = function (args) {
	// Optimization here; we already know the value and don't need to get
	// it converted for us.
	return convert.rgb.ansi16(convert.hsv.rgb(args), args[2]);
};

convert.rgb.ansi256 = function (args) {
	const r = args[0];
	const g = args[1];
	const b = args[2];

	// We use the extended greyscale palette here, with the exception of
	// black and white. normal palette only has 4 greyscale shades.
	if (r === g && g === b) {
		if (r < 8) {
			return 16;
		}

		if (r > 248) {
			return 231;
		}

		return Math.round(((r - 8) / 247) * 24) + 232;
	}

	const ansi = 16
		+ (36 * Math.round(r / 255 * 5))
		+ (6 * Math.round(g / 255 * 5))
		+ Math.round(b / 255 * 5);

	return ansi;
};

convert.ansi16.rgb = function (args) {
	let color = args % 10;

	// Handle greyscale
	if (color === 0 || color === 7) {
		if (args > 50) {
			color += 3.5;
		}

		color = color / 10.5 * 255;

		return [color, color, color];
	}

	const mult = (~~(args > 50) + 1) * 0.5;
	const r = ((color & 1) * mult) * 255;
	const g = (((color >> 1) & 1) * mult) * 255;
	const b = (((color >> 2) & 1) * mult) * 255;

	return [r, g, b];
};

convert.ansi256.rgb = function (args) {
	// Handle greyscale
	if (args >= 232) {
		const c = (args - 232) * 10 + 8;
		return [c, c, c];
	}

	args -= 16;

	let rem;
	const r = Math.floor(args / 36) / 5 * 255;
	const g = Math.floor((rem = args % 36) / 6) / 5 * 255;
	const b = (rem % 6) / 5 * 255;

	return [r, g, b];
};

convert.rgb.hex = function (args) {
	const integer = ((Math.round(args[0]) & 0xFF) << 16)
		+ ((Math.round(args[1]) & 0xFF) << 8)
		+ (Math.round(args[2]) & 0xFF);

	const string = integer.toString(16).toUpperCase();
	return '000000'.substring(string.length) + string;
};

convert.hex.rgb = function (args) {
	const match = args.toString(16).match(/[a-f0-9]{6}|[a-f0-9]{3}/i);
	if (!match) {
		return [0, 0, 0];
	}

	let colorString = match[0];

	if (match[0].length === 3) {
		colorString = colorString.split('').map(char => {
			return char + char;
		}).join('');
	}

	const integer = parseInt(colorString, 16);
	const r = (integer >> 16) & 0xFF;
	const g = (integer >> 8) & 0xFF;
	const b = integer & 0xFF;

	return [r, g, b];
};

convert.rgb.hcg = function (rgb) {
	const r = rgb[0] / 255;
	const g = rgb[1] / 255;
	const b = rgb[2] / 255;
	const max = Math.max(Math.max(r, g), b);
	const min = Math.min(Math.min(r, g), b);
	const chroma = (max - min);
	let grayscale;
	let hue;

	if (chroma < 1) {
		grayscale = min / (1 - chroma);
	} else {
		grayscale = 0;
	}

	if (chroma <= 0) {
		hue = 0;
	} else
	if (max === r) {
		hue = ((g - b) / chroma) % 6;
	} else
	if (max === g) {
		hue = 2 + (b - r) / chroma;
	} else {
		hue = 4 + (r - g) / chroma + 4;
	}

	hue /= 6;
	hue %= 1;

	return [hue * 360, chroma * 100, grayscale * 100];
};

convert.hsl.hcg = function (hsl) {
	const s = hsl[1] / 100;
	const l = hsl[2] / 100;

	const c = l < 0.5 ? (2.0 * s * l) : (2.0 * s * (1.0 - l));

	let f = 0;
	if (c < 1.0) {
		f = (l - 0.5 * c) / (1.0 - c);
	}

	return [hsl[0], c * 100, f * 100];
};

convert.hsv.hcg = function (hsv) {
	const s = hsv[1] / 100;
	const v = hsv[2] / 100;

	const c = s * v;
	let f = 0;

	if (c < 1.0) {
		f = (v - c) / (1 - c);
	}

	return [hsv[0], c * 100, f * 100];
};

convert.hcg.rgb = function (hcg) {
	const h = hcg[0] / 360;
	const c = hcg[1] / 100;
	const g = hcg[2] / 100;

	if (c === 0.0) {
		return [g * 255, g * 255, g * 255];
	}

	const pure = [0, 0, 0];
	const hi = (h % 1) * 6;
	const v = hi % 1;
	const w = 1 - v;
	let mg = 0;

	/* eslint-disable max-statements-per-line */
	switch (Math.floor(hi)) {
		case 0:
			pure[0] = 1; pure[1] = v; pure[2] = 0; break;
		case 1:
			pure[0] = w; pure[1] = 1; pure[2] = 0; break;
		case 2:
			pure[0] = 0; pure[1] = 1; pure[2] = v; break;
		case 3:
			pure[0] = 0; pure[1] = w; pure[2] = 1; break;
		case 4:
			pure[0] = v; pure[1] = 0; pure[2] = 1; break;
		default:
			pure[0] = 1; pure[1] = 0; pure[2] = w;
	}
	/* eslint-enable max-statements-per-line */

	mg = (1.0 - c) * g;

	return [
		(c * pure[0] + mg) * 255,
		(c * pure[1] + mg) * 255,
		(c * pure[2] + mg) * 255
	];
};

convert.hcg.hsv = function (hcg) {
	const c = hcg[1] / 100;
	const g = hcg[2] / 100;

	const v = c + g * (1.0 - c);
	let f = 0;

	if (v > 0.0) {
		f = c / v;
	}

	return [hcg[0], f * 100, v * 100];
};

convert.hcg.hsl = function (hcg) {
	const c = hcg[1] / 100;
	const g = hcg[2] / 100;

	const l = g * (1.0 - c) + 0.5 * c;
	let s = 0;

	if (l > 0.0 && l < 0.5) {
		s = c / (2 * l);
	} else
	if (l >= 0.5 && l < 1.0) {
		s = c / (2 * (1 - l));
	}

	return [hcg[0], s * 100, l * 100];
};

convert.hcg.hwb = function (hcg) {
	const c = hcg[1] / 100;
	const g = hcg[2] / 100;
	const v = c + g * (1.0 - c);
	return [hcg[0], (v - c) * 100, (1 - v) * 100];
};

convert.hwb.hcg = function (hwb) {
	const w = hwb[1] / 100;
	const b = hwb[2] / 100;
	const v = 1 - b;
	const c = v - w;
	let g = 0;

	if (c < 1) {
		g = (v - c) / (1 - c);
	}

	return [hwb[0], c * 100, g * 100];
};

convert.apple.rgb = function (apple) {
	return [(apple[0] / 65535) * 255, (apple[1] / 65535) * 255, (apple[2] / 65535) * 255];
};

convert.rgb.apple = function (rgb) {
	return [(rgb[0] / 255) * 65535, (rgb[1] / 255) * 65535, (rgb[2] / 255) * 65535];
};

convert.gray.rgb = function (args) {
	return [args[0] / 100 * 255, args[0] / 100 * 255, args[0] / 100 * 255];
};

convert.gray.hsl = function (args) {
	return [0, 0, args[0]];
};

convert.gray.hsv = convert.gray.hsl;

convert.gray.hwb = function (gray) {
	return [0, 100, gray[0]];
};

convert.gray.cmyk = function (gray) {
	return [0, 0, 0, gray[0]];
};

convert.gray.lab = function (gray) {
	return [gray[0], 0, 0];
};

convert.gray.hex = function (gray) {
	const val = Math.round(gray[0] / 100 * 255) & 0xFF;
	const integer = (val << 16) + (val << 8) + val;

	const string = integer.toString(16).toUpperCase();
	return '000000'.substring(string.length) + string;
};

convert.rgb.gray = function (rgb) {
	const val = (rgb[0] + rgb[1] + rgb[2]) / 3;
	return [val / 255 * 100];
};

const IoColorMixin = (superclass) => {
  const classConstructor = class extends superclass {
    static get Properties() {
      return {
        value: {
          value: [1, 1, 1, 1],
          observe: true,
        },
        // Internal
        rgb: [1, 1, 1],
        hsv: [1, 1, 1],
        hsl: [1, 1, 1],
        cmyk: [1, 1, 1, 1],
        alpha: 1,
        // 0 - rgb
        // 1 - hsv
        // 2 - hsl
        // 3 - cmyk
        mode: 0,
      };
    }
    static get GlUtils() {
      return /* glsl */`
      vec3 hue2rgb(float hue) {
        hue=fract(hue);
        float R = abs(hue * 6. - 3.) - 1.;
        float G = 2. - abs(hue * 6. - 2.);
        float B = 2. - abs(hue * 6. - 4.);
        return saturate(vec3(R,G,B));
      }
      vec3 hsv2rgb(vec3 hsv) {
        vec3 rgb = hue2rgb(hsv.r);
        return ((rgb - 1.) * hsv.g + 1.) * hsv.b;
      }
      vec3 hsl2rgb(vec3 hsl) {
        vec3 rgb = hue2rgb(hsl.x);
        float C = (1. - abs(2. * hsl.z - 1.)) * hsl.y;
        return (rgb - 0.5) * C + hsl.z;
      }
      vec3 cmyk2rgb(vec4 cmyk) {
        float r = 1. - min(1., cmyk.x * (1. - cmyk.w) + cmyk.w);
        float g = 1. - min(1., cmyk.y * (1. - cmyk.w) + cmyk.w);
        float b = 1. - min(1., cmyk.z * (1. - cmyk.w) + cmyk.w);
        return vec3(r, g, b);
      }
      \n\n`;
    }
    valueMutated() {
      this.valueChanged();
    }
    modeChanged() {
      this.valueChanged();
    }
    setValueFromRgb() {
      const c = Object.keys(this.value);
      switch (this.mode) {
        case 0: {
          this.value[c[0]] = this.rgb[0];
          this.value[c[1]] = this.rgb[1];
          this.value[c[2]] = this.rgb[2];
          break;
        }
        case 1: {
          const hsv = convert.rgb.hsv([
            this.rgb[0] * 255,
            this.rgb[1] * 255,
            this.rgb[2] * 255,
          ]);
          this.value[c[0]] = hsv[0] / 360;
          this.value[c[1]] = hsv[1] / 100;
          this.value[c[2]] = hsv[2] / 100;
          break;
        }
        case 2: {
          const hsl = convert.rgb.hsl([
            this.rgb[0] * 255,
            this.rgb[1] * 255,
            this.rgb[2] * 255,
          ]);
          this.value[c[0]] = hsl[0] / 360;
          this.value[c[1]] = hsl[1] / 100;
          this.value[c[2]] = hsl[2] / 100;
          break;
        }
        case 3: {
          const cmyk = convert.rgb.cmyk([
            this.rgb[0] * 255,
            this.rgb[1] * 255,
            this.rgb[2] * 255,
          ]);
          this.value[c[0]] = cmyk[0] / 100;
          this.value[c[1]] = cmyk[1] / 100;
          this.value[c[2]] = cmyk[2] / 100;
          this.value[c[3]] = cmyk[3] / 100;
          break;
        }
      }
      this._notifyValueChange();
    }
    setValueFromHsv() {
      const c = Object.keys(this.value);
      switch (this.mode) {
        case 0: {
          const rgb = convert.hsv.rgb([
            this.hsv[0] * 360,
            this.hsv[1] * 100,
            this.hsv[2] * 100,
          ]);
          this.value[c[0]] = rgb[0] / 255;
          this.value[c[1]] = rgb[1] / 255;
          this.value[c[2]] = rgb[2] / 255;
          break;
        }
        case 1: {
          this.value[c[0]] = this.hsv[0];
          this.value[c[1]] = this.hsv[1];
          this.value[c[2]] = this.hsv[2];
          break;
        }
        case 2: {
          const hsl = convert.rgb.hsl(convert.hsv.rgb([
            this.hsv[0] * 360,
            this.hsv[1] * 100,
            this.hsv[2] * 100,
          ]));
          this.value[c[0]] = hsl[0] / 360;
          this.value[c[1]] = hsl[1] / 100;
          this.value[c[2]] = hsl[2] / 100;
          break;
        }
        case 3: {
          const cmyk = convert.rgb.cmyk(convert.hsv.rgb([
            this.hsv[0] * 360,
            this.hsv[1] * 100,
            this.hsv[2] * 100,
          ]));
          this.value[c[0]] = cmyk[0] / 100;
          this.value[c[1]] = cmyk[1] / 100;
          this.value[c[2]] = cmyk[2] / 100;
          this.value[c[3]] = cmyk[3] / 100;
          break;
        }
      }
      this._notifyValueChange();
    }
    setValueFromHsl() {
      const c = Object.keys(this.value);
      switch (this.mode) {
        case 0: {
          const rgb = convert.hsl.rgb([
            this.hsl[0] * 360,
            this.hsl[1] * 100,
            this.hsl[2] * 100,
          ]);
          this.value[c[0]] = rgb[0] / 255;
          this.value[c[1]] = rgb[1] / 255;
          this.value[c[2]] = rgb[2] / 255;
          break;
        }
        case 1: {
          const hsv = convert.rgb.hsv(convert.hsl.rgb([
            this.hsl[0] * 360,
            this.hsl[1] * 100,
            this.hsl[2] * 100,
          ]));
          this.value[c[0]] = hsv[0] / 360;
          this.value[c[1]] = hsv[1] / 100;
          this.value[c[2]] = hsv[2] / 100;
          break;
        }
        case 2: {
          this.value[c[0]] = this.hsl[0];
          this.value[c[1]] = this.hsl[1];
          this.value[c[2]] = this.hsl[2];
          break;
        }
        case 3: {
          const cmyk = convert.rgb.cmyk(convert.hsl.rgb([
            this.hsl[0] * 360,
            this.hsl[1] * 100,
            this.hsl[2] * 100,
          ]));
          this.value[c[0]] = cmyk[0] / 100;
          this.value[c[1]] = cmyk[1] / 100;
          this.value[c[2]] = cmyk[2] / 100;
          this.value[c[3]] = cmyk[3] / 100;
          break;
        }
      }
      this._notifyValueChange();
    }
    setValueFromCmyk() {
      const c = Object.keys(this.value);
      switch (this.mode) {
        case 0: {
          const rgb = convert.cmyk.rgb([
            this.cmyk[0] * 100,
            this.cmyk[1] * 100,
            this.cmyk[2] * 100,
            this.cmyk[3] * 100,
          ]);
          this.value[c[0]] = rgb[0] / 255;
          this.value[c[1]] = rgb[1] / 255;
          this.value[c[2]] = rgb[2] / 255;
          break;
        }
        case 1: {
          const hsv = convert.rgb.hsv(convert.cmyk.rgb([
            this.cmyk[0] * 100,
            this.cmyk[1] * 100,
            this.cmyk[2] * 100,
            this.cmyk[3] * 100,
          ]));
          this.value[c[0]] = hsv[0] / 360;
          this.value[c[1]] = hsv[1] / 100;
          this.value[c[2]] = hsv[2] / 100;
          break;
        }
        case 2: {
          const hsl = convert.rgb.hsl(convert.cmyk.rgb([
            this.cmyk[0] * 100,
            this.cmyk[1] * 100,
            this.cmyk[2] * 100,
            this.cmyk[3] * 100,
          ]));
          this.value[c[0]] = hsl[0] / 360;
          this.value[c[1]] = hsl[1] / 100;
          this.value[c[2]] = hsl[2] / 100;
          break;
        }
        case 3: {
          this.value[c[0]] = this.cmyk[0];
          this.value[c[1]] = this.cmyk[1];
          this.value[c[2]] = this.cmyk[2];
          this.value[c[3]] = this.cmyk[3];
          break;
        }
      }
      this._notifyValueChange();
    }
    valueChanged() {
      let c = Object.keys(this.value);

      let mode = this.mode;
      if (c.indexOf('r') !== -1) mode = 0;
      else if (c.indexOf('h') !== -1 && c.indexOf('v') !== -1) mode = 1;
      else if (c.indexOf('h') !== -1 && c.indexOf('l') !== -1) mode = 2;
      else if (c.indexOf('c') !== -1) mode = 3;

      const val = [];
      for (let i = 0; i < c.length; i++) {
        val.push(this.value[c[i]]);
      }

      let rgb;
      let hsv;
      let hsl;
      let cmyk;
      let alpha = undefined;

      switch (mode) {
        case 3:
          cmyk = [val[0] * 100, val[1] * 100, val[2] * 100, val[3] * 100];
          rgb = convert.cmyk.rgb(cmyk);
          hsv = convert.rgb.hsv(convert.cmyk.rgb(cmyk));
          hsl = convert.rgb.hsl(convert.cmyk.rgb(cmyk));
          if (val[4] !== undefined) alpha = val[4] * 100;
          break;
        case 2:
          hsl = [val[0] * 360, val[1] * 100, val[2] * 100];
          rgb = convert.hsl.rgb(hsl);
          hsv = convert.hsl.hsv(hsl);
          cmyk = convert.rgb.cmyk(convert.hsl.rgb(hsl));
          if (val[3] !== undefined) alpha = val[3] * 100;
          break;
        case 1:
          hsv = [val[0] * 360, val[1] * 100, val[2] * 100];
          rgb = convert.hsv.rgb(hsv);
          hsl = convert.hsv.hsl(hsv);
          cmyk = convert.rgb.cmyk(convert.hsv.rgb(hsv));
          if (val[3] !== undefined) alpha = val[3] * 100;
          break;
        case 0:
        default:
          rgb = [val[0] * 255, val[1] * 255, val[2] * 255];
          hsv = convert.rgb.hsv(rgb);
          hsl = convert.rgb.hsl(rgb);
          cmyk = convert.rgb.cmyk(rgb);
          if (val[3] !== undefined) alpha = val[3] * 100;
          break;
      }

      // Prevent color collapsing to 0.

      if (hsv[1] === 0) hsv[0] = this.hsv[0] * 360;
      if (hsv[2] === 0) hsv[1] = this.hsv[1] * 100;

      if (hsl[1] === 0) hsl[0] = this.hsl[0] * 360;
      if (hsl[2] === 0 || hsl[2] === 100) {
        hsl[0] = this.hsl[0] * 360;
        hsl[1] = this.hsl[1] * 100;
      }

      if (cmyk[3] === 100) {
        cmyk[0] = this.cmyk[0] * 100;
        cmyk[1] = this.cmyk[1] * 100;
        cmyk[2] = this.cmyk[2] * 100;
      }

      //

      this.setProperties({
        rgb: [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255],
        hsv: [hsv[0] / 360, hsv[1] / 100, hsv[2] / 100],
        hsl: [hsl[0] / 360, hsl[1] / 100, hsl[2] / 100],
        cmyk: [cmyk[0] / 100, cmyk[1] / 100, cmyk[2] / 100, cmyk[3] / 100],
        alpha: alpha !== undefined ? alpha / 100 : undefined,
        mode: mode,
      });
    }
  };
  classConstructor.Register = IoElement.Register;
  return classConstructor;
};

class IoColorSlider extends IoColorMixin(IoSlider) {
  static get Properties() {
    return {
      value: [1, 1, 1, 1],
      step: 0.001,
      min: 0,
      max: 1,
    };
  }
  static get GlUtils() {
    return /* glsl */`
    vec4 paintColorSlider(vec2 position, vec3 color) {
      // return paintSlider(position, color);
      vec4 slotColor = vec4(.2, .2, .2, 1.);
      vec4 fillColor = vec4(.8, .8, .8, 1.);
      vec4 sliderColor = vec4(0.);
      float slotWidth = cssStrokeWidth * 1.5;
      float radius = cssItemHeight / 4.;
      float stroke = cssStrokeWidth;
      float strokeShape = min(circle(position, radius + stroke), rectangle(position - vec2(0., 2500.), vec2(slotWidth + stroke, 5000.)));
      sliderColor = mix(vec4(slotColor.rgb, 1.), sliderColor, strokeShape);
      float fillShape = min(circle(position, radius), rectangle(position - vec2(0., 2500.), vec2(slotWidth, 5000.)));
      sliderColor = mix(fillColor, sliderColor, fillShape);
      float colorShape = min(circle(position, radius - stroke), rectangle(position - vec2(0., 2500.), vec2(slotWidth - stroke, 5000.)));
      sliderColor = mix(vec4(color, 1.), sliderColor, colorShape);
      return sliderColor;
    }
    vec4 paintColorSlider2D(vec2 position, vec3 color) {
      vec4 sliderColor = vec4(0.);
      float radius = cssItemHeight / 4.;
      float stroke = cssStrokeWidth;
      vec4 slotColor = vec4(.2, .2, .2, 1.);
      vec4 fillColor = vec4(.8, .8, .8, 1.);
      vec2 width = (uHorizontal == 1) ? vec2(stroke * 2., uSize.y) : vec2(uSize.x, stroke * 2.);
      float strokeShape = circle(position, radius + stroke);
      sliderColor = mix(slotColor, sliderColor, strokeShape);
      float fillShape = circle(position, radius);
      sliderColor = mix(fillColor, sliderColor, fillShape);
      float colorShape = circle(position, radius - stroke);
      sliderColor = mix(vec4(color, 1.), sliderColor, colorShape);
      return sliderColor;
    }
    \n\n`;
  }
  valueMutated() {
    this.valueChanged();
  }
  setAria() {
    // TODO
  }
  _onKeydown(event) {
    super._onKeydown(event);
    this._notifyValueChange();
  }
  _setIncrease() {
  }
  _setDecrease() {
  }
  _setMin() {
    this._setValue(0, 0);
  }
  _setMax() {
    this._setValue(1, 1);
  }
  _onPointermoveThrottled(event) {
    super._onPointermoveThrottled(event);
    this._notifyValueChange();
  }
  _notifyValueChange() {
    this.dispatchEvent('object-mutated', {object: this.value}, false, window);
    this.dispatchEvent('value-set', {property: 'value', value: this.value}, false);
  }
  _setValue() {
    // NOTE: implement in subclass
  }
}

IoColorSlider.Register();

class IoColorSliderRed extends IoColorSlider {
  static get Frag() {
    return /* glsl */`
      varying vec2 vUv;

      void main(void) {
        vec2 size = (uHorizontal == 1) ? uSize : uSize.yx;
        vec2 uv = uHorizontal == 1 ? vUv.xy : vUv.yx;
        vec2 position = size * uv;

        // Value gradient
        vec3 finalColor = vec3(uv.x, uRgb[1], uRgb[2]);

        // Marker
        vec2 markerPos = translate(position, vec2(size.x * uRgb[0], size.y * 0.5));
        vec4 slider = paintColorSlider(markerPos, uRgb);
        finalColor = mix(finalColor, slider.rgb, slider.a);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
  }
  _setIncrease() {
    this.rgb[0] = Math.min(1, this.rgb[0] + 0.01);
    this.setValueFromRgb();
  }
  _setDecrease() {
    this.rgb[0] = Math.max(0, this.rgb[0] - 0.01);
    this.setValueFromRgb();
  }
  _setValue(x) {
    this.rgb[0] = x;
    this.setValueFromRgb();
  }
}

IoColorSliderRed.Register();

class IoColorSliderGreen extends IoColorSlider {
  static get Frag() {
    return /* glsl */`
      varying vec2 vUv;

      void main(void) {
        vec2 size = (uHorizontal == 1) ? uSize : uSize.yx;
        vec2 uv = uHorizontal == 1 ? vUv.xy : vUv.yx;
        vec2 position = size * uv;

        // Value gradient
        vec3 finalColor = vec3(uRgb[0], uv.x, uRgb[2]);

        // Marker
        vec2 markerPos = translate(position, vec2(size.x * uRgb[1], size.y * 0.5));
        vec4 slider = paintColorSlider(markerPos, uRgb);
        finalColor = mix(finalColor, slider.rgb, slider.a);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
  }
  _setIncrease() {
    this.rgb[1] = Math.min(1, this.rgb[1] + 0.01);
    this.setValueFromRgb();
  }
  _setDecrease() {
    this.rgb[1] = Math.max(0, this.rgb[1] - 0.01);
    this.setValueFromRgb();
  }
  _setValue(x) {
    this.rgb[1] = x;
    this.setValueFromRgb();
  }
}

IoColorSliderGreen.Register();

class IoColorSliderBlue extends IoColorSlider {
  static get Frag() {
    return /* glsl */`
      varying vec2 vUv;

      void main(void) {
        vec2 size = (uHorizontal == 1) ? uSize : uSize.yx;
        vec2 uv = uHorizontal == 1 ? vUv.xy : vUv.yx;
        vec2 position = size * uv;

        // Value gradient
        vec3 finalColor = vec3(uRgb[0], uRgb[1], uv.x);

        // Marker
        vec2 markerPos = translate(position, vec2(size.x * uRgb[2], size.y * 0.5));
        vec4 slider = paintColorSlider(markerPos, uRgb);
        finalColor = mix(finalColor, slider.rgb, slider.a);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
  }
  _setIncrease() {
    this.rgb[2] = Math.min(1, this.rgb[2] + 0.01);
    this.setValueFromRgb();
  }
  _setDecrease() {
    this.rgb[2] = Math.max(0, this.rgb[2] - 0.01);
    this.setValueFromRgb();
  }
  _setValue(x) {
    this.rgb[2] = x;
    this.setValueFromRgb();
  }
}

IoColorSliderBlue.Register();

class IoColorSliderHue extends IoColorSlider {
  static get Frag() {
    return /* glsl */`
      varying vec2 vUv;

      void main(void) {
        vec2 size = (uHorizontal == 1) ? uSize : uSize.yx;
        vec2 uv = uHorizontal == 1 ? vUv.xy : vUv.yx;
        vec2 position = size * uv;

        // Hue spectrum
        vec3 finalColor = hsv2rgb(vec3(uv.x, uHsv[1], uHsv[2]));

        // Marker
        vec2 markerPos = translate(position, vec2(size.x * uHsv[0], size.y * 0.5));
        vec4 slider = paintColorSlider(markerPos, uRgb);
        finalColor = mix(finalColor, slider.rgb, slider.a);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
  }
  _setIncrease() {
    this.hsv[0] = Math.min(1, this.hsv[0] + 0.01);
    this.setValueFromHsv();
  }
  _setDecrease() {
    this.hsv[0] = Math.max(0, this.hsv[0] - 0.01);
    this.setValueFromHsv();
  }
  _setValue(x) {
    this.hsv[0] = x;
    this.setValueFromHsv();
  }
}

IoColorSliderHue.Register();

class IoColorSliderSaturation extends IoColorSlider {
  static get Frag() {
    return /* glsl */`
      varying vec2 vUv;

      void main(void) {
        vec2 size = (uHorizontal == 1) ? uSize : uSize.yx;
        vec2 uv = uHorizontal == 1 ? vUv.xy : vUv.yx;
        vec2 position = size * uv;

        // Saturation gradient
        vec3 finalColor = hsv2rgb(vec3(uHsv[0], uv.x, uHsv[2]));
        float saturation = uHsv[1];
        if (uMode == 2.0) {
          saturation = uHsl[1];
          finalColor = hsl2rgb(vec3(uHsl[0], uv.x, uHsl[2]));
        }

        // Marker
        vec2 markerPos = translate(position, vec2(size.x * saturation, size.y * 0.5));
        vec4 slider = paintColorSlider(markerPos, uRgb);
        finalColor = mix(finalColor, slider.rgb, slider.a);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
  }
  _setIncrease() {
    this.hsv[1] = Math.min(1, this.hsv[1] + 0.01);
    this.setValueFromHsv();
  }
  _setDecrease() {
    this.hsv[1] = Math.max(0, this.hsv[1] - 0.01);
    this.setValueFromHsv();
  }
  _setValue(x) {
    this.hsv[1] = x;
    this.setValueFromHsv();
  }
}

IoColorSliderSaturation.Register();

class IoColorSliderValue extends IoColorSlider {
  static get Frag() {
    return /* glsl */`
      varying vec2 vUv;

      void main(void) {
        vec2 size = (uHorizontal == 1) ? uSize : uSize.yx;
        vec2 uv = uHorizontal == 1 ? vUv.xy : vUv.yx;
        vec2 position = size * uv;

        // Value gradient
        vec3 finalColor = hsv2rgb(vec3(uHsv[0], uHsv[1], uv.x));

        // Marker
        vec2 markerPos = translate(position, vec2(size.x * uHsv[2], size.y * 0.5));
        vec4 slider = paintColorSlider(markerPos, uRgb);
        finalColor = mix(finalColor, slider.rgb, slider.a);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
  }
  _setIncrease() {
    this.hsv[2] = Math.min(1, this.hsv[2] + 0.01);
    this.setValueFromHsv();
  }
  _setDecrease() {
    this.hsv[2] = Math.max(0, this.hsv[2] - 0.01);
    this.setValueFromHsv();
  }
  _setValue(x) {
    this.hsv[2] = x;
    this.setValueFromHsv();
  }
}

IoColorSliderValue.Register();

class IoColorSliderLevel extends IoColorSlider {
  static get Frag() {
    return /* glsl */`
      varying vec2 vUv;

      void main(void) {
        vec2 size = (uHorizontal == 1) ? uSize : uSize.yx;
        vec2 uv = uHorizontal == 1 ? vUv.xy : vUv.yx;
        vec2 position = size * uv;

        // Value gradient
        vec3 finalColor = hsl2rgb(vec3(uHsl[0], uHsl[1], uv.x));

        // Marker
        vec2 markerPos = translate(position, vec2(size.x * uHsl[2], size.y * 0.5));
        vec4 slider = paintColorSlider(markerPos, uRgb);
        finalColor = mix(finalColor, slider.rgb, slider.a);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
  }
  _setIncrease() {
    this.hsv[2] = Math.min(1, this.hsv[2] + 0.01);
    this.setValueFromHsl();
  }
  _setDecrease() {
    this.hsv[2] = Math.max(0, this.hsv[2] - 0.01);
    this.setValueFromHsl();
  }
  _setValue(x) {
    this.hsl[2] = x;
    this.setValueFromHsl();
  }
}

IoColorSliderLevel.Register();

class IoColorSliderHs extends IoColorSlider {
  static get Style() {
    return /* css */`
    :host {
      cursor: move !important;
    }
    `;
  }
  static get Properties() {
    return {
      noscroll: true,
    };
  }
  static get Frag() {
    return /* glsl */`
      varying vec2 vUv;

      void main(void) {
        vec2 size = (uHorizontal == 1) ? uSize : uSize.yx;
        vec2 uv = uHorizontal == 1 ? vUv.xy : vUv.yx;
        vec2 position = size * uv;

        // HS gradient
        vec3 finalColor = hsv2rgb(vec3(uv, uHsv[2]));
        if (uMode == 2.0) {
          finalColor = hsl2rgb(vec3(uv, uHsl[2]));
        }

        // Marker
        vec2 markerPos = translate(position, vec2(size.x * uHsv[0], size.y * uHsv[1]));
        vec4 slider = paintColorSlider2D(markerPos, uRgb);
        finalColor = mix(finalColor, slider.rgb, slider.a);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
  }
  _onKeydown(event) {
    if (event.shiftKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      if (this.horizontal) {
        this.hsv[0] = Math.max(0, this.hsv[0] - 0.01);
      } else {
        this.hsv[1] = Math.max(0, this.hsv[1] - 0.01);
      }
      this.setValueFromHsv();
    } else if (event.shiftKey && event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.horizontal) {
        this.hsv[1] = Math.min(1, this.hsv[1] + 0.01);
      } else {
        this.hsv[0] = Math.min(1, this.hsv[0] + 0.01);
      }
      this.setValueFromHsv();
    } else if (event.shiftKey && event.key === 'ArrowRight') {
      event.preventDefault();
      if (this.horizontal) {
        this.hsv[0] = Math.min(1, this.hsv[0] + 0.01);
      } else {
        this.hsv[1] = Math.min(1, this.hsv[1] + 0.01);
      }
      this.setValueFromHsv();
    } else if (event.shiftKey && event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.horizontal) {
        this.hsv[1] = Math.max(0, this.hsv[1] - 0.01);
      } else {
        this.hsv[0] = Math.max(0, this.hsv[0] - 0.01);
      }
      this.setValueFromHsv();
    } else {
      super._onKeydown(event);
    }
  }
  _setValue(x, y) {
    this.hsv[0] = x;
    this.hsv[1] = y;
    this.setValueFromHsv();
  }
}

IoColorSliderHs.Register();

class IoColorSliderSv extends IoColorSlider {
  static get Style() {
    return /* css */`
    :host {
      cursor: move !important;
    }
    `;
  }
  static get Properties() {
    return {
      noscroll: true,
    };
  }
  static get Frag() {
    return /* glsl */`
      varying vec2 vUv;

      void main(void) {
        vec2 size = (uHorizontal == 1) ? uSize : uSize.yx;
        vec2 uv = uHorizontal == 1 ? vUv.xy : vUv.yx;
        vec2 position = size * uv;

        // SV gradient
        vec3 finalColor = hsv2rgb(vec3(uHsv[0], uv));

        // Marker
        vec2 markerPos = translate(position, vec2(size.x * uHsv[1], size.y * uHsv[2]));
        vec4 slider = paintColorSlider2D(markerPos, uRgb);
        finalColor = mix(finalColor, slider.rgb, slider.a);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
  }
  _onKeydown(event) {
    if (event.shiftKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      if (this.horizontal) {
        this.hsv[1] = Math.max(0, this.hsv[1] - 0.01);
      } else {
        this.hsv[2] = Math.max(0, this.hsv[2] - 0.01);
      }
      this.setValueFromHsv();
    } else if (event.shiftKey && event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.horizontal) {
        this.hsv[2] = Math.min(1, this.hsv[2] + 0.01);
      } else {
        this.hsv[1] = Math.min(1, this.hsv[1] + 0.01);
      }
      this.setValueFromHsv();
    } else if (event.shiftKey && event.key === 'ArrowRight') {
      event.preventDefault();
      if (this.horizontal) {
        this.hsv[1] = Math.min(1, this.hsv[1] + 0.01);
      } else {
        this.hsv[2] = Math.min(1, this.hsv[2] + 0.01);
      }
      this.setValueFromHsv();
    } else if (event.shiftKey && event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.horizontal) {
        this.hsv[2] = Math.max(0, this.hsv[2] - 0.01);
      } else {
        this.hsv[1] = Math.max(0, this.hsv[1] - 0.01);
      }
      this.setValueFromHsv();
    } else {
      super._onKeydown(event);
    }
  }
  _setValue(x, y) {
    this.hsv[1] = x;
    this.hsv[2] = y;
    this.setValueFromHsv();
  }
}

IoColorSliderSv.Register();

class IoColorSliderSl extends IoColorSlider {
  static get Style() {
    return /* css */`
    :host {
      cursor: move !important;
    }
    `;
  }
  static get Properties() {
    return {
      noscroll: true,
    };
  }
  static get Frag() {
    return /* glsl */`
      varying vec2 vUv;

      void main(void) {
        vec2 size = (uHorizontal == 1) ? uSize : uSize.yx;
        vec2 uv = uHorizontal == 1 ? vUv.xy : vUv.yx;
        vec2 position = size * uv;

        // SV gradient
        vec3 finalColor = hsl2rgb(vec3(uHsl[0], uv));

        // Marker
        vec2 markerPos = translate(position, vec2(size.x * uHsl[1], size.y * uHsl[2]));
        vec4 slider = paintColorSlider2D(markerPos, uRgb);
        finalColor = mix(finalColor, slider.rgb, slider.a);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
  }
  _onKeydown(event) {
    if (event.shiftKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      if (this.horizontal) {
        this.hsl[1] = Math.max(0, this.hsl[1] - 0.01);
      } else {
        this.hsl[2] = Math.max(0, this.hsl[2] - 0.01);
      }
      this.setValueFromHsl();
    } else if (event.shiftKey && event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.horizontal) {
        this.hsl[2] = Math.min(1, this.hsl[2] + 0.01);
      } else {
        this.hsl[1] = Math.min(1, this.hsl[1] + 0.01);
      }
      this.setValueFromHsl();
    } else if (event.shiftKey && event.key === 'ArrowRight') {
      event.preventDefault();
      if (this.horizontal) {
        this.hsl[1] = Math.min(1, this.hsl[1] + 0.01);
      } else {
        this.hsl[2] = Math.min(1, this.hsl[2] + 0.01);
      }
      this.setValueFromHsl();
    } else if (event.shiftKey && event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.horizontal) {
        this.hsl[2] = Math.max(0, this.hsl[2] - 0.01);
      } else {
        this.hsl[1] = Math.max(0, this.hsl[1] - 0.01);
      }
      this.setValueFromHsl();
    } else {
      super._onKeydown(event);
    }
  }
  _setValue(x, y) {
    this.hsl[1] = x;
    this.hsl[2] = y;
    this.setValueFromHsl();
  }
}

IoColorSliderSl.Register();

class IoColorSliderCyan extends IoColorSlider {
  static get Frag() {
    return /* glsl */`
      varying vec2 vUv;

      void main(void) {
        vec2 size = (uHorizontal == 1) ? uSize : uSize.yx;
        vec2 uv = uHorizontal == 1 ? vUv.xy : vUv.yx;
        vec2 position = size * uv;

        // Value gradient
        vec3 finalColor = cmyk2rgb(vec4(uv.x, uCmyk[1], uCmyk[2], uCmyk[3]));

        // Marker
        vec2 markerPos = translate(position, vec2(size.x * uCmyk[0], size.y * 0.5));
        vec4 slider = paintColorSlider(markerPos, uRgb);
        finalColor = mix(finalColor, slider.rgb, slider.a);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
  }
  _setIncrease() {
    this.cmyk[0] = Math.min(1, this.cmyk[0] + 0.01);
    this.setValueFromCmyk();
  }
  _setDecrease() {
    this.cmyk[0] = Math.max(0, this.cmyk[0] - 0.01);
    this.setValueFromCmyk();
  }
  _setValue(x) {
    this.cmyk[0] = x;
    this.setValueFromCmyk();
  }
}

IoColorSliderCyan.Register();

class IoColorSliderMagenta extends IoColorSlider {
  static get Frag() {
    return /* glsl */`
      varying vec2 vUv;

      void main(void) {
        vec2 size = (uHorizontal == 1) ? uSize : uSize.yx;
        vec2 uv = uHorizontal == 1 ? vUv.xy : vUv.yx;
        vec2 position = size * uv;

        // Value gradient
        vec3 finalColor = cmyk2rgb(vec4(uCmyk[0], uv.x, uCmyk[2], uCmyk[3]));

        // Marker
        vec2 markerPos = translate(position, vec2(size.x * uCmyk[1], size.y * 0.5));
        vec4 slider = paintColorSlider(markerPos, uRgb);
        finalColor = mix(finalColor, slider.rgb, slider.a);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
  }
  _setIncrease() {
    this.cmyk[1] = Math.min(1, this.cmyk[1] + 0.01);
    this.setValueFromCmyk();
  }
  _setDecrease() {
    this.cmyk[1] = Math.max(0, this.cmyk[1] - 0.01);
    this.setValueFromCmyk();
  }
  _setValue(x) {
    this.cmyk[1] = x;
    this.setValueFromCmyk();
  }
}

IoColorSliderMagenta.Register();

class IoColorSliderYellow extends IoColorSlider {
  static get Frag() {
    return /* glsl */`
      varying vec2 vUv;

      void main(void) {
        vec2 size = (uHorizontal == 1) ? uSize : uSize.yx;
        vec2 uv = uHorizontal == 1 ? vUv.xy : vUv.yx;
        vec2 position = size * uv;

        // Value gradient
        vec3 finalColor = cmyk2rgb(vec4(uCmyk[0], uCmyk[1], uv.x, uCmyk[3]));

        // Marker
        vec2 markerPos = translate(position, vec2(size.x * uCmyk[2], size.y * 0.5));
        vec4 slider = paintColorSlider(markerPos, uRgb);
        finalColor = mix(finalColor, slider.rgb, slider.a);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
  }
  _setIncrease() {
    this.cmyk[2] = Math.min(1, this.cmyk[2] + 0.01);
    this.setValueFromCmyk();
  }
  _setDecrease() {
    this.cmyk[2] = Math.max(0, this.cmyk[2] - 0.01);
    this.setValueFromCmyk();
  }
  _setValue(x) {
    this.cmyk[2] = x;
    this.setValueFromCmyk();
  }
}

IoColorSliderYellow.Register();

class IoColorSliderKey extends IoColorSlider {
  static get Frag() {
    return /* glsl */`
      varying vec2 vUv;

      void main(void) {
        vec2 size = (uHorizontal == 1) ? uSize : uSize.yx;
        vec2 uv = uHorizontal == 1 ? vUv.xy : vUv.yx;
        vec2 position = size * uv;

        // Value gradient
        vec3 finalColor = cmyk2rgb(vec4(uCmyk[0], uCmyk[1], uCmyk[2], uv.x));

        // Marker
        vec2 markerPos = translate(position, vec2(size.x * uCmyk[3], size.y * 0.5));
        vec4 slider = paintColorSlider(markerPos, uRgb);
        finalColor = mix(finalColor, slider.rgb, slider.a);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
  }
  _setIncrease() {
    this.cmyk[3] = Math.min(1, this.cmyk[3] + 0.01);
    this.setValueFromCmyk();
  }
  _setDecrease() {
    this.cmyk[3] = Math.max(0, this.cmyk[3] - 0.01);
    this.setValueFromCmyk();
  }
  _setValue(x) {
    this.cmyk[3] = x;
    this.setValueFromCmyk();
  }
}

IoColorSliderKey.Register();

class IoColorSliderAlpha extends IoColorSlider {
  static get Frag() {
    return /* glsl */`
      varying vec2 vUv;

      void main(void) {
        vec2 size = (uHorizontal == 1) ? uSize : uSize.yx;
        vec2 uv = uHorizontal == 1 ? vUv.xy : vUv.yx;
        vec2 position = size * uv;

        // Alpha pattern
        vec3 alphaPattern = mix(vec3(0.5), vec3(1.0), checker(position, 6.));
        vec3 finalColor = alphaPattern;

        // Apha gradient
        finalColor = mix(finalColor, vec3(1.0), uv.x);

        // Marker
        vec2 markerPos = translate(position, vec2(size.x * uAlpha, size.y * 0.5));
        vec4 slider = paintColorSlider(markerPos, vec3(1.0));
        finalColor = mix(finalColor, slider.rgb, slider.a);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;
  }
  setAria() {
    super.setAria();
    // TODO
    const i = this.mode === 3 ? 4 : 3;
    const components = Object.keys(this.value);
    const hasAlpha = this.value[components[i]] !== undefined;
    this.setAttribute('aria-invalid', !hasAlpha ? 'true' : false);
  }
  _setIncrease() {
    const i = this.mode === 3 ? 4 : 3;
    const components = Object.keys(this.value);
    this.value[components[i]] = Math.min(1, this.value[components[i]] + 0.01);
  }
  _setDecrease() {
    const i = this.mode === 3 ? 4 : 3;
    const components = Object.keys(this.value);
    this.value[components[i]] = Math.max(0, this.value[components[i]] - 0.01);
  }
  _setMin() {
    const i = this.mode === 3 ? 4 : 3;
    const components = Object.keys(this.value);
    this.value[components[i]] = 0;
  }
  _setMax() {
    const i = this.mode === 3 ? 4 : 3;
    const components = Object.keys(this.value);
    this.value[components[i]] = 1;
  }
  _setValue(x) {
    const i = this.mode === 3 ? 4 : 3;
    const components = Object.keys(this.value);
    const hasAlpha = this.value[components[i]] !== undefined;
    if (hasAlpha) this.value[components[i]] = x;
  }
}

IoColorSliderAlpha.Register();

class IoColorPanel extends IoColorMixin(IoElement) {
  static get Style() {
    return /* css */`
    :host {
      @apply --io-panel;
      display: flex;
      cursor: move;
      align-items: stretch;
      min-width: var(--io-line-height);
      min-height: var(--io-line-height);
      flex-direction: column;
    }
    :host:not([expanded]) {
      display: none;
    }
    :host[horizontal] {
      flex-direction: row;
    }
    :host > * {
      border-radius: calc(var(--io-border-radius) - var(--io-border-width));
    }
    :host > io-color-slider-sl,
    :host > io-color-slider-sv {
      flex: 1 1;
    }
    :host > *:not(:last-child) {
      margin: 0 0 var(--io-spacing) 0;
    }
    :host[horizontal] > *:not(:last-child) {
      margin: 0 var(--io-spacing) 0 0;
    }
    `;
  }
  static get Properties() {
    return {
      expanded: {
        type: Boolean,
        reflect: 1,
      },
      horizontal: {
        value: true,
        reflect: 1,
      },
    };
  }
  static get Listeners() {
    return {
      'keydown': '_onKeydown',
    };
  }
  _onKeydown(event) {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.expanded = false;
    }
  }
  changed() {
    this.template([
      this.mode === 2 ?
        ['io-color-slider-sl', {value: this.value, mode: this.mode}] :
        ['io-color-slider-sv', {value: this.value, mode: this.mode}],
      ['io-color-slider-hue', {value: this.value, mode: this.mode, horizontal: !this.horizontal}],
      this.alpha !== undefined ? ['io-color-slider-alpha', {value: this.value, horizontal: !this.horizontal}] : null,
    ]);
  }
}

IoColorPanel.Register();

const IoColorPanelSingleton = new IoColorPanel();
IoLayerSingleton.appendChild(IoColorPanelSingleton);

class IoColorSwatch extends IoColorMixin(IoGl) {
  static get Style() {
    return /* css */`
    :host {
      box-sizing: border-box;
      align-self: flex-start;
      border-radius: var(--io-border-radius);
      border: var(--io-border);
      border-color: var(--io-color-border-inset);
      min-width: var(--io-item-height);
      min-height: var(--io-item-height);
    }
    :host[aria-invalid] {
      border: var(--io-border-error);
    }
    :host:focus {
      border-color: var(--io-color-focus);
      outline-color: var(--io-color-focus);
    }
    `;
  }
  static get Frag() {
    return /* glsl */`
      varying vec2 vUv;
      void main(void) {
        vec2 position = vUv * uSize;

        // Alpha pattern
        vec3 alphaPattern = mix(vec3(0.5), vec3(1.0), checker(position, 6.));

        float alpha = uAlpha;
        float lineWidth = cssStrokeWidth * 2.0;
        vec2 pxUv = vUv * uSize;
        if (pxUv.x < lineWidth) alpha = 1.0;
        if (pxUv.y < lineWidth) alpha = 1.0;
        if (pxUv.x > uSize.x - lineWidth) alpha = 1.0;
        if (pxUv.y > uSize.y - lineWidth) alpha = 1.0;

        gl_FragColor = saturate(vec4(mix(alphaPattern, uRgb.rgb, alpha), 1.0));
      }
    `;
  }
}

IoColorSwatch.Register();

class IoColorPicker extends IoColorMixin(IoItem) {
  static get Style() {
    return /* css */`
    :host {
      display: flex;
      box-sizing: border-box;
      border-radius: var(--io-border-radius);
      border: var(--io-border);
      border-color: var(--io-color-border-inset);
      min-width: var(--io-item-height);
      min-height: var(--io-item-height);
      padding: 0;
    }
    :host > io-color-swatch {
      border: 0;
      flex: 1 1 auto;
      align-self: stretch;
      min-width: 0;
      min-height: 0;
      border-radius: 0;
    }
    `;
  }
  static get Properties() {
    return {
      value: [0.5, 0.5, 0.5, 0.5],
      horizontal: false,
      role: 'slider',
      tabindex: 0,
    };
  }
  static get Listeners() {
    return {
      'click': '_onClick',
      'keydown': '_onKeydown',
    };
  }
  _onClick() {
    event.preventDefault();
    this.focus();
    this.toggle();
  }
  get expanded() {
    return IoColorPanelSingleton.expanded && IoColorPanelSingleton.value === this.value;
  }
  _onKeydown(event) {
    const rect = this.getBoundingClientRect();
    const pRect = IoColorPanelSingleton.getBoundingClientRect();
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggle();
      if (this.expanded) IoColorPanelSingleton.firstChild.focus();
    } else if (this.expanded && pRect.top >= rect.bottom && event.key === 'ArrowDown') {
      event.preventDefault();
      IoColorPanelSingleton.firstChild.focus();
    } else if (this.expanded && pRect.bottom <= rect.top && event.key === 'ArrowUp') {
      event.preventDefault();
      IoColorPanelSingleton.firstChild.focus();
    } else {
      this.collapse();
      super._onKeydown(event);
    }
  }
  _onValueSet() {
    this.dispatchEvent('value-set', {property: 'value', value: this.value}, true);    
  }
  toggle() {
    if (this.expanded) {
      this.collapse();
    } else {
      this.expand();
    }
  }
  expand() {
    const hasAlpha = this.alpha !== undefined;
    IoColorPanelSingleton.value = this.value;
    IoColorPanelSingleton.mode = this.mode;
    IoColorPanelSingleton.style.width = hasAlpha ? '192px' : '160px';
    IoColorPanelSingleton.style.height = '128px';
    IoColorPanelSingleton.expanded = true;
    IoLayerSingleton.setElementPosition(IoColorPanelSingleton, 'bottom', this.getBoundingClientRect());
    // hook up 'value-set' event dispatch
    IoColorPanelSingleton.removeEventListener('value-set', IoColorPanelSingleton._targetValueSetHandler);
    IoColorPanelSingleton.addEventListener('value-set', this._onValueSet);
    IoColorPanelSingleton._targetValueSetHandler = this._onValueSet;
  }
  collapse() {
    IoColorPanelSingleton.expanded = false;
  }
  changed() {
    this.template([['io-color-swatch', {value: this.value, mode: this.mode}]]);
  }
}

IoColorPicker.Register();

class IoColorVector extends IoColorMixin(IoElement) {
  static get Style() {
    return /* css */`
    :host {
      display: flex;
      flex-direction: row;
      align-self: stretch;
      justify-self: stretch;
    }
    :host > io-number {
      width: inherit;
      flex: 1 1;
    }
    :host > *:not(:last-child) {
      margin-right: var(--io-spacing);
    }
    :host > io-color-picker {
      width: calc(var(--io-line-height) + calc(2 * var(--io-spacing)));
    }
    `;
  }
  static get Properties() {
    return {
      value: [0, 0, 0, 0],
      conversion: 1,
      step: 0.01,
      min: 0,
      max: 1,
    };
  }
  _onValueSet(event) {
    const item = event.composedPath()[0];
    const c = item.id;
    const value = event.detail.value;
    const oldValue = event.detail.oldValue;
    this.value[c] = value;
    // TODO: test
    const detail = {object: this.value, property: this.linked ? null : c, value: value, oldValue: oldValue};
    this.dispatchEvent('object-mutated', detail, false, window);
    // this.dispatchEvent('value-set', {property: 'value', value: this.value}, false);
  }
  changed() {
    const elements = [];
    const components = Object.keys(this.value);
    for (let i in components) {
      const c = components[i];
      if (this.value[c] !== undefined) {
        elements.push(['io-number', {
          id: c,
          value: this.value[c],
          conversion: this.conversion,
          step: this.step,
          min: this.min,
          max: this.max,
          ladder: true,
          'on-value-set': this._onValueSet
        }]);
      }
    }
    elements.push(this.getSlotted());
    this.template(elements);
  }
  getSlotted() {
    return ['io-color-picker', {id: 'swatch', mode: this.mode, value: this.value}]; // , 'on-value-set': this._onValueSet
  }
}

IoColorVector.Register();

class IoLayout extends IoElement {
  static get Style() {
    return /* css */`
    :host {
      flex: 1;
      display: flex;
      overflow: hidden;
      touch-action: none;
    }
    :host[orientation=horizontal] {
      flex-direction: row;
    }
    :host[orientation=vertical] {
      flex-direction: column;
    }
    `;
  }
  static get Properties() {
    return {
      elements: Array,
      splits: {
        type: Array,
        observe: true,
      },
      editable: true,
      orientation: {
        value: 'horizontal',
        reflect: 1,
      },
    };
  }
  static get Listeners() {
    return {
      'io-layout-divider-move': '_onDividerMove',
      'io-layout-tab-insert': '_onLayoutTabInsert',
    };
  }
  _onSelectedChanged() {
    const $blocks = [].slice.call(this.children).filter(element => element.localName !== 'io-layout-divider');
    for (let i = 0; i < $blocks.length; i++) {
      if ($blocks[i].selected) {
        this.splits[i].selected = $blocks[i].selected;
      }
    }
  }
  changed() {
    // let dim = this.orientation === 'horizontal' ? 'width' : 'height';
    // let SPLIT_SIZE = 5;
    // let rectSize = this.getBoundingClientRect()[dim];
    // let maxFlex = rectSize - (this.splits.length - 1) * SPLIT_SIZE;
    let children = [];
    for (let i = 0; i < this.splits.length; i++) {
      const split = this.splits[i];
      const flexBasis = split.size !== undefined ? split.size + 'px' : null;
      const style = {
        'flex-basis': flexBasis ? flexBasis : 'auto',
        'flex-grow': flexBasis ? 0 : 1,
        'flex-shrink': flexBasis ? 0 : 1,
      };
      if (split.tabs) {
        children.push(['io-selector-tabs', {
          elements: this.elements,
          filter: split.tabs, // TODO: reimplement
          selected: split.selected,
          editable: this.editable,
          style: style,
          'on-selected-changed': this._onSelectedChanged
        }]);
        // children.push(['div', {style: style}, ' ' + split.size]);
      } else if (split.splits) {
        children.push(['io-layout', {
          elements: this.elements,
          splits: split.splits,
          orientation: split.orientation,
          editable: this.editable,
          style: style,
        }]);
      } else {
        // TODO: Improve data validation.
        children.push(['p', 'Malformed layout data.']);
      }
      if (i < this.splits.length - 1) {
        children.push(['io-layout-divider', {
          orientation: this.orientation || 'horizontal',
          index: i
        }]);
      }
    }
    this.template([children]);
  }
  // splitsChanged(event) {
  //   // for (let i = this.splits.length; i--;) {
  //   //   if (this.splits[i][1].tabs == event.detail.tabs) {
  //   //     this.splits[i][1].selected = event.detail.selected;
  //   //     // if (event.detail.tabs.length === 0) {
  //   //     //   this.splits.splice(i, 1);
  //   //     //   console.log(event.detail.tabs);
  //   //     // }
  //   //   }
  //   // }
  // }
  // addSplit(elementID, srcBlock, target) {
  //   let hor = this.orientation === 'horizontal';
  //   let ver = this.orientation === 'vertical';
  //
  //   const $blocks = [].slice.call(this.children).filter(element => element.localName !== 'io-layout-divider');
  //   let spliceIndex = $blocks.indexOf(srcBlock);
  //   let divideIndex = -1;
  //
  //   if ((hor && target == 'right') || (ver && target == 'bottom')) spliceIndex += 1;
  //   else if ((hor && target == 'top') || (ver && target == 'left')) divideIndex = 0;
  //   else if ((hor && target == 'bottom') || (ver && target == 'right')) divideIndex = 1;
  //
  //   let newBlock = ['io-layout', {'tabs': [elementID], 'selected': 0}];
  //   if (divideIndex !== -1) {
  //     let split = this.splits[spliceIndex];
  //     this.splits.splice(spliceIndex, 1, ['io-layout', {'orientation': hor ? 'vertical' : 'horizontal', 'splits': [
  //       divideIndex ? split : newBlock,
  //       divideIndex ? newBlock : split
  //     ]}]);
  //   } else {
  //     this.splits.splice(spliceIndex, 0, newBlock);
  //   }
  //   this.changed();
  // }
  _onLayoutTabInsert(event) {
    event.stopImmediatePropagation();
    const $blocks = [].slice.call(this.children).filter(element => element.localName !== 'io-layout-divider');
    const srcTabs = event.detail.source;
    const destTabs = event.detail.destination;
    const destIndex = $blocks.indexOf(destTabs);
    const tab = event.detail.tab;
    const v = this.orientation === 'vertical';
    const dir = event.detail.direction;

    for (let i = srcTabs.filter.length; i--;) {
      if (srcTabs.filter[i] === tab) {
        srcTabs.filter.splice(i, 1);
        srcTabs.selected = srcTabs.filter[srcTabs.filter.length - 1];
        srcTabs.changed();
      }
    }

    if ((v && dir === 'down') || (!v && dir === 'right')) {
      this.splits.splice(destIndex + 1, 0, {tabs: [tab], selected: tab});
    } else if ((v && dir === 'up') || (!v && dir === 'left')) {
      this.splits.splice(destIndex, 0, {tabs: [tab], selected: tab});
    } else if ((v && dir === 'left') || (!v && dir === 'up')) {
      this.splits[destIndex] = {splits: [
        {tabs: [tab], selected: tab},
        this.splits[destIndex],
      ], orientation: v ? 'horizontal' : 'vertical'};
    } else if ((v && dir === 'right') || (!v && dir === 'down')) {
      this.splits[destIndex] = {splits: [
        this.splits[destIndex],
        {tabs: [tab], selected: tab},
      ], orientation: v ? 'horizontal' : 'vertical'};
    }
    this.changed();
  }
  _onDividerMove(event) {
    event.stopImmediatePropagation();
    let pi = event.detail.index;
    let ni = event.detail.index + 1;

    let prev = this.splits[pi];
    let next = this.splits[ni];

    // TODO: better clipping and snapping
    let dp = prev.size === undefined ? undefined : (prev.size + event.detail.movement);
    let dn = next.size === undefined ? undefined : (next.size - event.detail.movement);

    // console.log(dp, dn);
    if ((dp !== undefined && dp >= 0) && (dn === undefined || dn >= 0)) {
      this.splits[pi].size = Math.max(0, dp);
    }
    if ((dn !== undefined && dn >= 0) && (dp === undefined || dp >= 0)) {
      this.splits[ni].size = Math.max(0, dn);
    }

    // TODO improve UX to work as expected in all edge cases.

    if (prev.size === undefined && next.size === undefined) {
      const $blocks = [].slice.call(this.children).filter(element => element.localName !== 'io-layout-divider');
      let dim = this.orientation === 'horizontal' ? 'width' : 'height';
      let ci = Math.floor(this.splits.length / 2);
      if (Math.abs(ci - pi) <= Math.abs(ci - ni)) {
        for (let j = ni; j < this.splits.length; j++) {
          this.splits[j].size = parseInt($blocks[j].getBoundingClientRect()[dim]);
        }
      } else {
        for (let j = pi; j >= 0; j--) {
          this.splits[j].size = parseInt($blocks[j].getBoundingClientRect()[dim]);
        }
      }
    }
    this.queue('splits', this.splits, this.splits);
    this.queueDispatch();
  }
}

IoLayout.Register();

class IoLayoutDivider extends IoElement {
  static get Style() {
    return /* css */`
    :host {
      background: var(--io-background-color);
      color: var(--io-color);
      z-index: 1;
      display: flex;
      flex: none;
      border: var(--io-border);
      border-color: var(--io-color-border-outset);
      user-select: none;
      transition: background-color 0.4s;
    }
    :host:hover {
      background-color: var(--io-color-focus);
    }
    :host[orientation=horizontal] {
      cursor: col-resize;
      width: var(--io-spacing);
      border-top: 0;
      border-bottom: 0;
    }
    :host[orientation=vertical] {
      cursor: row-resize;
      height: var(--io-spacing);
      border-left: 0;
      border-right: 0;
    }
    :host > .app-divider {
      flex: 1;
      display: flex;
      margin-left: -0.03em;
      margin-top: -0.06em;
      align-items: center;
      justify-content: center;
    }
    `;
  }
  static get Properties() {
    return {
      orientation: {
        value: 'horizontal',
        reflect: 1
      },
      index: Number,
      pointermode: 'relative'
    };
  }
  static get Listeners() {
    return {
      'pointermove': '_onPointermove'
    };
  }
  _onPointermove(event) {
    if (event.buttons) {
      event.preventDefault();
      this.setPointerCapture(event.pointerId);
      this.dispatchEvent('io-layout-divider-move', {
        movement: this.orientation === 'horizontal' ? event.movementX : event.movementY,
        index: this.index
      }, true);
    }
  }
  changed() {
    this.template([
      ['div', {class: 'app-divider'}, this.orientation === 'horizontal' ? '⋮' : '⋯']
    ]);
  }
}

IoLayoutDivider.Register();

class IoCollapsable extends IoElement {
  static get Style() {
    return /* css */`
    :host {
      display: flex;
      flex-direction: column;
      align-self: stretch;
      justify-self: stretch;
    }
    :host > io-boolean {
      text-align: left;
      align-self: stretch;
      width: auto;
      border-radius: 0;
      background-color: var(--io-background-color-dark);
    }
    :host > io-boolean:before {
      display: inline-block;
      width: 1.125em;
      content: "▸"
    }
    :host > io-boolean[value]:before {
      content: "▾";
    }
    :host > :nth-child(n+2) {
      margin-top: var(--io-spacing);
    }
    `;
  }
  static get Properties() {
    return {
      elements: Array,
      label: {
        reflect: 1,
      },
      expanded: {
        type: Boolean,
        reflect: 1,
      },
      role: 'region',
    };
  }
  changed() {
    this.template([
      ['io-boolean', {true: this.label, false: this.label, value: this.bind('expanded')}],
      ['io-content', {elements: this.elements, expanded: this.expanded}],
    ]);
  }
}

IoCollapsable.Register();

// TODO: use IoContent for caching and display.

class IoSelector extends IoElement {
  static get Style() {
    return /* css */`
    :host {
      display: flex;
      flex: 1 1;
      flex-direction: column;
      align-self: stretch;
      justify-self: stretch;
      overflow-x: hidden;
      overflow-y: auto;
      color: var(--io-color);
      background-color: var(--io-background-color);
    }
    @keyframes io-selector-spinner {
      to {
        transform: rotate(360deg);
      }
    }
    :host .io-loading {
      background-image: repeating-linear-gradient(135deg, var(--io-background-color-highlight), var(--io-background-color) 3px, var(--io-background-color) 7px, var(--io-background-color-highlight) 10px) !important;
      background-repeat: repeat;
      position: relative;
    }
    :host .io-loading:after {
      content: '';
      box-sizing: border-box;
      position: absolute;
      top: 50%;
      left: 50%;
      width: 40px;
      height: 40px;
      margin-top: -20px;
      margin-left: -20px;
      border-radius: 50%;
      border: var(--io-border);
      border-top-color: #000;
      animation: io-selector-spinner .6s linear infinite;
    }
    `;
  }
  static get Properties() {
    return {
      elements: {
        type: Array,
        observe: true,
      },
      selected: {
        type: String,
        reflect: 1,
      },
      cache: Boolean,
      _caches: Object,
      _selectedID: String,
      _scrollID: {
        type: String,
        notify: true,
      }
    };
  }
  static get Listeners() {
    return {
      'scroll': ['_onScroll', {capture: true, passive: true}],
      'content-ready': '_onIoContentReady',
    };
  }
  _onIoContentReady(event) {
    event.stopImmediatePropagation();
    this.scrollTo(this._scrollID, false);
  }
  connectedCallback() {
    super.connectedCallback();
    this.scrollTo(this._scrollID, false);
  }
  scrollTo(id, smooth) {
    if (!id) return;
    setTimeout(()=>{
      const elem = this.$.content.querySelector('#' + id.toLowerCase());
      if (elem) elem.scrollIntoView({behavior: smooth ? 'smooth' : 'auto'});
    }, 100); // TODO: unhack!
  }
  _onScroll() {
    if (this._scrollID === undefined) return;
    clearTimeout(this.__scrollThrottle);
    this.__scrollThrottle = setTimeout(() => {
      delete this.__scrollThrottle;
      const scrollableElements = [...this.$.content.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]')];
      const top = this.$.content.scrollTop || this.$.content.children[0].scrollTop;
      const bottom = top + this.$.content.getBoundingClientRect().height / 2;
      const oldScrollID = this._scrollID;
      let scrollID;
      for (let i = scrollableElements.length; i--;) {
        const elem = scrollableElements[i];
        const nextElem = scrollableElements[i + 1];
        const elemTop = elem.offsetTop;
        const elemBottom = nextElem ? nextElem.offsetTop : elemTop;
        if ((elemTop < top - 5) && (elemBottom < bottom) && i !== scrollableElements.length - 1) {
          break;
        }
        scrollID = elem.id;
      }
      if (scrollID !== undefined && scrollID !== oldScrollID) {
        this._scrollID = scrollID;
        const oldSelected = this.selected;
        const selected = this._selectedID + '#' + this._scrollID;
        this.__properties.selected.value = selected;
        this.dispatchEvent('selected-changed', {value: selected, oldValue: oldSelected});
      }
    }, 100);
  }
  selectedChanged() {
    this.updateScroll();
  }
  elementsChanged() {
    this.updateScroll();
  }
  updateScroll() {
    const oldScrollID = this._scrollID;
    const oldSelectedID = this._selectedID;
    this._selectedID = this.selected.split('#')[0];
    this._scrollID = this.selected.split('#')[1];
    if (this._selectedID !== oldSelectedID) {
      this.update();
      this.scrollTo(this._scrollID);
    } else if (this._scrollID !== oldScrollID) {
      this.scrollTo(this._scrollID, true);
    }
  }
  getSlotted() {
    return null;
  }
  update() {
    const selected = this._selectedID;

    let element = this.elements.find(element => {return element[1].name === selected;});
    if (!element) {
      console.warn(`Could not find element with id:${selected}!`);
      element = ['span', `Could not find element with id:${selected}!`];
    }
    if (typeof element[1] !== 'object') element.splice(1, 0, {});

    const explicitlyCache = element[1].cache === true;
    const explicitlyDontCache = element[1].cache === false;

    this.template([
      this.getSlotted(),
      ['div', {id: 'content', class: 'io-content'}],
    ]);

    if (this.$.content) {
      this.$.content.textContent = '';
    }

    this.$.content.classList.toggle('io-loading', true);
    if (!explicitlyDontCache && (this.cache || explicitlyCache) && this._caches[selected]) {
      // NOTE: Cached elements shound't be removed with `template()` to avoid `dispose()`
      this.$.content.appendChild(this._caches[selected]);
      this.$.content.classList.toggle('io-loading', false);
      // TODO: IMPORTANT update all bindings inside when reconnected (page change)!
    } else {
      this.import(element[1].import).then(() => {
        if (element[1].name === this.selected.split('#')[0]) {
          this.$.content.classList.toggle('io-loading', false);
          this.template([element], this.$.content);
          this._caches[selected] = this.$.content.childNodes[0];
        }
      });
    }
  }
}

IoSelector.Register();

class IoSidebar extends IoElement {
  static get Style() {
    return /* css */`
    :host {
      display: flex;
      flex-wrap: nowrap;
      overflow-x: hidden;
      overflow-y: auto;
      padding: var(--io-spacing);
      flex-direction: column;
      -webkit-overflow-scrolling: touch;
    }
    :host > * {
      align-self: stretch !important;
      flex: 0 0 auto;
    }
    :host * {
      overflow: visible !important;
    }
    :host io-collapsable {
      padding: 0;
    }
    :host io-collapsable > io-content {
      padding: 0 0 0 0.75em;
    }
    :host io-button {
      text-align: left;
      align-self: stretch;
    }
    :host io-button,
    :host io-collapsable,
    :host io-content {
      background: none;
      box-shadow: none;
      border-color: transparent;
    }
    :host io-boolean:not(:focus) {
      border-bottom-color: transparent  !important;
    }
    `;
  }
  static get Properties() {
    return {
      selected: String,
      options: {
        type: Array,
        observe: true,
      },
      collapsed: {
        type: Boolean,
        reflect: 1,
      },
      role: 'navigation',
    };
  }
  _onSelect(id) {
    this.set('selected', id);
  }
  _addOptions(options) {
    const elements = [];
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      if (option.options) {
        const containsSelected = !!this.filterObject(option.options, o => matches(this.selected, o));
        const collapsableState = IoStorageFactory({value: false, storage: 'local', key: genUUID$1(options, i)});
        elements.push(['io-collapsable', {
          label: option.label,
          expanded: containsSelected || collapsableState,
          elements: [...this._addOptions(option.options)]
        }]);
      } else {
        const selected = matches(this.selected, option);
        elements.push(['io-button', {
          value: option.value || option,
          label: option.label || option.value || option,
          action: this._onSelect,
          selected: selected,
        }]);
      }
    }
    return elements;
  }
  changed() {
    if (this.collapsed) {
      const selected = this.filterObject(this.options, o => matches(this.selected, o));
      this.template([['io-option-menu', {
        options: this.options,
        value: this.bind('selected'),
        label: selected.label,
        icon: '☰',
        selectable: true,
        title: 'select tab',
        class: 'io-item',
      }]]);
    } else {
      this.template([...this._addOptions(this.options)]);
    }
  }
}

IoSidebar.Register();

function genUUID$1(options, i) {
  const option = options[i];
  let UUID = 'io-sidebar-collapse-state-' + i + '-' + options.length;
  if (option.label) UUID += '-' + option.label;
  if (option.options.length) UUID += '(' + option.options.length + ')';
  return UUID;
}

function matches(selected, option) {
  if (selected === undefined) return false;
  if (typeof option === 'object') option = option.value;
  return String(selected).toLowerCase() === String(option).toLowerCase();
}

class IoSelectorSidebar extends IoSelector {
  static get Style() {
    return /* css */`
    :host {
      flex-direction: row;
    }
    :host[right] {
      flex-direction: row-reverse;
    }
    :host[collapsed] {
      flex-direction: column;
    }
    :host > io-sidebar {
      flex: 0 0 8em;
      background-color: var(--io-background-color-dark);
      border: var(--io-border);
      border-width: 0 var(--io-border-width) 0 0;
    }
    :host[right] > io-sidebar {
      border-width: 0 0 0 var(--io-border-width);
    }
    :host[collapsed] > io-sidebar {
      flex: 0 0 auto;
      border-width: 0 0 var(--io-border-width) 0;
    }
    `;
  }
  static get Properties() {
    return {
      options: {
        type: Array,
        observe: true,
      },
      collapseWidth: 410,
      collapsed: {
        type: Boolean,
        reflect: 1,
      },
      right: {
        type: Boolean,
        reflect: 1,
      },
    };
  }
  onResized() {
    this.collapsed = this.getBoundingClientRect().width < this.collapseWidth;
  }
  collapsedChanged() { this.update(); }
  getSlotted() {
    return ['io-sidebar', {
      selected: this.bind('selected'),
      options: this.options,
      collapsed: this.collapsed,
    }];
  }
}

IoSelectorSidebar.Register();

class IoSelectorTabs extends IoSelector {
  static get Style() {
    return /* css */`
    :host > io-menu-options {
      flex: 0 0 auto;
      border: none;
      border-radius: 0;
      background-color: var(--io-background-color-dark);
      border: var(--io-border);
      border-width: 0 0 var(--io-border-width) 0;
    }
    `;
  }
  static get Properties() {
    return {
      options: {
        type: Array,
        observe: true,
      },
      slotted: {
        type: Array,
        observe: true,
      },
    };
  }
  getSlotted() {
    return ['io-menu-options', {
      role: 'navigation',
      horizontal: true,
      value: this.bind('selected'),
      options: this.options,
      slotted: this.slotted,
      selectable: true,
    }];
  }
}

IoSelectorTabs.Register();

class IoNotify extends IoElement {
  static get Style() {
    return /* css */`
    :host {
      display: flex;
      position: fixed;
      box-sizing: border-box;
      background-color: var(--io-background-color-dark);
      border: var(--io-border);
      border-color: var(--io-color-error);
      width: 100%;
      opacity: 1;
      font-weight: bold;
      align-items: center;
      justify-content: center;
      padding: 0 var(--io-spacing);
    }
    :host > span {
      cursor: default;
      box-sizing: border-box;
      line-height: var(--io-item-height);
      font-size: var(--io-font-size);
      color: var(--io-color);
      padding: 0 var(--io-spacing);
    }
    :host > :nth-child(n+2) {
      flex-shrink: 0;
      align-self: center;
      white-space: nowrap;
    }
    @keyframes io-notification-fade {
      to {
        opacity: 0;
      }
    }
    :host:not([expanded]) {
      animation: io-notification-fade .6s linear forwards;
      pointer-events: none;
    }
    `;
  }
  static get Properties() {
    return {
      expanded: {
        value: true,
        reflect: 1,
      }
    };
  }
  static get Listeners() {
    return {
    };
  }
  constructor(props) {
    super(props);
    this.template([
      ['span', 'This app uses cookies for user interface customization.'],
      ['span', 'Agree'],
      ['io-boolicon', {'on-value-set': this._onAgree}],
      ['span', 'Disagree'],
      ['io-boolicon', {'on-value-set': this._onDisgree}],
    ]);
  }
  _onAgree() {
    if (event.detail.value) IoStorageFactory.permitted = true;
    else IoStorageFactory.permitted = false;
    this.expanded = false;
  }
  _onDisgree() {
    IoStorageFactory.permitted = false;
    this.expanded = false;
  }
}

IoNotify.Register();

if (IoStorageFactory.permitted === null) document.body.appendChild(new IoNotify());

export { IoBoolean, IoBoolicon, IoButton, IoCollapsable, IoColorPanel, IoColorPicker, IoColorSlider, IoColorSliderAlpha, IoColorSliderBlue, IoColorSliderCyan, IoColorSliderGreen, IoColorSliderHs, IoColorSliderHue, IoColorSliderKey, IoColorSliderLevel, IoColorSliderMagenta, IoColorSliderRed, IoColorSliderSaturation, IoColorSliderSl, IoColorSliderSv, IoColorSliderValue, IoColorSliderYellow, IoColorVector, IoContent, IoContextMenu, IoGl, IoIcon, IoIconsetSingleton, IoInspector, IoItem, IoLadderSingleton, IoLayerSingleton, IoLayout, IoMatrix, IoMenuItem, IoMenuOptions, IoNotify, IoNumber, IoNumberSlider, IoNumberSliderRange, IoObject, IoOptionMenu, IoProperties, IoSelector, IoSelectorSidebar, IoSelectorTabs, IoSidebar, IoSlider, IoSliderRange, IoStorageFactory, IoString, IoSwitch, IoThemeSingleton, IoVector };
