goog.provide('ol.control.MeasureRuler');

goog.require('goog.dom');
goog.require('goog.events');
goog.require('ol.control.Control');
goog.require('ol.css');
goog.require('ol.geom.Geometry');
goog.require('ol.geom.LineString');
goog.require('ol.interaction.Draw');
goog.require('ol.pointer.PointerEventHandler');



/**
 * Adds a button that allows measurement utilizing a LineString.
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {olx.control.ControlOptions=} opt_options Measure ruler options.
 */
ol.control.MeasureRuler = function(opt_options) {
  var options = goog.isDef(opt_options) ? opt_options : {};

  /**
   * @public
   * @type {string}
   */
  this.name = 'ol.control.MeasureRuler';

  /**
   * @private
   * @type {?ol.interaction.Draw}
   */
  this.draw_ = null;

  var cssClassName = goog.isDef(options.className) ?
      options.className : 'ol-measure';

  var tipLabel = goog.isDef(options.tipLabel) ?
      options.tipLabel : 'Measure - Click existing point to end line.' +
          ' Click existing ruler to remove';

  var tip = goog.dom.createDom(goog.dom.TagName.SPAN, {
    'role': 'tooltip'
  }, tipLabel);

  /**
   * @public
   * @type {element}
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
    name: 'measure'
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
goog.inherits(ol.control.MeasureRuler, ol.control.Control);


/**
 * Method for formatting the text to print on the ruler
 *
 * @public
 * @param {ol.Feature} feature Feature to format text for
 * @return {string}
 */
ol.control.MeasureRuler.formatFeatureText = function(feature) {
  var geom = /** @type {ol.geom.LineString} */ (feature.getGeometry());
  var length = geom.getLength();
  var str = '';
  var conversions = {};
  // calculate the nautical miles
  conversions.nm = length / 1852;
  // calculate the miles
  conversions.mi = length / 1609.3;
  // calculate the kilometers
  conversions.km = length / 1000;

  for (var key in conversions) {
    if (conversions[key].toString().split('.')[0].length < 2) {
      // round to 10s if single digit
      conversions[key] = Math.round(conversions[key] * 10) / 10;
    } else {
      // round to nearest whole number
      conversions[key] = Math.round(conversions[key]);
    }
  }

  str += conversions.nm + ' nm | ';
  str += conversions.mi + ' mi | ';
  str += conversions.km + ' km';

  return str;
};


/**
 * @public
 * @param {ol.MapEvent} mapEvent
 */
ol.control.MeasureRuler.prototype.handleMapPostrender = function(mapEvent) {
  if (goog.isNull(mapEvent.frameState)) {
    if (goog.isDefAndNotNull(mapEvent.frameState.view2DState)) {
      return;
    }
  }
  if (!this.initialized_) {
    this.initalize_();
  }
};


/**
 * Initializes adds a layer to the map that will contain any rulers added
 * and sets up listeners for hover and click events on that layer.
 *
 * @private
 */
ol.control.MeasureRuler.prototype.initalize_ = function() {
  var map = this.getMap();
  map.addLayer(this.vector_);

  goog.events.listen(
      map.getViewport(),
      goog.events.EventType.MOUSEUP,
      function(evt) {
        var pixel = map.getEventPixel(evt);
        var set = map.forEachFeatureAtPixel(pixel, function(feature, layer) {
          if (layer.get('name') === 'measure') {
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
          if (l.get('name') === 'measure') {
            return f;
          }
          return false;
        });
        if (feature) {
          map.getViewport().style.cursor = 'pointer';

          ol.control.MeasureRuler.ACTIVE_RULER = feature;
          feature.setStyle(function(resolution) {
            var text = ol.control.MeasureRuler.formatFeatureText(feature);
            var style = [ol.control.MeasureRuler.RULER_HOVER_STYLE(text)];
            return style;
          });
        } else {
          if (ol.control.MeasureRuler.ACTIVE_RULER) {
            feature = ol.control.MeasureRuler.ACTIVE_RULER;
            feature.setStyle(function(resolution) {
              var text = ol.control.MeasureRuler.formatFeatureText(feature);
              var style = [ol.control.MeasureRuler.RULER_DEFAULT_STYLE(text)];
              return style;
            });
            ol.control.MeasureRuler.ACTIVE_RULER = null;
          }
          map.getViewport().style.cursor = '';
        }
      });
  this.initialized_ = true;
};


/**
 * A pseudo constant as text for the ruler is part of the style. Defines
 * the default style for rulers.
 *
 * @public
 * @param {string} text Text to be writen on top of the ruler
 * @return {ol.style.Style} Fully typed OpenLayers style object
 */
ol.control.MeasureRuler.RULER_DEFAULT_STYLE = function(text) {
  return new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(255, 255, 255, 0.2)'
    }),
    stroke: new ol.style.Stroke({
      color: '#ffcc33',
      width: 4,
      lineCap: 'square'
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
 * A pseudo constant as text for the ruler is part of style. Defines
 * the hover style for rulers.
 *
 * @public
 * @param {string} text Text to be writen on top of the ruler
 * @return {ol.style.Style} Fully typed OpenLayers style object
 */
ol.control.MeasureRuler.RULER_HOVER_STYLE = function(text) {
  return new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(255, 255, 255, 0.2)'
    }),
    stroke: new ol.style.Stroke({
      color: '#0099ff',
      width: 6,
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
 * Method for toggling the map interactivity of drawing rulers
 *
 * @public
 */
ol.control.MeasureRuler.prototype.toggle = function() {
  var map = this.getMap();

  goog.dom.classes.toggle(this.button, 'on');

  if (this.draw_ === null) {
    this.draw_ = new ol.interaction.Draw({
      source: this.source_,
      type: /** @type {ol.geom.GeometryType} */ ('LineString')
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
ol.control.MeasureRuler.prototype.handleClick_ = function(pointerEvent) {
  this.toggle();
};


/**
 * @private
 * @param {ol.DrawEvent} drawEvent
 */
ol.control.MeasureRuler.prototype.drawEnd_ = function(drawEvent) {
  var map = this.getMap();
  var feature = event.feature;

  feature.setStyle(function(resolution) {
    var text = ol.control.MeasureRuler.formatFeatureText(feature);
    var style = [ol.control.MeasureRuler.RULER_DEFAULT_STYLE(text)];
    return style;
  });

  var controls = map.getControls();
  controls.forEach(function(ctrl) {
    if (ctrl.name == 'ol.control.MeasureRuler') {
      ctrl.toggle();
    }
  });
};
