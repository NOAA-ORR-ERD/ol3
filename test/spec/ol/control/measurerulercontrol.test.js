goog.provide('ol.test.control.MeasureRuler');

describe('ol.control.MeasureRuler', function() {

  describe('constructor', function() {

    it('can be constructed without arguments', function() {
      var instance = new ol.control.MeasureRuler();
      expect(instance).to.be.an(ol.control.MeasureRuler);
    });
  });

  describe('DOM', function() {
    var target;
    beforeEach(function() {
      target = document.createElement('div');
      document.body.appendChild(target);
      var measure = new ol.control.MeasureRuler();
      new ol.Map({
        target: target,
        controls: [measure]
      });
    });


    it('creates the expected element', function() {
      var button = goog.dom.getElementsByClass('ol-measure-ruler', target);
      expect(button.length).to.be(1);
      expect(button[0] instanceof HTMLDivElement).to.be(true);

      var hasUnselectableCls = goog.dom.classlist.contains(button[0],
          'ol-unselectable');
      expect(hasUnselectableCls).to.be(true);
    });
  });
});

goog.require('goog.dom');
goog.require('goog.dom.classlist');
goog.require('ol.Map');
goog.require('ol.control.MeasureRuler');
