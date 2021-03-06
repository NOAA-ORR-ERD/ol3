goog.provide('ol.control.MeasureArea');

goog.require('goog.dom');
goog.require('goog.dom.TagName');
goog.require('goog.dom.classlist');
goog.require('ol.control.Control');
goog.require('ol.css');
goog.require('ol.events');
goog.require('ol.events.EventType');
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
 * @api
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

  /**
   * @private
   * @type {boolean}
   */
  this.hasLayer_ = false;

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
  ol.events.listen(buttonHandler,
      ol.pointer.EventType.POINTERUP, this.handleClick_, this);

  ol.events.listen(this.button, ol.events.EventType.MOUSEOUT,
  function() {
    this.blur();
  });

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
 * @public
 * @param {ol.Feature} feature Feature to format text for
 * @return {string} formated string of distances
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
 * Sets up listeners for hover and click events on relavent layer.
 *
 * @private
 */
ol.control.MeasureArea.prototype.addListeners = function() {
  var map = this.getMap();

  ol.events.listen(
      map.getViewport(),
      ol.events.EventType.MOUSEUP,
      function(evt) {
        var pixel = map.getEventPixel(evt);
        var feature = map.forEachFeatureAtPixel(pixel, function(f) {
          if (f.get('layer') == 'area_measure') {
            return f;
          }
        }, null);
        if (feature) {
          this.source_.removeFeature(feature);
        }
      }, this);

  ol.events.listen(
      map.getViewport(),
      ol.events.EventType.MOUSEMOVE,
      function(evt) {
        var pixel = map.getEventPixel(evt);
        var feature = map.forEachFeatureAtPixel(pixel, function(f) {
          if (f.get('layer') == 'area_measure') {
            return f;
          }
        }, null);
        if (feature) {
          // map.getViewport().style.cursor = 'pointer';

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
            ol.control.MeasureArea.ACTIVE_RULER = null;
          }
          // if(map.getViewport().style.cursor === 'pointer'){
          //   map.getViewport().style.cursor = '';
          // }
        }
      });
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

  goog.dom.classlist.toggle(this.button, 'on');
  if (!this.hasLayer_) {
    this.hasLayer_ = true;
    map.addLayer(this.vector_);
    this.addListeners();
  }

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
 * @param {ol.interaction.DrawEvent} drawEvent Draw event
 */
ol.control.MeasureArea.prototype.drawEnd_ = function(drawEvent) {
  var feature = drawEvent.feature;
  feature.set('layer', 'area_measure');

  feature.setStyle(function(resolution) {
    var text = ol.control.MeasureArea.formatFeatureText(feature);
    var style = [ol.control.MeasureArea.AREA_DEFAULT_STYLE(text)];
    return style;
  });

  this.toggle();
};
