goog.provide('ol.control.MeasureArea');

goog.require('goog.debug.Console');
goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.dom.classes');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('ol.control.Control');
goog.require('ol.css');
goog.require('ol.geom.Geometry');
goog.require('ol.geom.Polygon');
goog.require('ol.interaction.Draw');
goog.require('ol.layer.Vector');
goog.require('ol.pointer.PointerEventHandler');
goog.require('ol.source.Vector');
goog.require('ol.style.Circle');
goog.require('ol.style.Fill');
goog.require('ol.style.Stroke');
goog.require('ol.style.Style');
goog.require('ol.style.Text');



/**
 * Adds a button that allows measurement utilizing a Polygon.
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {olx.control.ControlOptions=} opt_options Measure area options.
 */
ol.control.MeasureArea = function(opt_options) {
  var options = goog.isDef(opt_options) ? opt_options : {};

  /**
   * @public
   * @type {string}
   */
  this.name = 'ol.control.MeasureArea';

  /**
   * @private
   * @type {?ol.interaction.Draw}
   */
  this.draw_ = null;

  var cssClassName = goog.isDef(options.className) ?
      options.className : 'ol-measure-area';

  var tipLabel = goog.isDef(options.tipLabel) ?
      options.tipLabel : 'Area - Click start point to end polygon.' +
          ' Click existing area to remove';

  var tip = goog.dom.createDom(goog.dom.TagName.SPAN, {
    'role': 'tooltip'
  }, tipLabel);

  /**
   * @public
   * @type {Element}
   */
  this.button = goog.dom.createDom(goog.dom.TagName.BUTTON, {
    'class': 'ol-has-tooltip'
  });

  goog.dom.appendChild(this.button, tip);

  var buttonHandler = new ol.pointer.PointerEventHandler(this.button);
  this.registerDisposable(buttonHandler);
  goog.events.listen(buttonHandler,
      ol.pointer.EventType.POINTERUP, this.handleClick_, false, this);

  goog.events.listen(this.button, [
    goog.events.EventType.MOUSEOUT,
    goog.events.EventType.FOCUSOUT
  ], function() {
    this.blur();
  }, false);

  /**
   * @private
   * @type {ol.source.Vector}
   */
  this.source_ = new ol.source.Vector();

  /**
   * @private
   * @type {ol.layer.Vector}
   */
  this.vector_ = new ol.layer.Vector({
    source: this.source_,
    name: 'measure-area'
  });

  /**
   * @private
   * @type {boolean}
   */
  this.initialized_ = false;

  var element = goog.dom.createDom(goog.dom.TagName.DIV, {
    'class': cssClassName + ' ' + ol.css.CLASS_UNSELECTABLE
  }, this.button);

  goog.base(this, {
    element: element,
    target: options.target
  });
};
goog.inherits(ol.control.MeasureArea, ol.control.Control);


/**
 * Method for formatting the text to print on the area
 *
 * @public
 * @param {ol.Feature} feature Feature to format text for
 * @return {string}
 */
ol.control.MeasureArea.formatFeatureText = function(feature) {
  var geom = /** @type {ol.geom.Polygon} */ (feature.getGeometry());
  var area = geom.getArea();
  var str = '';
  var conversions = {};
  // calculate the kilometers
  conversions.km = area / 1000000;
  // calculate the nautical miles
  conversions.nm = conversions.km * 0.2915533496;
  // calculate the miles
  conversions.mi = conversions.km * 0.38610;
  

  for (var key in conversions) {
    if (conversions[key].toString().split('.')[0].length < 2) {
      // round to 10s if single digit
      conversions[key] = Math.round(conversions[key] * 10) / 10;
    } else {
      // round to nearest whole number
      conversions[key] = Math.round(conversions[key]);
    }
  }

  str += conversions.nm + ' nm2 | ';
  str += conversions.mi + ' mi2 | ';
  str += conversions.km + ' km2';

  return str;
};


/**
 * @public
 * @param {ol.MapEvent} mapEvent
 */
ol.control.MeasureArea.prototype.handleMapPostrender = function(mapEvent) {
  if (goog.isNull(mapEvent.frameState)) {
    if (goog.isDefAndNotNull(mapEvent.frameState.view2DState)) {
      return;
    }
  }
  if (!this.initialized_) {
    this.initialize_();
  }
};


/**
 * Initializes adds a layer to the map that will contain any areas added
 * and sets up listeners for hover and click events on that layer.
 *
 * @private
 */
ol.control.MeasureArea.prototype.initialize_ = function() {
  var map = this.getMap();
  map.addLayer(this.vector_);

  goog.events.listen(
      map.getViewport(),
      goog.events.EventType.MOUSEUP,
      function(evt) {
        var pixel = map.getEventPixel(evt);
        var set = map.forEachFeatureAtPixel(pixel, function(feature, layer) {
          if (layer.get('name') === 'measure-area') {
            return {layer: layer, feature: feature};
          }
        });
        if (set) {
          set.layer.getSource().removeFeature(set.feature);
        }
      });

  goog.events.listen(
      map.getViewport(),
      goog.events.EventType.MOUSEMOVE,
      function(evt) {
        var pixel = map.getEventPixel(evt);
        var feature = map.forEachFeatureAtPixel(pixel, function(f, l) {
          if (l.get('name') === 'measure-area') {
            return f;
          }
          return false;
        });
        if (feature) {
          map.getViewport().style.cursor = 'pointer';

          ol.control.MeasureArea.ACTIVE_AREA = feature;
          feature.setStyle(function(resolution) {
            var text = ol.control.MeasureArea.formatFeatureText(feature);
            var style = [ol.control.MeasureArea.AREA_HOVER_STYLE(text)];
            return style;
          });
        } else {
          if (ol.control.MeasureArea.ACTIVE_AREA) {
            feature = ol.control.MeasureArea.ACTIVE_AREA;
            feature.setStyle(function(resolution) {
              var text = ol.control.MeasureArea.formatFeatureText(feature);
              var style = [ol.control.MeasureArea.AREA_DEFAULT_STYLE(text)];
              return style;
            });
            ol.control.MeasureArea.ACTIVE_AREA = null;
          }
          map.getViewport().style.cursor = '';
        }
      });
  this.initialized_ = true;
};


/**
 * A pseudo constant as text for the area is part of the style. Defines
 * the default style for areas.
 *
 * @public
 * @param {string} text Text to be writen on top of the area
 * @return {ol.style.Style} Fully typed OpenLayers style object
 */
ol.control.MeasureArea.AREA_DEFAULT_STYLE = function(text) {
  return new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(255, 204, 51, 0.4)'
    }),
    stroke: new ol.style.Stroke({
      color: '#ffcc33',
      width: 2,
      lineCap: 'round'
    }),
    image: new ol.style.Circle({
      radius: 7,
      fill: new ol.style.Fill({
        color: '#ffcc33'
      })
    }),
    text: new ol.style.Text({
      font: '11px Calibri, sans-serif',
      text: text,
      fill: new ol.style.Fill({
        color: '#000'
      }),
      stroke: new ol.style.Stroke({
        color: '#fff',
        width: 2
      })
    })
  });
};


/**
 * A pseudo constant as text for the area is part of style. Defines
 * the hover style for areas.
 *
 * @public
 * @param {string} text Text to be writen on top of the area
 * @return {ol.style.Style} Fully typed OpenLayers style object
 */
ol.control.MeasureArea.AREA_HOVER_STYLE = function(text) {
  return new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(0, 153, 204, 0.4)'
    }),
    stroke: new ol.style.Stroke({
      color: '#0099ff',
      width: 4,
      lineCap: 'square'
    }),
    text: new ol.style.Text({
      font: '11px Calibri, sans-serif',
      text: text,
      fill: new ol.style.Fill({
        color: '#000'
      }),
      stroke: new ol.style.Stroke({
        color: '#fff',
        width: 2
      })
    })
  });
};


/**
 * Method for toggling the map interactivity of drawing areas
 *
 * @public
 */
ol.control.MeasureArea.prototype.toggle = function() {
  var map = this.getMap();

  goog.dom.classes.toggle(this.button, 'on');

  if (this.draw_ === null) {
    this.draw_ = new ol.interaction.Draw({
      source: this.source_,
      type: /** @type {ol.geom.GeometryType} */ ('Polygon')
    });
    map.addInteraction(this.draw_);

    this.draw_.on('drawend', this.drawEnd_, this);
  } else {
    map.removeInteraction(this.draw_);
    this.draw_ = null;
    this.button.blur();
  }
};


/**
 * @private
 * @param {ol.pointer.PointerEvent} pointerEvent Pointer Event
 */
ol.control.MeasureArea.prototype.handleClick_ = function(pointerEvent) {
  this.toggle();
};


/**
 * @private
 * @param {ol.DrawEvent} drawEvent
 */
ol.control.MeasureArea.prototype.drawEnd_ = function(drawEvent) {
  var map = this.getMap();
  var feature = drawEvent.feature;

  feature.setStyle(function(resolution) {
    var text = ol.control.MeasureArea.formatFeatureText(feature);
    var style = [ol.control.MeasureArea.AREA_DEFAULT_STYLE(text)];
    return style;
  });

  var controls = map.getControls();
  controls.forEach(function(ctrl) {
    if (ctrl.name == 'ol.control.MeasureArea') {
      ctrl.toggle();
    }
  });
};
