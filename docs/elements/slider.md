### `<io-slider>` ###

<io-slider step="0.1"></io-slider>

Input element for `Number` data type. It can be configured to clamp the `value` to `min`/`max` and round it to the nearest `step` increment.

When the number field is focused, arrow keys will change focus to the nearest focusable element in the chosen direction. When the slider is focused, the arrow keys will change the value according to accessibility rules for the slider role. Users can still change the focus by holding down the shift key and pressing the arrow keys.

#### Properties ####

| Property | Type | Description | Default |
|:---------|:-----|:-----------|:--------|
| **`value`** | Number | Value | `0` |
| **`step`** | Number | Value increment/decimals | `0.001` |
| **`min`** | Number | Minimum value | `-Infinity` |
| **`max`** | Number | Maximum value | `Infinity` |

#### Events ####

| Event | Description | Detail | Bubbles |
|:------|:------------|:-------|:--------|
| **`value-set`** | Value set by user action | `property`, `value`, `oldValue` | false |
