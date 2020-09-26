OpenLayers-based Map Component
==============================

## Install
To be able to use this map component in your project, you need to install OpenLayers and some dev-dependencies first.

To achieve this purpose run:
>`npm i ol color deepmerge @turf/boolean-point-in-polygon --save-dev`
* NOTE: it's already installed in the current project, no need to install again.


## Usage
First import map styles in your `app.styl` file _(already imported for this project)_:
>`@import 'ol/ol.css'`

Then import named `Map` component to your component/page (e.g. `.vue` file):

>`import { Map } from '~/components/shared/map'`

Then add the imported component to the `components` property of your vue component:
```javascript
export default {
	components: {
		appMap: Map
	},
	...
}
```

Now you can use the map component in your template:
```html
<app-map></app-map>
```
