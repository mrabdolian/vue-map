<!--

use one of 'center-point' prop or 'user-points' prop at a time

style object for points:
{
	// one of 'icon' or 'circle' should be provided. if both exist, 'icon' has priority over 'circle'.
		icon: {
			src: undefined, // image url or base64 string
			scale: 1,
			size: undefined, // [width, height] - accepts null
			img: undefined,
			imgSize: undefined,
		},
		circle: {
			radius: 10,
			color: COLORS.POINT.default,
			strokeColor: '#fff',
			strokeWidth: 3,
		},
	text: {
		color: '#fff',
		text: '',
	},
	zIndex: 0,
}


style.image can be a Circle or Icon:
Circle:
{
	src: String,
	size: [Number, Number], // [width, height] - accepts null
	scale: Number, // 0 to 1 - Default: 1
}

Icon:
{
	stroke: {
		color: String, //in short/full hex '#3399CC'/'#fff' or name 'red'
		width: Number, //in pixel
	},
	fill: {
		color: String,
	},
}

-->

<template>
	<div class="map-container">
		<div
			ref="map"
			:id="id"
			class="map"/>

		<div class="toolbar">
			<slot name="toolbar" />
		</div>

		<div
			v-if="mapLoaded && centerPoint"
			class="point">
			<img :src="require('./assets/point.svg')">
		</div>
		<div
			v-if="mapLoaded && userPointCanBeAdded(userPoints)"
			class="point"
			@click="addUserPoint">
			<img :src="require('./assets/point.svg')">
		</div>

		<div
			v-if="!mapLoaded"
			class="map-overlay">
			<div
				v-if="!mapLoaded"
				class="loader"/>
		</div>

		<div class="hidden">
			<property-view
				id="tooltip"
				:model="tooltipModel"
				:type="'tooltip'" />
		</div>
	</div>
</template>

<script>
import merge from 'deepmerge';
import Interface from './Interface';
import { PropertyView } from '../property/view';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import centerOfMass from '@turf/center-of-mass';

let Color, ol;
if (process.browser) {
	Color = require('color');
	ol = require('ol');
	ol.eventsCondition = require('ol/events/condition');
	ol.format = require('ol/format');
	ol.geom = require('ol/geom');
	ol.geom.Polygon.fromExtent = require('ol/geom/Polygon').fromExtent;
	ol.interaction = require('ol/interaction');
	ol.layer = require('ol/layer');
	ol.proj = require('ol/proj');
	ol.size = require('ol/size');
	ol.source = require('ol/source');
	ol.style = require('ol/style');
}

const COLORS = {
	POINT: {
		default: '#777',
		default_hover: '#999',
		default_selected: '#000',
		default_disabled: '#bbb',
	},
	POLYGON: {
		default: '#707070',
		default_hover: '#FF9a9a',
		default_selected: '#FF6767',
		default_disabled: '#c0c0c0',
	},
};

export default {
	components: { PropertyView },
	mixins: [ Interface ],
	props: {
		center: {
			type: Array,
			default: () => undefined,
		},
		zoom: {
			type: Number,
			default: undefined,
		},
		maxZoom: {
			type: Number,
			default: undefined,
		},
		minZoom: {
			type: Number,
			default: undefined,
		},
		disableZoom: {
			type: Boolean,
			default: false,
		},
		options: {
			type: Object,
			default: () => new Object(),
		},
		polygons: {
			type: Object,
			default: () => null,
		},
		points: {
			type: Object,
			default: () => null,
		},
		selectable: {
			type: [Boolean, String, Array, Object],
			default: () => false,
		},
		userPoints: {
			type: [Boolean, Number],
			default: false,
		},
		centerPoint: {
			type: Boolean,
			default: false,
		},
		tooltip: {
			type: [Boolean, String],
			default: false,
		},
		statisticsMode: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			mapLoaded: false,
			map: undefined,
			view: undefined,
			layers: {
				polygons: undefined,
				points: undefined,
				userPoints: undefined,
			},
			currentUserPoints: 0,
			tooltipOverlay: undefined,
			tooltipModel: undefined,
			id: `map-${Math.floor(Math.random() * 1000000)}`,
			hoveredFeature: {
				id: undefined,
				feature: undefined,
				eventData: undefined,
				originalStyle: undefined, // used when restoring previous style on a feature leave
				wasSelected: undefined,
				clear() {
					this.id = undefined;
					this.feature = undefined;
					this.eventData = undefined;
					this.originalStyle = undefined;
					this.wasSelected = undefined;
				},
			},
			mapOptions: {},
			mapRefreshRequest: {
				delay: 100,
				timeout: undefined,
			},
			panRequest: {
				delay: 50,
				timeout: undefined,
				options: undefined,
			},
			selectOptions: {
				layers: undefined,
				multi: undefined,
			},
			selectInteraction: undefined,
			selectedFeatures: undefined,
			tempStyles: {}, // used when restoring previous style on a feature deselect
			CONSTS: {
				styles: {
					point: {
						default: {
							normal: {
								circle: {
									radius: 8,
									color: COLORS.POINT.default,
									strokeColor: '#fff',
									strokeWidth: 4,
								},
								text: {
									text: undefined,
									color: undefined,
									scale: 1,
									font: undefined, // string e.g. '2rem sans-serif'
									overflow: false, // if set to true, when text becomes bigger than it's geometry, it will not disappear (always visible even in the lowest zoom)
									strokeColor: undefined,
									strokeWidth: undefined,
								},
								zIndex: 11,
							},
							hover: {
								circle: {
									radius: 12,
									color: COLORS.POINT.default_hover,
									strokeColor: '#fff',
									strokeWidth: 0,
								},
								text: {
									text: undefined,
									color: undefined,
									scale: 1,
									font: undefined, // string e.g. '2rem sans-serif'
									overflow: false, // if set to true, when text becomes bigger than it's geometry, it will not disappear (always visible even in the lowest zoom)
									strokeColor: undefined,
									strokeWidth: undefined,
								},
								zIndex: 12,
							},
							selected: {
								circle: {
									radius: 8,
									color: COLORS.POINT.default_selected,
									strokeColor: '#fff',
									strokeWidth: 4,
								},
								text: {
									text: undefined,
									color: undefined,
									scale: 1,
									font: undefined,
									overflow: false,
									strokeColor: undefined,
									strokeWidth: undefined,
								},
								zIndex: 13,
							},
							disabled: {
								circle: {
									radius: 8,
									color: COLORS.POINT.default_disabled,
									strokeColor: '#fff',
									strokeWidth: 4,
								},
								text: {
									text: undefined,
									color: undefined,
									scale: 1,
									font: undefined, // string e.g. '2rem sans-serif'
									overflow: false, // if set to true, when text becomes bigger than it's geometry, it will not disappear (always visible even in the lowest zoom)
									strokeColor: undefined,
									strokeWidth: undefined,
								},
								zIndex: 10,
							},
						},
						defaultSquare: {
							normal: {
								square: {
									radius: 8,
									color: COLORS.POINT.default,
									strokeColor: '#fff',
									strokeWidth: 4,
								},
								text: {
									text: undefined,
									color: undefined,
									scale: 1,
									font: undefined, // string e.g. '2rem sans-serif'
									overflow: false, // if set to true, when text becomes bigger than it's geometry, it will not disappear (always visible even in the lowest zoom)
									strokeColor: undefined,
									strokeWidth: undefined,
								},
								zIndex: 11,
							},
							hover: {
								square: {
									radius: 12,
									color: COLORS.POINT.default_hover,
									strokeColor: '#fff',
									strokeWidth: 0,
								},
								text: {
									text: undefined,
									color: undefined,
									scale: 1,
									font: undefined, // string e.g. '2rem sans-serif'
									overflow: false, // if set to true, when text becomes bigger than it's geometry, it will not disappear (always visible even in the lowest zoom)
									strokeColor: undefined,
									strokeWidth: undefined,
								},
								zIndex: 12,
							},
							selected: {
								square: {
									radius: 8,
									color: COLORS.POINT.default_selected,
									strokeColor: '#fff',
									strokeWidth: 4,
								},
								text: {
									text: undefined,
									color: undefined,
									scale: 1,
									font: undefined,
									overflow: false,
									strokeColor: undefined,
									strokeWidth: undefined,
								},
								zIndex: 13,
							},
							disabled: {
								square: {
									radius: 8,
									color: COLORS.POINT.default_disabled,
									strokeColor: '#fff',
									strokeWidth: 4,
								},
								text: {
									text: undefined,
									color: undefined,
									scale: 1,
									font: undefined, // string e.g. '2rem sans-serif'
									overflow: false, // if set to true, when text becomes bigger than it's geometry, it will not disappear (always visible even in the lowest zoom)
									strokeColor: undefined,
									strokeWidth: undefined,
								},
								zIndex: 10,
							},
						},
						userPoint: {
							normal: {
								icon: {
									src: require('./assets/point.svg'),
									scale: 0.1,
								},
							},
						},
					},
					polygon: {
						default: {
							normal: {
								color: COLORS.POLYGON.default,
								strokeWidth: 3,
								text: {
									text: undefined,
									color: undefined,
									scale: 1,
									font: undefined,
									overflow: false,
									strokeColor: undefined,
									strokeWidth: undefined,
								},
								zIndex: 1,
							},
							hover: {
								color: COLORS.POLYGON.default_hover,
								strokeWidth: 3,
								text: {
									text: undefined,
									color: undefined,
									scale: 1,
									font: undefined,
									overflow: false,
									strokeColor: undefined,
									strokeWidth: undefined,
								},
								zIndex: 2,
							},
							selected: {
								color: COLORS.POLYGON.default_selected,
								strokeWidth: 3,
								text: {
									text: undefined,
									color: undefined,
									scale: 1,
									font: undefined,
									overflow: false,
									strokeColor: undefined,
									strokeWidth: undefined,
								},
								zIndex: 3,
							},
							disabled: {
								color: COLORS.POLYGON.default_disabled,
								strokeWidth: 3,
								text: {
									text: undefined,
									color: undefined,
									scale: 1,
									font: undefined,
									overflow: false,
									strokeColor: undefined,
									strokeWidth: undefined,
								},
								zIndex: 0,
							},
						},
						transparent: {
							normal: {
								color: 'transparent',
								zIndex: 0,
							},
							hover: {
								color: 'transparent',
								zIndex: 0,
							},
							selected: {
								color: 'transparent',
								zIndex: 0,
							},
						},
					},
				},
			},
		};
	},
	watch: {
		center() {
			this.requestPan({center: this.center});
		},
		zoom() {
			this.requestPan({zoom: this.zoom});
		},
		points: {
			deep: true,
			handler() {
				this.map && this.requestMapRefresh();
			},
		},
		polygons: {
			deep: true,
			handler() {
				this.map && this.requestMapRefresh();
			},
		},
		selectable: {
			deep: true,
			handler(newValue) {
				const hovered = this.hoveredFeature;
				const hoveredId = this.hoveredFeature.id;
				const hoveredFeature = this.hoveredFeature.feature;

				// first restore style for the hovered feature (if present)
				if (hoveredFeature && (!this.tempStyles[hoveredId] || hovered.wasSelected)) {
					hoveredFeature.setStyle(hovered.originalStyle);
					hovered.clear();
				}

				this.setSelectOptions();
				this.clearSelectInteractionFromMap();
				newValue && this.addSelectInteractionToMap();
			},
		},
	},
	created() {
		this.initMapOptions();
	},
	mounted() {
		this.initMap();

		// init this.selectedFeatures with a new empty ol.Collection
		this.initSelectedFeatures();

		this.addFeatures();
		this.setSelectOptions();
		this.addSelectInteractionToMap();
	},
	methods: {
		initMapOptions() {
			// set default init values for mapOptions
			this.mapOptions = {
				// view is used when initializing map
				view: {
					center: [51.45978013240674, 35.804849457831764], // almost center of tehran: [51.35, 35.70]
					zoom: 12,
					maxZoom: 20,
					minZoom: 11,
					projection: 'EPSG:4326',
				},
			};

			// merge options (prop) into mapOptions (data)
			const overwriteMergeFunction = (destinationArray, sourceArray, options) => sourceArray;
			this.mapOptions = merge(this.mapOptions, this.options, { arrayMerge: overwriteMergeFunction });

			// handle prop options
			this.center && (this.mapOptions.view.center = this.center);
			this.zoom && (this.mapOptions.view.zoom = this.zoom);
			this.maxZoom && (this.mapOptions.view.maxZoom = this.maxZoom);
			this.minZoom && (this.mapOptions.view.minZoom = this.minZoom);

			// merge styles from config mixin
			this.CONSTS.styles = merge(this.CONSTS.styles, this.styles); // this.styles is the `style` object in `Interface.js` that is accessible because it's defined as a  mixin
		},
		initMap() {
			if (process.browser) {

				// const tileLayer = new ol.layer.Tile({
				// 	source: new ol.source.OSM({
				// 		url: 'https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYWhtYWR3b3JsZCIsImEiOiJjamhlZGZvb2swNDZjM2RvdTBvdzFicnQ3In0._v_rw3NJhc97My8PpRk4mQ',
				// 	}),
				// });

				const tileSource = new ol.source.XYZ({
					url: 'https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYWhtYWR3b3JsZCIsImEiOiJjamhlZGZvb2swNDZjM2RvdTBvdzFicnQ3In0._v_rw3NJhc97My8PpRk4mQ',
					tileSize: [512, 512],
					// zoomOffset: -1,
				});

				const tileLayer = new ol.layer.Tile({
					source: tileSource,
				});

				const layers = this.statisticsMode ? [] : [tileLayer];
				Object.keys(this.layers).map((layerKey) => {
					this.layers[layerKey] = new ol.layer.Vector();
					layers.push(this.layers[layerKey]);
				});

				this.view = new ol.View(this.mapOptions.view);

				this.map = new ol.Map({
					controls: [],
					target: this.$refs.map.id, //this.id had problem
					layers: layers,
					view: this.view,
					interactions: ol.interaction.defaults({
						mouseWheelZoom: !this.disableZoom,
						doubleClickZoom: !this.disableZoom,
						shiftDragZoom: !this.disableZoom,
						pinchZoom: !this.disableZoom,
					}),
				});

				if (this.tooltip) {
					this.tooltipOverlay = new ol.Overlay({
						element: document.getElementById('tooltip'),
						positioning: 'bottom-center',
						offset: [0, -25],
					});

					this.map.addOverlay(this.tooltipOverlay);
				}

				if (!this.statisticsMode) {
					tileSource.on('tileloadend', () => {
						setTimeout(() => {
							this.mapLoaded = true;
						}, 1000);
					});
				}
				else {
					this.mapLoaded = true;
				}

				this.map.on('moveend', (e) => this.handleMoveEndEvent());
				this.map.on('pointermove', (hovered) => this.handleHoverEvent(hovered));
				this.view.on('propertychange', (e) => this.handleViewChangeEvent(e));
			}
		},
		initSelectedFeatures() {
			// init selectedFeatures collection
			this.selectedFeatures = undefined;
			this.selectedFeatures = new ol.Collection([], { unique: true });
			this.tempStyles = {};
		},
		addFeatures() {
			this.polygons && this.polygons.type && this.addPolygons(this.polygons);
			this.points && this.points.type && this.addPoints(this.points);
		},
		setSelectOptions() {
			// set multi select option and the layers that should be included in selectInteraction and hover event
			let layers, multi = false;
			if (!this.selectable) {
				layers = []; // an empty array means none of layers are selectable
			}
			else if (this.selectable === true) {
				layers = undefined; // undefined means all layers are selectable
			}
			else if (typeof this.selectable === 'string') {
				switch (this.selectable) {
					case 'multi':
						layers = undefined;
						multi = true;
						break;
					case 'points':
						layers = [this.layers.points];
						break;
					case 'polygons':
						layers = [this.layers.polygons];
						break;
					case 'userPoints':
						layers = [this.layers.userPoints];
						break;
				}
			}
			else if (Array.isArray(this.selectable)) {
				layers = [];
				this.selectable.forEach((featureType) => {
					layers.push(this.layers[featureType]);
				});
			}
			else {
				// it's an object
				layers = [];
				if (this.selectable.features) {
					this.selectable.features.forEach((featureType) => {
						layers.push(this.layers[featureType]);
					});
					multi = this.selectable.multi || false;
				}
			}

			this.selectOptions = { layers, multi };
		},
		addSelectInteractionToMap() {
			this.clearSelectInteractionFromMap();

			// handle style for initially selected feature
			this.selectedFeatures.forEach((initiallySelectedFeature) => {
				const featureId = initiallySelectedFeature.getId();

				if (this.tempStyles[featureId]) return;

				this.toggleFeatureSelectStatus(initiallySelectedFeature, true);
			});

			// define the select interaction for selectable features
			this.selectInteraction = new ol.interaction.Select({
				condition: ol.eventsCondition.click, // click, singleClick, pointerMove
				toggleCondition: () => {
					return this.selectOptions.multi;
				},
				layers: this.selectOptions.layers,
				// style: , won't work when a style is applied to a feature (feature.setStyle)
				features: this.selectedFeatures,
				filter: (feature) => {
					return this.isSelectable(feature);
				},
			});

			// set the map to use the defined select interaction
			this.map.addInteraction(this.selectInteraction);

			// event triggered when a selectable feature get selected
			this.selectInteraction.on('select', (e) => {

				const restoreOriginalStyle = !this.selectOptions.multi;
				this.handleSelectEvent(e, false, restoreOriginalStyle);
			});
		},
		requestMapRefresh(resetMap, resetView) {
			if (this.mapRefreshRequest.timeout) {
				clearTimeout(this.mapRefreshRequest.timeout);
			}
			this.mapRefreshRequest.timeout = setTimeout(
				() => {
					this.refreshMap(resetMap, resetView);
					this.mapRefreshRequest.timeout = undefined;
				},
				this.mapRefreshRequest.delay
			);
		},
		refreshMap(resetMap, resetView) {
			if (resetMap) {
				this.map.setTarget(null);
				this.map = undefined;
				this.initMap();
			}

			// init mapOptions again to set new values (if any) and decide again for selectInteraction
			this.initMapOptions();

			if (resetMap || resetView) {
				// re-set the map view (map is moved to center point again and zoom will re-set)
				this.view = new ol.View(this.mapOptions.view);
				this.map.setView(this.view);
			}

			// clear the hoveredFeature object
			this.hoveredFeature.clear();

			// reset layers sources (all features will be removed)
			Object.keys(this.layers).map((layerKey) => {
				this.layers[layerKey].setSource(undefined);
			});

			// init this.selectedFeatures with a new empty ol.Collection
			this.initSelectedFeatures();

			// remove selectInteraction from the map
			this.clearSelectInteractionFromMap();

			// add updated features (points, polygons, ...)
			this.addFeatures();

			// re-set select options
			this.setSelectOptions();

			// add selectInteraction to the map
			this.addSelectInteractionToMap();
		},
		requestPan(options) {
			if (this.panRequest.timeout) {
				this.panRequest.options = merge(this.panRequest.options, options);
				clearTimeout(this.panRequest.timeout);
			}
			else {
				this.panRequest.options = options;
			}
			this.panRequest.timeout = setTimeout(
				() => {
					this.pan(this.panRequest.options);
					this.panRequest.timeout = undefined;
					this.panRequest.options = undefined;
				},
				this.panRequest.delay
			);
		},
		pan({center, zoom}) {
			center = center || this.view.getCenter();
			zoom = zoom || this.view.getZoom();
			this.view.animate({
				center,
				zoom,
			});
		},
		makePointStyle(styleObject) {
			let image = {};

			if (styleObject.icon) {
				image = new ol.style.Icon(styleObject.icon);
			}
			else if (styleObject.circle) {
				let stroke = undefined;

				if (styleObject.circle.strokeWidth) {
					stroke = new ol.style.Stroke({
						color: styleObject.circle.strokeColor,
						width: styleObject.circle.strokeWidth,
					});
				}
				image = new ol.style.Circle({
					radius: styleObject.circle.radius,
					fill: new ol.style.Fill({
						color: styleObject.circle.color,
					}),
					stroke: stroke,
				});
			}
			else if (styleObject.square) {
				let stroke = undefined;

				if (styleObject.square.strokeWidth) {
					stroke = new ol.style.Stroke({
						color: styleObject.square.strokeColor,
						width: styleObject.square.strokeWidth,
					});
				}
				image = new ol.style.RegularShape({
					points: 4,
					angle: Math.PI / 4,
					radius: styleObject.square.radius,
					fill: new ol.style.Fill({
						color: styleObject.square.color,
					}),
					stroke: stroke,
				});
			}

			let textStroke = undefined;
			if (styleObject.text && styleObject.text.strokeWidth) {
				textStroke = new ol.style.Stroke({
					color: styleObject.text.strokeColor,
					width: styleObject.text.strokeWidth,
				});
			}

			return new ol.style.Style({
				image: image,
				text: new ol.style.Text({
					text: styleObject.text.text,
					fill: new ol.style.Fill({
						color: styleObject.text.color,
					}),
					scale: styleObject.text.scale,
					font: styleObject.text.font,
					overflow: styleObject.text.overflow,
					stroke: textStroke,
				}),
				zIndex: styleObject.zIndex,
			});
		},
		makePolygonStyle(styleObject) {
			// handle fillColor & strokeColor
			let fillColor, strokeColor;

			const colorTypes = {
				transparent: 'rgba(0, 0, 0, 0)',
				opacity: (color, amount) => {
					amount = amount || 0.3;
					return Color(color).alpha(amount).string();
				},
			};

			if (styleObject.color) {
				fillColor = styleObject.color !== 'transparent' ? colorTypes.opacity(styleObject.color) : styleObject.color;
				strokeColor = styleObject.color;
			}

			// overwrite fillColor/strokeColor if they are present
			fillColor = styleObject.fillColor || fillColor;
			strokeColor = styleObject.strokeColor || strokeColor;

			// set actual transparent color value for fillColor/strokeColor if they are transparent
			fillColor = fillColor === 'transparent' ? colorTypes.transparent : fillColor;
			strokeColor = strokeColor === 'transparent' ? colorTypes.transparent : strokeColor;

			let stroke = undefined;
			if (styleObject.strokeWidth) {
				stroke = new ol.style.Stroke({
					color: strokeColor,
					width: styleObject.strokeWidth,
				});
			}

			let textStroke = undefined;
			if (styleObject.text && styleObject.text.strokeWidth) {
				textStroke = new ol.style.Stroke({
					color: styleObject.text.strokeColor,
					width: styleObject.text.strokeWidth,
				});
			}

			let text = undefined;
			if (styleObject.text) {
				text = new ol.style.Text({
					text: styleObject.text.text,
					fill: new ol.style.Fill({
						color: styleObject.text.color,
					}),
					scale: styleObject.text.scale,
					font: styleObject.text.font,
					overflow: styleObject.text.overflow,
					stroke: textStroke,
				});
			}

			return new ol.style.Style({
				stroke: stroke,
				fill: new ol.style.Fill({
					color: fillColor,
				}),
				text: text,
				zIndex: styleObject.zIndex,
			});
		},
		makeStyle(geometryType, featureTypeProperty, state) {
			if (!geometryType) return;
			geometryType = geometryType.toLowerCase();
			geometryType = geometryType === 'multipolygon' ? 'polygon' : geometryType;

			if (!featureTypeProperty) {
				featureTypeProperty = 'default';
			}

			let secondState = undefined;
			if (!state) {
				state = 'normal';
			}
			else if (Array.isArray(state)) {
				secondState = state[1];
				state = state[0];
			}

			const featureStyles = this.CONSTS.styles[geometryType];
			const featureStyle = featureStyles[featureTypeProperty];
			let styleObject;
			if (featureStyle && featureStyle[state]) {
				styleObject = featureStyle[state];
			}
			else {
				console.warn(`No style found for ${geometryType} type "${featureTypeProperty}", or the state "${state}" is not defined for this type. The default style for this ${geometryType} will be used.`);
				styleObject = featureStyles.default[state];
			}

			if (styleObject.circle) {
				styleObject = merge(featureStyles.default[state], styleObject);
			}
			else if (styleObject.square) {
				styleObject = merge(featureStyles.defaultSquare[state], styleObject);
			}

			let secondStyle = undefined;
			if (secondState) {
				secondStyle = featureStyle[secondState];
			}

			let style;
			switch (geometryType) {
				case 'point':
					if (secondStyle) {
						if (secondStyle.circle && styleObject.circle) {
							styleObject.circle.color = secondStyle.circle.color;
						}
						else if (secondStyle.square && styleObject.square) {
							styleObject.square.color = secondStyle.square.color;
						}
					}
					style = this.makePointStyle(styleObject);
					break;
				case 'polygon':
					if (secondStyle && secondStyle.color && styleObject.color) {
						styleObject.color = secondStyle.color;
					}
					style = this.makePolygonStyle(styleObject);
					break;
			}

			return style;
		},
		makeEventData(feature, includeCoordinates) {
			let geometryType = feature.getGeometry().getType().toLowerCase();
			geometryType = geometryType === 'multipolygon' ? 'polygon' : geometryType;
			const properties = feature.getProperties();

			const eventData = {
				type: geometryType,
				properties: properties,
			};

			if (includeCoordinates) {
				eventData.coordinates = feature.getGeometry().getCoordinates();
			}

			return eventData;
		},
		addPolygons(polygons) {
			const polygonFeatures = [];
			const centerPoints = [];

			const statisticsModePolygonStyle = this.makeStyle('polygon', 'solidGray');

			for (let i = 0; i < polygons.features.length; i++) {
				const polygon = polygons.features[i];

				const polygonFeature = (new ol.format.GeoJSON()).readFeatureFromObject(polygon);
				polygonFeature.setId(`Polygon-${i}`);

				if (!this.statisticsMode) {
					// make style
					const polygonTypeProperty = polygon.properties && polygon.properties.type;
					const polygonState = polygon.properties && polygon.properties.disabled ? 'disabled' : undefined;
					const polygonStyle = this.makeStyle('Polygon', polygonTypeProperty, polygonState);

					// set style
					polygonFeature.setStyle(polygonStyle);
				}
				else {
					polygonFeature.setStyle(statisticsModePolygonStyle);
				}

				// add this polygonFeature to polygonFeatures array
				polygonFeatures.push(polygonFeature);

				// handle isSelected
				const propertyIsSelected = polygon.properties && polygon.properties.isSelected;
				if (propertyIsSelected) {
					this.selectedFeatures.push(polygonFeature);
				}

				if (this.statisticsMode) {
					const centerPointGeoJSON = centerOfMass(polygon);
					const centerPoint = (new ol.format.GeoJSON()).readFeatureFromObject(centerPointGeoJSON);
					centerPoint.setId(`Point-PolygonCenter-${i}`);

					const point = {
						sell: this.CONSTS.styles.point['sellStatisticsPoint'].normal,
						rent: this.CONSTS.styles.point['rentStatisticsPoint'].normal,
					};
					const centerPointProperty = polygon.properties.centerPoint;
					const type = centerPointProperty && centerPointProperty.type || 'sell';
					point[type].circle = merge(point[type].circle, centerPointProperty);
					const centerPointStyle = this.makeStyle('point', `${type}StatisticsPoint`);
					centerPoint.setStyle(centerPointStyle);

					centerPoints.push(centerPoint);
				}
			}

			this.statisticsMode && this.map.addLayer(new ol.layer.Vector({source: new ol.source.Vector({features: centerPoints})}));

			const polygonSource = new ol.source.Vector({
				features: polygonFeatures,
				//overlaps: false, // no effects!
			});

			// set the source of the polygons layer
			this.layers.polygons.setSource(polygonSource);
		},
		addPoints(points) {
			const pointFeatures = [];

			for (let i = 0; i < points.features.length; i++) {
				const point = points.features[i]; // point in GeoJSON format

				const pointFeature = (new ol.format.GeoJSON()).readFeatureFromObject(point);
				pointFeature.setId(`Point-${i}`);

				// make style
				const pointTypeProperty = point.properties && point.properties.type;
				const pointState = point.properties && point.properties.disabled ? 'disabled' : undefined;
				const pointStyle = this.makeStyle('Point', pointTypeProperty, pointState);

				// set style
				pointFeature.setStyle(pointStyle);

				// add this pointFeature to pointFeatures array
				pointFeatures.push(pointFeature);
			}

			const pointSource = new ol.source.Vector({
				features: pointFeatures,
			});

			// set the source of the points layer
			this.layers.points.setSource(pointSource);
		},
		userPointCanBeAdded(userPoints) {
			if (userPoints) {
				if (((typeof userPoints) === 'boolean') || (Number.isInteger(userPoints) && this.currentUserPoints < userPoints)) {
					return true;
				}
				return false;
			}
			return false;
		},
		addUserPoint(coordinates) {
			if (this.userPointCanBeAdded(this.userPoints)) {
				if (!coordinates || !Array.isArray(coordinates)) {
					coordinates = this.view.getCenter();
				}

				const pointGeometry = new ol.geom.Point(coordinates);
				const pointFeature = new ol.Feature(pointGeometry);

				pointFeature.setId(`UserPoint-${this.currentUserPoints}`);

				const pointStyle = this.makeStyle('Point', 'userPoint');
				pointFeature.setStyle(pointStyle);

				if (this.layers.userPoints.getSource()) {
					this.layers.userPoints.getSource().addFeature(pointFeature);
				}
				else {
					const pointSource = new ol.source.Vector({
						features: [ pointFeature ],
					});

					// set the source of the userPoints layer
					this.layers.userPoints.setSource(pointSource);
				}

				this.currentUserPoints++;

				const eventData = this.makeEventData(pointFeature, true);
				this.$emit('userPointAdd', eventData);
			}
		},
		addRandomPoints(num) {
			if (!num) {
				num = 5000;
			}

			const pointsGeoJson = {
				type: "FeatureCollection",
				features: [],
			};

			const
				latMin = 50,
				latMax = 52,
				lngMin = 34,
				lngMax = 36;

			for (let i = 0; i < num; i++) {
				pointsGeoJson.features.push({
					type: "Feature",
					properties: {
						color: Math.random() > 0.5 ? 'sell' : 'rent',
					},
					geometry: {
						type: "Point",
						coordinates: [
							Math.random() * (latMax - latMin) + latMin,
							Math.random() * (lngMax - lngMin) + lngMin,
						],
					},
				});
			}

			this.addPoints(pointsGeoJson);
		},
		clearSelectInteractionFromMap() {
			if (this.selectInteraction) {
				this.map.removeInteraction(this.selectInteraction);
				this.selectInteraction = undefined;
			}
		},
		toggleFeatureSelectStatus(feature, isSelected, restoreOriginalStyle) {
			let geometryType = feature.getGeometry().getType().toLowerCase();
			geometryType = geometryType === 'multipolygon' ? 'polygon' : geometryType;
			const properties = feature.getProperties();
			const featureId = feature.getId();

			// update isSelected property of feature
			feature.setProperties({
				isSelected: isSelected,
			});

			// handle style for the (selected/deselected) feature
			let style;
			if (isSelected) {
				// save the original style for this feature to use later when deselected

				// if it's in hovered state now
				if (this.hoveredFeature.id === featureId) {
					this.tempStyles[featureId] = {
						hover: feature.getStyle(),
						normal: this.hoveredFeature.originalStyle,
					};
					if (this.hoveredFeature.wasSelected) {
						this.hoveredFeature.originalStyle = undefined;
					}
				}
				else {
					this.tempStyles[featureId] = {
						normal: feature.getStyle(),
					};
				}

				// make the style for the selected feature
				const featureTypeProperty = properties && properties.type;
				const disabled = properties && properties.disabled;
				const state = disabled ? ['selected', 'disabledSelected'] : 'selected';
				style = this.makeStyle(geometryType, featureTypeProperty, state);
			}
			else {
				// get the original style for this feature
				if (this.tempStyles[featureId].hover && !restoreOriginalStyle) {
					style = this.tempStyles[featureId].hover;
					if (this.hoveredFeature.id === featureId) {
						this.hoveredFeature.originalStyle = this.tempStyles[featureId].normal;
					}
				}
				else {
					style = this.tempStyles[featureId].normal;
				}

				if (this.hoveredFeature.id === featureId && this.hoveredFeature.wasSelected) {
					style = this.tempStyles[featureId].normal;
				}

				// remove restored style from this.tempStyles
				delete this.tempStyles[featureId];
			}
			style && feature.setStyle(style);
		},
		isSelectable(feature) {
			// check if the given feature can be selected (without considering global selectable prop)
			const properties = feature.getProperties();
			return (properties.selectable !== false) && (!properties.disabled || properties.selectable);
		},
		handleMoveEndEvent() {
			const coordinates = this.view.getCenter();
			this.$emit('centerPoint', {coordinates});
		},
		handleHoverEvent(hovered) {
			// do not hover any element when global selectable is not defined or false
			if (!this.selectable) return;

			const hasFeatureAtPixel = this.map.hasFeatureAtPixel(hovered.pixel);
			const leave = () => {
				if (this.hoveredFeature.feature) {
					const featureId = this.hoveredFeature.id;

					// handle style ////////////////////////////////////////////////
					// if the feature selection status was not changed OR
					// if the feature was selected before and now it's deselected
					if (
						this.hoveredFeature.wasSelected && this.tempStyles[featureId] ||
						!this.hoveredFeature.wasSelected && !this.tempStyles[featureId] ||
						this.hoveredFeature.wasSelected && !this.tempStyles[featureId]
					) {
						const style = this.hoveredFeature.originalStyle; // this is updated when feature is deselected
						style && this.hoveredFeature.feature.setStyle(style); // if it wasSelected and deselected and selected again, style will be undefined
					}
					// else (if the feature was not selected before and now it's selected) do not restore any styles!
					////////////////////////////////////////////////////////////////

					// emit leave event
					this.$emit('leave', this.hoveredFeature.eventData);

					// hide tooltip
					this.hideTooltip();

					// clear hoveredFeature object
					this.hoveredFeature.clear();
				}
			};

			if (hasFeatureAtPixel) {
				const featuresAtPixel = [];
				this.map.forEachFeatureAtPixel(
					hovered.pixel,
					(feature, layer) => {
						featuresAtPixel.push({feature, layer});
					},
					// { // options
					// 	layerFilter: ,
					// 	hitTolerance: ,
					// }
				);

				const featureAtPixel = featuresAtPixel[0];
				const feature = featureAtPixel.feature;
				const layer = featureAtPixel.layer;
				const featureId = feature.getId();
				if (this.hoveredFeature.id !== featureId) {
					// emit leave event for the previous hovered feature (if any) & reset the hoveredFeature object
					leave();

					const layerIncluded = this.selectOptions.layers ? this.selectOptions.layers.includes(layer) : true;
					if (!layerIncluded) return;

					// check hover ability for this feature
					if (!this.isSelectable(feature)) return;

					if (featuresAtPixel.length > 1) {
						console.warn('More than one feature hovered at a pixel, just the first one is considered.');
					}

					const eventData = this.makeEventData(feature);
					this.$emit('hover', eventData);

					this.hoveredFeature.id = featureId;
					this.hoveredFeature.feature = feature;
					this.hoveredFeature.eventData = eventData;
					this.hoveredFeature.originalStyle = feature.getStyle();
					this.hoveredFeature.wasSelected = !!this.tempStyles[featureId];

					// update style
					const geometry = feature.getGeometry();
					const geometryType = geometry.getType();
					const properties = feature.getProperties();
					const featureTypeProperty = properties && properties.type;
					const disabled = properties && properties.disabled;
					const state = disabled ? ['hover', 'disabled'] : 'hover';
					const hoveredStyle = this.makeStyle(geometryType, featureTypeProperty, state);
					feature.setStyle(hoveredStyle);

					// show tooltip
					this.showTooltipForFeature(feature);
				}
			}
			else {
				leave();
			}
		},
		handleViewChangeEvent(e) {
			this.$emit('viewChange', e);
		},
		handleSelectEvent(e, silent, restoreOriginalStyle) {
			e.deselected.forEach((deselectedFeature) => {
				this.toggleFeatureSelectStatus(deselectedFeature, false, restoreOriginalStyle);
			});
			e.selected.forEach((selectedFeature) => {
				this.toggleFeatureSelectStatus(selectedFeature, true);
			});

			if (!silent) {
				// make an array of selected feature
				let index = -1;
				const items = [];
				this.selectedFeatures.forEach((feature, i) => {
					items.push(this.makeEventData(feature));
					if (feature === e.selected[0]) {
						index = i;
					}
				});
				const eventData = {
					items: items,
					index: index,
					item: items[index],
				};

				this.$emit('select', eventData);
			}
		},
		toggleTooltip(coordinates, model) {
			if (!this.tooltip) return;

			if (coordinates && model) {
				this.tooltipModel = model;
			}
			else {
				this.tooltipModel = undefined;
			}

			this.$nextTick(() => {
				this.tooltipOverlay.setPosition(coordinates);
			});
		},
		showTooltipForFeature(feature) {
			if (!feature || !this.tooltip) return;

			const geometry = feature.getGeometry();

			// for now, only point tooltips are supported
			if (geometry.getType() !== 'Point') return;

			const coordinates = geometry.getCoordinates();
			const properties = feature.getProperties();

			const model = properties && properties.model;

			this.toggleTooltip(coordinates, model);
		},

		// methods for external use
		select(id, geometryType) {
			let itemFound = false;

			// define a flag to return as the result
			const result = {
				selected: false,
				status: 'NOT_FOUND',
				message: `Item with id "${id}" not found to select.`,
			};

			if (!this.selectOptions.multi && this.selectedFeatures.getLength() > 0) {
				this.deselectAll(true);
			}

			// get the polygon and point feature
			const polygonFeatures = this.layers.polygons && this.layers.polygons.getSource() && this.layers.polygons.getSource().getFeatures();
			const pointFeatures = this.layers.points && this.layers.points.getSource() && this.layers.points.getSource().getFeatures();

			const findAndSelect = (features) => {
				if (!features) return;
				features.every((feature, index) => {
					if (feature && feature.getProperties()) {
						const idProperty = feature.getProperties().id;
						if (idProperty === id) {
							itemFound = true;

							const selectEventData = {
								selected: [],
								deselected: [],
							};

							try {
								selectEventData.selected.push(feature);
								this.selectedFeatures.push(feature);
								this.handleSelectEvent(selectEventData);
								result.selected = true;
								result.status = 'SELECTED';
								result.message = `Item with id "${id}" successfully selected.`;
							}
							catch (e) {
								if (e.code === 58) {
									result.selected = false;
									result.status = 'ALREADY_SELECTED';
									result.message = `Item with id "${id}" is already selected.`;
								}
								else {
									result.selected = false;
									result.status = 'ERROR';
									result.message = `Item with id "${id}" found but something happened. OpenLayers error code: ${e.code}`;
								}
							}

							// break the every loop
							return false;
						}

						// continue the every loop
						return true;
					}
				});
			};

			if (geometryType) {
				geometryType = geometryType.toLowerCase();
				geometryType = geometryType === 'multipolygon' ? 'polygon' : geometryType;
				if (geometryType === 'point') {
					findAndSelect(pointFeatures);
				}
				else if (geometryType === 'polygon') {
					findAndSelect(polygonFeatures);
				}
			}
			else {
				// the polygons have priority
				findAndSelect(polygonFeatures);

				// if the feature with specified id not found yet
				if (!itemFound) {
					findAndSelect(pointFeatures);
				}
			}

			return result;
		},
		deselect(id) {
			// define a flag to return as the result
			let successFlag = false;

			// get the actual array in order to have 'every' function which does not exist in ol.Collection
			const selectedFeaturesArray = this.selectedFeatures.getArray();

			selectedFeaturesArray.every((feature, index) => {
				if (feature && feature.getProperties()) {
					const idProperty = feature.getProperties().id;
					if (idProperty === id) {
						successFlag = true;

						const deselectEventData = {
							selected: [],
							deselected: [],
						};
						deselectEventData.deselected.push(feature);

						this.selectedFeatures.removeAt(index);

						this.handleSelectEvent(deselectEventData, false, true);

						// break the every loop
						return false;
					}

					// continue the every loop
					return true;
				}
			});

			return successFlag;
		},
		deselectAll(silent) {

			const deselectEventData = {
				selected: [],
				deselected: [],
			};
			this.selectedFeatures.getArray().forEach((feature) => {
				deselectEventData.deselected.push(feature);
			});

			// deselect all selected feature
			this.selectedFeatures.clear();

			this.handleSelectEvent(deselectEventData, silent, true);

			return true;
		},
		showTooltip(id) {
			if (!id || !this.tooltip) return;

			const targetFeature = this.layers.points.getSource().getFeatures().filter((feature) => {
				const properties = feature.getProperties();
				return properties && properties.id === id;
			})[0];

			if (!targetFeature) return;

			this.showTooltipForFeature(targetFeature);
		},
		hideTooltip() {
			this.toggleTooltip(undefined);
		},
		getBounds() {
			return this.view.calculateExtent();
		},
		getBoundsAsPolygonCoordinates() {
			const bounds = this.getBounds();
			const polygon = ol.geom.Polygon.fromExtent(bounds);
			return polygon.getCoordinates()[0];
		},
		isCenterInPolygons() {
			const center = this.view.getCenter();
			const polygonFeatures = this.layers.polygons.getSource().getFeatures();
			const polygonsGeoJSON = (new ol.format.GeoJSON()).writeFeaturesObject(polygonFeatures);

			let result = false;
			polygonsGeoJSON.features.every((polygon, index) => {
				if (booleanPointInPolygon(center, polygon)) {
					result = true;

					// break the every loop
					return false;
				}

				// continue the every loop
				return true;
			});

			return result;
		},
	},
};
</script>

<style lang="stylus" scoped>
	.map-container {
		min-height 100px
		position relative
		height 100%
		display flex
		flex-direction column

		.hidden {
			display none
		}

		.map {
			height 100%
		}

		.toolbar {
			position absolute
			top 0
			right 0
		}

		.point {
			position absolute
			left 50%
			top 50%
			transform translate(-50%, -50%)
			width 50px
			height 50px
			z-index 99
		}

		.point > img {
			width 100%
			height 100%
			margin-top -50%
		}

		.map-overlay {
			position absolute
			top 0
			bottom 0
			left 0
			right 0
			background-color rgba(0, 0, 0, 0.3)
			z-index 1
			display flex
			justify-content center
			align-items center
			height 100%
			overflow hidden

			.loader {
				position absolute
				font-size 3em
				border 0.15rem solid #cdcdcd
				border-radius 50%
				border-top 0.15rem solid #696969
				width 1em
				height 1em
				-webkit-animation spin 2s linear infinite /* Safari */
				animation spin 2s linear infinite
			}

			/* Safari */
			@-webkit-keyframes spin {
				0% { -webkit-transform: rotate(0deg) }
				100% { -webkit-transform: rotate(360deg) }
			}

			@keyframes spin {
				0% { transform: rotate(0deg) }
				100% { transform: rotate(360deg) }
			}
		}
	}
</style>
