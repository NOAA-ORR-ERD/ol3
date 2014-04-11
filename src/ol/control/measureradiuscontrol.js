goog.provide('ol.control.MeasureRadius');



/**
 * Add a button that allows radial measurements
 *
 * @constructor
 * @extends {ol.control.Control}
 * @param {olx.control.ControlOptions=} opt_options Radial measurement options
 */
ol.control.MeasureRadius = function(opt_options) {
  var options = goog.isDef(opt_options) ? opt_options : {};

  var cssClassName = goog.isDef(options.className) ?
      options.className : 'ol-measure-radius';

  var tipLabel = goog.isDef(options.tipLabel) ?
      options.tipLabel : 'Radial Measure';

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
    name: 'measure-radius'
  });

  /**
   * @private
   * @type {boolean}
   */
  this.initialized_ = false;

  /**
   * @private
   * @type {ol.interaction.Draw}
   */
  this.draw_ = null;

  var element = goog.dom.createDom(goog.dom.TagName.DIV, {
    'class': cssClassName + ' ' + ol.css.CLASS_UNSELECTABLE
  }, this.button);

  goog.base(this, {
    element: element,
    target: options.target
  });
};
goog.inherits(ol.control.MeasureRadius, ol.control.Control);


/**
 * @private
 */
ol.control.MeasureRadius.prototype.initialize_ = function() {
  var map = this.getMap();
  map.addLayer(this.vector_);

  this.initialized_ = true;
};


/**
 * Method for toggling the map interactivity of drawing radial measures
 *
 * @public
 */
ol.control.MeasureRadius.prototype.toggle = function() {
  var map = this.getMap();

  goog.dom.classes.toggle(this.button, 'on');

  if (this.draw_ === null) {
    this.draw_ = new ol.interaction.Draw({
      source: this.source_,
      type: /** @type {ol.geom.GeometryType} */ ('Circle')
    });
    map.addInteraction(this.draw_);

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
ol.control.MeasureRadius.prototype.handleClick_ = function(pointerEvent) {
  this.toggle();
};


/**
 * @public
 * @param {ol.MapEvent} mapEvent
 */
ol.control.MeasureRadius.prototype.handleMapPostrender = function(mapEvent) {
  if (goog.isNull(mapEvent.frameState)) {
    if (goog.isDefAndNotNull(mapEvent.frameState.view2DState)) {
      return;
    }
  }
  if (!this.initialized_) {
    this.initialize_();
  }
};
