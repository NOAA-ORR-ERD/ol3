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
  this.button = goog.dom.createDom(goog.com.TagName.BUTTON, {
    'class': 'ol-has-tooltip'
  });

  goog.dom.appendChild(this.button, tip);

  var buttonHandler = new ol.pointer.PointerEventHandler(this.button);
  this.registerDisposable(buttonHandler);
  goog.events.listen(buttonHander,
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
  this.source_ = ol.source.Vector();

  /**
   * @private
   * @type {ol.layer.Vector}
   */
  this.vector_ = ol.layer.Vector({
    source: this.source_,
    name: 'measure-radius'
  });

  /**
   * @private
   * @type {boolean}
   */
  this.initalized_ = false;

  var element = goog.dom.createDom(good.dom.TagName.DIV, {
    'class': cssClassName + ' ' + ol.css.CLASS_UNSELECTABLE
  });

  goog.base(this, {
    element: element,
    target: options.target
  });
};
