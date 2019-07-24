import{IoThemeSingleton}from"./io-elements-core.js";import{IoElement,html,IoStorage,filterObject}from"./io.js";class IoLayout extends IoElement{static get Style(){return html`<style>:host {flex: 1;display: flex;overflow: hidden;touch-action: none;/* border: var(--io-outset-border); *//* border-color: var(--io-outset-border-color); */}:host[orientation=horizontal] {flex-direction: row;}:host[orientation=vertical] {flex-direction: column;}</style>`}static get Attributes(){return{orientation:{value:"horizontal",notify:!0}}}static get Properties(){return{elements:Array,splits:Array,editable:!0}}static get Listeners(){return{"io-layout-divider-move":"_onDividerMove","io-layout-tab-insert":"_onLayoutTabInsert"}}_onSelectedChanged(){const e=[].slice.call(this.children).filter(e=>"io-layout-divider"!==e.localName);for(let t=0;t<e.length;t++)e[t].selected&&(this.splits[t].selected=e[t].selected)}changed(){let e=[];for(let t=0;t<this.splits.length;t++){const o=this.splits[t],i=void 0!==o.size?o.size+"px":null,s={"flex-basis":i||"auto","flex-grow":i?0:1,"flex-shrink":i?0:1};o.tabs?e.push(["io-selector-tabs",{elements:this.elements,filter:o.tabs,selected:o.selected,editable:this.editable,style:s,"on-selected-changed":this._onSelectedChanged}]):o.splits?e.push(["io-layout",{elements:this.elements,splits:o.splits,orientation:o.orientation,editable:this.editable,style:s}]):e.push(["p","Malformed layout data."]),t<this.splits.length-1&&e.push(["io-layout-divider",{orientation:this.orientation||"horizontal",index:t}])}this.template([e])}_onLayoutTabInsert(e){e.stopImmediatePropagation();const t=[].slice.call(this.children).filter(e=>"io-layout-divider"!==e.localName),o=e.detail.source,i=e.detail.destination,s=t.indexOf(i),l=e.detail.tab,n="vertical"===this.orientation,r=e.detail.direction;for(let e=o.filter.length;e--;)o.filter[e]===l&&(o.filter.splice(e,1),o.selected=o.filter[o.filter.length-1],o.changed());n&&"down"===r||!n&&"right"===r?this.splits.splice(s+1,0,{tabs:[l],selected:l}):n&&"up"===r||!n&&"left"===r?this.splits.splice(s,0,{tabs:[l],selected:l}):n&&"left"===r||!n&&"up"===r?this.splits[s]={splits:[{tabs:[l],selected:l},this.splits[s]],orientation:n?"horizontal":"vertical"}:(n&&"right"===r||!n&&"down"===r)&&(this.splits[s]={splits:[this.splits[s],{tabs:[l],selected:l}],orientation:n?"horizontal":"vertical"}),this.changed()}_onDividerMove(e){e.stopImmediatePropagation();let t=e.detail.index,o=e.detail.index+1,i=this.splits[t],s=this.splits[o],l=void 0===i.size?void 0:i.size+e.detail.movement,n=void 0===s.size?void 0:s.size-e.detail.movement;if(void 0!==l&&l>=0&&(void 0===n||n>=0)&&(this.splits[t].size=Math.max(0,l)),void 0!==n&&n>=0&&(void 0===l||l>=0)&&(this.splits[o].size=Math.max(0,n)),void 0===i.size&&void 0===s.size){const e=[].slice.call(this.children).filter(e=>"io-layout-divider"!==e.localName);let i="horizontal"===this.orientation?"width":"height",s=Math.floor(this.splits.length/2);if(Math.abs(s-t)<=Math.abs(s-o))for(let t=o;t<this.splits.length;t++)this.splits[t].size=parseInt(e[t].getBoundingClientRect()[i]);else for(let o=t;o>=0;o--)this.splits[o].size=parseInt(e[o].getBoundingClientRect()[i])}this.queue("splits",this.splits,this.splits),this.queueDispatch()}}IoLayout.Register();class IoLayoutDivider extends IoElement{static get Style(){return html`<style>:host {background: var(--io-background-color);color: var(--io-color);z-index: 1;display: flex;flex: none;border: var(--io-outset-border);border-color: var(--io-outset-border-color);user-select: none;transition: background-color 0.4s;}:host:hover {background-color: var(--io-color-focus);}:host[orientation=horizontal] {cursor: col-resize;width: var(--io-spacing);border-top: 0;border-bottom: 0;}:host[orientation=vertical] {cursor: row-resize;height: var(--io-spacing);border-left: 0;border-right: 0;}:host > .app-divider {flex: 1;display: flex;margin-left: -0.03em;margin-top: -0.06em;align-items: center;justify-content: center;}</style>`}static get Properties(){return{orientation:{value:"horizontal",reflect:1},index:Number,pointermode:"relative"}}static get Listeners(){return{pointermove:"_onPointerMove"}}_onPointerMove(e){e.buttons&&(e.preventDefault(),this.setPointerCapture(e.pointerId),this.dispatchEvent("io-layout-divider-move",{movement:"horizontal"===this.orientation?e.movementX:e.movementY,index:this.index},!0))}changed(){this.template([["div",{class:"app-divider"},"horizontal"===this.orientation?"⋮":"⋯"]])}}IoLayoutDivider.Register();class IoCollapsable extends IoElement{static get Style(){return html`<style>:host {${IoThemeSingleton.panel}}:host > io-boolean {cursor: pointer !important;align-self: stretch;}:host > io-boolean[value] {margin-bottom: var(--io-spacing);}:host:not([expanded]) > .io-frame {display: none;}</style>`}static get Attributes(){return{label:{notify:!0},expanded:{type:Boolean,notify:!0},role:"region"}}static get Properties(){return{elements:Array}}_onButtonValueSet(e){this.set("expanded",e.detail.value)}changed(){this.template([["io-boolean",{class:"io-item",true:"▾ "+this.label,false:"▸ "+this.label,value:this.expanded,"on-value-set":this._onButtonValueSet}],["div",{id:"content",class:"io-frame"},this.expanded&&this.elements.length?this.elements:[null]]])}}IoCollapsable.Register();const importedPaths={};class IoSelector extends IoElement{static get Style(){return html`<style>:host {display: flex;flex-direction: column;align-self: stretch;justify-self: stretch;overflow: auto;}:host > .io-content {background: var(--io-background-color);color: var(--io-color);}</style>`}static get Properties(){return{elements:Array,selected:{type:String,reflect:1},cache:Boolean,precache:Boolean,_caches:Object,_selectedID:String,_scrollID:{type:String,notify:!0}}}static get Listeners(){return{scroll:["_onScroll",{capture:!0}],"content-ready":"_onIoContentReady"}}_onIoContentReady(e){e.stopImmediatePropagation(),this.scrollTo(this._scrollID,!1)}constructor(e){super(e),this.stagingElement=document.createElement("io-selector-staging")}connectedCallback(){super.connectedCallback(),document.head.appendChild(this.stagingElement),document.addEventListener("readystatechange",this.onReadyStateChange)}disconnectedCallback(){super.disconnectedCallback(),document.head.removeChild(this.stagingElement),document.removeEventListener("readystatechange",this.onReadyStateChange)}checkImport(e,t){const o=e?new URL(e,window.location).href:void 0;!e||importedPaths[o]?t():(this.__callback=t,o&&!importedPaths[o]&&(console.log(o),import(o).then(()=>{importedPaths[o]=!0,this.__callback()})))}onReadyStateChange(){this.precacheChanged()}precacheChanged(){if(this.__connected&&this.precache&&"complete"===document.readyState)for(let e=0;e<this.elements.length;e++){const t=this.elements[e][1].name,o=!1===this.elements[e][1].cache||!!this.elements[e][1].import;this._caches[t]||o||this.checkImport(this.elements[e][1].import,()=>{this.stagingElement.parentElement!==document.head&&document.head.appendChild(this.stagingElement),this.template([this.elements[e]],this.stagingElement),this._caches[t]=this.stagingElement.childNodes[0],this.stagingElement.textContent=""})}}renderShadow(){this.template([["div",{id:"content",class:"io-content"}]])}scrollTo(e,t){e&&setTimeout(()=>{const o=this.$.content.querySelector("#"+e);o&&o.scrollIntoView({behavior:t?"smooth":"auto"})},100)}_onScroll(){void 0!==this._scrollID&&(clearTimeout(this.__scrollDebounce),this.__scrollDebounce=setTimeout(()=>{delete this.__scrollDebounce;const e=[...this.$.content.querySelectorAll("h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]")],t=this.$.content.scrollTop||this.$.content.children[0].scrollTop,o=t+this.$.content.getBoundingClientRect().height/2,i=this._scrollID;let s;for(let i=e.length;i--;){const l=e[i],n=e[i+1],r=l.offsetTop,a=n?n.offsetTop:r;if(r<t-5&&a<o&&i!==e.length-1)break;s=l.id}if(void 0!==s&&s!==i){this._scrollID=s;const e=this.selected,t=this._selectedID+"#"+this._scrollID;this.__properties.selected.value=t,this.dispatchEvent("selected-changed",{value:t,oldValue:e})}},100))}selectedChanged(){const e=this._scrollID,t=this._selectedID;this._selectedID=this.selected.split("#")[0],this._scrollID=this.selected.split("#")[1],this._selectedID!==t?(this.update(),this.scrollTo(this._scrollID)):this._scrollID!==e&&this.scrollTo(this._scrollID,!0)}elementsChanged(){this.selectedChanged()}update(){const e=this._selectedID;let t=this.elements.find(t=>t[1].name===e);t||(console.warn(`Could not find element with id:${e}!`),t=["span",`Could not find element with id:${e}!`]),"object"!=typeof t[1]&&t.splice(1,0,{});const o=!0===t[1].cache,i=!1===t[1].cache;this.renderShadow(),this.$.content&&(this.$.content.textContent=""),this.$.content.classList.toggle("io-loading",!0),!i&&(this.precache||this.cache||o)&&this._caches[e]?(this.$.content.appendChild(this._caches[e]),this.$.content.classList.toggle("io-loading",!1)):this.checkImport(t[1].import,()=>{this.$.content.classList.toggle("io-loading",!1),this.template([t],this.$.content),this._caches[e]=this.$.content.childNodes[0]})}}IoSelector.Register();class IoSidebar extends IoElement{static get Style(){return html`<style>:host {display: flex;flex-wrap: nowrap;overflow-x: hidden;overflow-y: auto;padding: var(--io-spacing);}:host:not([overflow]) {-webkit-overflow-scrolling: touch;flex-direction: column;}:host io-boolean,:host io-button,:host io-collapsable {width: 100%; /* Prevents layout trashing when overflown */}:host io-collapsable,:host io-boolean,:host .io-frame,:host io-button {flex: 0 0 auto;margin: 0;padding: var(--io-spacing);border: none;background: none;box-shadow: none;}:host .io-frame {padding-left: 1em;}:host io-button.io-selected-tab {color: var(--io-color-link);text-decoration: underline;}</style>`}static get Attributes(){return{role:"navigation",label:{notify:!0},overflow:{notify:!0}}}static get Properties(){return{selected:String,options:Array}}_onSelect(e){this.set("selected",e)}_onValueSet(e){this.set("selected",e.detail.value)}_addOptions(e){const t=[];for(let o=0;o<e.length;o++){const i=e[o];if(i.options){const s=i.label+" "+o+"/"+e.length+" ("+i.options.length+")";t.push(["io-collapsable",{label:i.label,expanded:IoStorage("io-sidebar-collapse "+s,!1),elements:[...this._addOptions(i.options)]}])}else{const e=this.selected&&(this.selected===i||this.selected===i.value);t.push(["io-button",{label:i.label||i.value||i,value:i.value||i,action:this._onSelect,class:e?"io-selected-tab":""}])}}return t}changed(){let e=filterObject(this.options,e=>e.value===this.selected);if(this.overflow){const t=e?e.label||String(e.value):String(this.selected).split("#")[0];this.template([["io-menu-option",{label:"☰  "+t,title:"select tab",value:this.selected,options:this.options,class:"io-item","on-value-set":this._onValueSet}]])}else this.template([...this._addOptions(this.options)])}}IoSidebar.Register();class IoSelectorSidebar extends IoSelector{static get Style(){return html`<style>:host {flex-direction: row-reverse;align-self: stretch;justify-self: stretch;flex: 1 1 auto;}:host[left] {flex-direction: row;}:host[overflow] {flex-direction: column;}:host > io-sidebar {flex: 0 0 auto;background-color: var(--io-background-color-dark);}:host:not([overflow]) > io-sidebar {flex: 0 0 8em;}:host > .io-content {border: var(--io-border);border-width: 0 var(--io-border-width) 0 0}:host[left] > .io-content {border-width: 0 0 0 var(--io-border-width);}:host[overflow] > .io-content {border-width: var(--io-border-width) 0 0 0;}</style>`}static get Attributes(){return{role:"navigation",label:{notify:!0},overflow:{type:Boolean,notify:!0},left:!0}}static get Properties(){return{options:Array,minWidth:410}}_onScroll(){if(super._onScroll(),this.$.sidebar.selected!==this.selected){!!filterObject(this.options,e=>e===this.selected||e.value===this.selected)&&(this.$.sidebar.selected=this.selected)}}minWidthChanged(){this.onResized()}onResized(){this.overflow=this.getBoundingClientRect().width<this.minWidth}leftChanged(){this.renderShadow()}overflowChanged(){this.renderShadow()}renderShadow(){const e=["io-sidebar",{id:"sidebar",elements:this.elements,selected:this.bind("selected"),options:this.options.length?this.options:this.elements.map(e=>e[1].name),overflow:this.overflow}];this.template([e,["div",{id:"content",class:"io-content"}]])}}IoSelectorSidebar.Register();class IoSelectorTabs extends IoSelector{static get Style(){return html`<style>:host {flex-direction: column;align-self: stretch;justify-self: stretch;flex: 1 1 auto;}:host > io-menu-options {flex: 0 0 auto;border-radius: 0;border: none;background-color: var(--io-background-color-dark);}:host > .io-content {border: var(--io-border);border-width: var(--io-border-width) 0 0 0;}</style>`}static get Properties(){return{options:Array,slotted:Array}}_onScroll(){if(super._onScroll(),this.$.tabs.selected!==this.selected){!!filterObject(this.options,e=>e===this.selected||e.value===this.selected)&&(this.$.tabs.selected=this.selected)}}renderShadow(){const e=[["io-menu-options",{id:"tabs",role:"navigation",horizontal:!0,value:this.bind("selected"),options:this.options.length?this.options:this.elements.map(e=>e[1].name),slotted:this.slotted}]];this.template([e,["div",{id:"content",class:"io-content"}]])}}IoSelectorTabs.Register();export{IoCollapsable,IoLayout,IoSelector,IoSelectorSidebar,IoSelectorTabs,IoSidebar};