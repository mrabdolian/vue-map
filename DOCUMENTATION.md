Map Component Developer Documentation
======================================

This map component is developed based on [OpenLayers](http://openlayers.org/) v5.2.0 .<br/>
This is the developer documentation for this component, to see the user guide please refer to [README](./README.md) file.
## Structure
It consists of a main `Map.vue` file that holds the map itself, it's methods and capabilities; and a config-like `Interface.js` file used to read some configurations from it (e.g. map points/polygons styles).

So you can define your arbitrary point/polygon styles outside of the core map component (in `Interface.js` file) and keep it clean.

The map itself is a vue SFC file (Single File Component).

## Map
### template
The `template` part of the component is holding the html structure needed for implementing the map and it's features:
* the div with `ref="map"` is the container for the map.
* the div with `class="toolbar"` has a `slot` to be used for custom external toolbar.
* next we have two containers with `class="point"` holding map pin image to be shown when `centerPoint` or `userPoints` options are used _(these options will be described later)_.
* the div with `class="map-overlay"` overlays and dims the whole map and also has a spinning loading icon to be shown when the map is loading.
* the last element with `class="hidden"` that has a child `<property-view/>` is a container for the tooltip overlay that is hidden by default. The `PropertyView` component is used as an overlay template to show on map when hovering on a point. _(overlay here is a capability of OpenLayers.)_

### script
Almost everything happens here! From initializing map to adding points/polygons, implementing hover/click/select interactions and more...

First, the needed packages and components are imported:
* `deepmerge` is needed to deeply merge and overwrite basic default configs and styles with the ones defined externally.
* `Interface` is the external config to read styles from.
* `PropertyView` is another component that is used for tooltips.
* `color` is needed to apply an alpha to the color of a polygon.
* `ol` is the OpenLayers map library.

Then, I defined `COLORS` constant object globally to use as the base colors for point/polygon styles.

Then our main `export default` object begins:
#### props
Props are actually, the map options and configs:
* `center` specifies the initial center of the map.
* `zoom` specifies the initial zoom of the map.
* `maxZoom` restricts the maximum zoom of the map.
* `minZoom` restricts the minimum zoom of the map.
* `disableZoom` disables the zoom ability completely.
* `options` was useful before but now it should be removed, because options are flat now and they are separate props (see above). [obsolete]
* `polygons` gets a GeoJSON-formatted "FeatureCollection" object that has Polygon or MultiPolygon Features in it. (1)
* `points` gets a GeoJSON-formatted "FeatureCollection" object that has Point Features in it.
* `selectable` specifies whether map features (points and polygons) should be selectable or not. It accepts Boolean, String, Array or Object; supporting all forms of configuration (for more info refer to [setSelectOptions](#setselectoptions) in methods).
* `userPoints` can be a boolean or number specifying whether user points can be added or not (a number means how many points can be added by user). It puts a pin (point) image at the center of the map and gives the user the ability to add points to the map.
* `centerPoint` just puts a pin image at the center of the map! (it's used with "centerPoint" event to get the center position of the map after map's move-end event).
* `tooltip` specifies whether to enable tooltips or not.
* `statisticsMode` is a boolean that specifies whether to enable statistics mode or not.

> 1: Map "Features" are the elements on the map like: Points, Polygons, ...

#### data
I declared every variable that is needed globally in data:
* `mapLoaded` determines whether the map is finished loading or not.
* `map` holds the created instance of the OpenLayers map (ol.Map) to be accessible through the whole component.
* `view` holds the instance of OpenLayers view (ol.View).
* `layers` is an object holding the instances of our vector layers (ol.layer.Vector). We have three main layers:
	* a layer for `polygons`
	* another layer for `points`
	* and the `userPoints` layer for user-added points (in the runtime).
* `currentUserPoints` is a counter for user-added points (to restrict the max no. of user points that can be added).
* `tooltipOverlay` holds the instance of our tooltip overlay (ol.Overlay).
* `tooltipModel` holds the model for tooltip data.
* `id` is a unique generated id that is bound to map, so this component can be used multiple times in a page and every instance work separately.
* `hoveredFeature` is an object that holds the last hovered map feature details:
	* `id` is the id of the hovered feature.
	* `feature` is the hovered feature itself.
	* `eventData` is the eventData emitted for the hovered feature (to use for emitting leave event when the feature is left).
	* `originalStyle` to restore the original feature style after it has been left. (2)
	* `wasSelected` specifies the select status of the feature before it is hovered (to use in styling decisions).
	* `clear` clears the object.
* `mapOptions` will hold map options!
* `mapRefreshRequest` is an object that is used to refresh map with a delay when `points` and/or `polygons` prop(s) updated _(these props are watched by vue watch property)_.
	* `delay` is the delay time before the map refreshes (this delay is used to prevent double refreshing map when `points` and `polygons` updated with a tiny delay between them).
	* `timeout` is the result of the js setTimeout (used for clearing the timeout).
* `panRequest` is an object that is used to pan and/or zoom map with a delay when `center` and/or `zoom` props(s) updated _(these props are watched by vue watch property)_.
	* `delay` _(same as above)_
	* `timeout` _(same as above)_
* `selectOptions` is an object that is used to config select interaction of the map:
	* `layers` specifies which layers to be included in select interaction.
	* `multi` specifies whether the selectable features should be multi-select supported or not.
* `selectInteraction` is the actual select interaction instance (ol.interaction.Select).
* `selectedFeatures` is an OpenLayers Collection (ol.Collection) to hold the selected features.
* `tempStyles` is an object that stores the previous style of the selected features by their id, to restore their style after deselect. (2)
* `CONSTS` object is for storing basic static configurations like default styles for map features (points and polygons.
	

> 2: Because of the styling approach of features and some restrictions, We have to handle styling manually!
Features styles are replaced with corresponding hover/selected style when they're hovered/selected; 
So the previous style will be overwritten; So in order to re-set the original style we need to save the previous style. 
`originalStyle` property in `hoveredFeature` is used for this purpose (holding original styles before hover), 
`tempStyles` too (holding original styles before select, including normal and hovered styles if the feature is hovered before select).

#### watch
some props are watched to make the map interactive and responsive:
* `point` and `polygons` props are deeply watched to refresh the map and re-draw the points and polygons when their props get updated. 
When a change detected they call `requestMapRefresh` method.
* `center` and `zoom` prop are watched for changes in order to pan and/or zoom the map to the new center and/or zoom. 
When a change detected they call `requestPan` method with the new center/zoom.
* `selectable` prop is deeply watched to update the select interaction of the map to match the new config. 
First, some conditions are checked to handle style issues. 
Then `setSelectOptions` method is called to set `selectOptions`, 
`clearSelectInteractionFromMap` method to clear the current select interaction (if any) and remove it from map, 
and finally `addSelectInteractionToMap` to define and add the new select interaction to the map.

#### created
When the map component is created, `initMapOptions` method is called to do some data preparing and initializing.

#### mounted
When the component is mounted and ready, we call some methods to bind the map, add features and more:
* `initMap` inits and binds the map to our template and set some map listeners.
* `initSelectedFeatures` inits `selectedFeatures` and assigns an empty collection to it.
* `addFeatures` adds `points` and `polygons` (if any) to the map.
* `setSelectOptions` sets the options needed for adding map select interaction (`selectOptions`), according to `selectable` prop.
* `addSelectInteractionToMap` adds a new select interaction to the map (using `selectOptions` as a config for it).

#### methods
Detailed descriptions for methods:

**initMapOptions()** <br/><br/>
This method initializes and merges some map options.
Also merges the styles from Interface file into our basic default styles.

---
**initMap()** <br/><br/>
the `if` statement is used to ensure that the included code block runs only in the browser. It's needed because of using of Nuxt SSR (Server Side Rendering).

To create a new instance of the map, we need to create a main layer for map tiles. In order to do that, first we need to create it's source.
So we define a const (`tileSource`) and assign it a new instance of `ol.source.XYZ`. Then we create a new tile layer (`ol.layer.Tile`) using the source created before.

So we created a layer for the map tiles, but this is not enough yet. We also need separate layers for different map features (the layers are described in **[data](#data)** section).
Here we create new instances of Vector Layer `ol.layer.Vector` for each layer defined in `this.layers` and push them to a local array (`layers`) for storing all layers (including `tileLayer`) to use later in the map constructor.

Also we need to declare an `ol.View` to be used in the map (storing in `this.view` to be accessible later for many other tasks). `ol.View` has some properties related to the map viewport; like: `center`, `zoom`, `maxZoom`, `minZoom` and `projection`. Here we use `this.mapOptions.view` that we defined before for the view options.
> This map component uses the Standard WGS84 (EPSG:4326) for the  projection.

Now we init and bind the map by creating an instance of `ol.Map` and passing the appropriate options that we already prepared:
* `controls`: We pass an empty array to this property to remove the default control `attribution`
* `target`: the id of the element that we want to render map in it.
* `layers`: We pass our layers array that includes tileLayer and other vector layers (that are empty and not having source at this point) to use separately for map features (e.g. points, polygons, ...) later.
* `view`: uses our previously created `this.view` instance.
* `interactions`: We use this property and pass the default interactions to it, but with modified zoom-related properties. If the `disableZoom` prop is true, the zoom feature of the map will be disabled completely.

After binding the map to the template, we check for `tooltip` prop and if it's true, we create an `ol.Overlay` instance using our tooltip template and add it to the map.

Finally at the end of the function, we set some event listeners for the tile-load-end event to use for loading, for map move-end to emit an event (`centerPoint`), for map pointermove to handle mouse hover on features and finally for view propertychange to emit a `viewChange` event.

---
**initSelectedFeatures()** <br/><br/>
As said before, this function resets `this.selectedFeatures` with a new empty OpenLayers collection (`ol.Collection`).
Also it resets `tempStyles` object.

---
**addFeatures()** <br/><br/>
This function calls `addPolygons` _(with `polygons` prop as parameter)_ and `addPoints` _(with `points` prop as parameter)_ in order to add them to the map, if they exist (for more info refer to [addPolygons](#addPolygons) and [addPoints](#addPoints) methods).

---
**addPolygons()** <br/><br/>
The `polygons` parameter should be a valid GeoJSON FeatureCollection of Polygons or MultiPolygons. With the following structure:
```json
{
	"type": "FeatureCollection",
	"features": [
		{
			"type": "Feature",
			"geometry": {...},
		},
		...
	],
}
```

The steps to add features to the map in OpenLayers are as follows:
1. Create Feature (ol.Feature)
2. Create a source (ol.source.Vector) containing features
3. Create a Layer (ol.layer.Vector) from the created source
4. Add the created layer to the map

So in order to do this, we define an empty array `polygonFeatures` to push the created features into it.
Then we loop through every feature and read them from GeoJSON object (using `readFeatureFromObject` method which returns an ol.Feature).
Then we set a unique id for the created feature to use later for some purposes (like managing feature styles).
After that, it's the time to define and make the style for the current feature using our `makeStyle` function that returns an ol.style.Style.

We pass some parameters to this function to make the appropriate style:
1. feature type (here is 'Polygon')
2. polygonTypeProperty: type property of the current polygon (in GeoJSON object) `polygon.properties.type` that defines the style of the feature.
3. polygonState: specifies that whether the feature is in a special state or not (e.g. disabled, selected, hover and ...).

> Note: Every feature in GeoJSON object can have a `properties` property that can have arbitrary properties!
We have considered some custom properties like:
> * `type` that specifies a style to use for a feature that should be the key of a pre-defined style in `Interface.js` file.
> * `disabled` that makes the feature look disabled.
> * `isSelected` that makes the feature initially selected.

So now we set the style of our feature (polygon) with OpenLayers' Feature `setStyle` method and push the resulting feature to our `polygonFeatures` array.

Then we check the feature's isSelected property and if it's true, we push it to our `selectedFeatures` collection.

Then if `statisticsMode` is enabled, we use some special styles for our polygons and also add a center point for each polygon with a different style that can be customized from outside by providing `centerPoint` object in `properties` of the polygons.
This object can have the same properties as the `circle` in point styles in Interface file (for more info refer to `Interface` section).

After our loop, the `polygonFeatures` array is ready and we create a vector source (ol.source.Vector) with these features.

And as the final step we just need to set this source as the source of our previously-created `polygons` layer. This layer is already added to the map in the moment of initializing map; So setting the source of this layer is enough to add our features to map.

---
**addPoints()** <br/><br/>

Exactly same as `addPolygons`, but just for points.

---
**makeStyle()** <br/><br/>

This method takes some arguments, makes an appropriate style (ol.style.Style) and returns it. The arguments are:
* `geometryType` that can be `'Point'`, `'Polygon'` or `'MultiPolygon'`.
* `featureTypeProperty` is the `type` property defined in `properties` object of a feature (properties.type). It should be a pre-defined style in `Interface.js` (e.g. 'sell', 'rent', ...).
* `state` specifies the state of the feature ('disabled', 'hover', 'selected', 'normal', ...).

The two last arguments (`featureTypeProperty` and `state`) are optional and the defaults (`'default'` and `'normal'` respectively) are used when they won't exist.
`state` also can be an array with two strings as two separate state names that their corresponding styles should mix in a special way (We describe it more later).

However, we check for `state` type and if it's an array, we save the second item in `secondState` variable and replace the original `state` variable with the first item of the array 
(This way, we won't have to use two separate code blocks and flows based on the type of `state`).

Then, the main flow continues and we fetch the desired object (that is needed to create an OpenLayers style) from our styles definition object (`this.CONSTS.styles`).

> We use and parse a custom object to create OpenLayers styles (ol.style.Style).
So we have considered a special structure for this object; which is described deeper in **[Interface file](#interface-file)** section.<br/>
For now it's necessary to know the hierarchy to reach to this object:
> 1. **feature geometry type** _('point', 'polygon')_<br/>
> 2. **feature type** _('default', 'rent', sell', ...)_
> 3. **feature state** _('normal', 'hover', 'selected', 'disabled', ...)_
	
First we need to extract all styles for our feature geometry type (e.g. 'point'):
```javascript
const featureStyles = this.CONSTS.styles[geometryType];
```

In this step, our `featureStyles` would be like this:
```json
{
  "default": { ... },
  "rent": { ... },
  "sell": { ... },
  ...
}
```

These are our **feature types**; here _point types_ (e.g. `'default'`, `'rent'`, ...).
Now we extract the desired feature type and save it in another variable:

```javascript
const featureStyle = featureStyles[featureTypeProperty];
```

Now `featureStyle` contains different states of the feature (default state is `'normal'`):
```json
{
  "normal": { ... },
  "hover": { ... },
  "selected": { ... },
  "disabled": { ... },
  ...
}
```

Now we can access the actual **style object** by selecting one of these states. We also check if the requested style is present; if it doesn't, we use the default style instead.

So now we have the style object; something like this:

```json
{
  "circle": {
    "radius": 8,
    "color": '#F38586',
    "strokeColor": '#fff',
    "strokeWidth": 4,
  },
  "text": {
    "text": undefined,
    "color": undefined,
    "scale": 1,
    "font": undefined,
    "overflow": false,
    "strokeColor": undefined,
    "strokeWidth": undefined,
  },
  "zIndex": 11,
}
```

> Please notice that we have a property `circle`. It specifies the shape of our style and can be `circle` or `square`.

So we check to see whether the `circle` property is present or the `square` property (One of them should be present), and then we merge the `styleObject` with an appropriate pre-defined full base object.
This way we always use the default style object as a base and overwrite re-defined properties. As a result, we only specify necessary style properties (e.g. `circle.color`).

Now we set `secondStyle` if `secondState` is defined (when `state` parameter is an array with two items).

Then we go through a switch-case to check if the feature is a 'point' or 'polygon' and then call the appropriate function (`makePointStyle` or `makePolygonStyle`) to parse our style object and return the created instance of ol.style.Style.
But before calling the function, we check for the secondStyle and if it's present, we override color property of our `styleObject` and use the color property of the `secondStyle` instead of the primary one _(This is used for some really special situations!)_.

At the end we have the style and return it!

> Also for more details on the style objects, you can refer to [`Interface file`](#interfaceFile) section.

---
**makePointStyle()** <br/><br/>
This method parses our custom style object and creates necessary instances of OpenLayers style classes.
Finally, the created instance of ol.style.Style is returned.

> Attention: Never use this method directly. Use `makeStyle` instead. This method is there to be used only in makeStyle method.

---
**makePolygonStyle()** <br/><br/>
This is almost the same as `makePointStyle`, but it also do some color modifications. For example, fill color for polygons should be a little transparent comparing to it's borders.
Full transparent is also supported (only for polygons).

> Attention: Never use this method directly. Use `makeStyle` instead. This method is there to be used only in makeStyle method.

---
**setSelectOptions()** <br/><br/>
It parses `selectable` prop and sets select options based on that. `this.selectOptions` hsa two properties:
* `layers` specifies which layers to be included in select interaction.
* `multi` specifies whether select interaction should be multi-select or not. It's `false` by default.

`selectable` can be one of these:
* **Boolean:**
	* `true`: `layers` will be set to `undefined` meaning that all layers will be included in the map select interaction.
	* `false` (or `undefined`/`null`): sets `layers` to be an empty array which means none of layers will be included (actually it disables map select interaction).
* **String:**
	* `'multi'`: enables map select interaction for all layers with multi-select enabled (sets `layers` to undefined and `multi` to true).
	* `'points''`: enables select interaction just for points layer (leaves `multi` to be false and sets layers to include only points layer).
	* `'polygons''`: enables select interaction just for polygons layer.
	* `'userPoints''`: enables select interaction just for userPoints layer.
* **Array:** Specifies the layers to be included in the select interaction. The array members are restricted to `this.layers` properties (e.g. 'points', 'polygons', ...). `multi` won't change and will be left as `false`. 
* **Object:** can include two properties:
	* `features` is an array same as above.
	* `multi` is a boolean that specifies multi-select.

---
**addSelectInteractionToMap()** <br/><br/>
First clears the current select interaction from the map (if any) by calling `clearSelectInteractionFromMap`.

Then loops through `this.selectedFeatures` to handle style for initially selected features (features that have been added to `this.selectedFeatures` while adding themselves in `addPolygons`/`addPoints`).
Feature Select/Deselect style handling is done by `toggleFeatureSelectStatus` method (two first parameters are passed; first is the feature itself and the second one specifies feature status change, `true` is for selected and `false` is for deselected).

Then we need to define a **select interaction** (`ol.interaction.Select`). We pass a config object with these properties:
* `condition` the condition to select a feature. We set it to be normal **click**.
* `toggleCondition` specifies when this select interaction should be multi-selectable (toggle-enabled). We use `selectOptions.multi` to enable or disable this.
* `layers` specifies which layers to include. We use `selectOptions.layers` for this.
* `features` is the collection that holds the selected features. We use our pre-defined `selectedFeatures` collection (which may contain the initially selected features).
* `filter` is a function that applies for all features. It takes the `feature` as the first parameter and lets us decide whether to include this feature in our select interaction or not. We use our `isSelectable` method to find out that this feature is eligible to be included in select interaction or not (refer to `isSelectable` section).

Now we add our created select interaction to the map and also set an event listener for it, which handles the select event (using `handleSelectEvent` method).

---
**clearSelectInteractionFromMap()** <br/><br/>
Clears select interaction from map (if any) by calling map's `removeInteraction` method and setting `this.selectInteraction` to `undefined`.

---
**toggleFeatureSelectStatus()** <br/><br/>
This function handles styles for a feature that got selected or deselected.
It has three parameters:
* `feature` is the feature that is selected/deselected.
* `isSelected` is a boolean that specifies whether the feature is get selected (`true`) or deselected(`false`).
* `restoreOriginalStyle` is a boolean used to restore original style instead of the last style (for example _hover_).

First we get geometry type, properties and id of the feature and update `isSelected` property of the feature.
Then we check some conditions and update style-management-related variables (`tempStyles` and `hoveredFeature`).
Then, based on conditions, we make a new appropriate style or use a previously-saved style and set (update) the feature style.

> These conditions are completed over time and handles special states and combination of feature selecting/deselecting/hovering. Please be careful, if you need to update these codes.

---
**isSelectable()** <br/><br/>
This method determines whether a feature is selectable or not based on some feature properties (`selectable` and `disabled`).

There is two general conditions:
* `properties.selectable` should not be `false` (it can be either `undefined` or `true`).
* `properties.disabled` should be `false`/`undefined`/`null` OR `properties.selectable` should be `true`.

It means that a feature can be disabled but also selectable at the same time!
When it's `disabled` property is set to `true`, the `selectable` property needs to be set to `true` explicitly. In this case, `disabled` property is just used for styling the feature.

> Please notice that this function won't consider global `selectable` prop.

---
**handleSelectEvent()** <br/><br/>
This function takes 3 parameters:
* `e` is the select event (emitted from the select interaction).
* `silent` is a boolean that specifies whether to emit `select` event or not.
* `restoreOriginalStyle` is a boolean that specifies whether to restore the original/normal style (not the latest style which can be hovered style) or not on deselects.

The event data (`e`) is an object that has two arrays in it: `selected` and `deselected` that contain selected or deselected features.
We loop through them and call `toggleFeatureSelectStatus` to handle styles for the selected/deselected feature (for more details refer to `toggleFeatureSelectStatus` section above).

And at the end we prepare and emit a `select` event (if silent is not true) to be used outside of the map component.
For event data, we return an array of selected features (`items`) and the index of the current (latest) selected feature (`index`) and the selected feature itself (`item`).
To create this array, we call `makeEventData` for each selected feature. The array items will be of type object with some custom properties. (for more info please refer to `makeEventData` section).
Finally we emit `select` event with the prepared event data.

---
**makeEventData()** <br/><br/>
This method is used to make event data (object) for a given feature. This is useful in emitting events about features (e.g. `select`, `hover`, ...).

The parameters are as follows:
* `feature` is the feature that we want to make event data for.
* `includeCoordinates` is a boolean that specifies whether `coordinates` of the feature should also be included or not.

The returning object would be like this:
```json
{
  "type": "point",
  "properties": { ... },
  "coordinates": [ ... ],
}
```
> coordinates array is not included by default.

---
**requestMapRefresh()** <br/><br/>
As mentioned in the **watch** section, this method is called when `points` and/or `polygons` props get updated and it will call `refreshMap` method just with a delay (to refresh the map only once, if these two props updated with a delay between them).
It has two parameters that are passed directly to the `refreshMap` method (keep reading the next section for more details).

---
**refreshMap()** <br/><br/>
This method is used to refresh or even reset the map.
By refreshing the map, all features (points and polygons) are re-rendered. So the new `points` and/or `polygons` will be added to the map (realtime map update).

We have two parameters:
* `resetMap` is an optional boolean used to also re-set the map in addition to refreshing it.
* `resetView` is the second optional boolean parameter used to re-set the map view in addition to refreshing map (it will re-set view-related properties like `center` and `zoom`).

First we check for `resetMap` parameter and if it's true, detach the map from target (dedicated `div` in template), assign undefined to `this.map` and call `initMap` to start from zero.

Then we call `initMapOptions` to set new values (if any).

After that we check for `resetView` to decide if we need to re-set view or not (`resetMap` also causes the map view to be re-set).

Then we clear/reset everything:
* clear `this.hoveredFeature`
* un-set the source of `layers` (by setting them to `undefined`)
* [`initSelectedFeatures()`](#initSelectedFeatures)
* [`clearSelectInteractionFromMap()`](#clearSelectInteractionFromMap)
* [`addFeatures()`](#addFeatures)
* [`setSelectOptions()`](#setSelectOptions)
* [`addSelectInteractionToMap()`](#addSelectInteractionToMap)

> All these methods are already described separately.

---
**requestPan()** <br/><br/>
It has almost the same functionality as `requestMapRefresh`, but just for requesting pan & zoom to the new `center` and/or `zoom`.
As mentioned in the **watch** section, this method is called when `center` and/or `zoom` props get updated.
It also works with an `options` parameter and property to be able to handle realtime changes of both props `center` and `zoom` with a special delay between them.

---
**pan()** <br/><br/>
This method has one parameter of type object that can contain `center` and/or `zoom` properties.
Then we check each of these properties separately and use the current map center/zoom as a default if each of them was not present. Then we animate to the new center/zoom.

---
**addUserPoint()** <br/><br/>
This function is used if `userPointCanBeAdded()`, to add user arbitrary points to the map. 

It has an optional parameter:
* `coordinates` that is used (if provided) to add the user point in that position.

If the parameter is not provided, we use the coordinates of the center of the map by default (where the pin image is also pointing).

The path to create and add a point feature in OpenLayers map is as follows:<br/>
**geometry > feature > source > layer > map.addLayer**

So for the first steps, we create a point geometry with our `coordinates`. Then we create a feature using the `pointGeometry` that we just created.
Then we set a unique ID for it (using `this.currentUserPoints` which holds the number of the current user points added to the map). Also we make and set a style for the feature.

Now according to the path we introduced, we should make a source and then create a layer from that and finally add the layer to the map; But we already did some of these steps before.
We have dedicated a layer for user points (`this.layers.userPoints`) and added that to the map already; But just without a source set to it.
So only for the first time, we need to create a source from our point feature and set that as the source of `userPoints` layer.
But for the next times (when `userPoints` layer has a source) we just need to add the new point feature to the existing source.
So we check that with an if statement and take the appropriate actions.

Finally, we increase our counter (`this.currentUserPoints`), make event data for the added point feature (including coordinates) and emit `userPointAdd` event with the prepared event data.

---
**userPointCanBeAdded()** <br/><br/>
This method goal is to check if user point can be added to the map.

It has one parameter:
* `userPoints` that is a boolean or number (actually it will be our [`userPoints`](#props) prop).

This parameter indicates the ability to add user points. If it's `true` user can add as many points as he/she wants, but if it's a number, user points are limited to that.

So this function returns `true` only if `userPoints` parameter is true or a number that is greater than the `currentUserPoints` (meaning that we still does not reach the limit).

---
**handleMoveEndEvent()** <br/><br/>
This function handles `moveend` event of the map (which is set in `initMap` function).

When map is moved, we emit `centerPoint` event with coordinates of the center of the map (meaning that center point is updated).

---
**handleHoverEvent()** <br/><br/>
This method responsibility is to handle the map hover event (`pointermove` on the whole map). This method continues only if global `selectable` prop is defined and is not false (because hover is useful only if there is selectable features).

First we need to define a `leave` function to use later in some points in this method. This leave function is called when mouse hovers somewhere on the map that has no features.
It checks if there's a feature that is hovered (`hoveredFeature`) currently and reset it's style and also emits a `leave` event, hide the tooltip (if it's enabled and visible) and clears the `hoveredFeature` object.

Then we call `hasFeatureAtPixel` method of the map to check if there's a feature in the hovered pixel.
If there's no feature at that pixel, we call our `leave` function, otherwise we do the following:

Make an array for storing features from that pixel in it. We use `forEachFeatureAtPixel` method of the map and push an object (including the feature itself and it's layer) for each feature at pixel to it.
Then we just use the most top feature and make sure that this is not the same feature as the last hovered one (`this.hoveredFeature.id !== featureId`).
Then we make sure that it's layer is included in the select interaction and also this feature is a selectable feature (using `isSelectable` method).

Then we emit `hover` event, update the `hoveredFeature` object, set the new style and show the tooltip for this hovered feature (refer to `showTooltipForFeature`).

> For more details on making and setting the styles, you can refer to previously described function: `addPolygons`.

---
**handleViewChangeEvent()** <br/><br/>
This method emits an event (`viewChange`) when a property of the map view is changed.
This is useful when we need to realize if map zoom or position is changed by user interaction with the map. For example used for sending new http requests to get new features in the current viewport.

---
**showTooltipForFeature()** <br/><br/>
This function gets a `feature` as the parameter and show the tooltip for it (tooltip should be enabled by passing `tooltip` prop).

For now, it supports only point features. It gets the coordinates of the point and also the model needed to fill the tooltip from the feature and calls `toggleTooltip` method with providing them as parameters.

---
**toggleTooltip()** <br/><br/>
It's the base function to use for showing/hiding the tooltip.

It takes two parameters:
* `coordinates` to show the tooltip in that position.
* `model` the data model to be used in tooltip.

It updates the `tooltipModel` with the provided `model` and calls the `setPosition` method of the `tooltipOverlay` with the provided `coordinates` to show the tooltip.
It will hide the tooltip if the `coordinates` is not provided (`undefined`).

---
**addRandomPoints()** <br/><br/>
It add some random points to the map just for testing purposes.
It has an optional `num` parameter to override default no. of points.

> This function can be used to test the performance of the map with a lot of points.

---
<br/>

**The following methods has been written specially for the external use (using Vue refs), but also can be used internally if needed.**

**select()** <br/><br/>
Gets an id, selects the desired feature and returns an object that describes the result of the selection.

It has two parameters:
* `id` is required and should be the one that defined in `properties` of a feature.
* `geometryType` is optional and is the type of the feature (`point` or `polygon`). It helps to find the feature faster and have a better performance.

First we prepare a default `result` object and update it later if needed. Then we check if our select interaction is in single-select mode, and there's already a selected feature, we first deselect all selected features using `deselectAll` method.

Then we store all polygon and point features in separate variables to look through them to find the desired feature.

Now we need a `findAndSelect` function that is re-usable for our `polygonFeatures` and `pointFeatures`.
This function gets an array of features and loop through them to find the feature with the provided `id`.
If the feature with that id is found, it pushes the found feature to `selectedFeatures` collection to make it selected.
Also it manually creates the needed event data for our `handleSelectEvent` method and calls it (to handle the select event that just happened).
It also updates the `result` object based on the conditions.

So now that we have our `findAndSelect` function ready, we start to call it for our `polygonFeatures` and `pointFeatures` with considering `geometryType` in priority of function calls.
Finally we return the result.

---
**deselect()** <br/><br/>
It's a lot like `select` method, but it's just for deselecting an already selected feature.

It just uses `selectedFeatures` collection to look for the desired feature, and everything else is like `selected` method.

---
**deselectAll()** <br/><br/>
It deselects all selected features.

It has one parameter:
* `silent` that is a boolean to specify whether the events for the deselect features should be emitted or not.

It makes a fake event data with all `selectedFeatures` as the deselected features, then clears the `selectedFeatures` collection (actual deselect is happening here) and finally calls `handleSelectEvent` to handle deselected features.

---
**showTooltip()** <br/><br/>
Takes an `id`, finds the desired feature (point) and shows the tooltip for that point by calling `showTooltipForFeature` with the found target feature as the parameter.

---
**hideTooltip()** <br/><br/>
It hides the tooltip by calling `toggleTooltip` with `undefined` as the first parameter (described earlier in `toggleTooltip`).

---
**getBounds()** <br/><br/>
It returns the bounds (extent) of the current viewport by calling `calculateExtent` method of the map view.
The returned result is an array with four numbers as the coordinates of the top-left and bottom-right points.

---
**getBoundsAsPolygonCoordinates()** <br/><br/>
It returns the bounds (extent) of the current viewport in format of coordinates of a polygon.
It uses the previous `getBounds` method and makes a polygon geometry from that and finally returns the coordinates of it.

---
**isCenterInPolygons()** <br/><br/>
Checks whether the center point of the map is inside current polygons or not.
This uses `booleanPointInPolygon` method of `turf` package and call it for every polygon we have and break the loop as soon as it returned true.

---

## Interface file
This file is actually a Vue mixin for the map. It contains some custom configs for the map (for now only custom styles).
In it's data, it has a `styles` `property that has two properties in it:
* `point` which includes the styles for point features.
* `polygon` which includes the styles for polygon features.

Then in the next level we have our desired names for our styles.

In the next level we have our different states that can be:
* `normal`: the default style for a feature that is not hovered or selected.
* `hover`: hovered feature style.
* `selected`: selected feature style.
* `disabled`: disabled feature style.
* `disabledSelected`: disabled and selected at the same time!

> This is not required to define all of the states. Just define each of them that you need.

Now, for each of these states we have an object that we call it style object.

**For points:**
```json
{
  "circle":{
	"radius":8,
	"color":"#777",
	"strokeColor":"#fff",
	"strokeWidth":4,
  },
  "text": {
	"text": undefined,
	"color": undefined,
	"scale": 1,
	"font": undefined, // string e.g. '2rem sans-serif'
	"overflow": false, // if set to true, when text becomes bigger than it's geometry, it will not disappear (always visible even in the lowest zoom)
	"strokeColor": undefined,
	"strokeWidth": undefined,
  },
  "zIndex": 10,
},
```
> we can use `square` instead of the `circle` property and it has the same properties.

**For polygons:**
```json
{
  "color": "#f55",
  "fillColor": undefined,
  "strokeColor": undefined,
  "strokeWidth": 3,
  "text": { ... }, // it's the same as point text
  "zIndex": 1,
},
```
> You can either:
> * use only `color` property to automatically set the color for polygon stroke (border) and it's filling color. In this case, the filling color will get an opacity (alpha) automatically.
> * Or, provide `fillColor` and `strokeColor` separately, and they will be set as they are, without any opacity (alpha) applied.

Also to read more about styling you can refer to [`makeStyle`](#makeStyle) method.
