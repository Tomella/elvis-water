{



   // Conditionally loads markers given a min and max zoom.
   // Author: Ishmael Smyrnow

   L.ConditionalMarkers = L.FeatureGroup.extend({

      _markers: [],
      _layer: null,

      options: {
        minZoomShow: 0,
        maxZoomShow: 99,
        viewportPadding: 1 // Percentage of viewport, [0-1.0]
      },

      initialize: function (options) {
        L.Util.setOptions(this, options);
      },

      addLayer: function (layer) {
        this._markers.push(layer);
        this._update();
      },

      removeLayer: function (layer) {
        var markerIndex;

        for (var i = 0; i < this._markers.length; i++) {
          if (this._markers[i] == layer) {
            markerIndex = i;
            break;
          }
        }

        if (typeof markerIndex !== 'undefined') {
          this._markers.splice(markerIndex, 1);
          this._layer.removeLayer(layer);
        }
      },

      onAdd: function (map) {
        this._map = map;
        var self = this;

        map.on("moveend", function (e) { self._update.call(self, e); });
        map.on("zoomend", function (e) { self._update.call(self, e); });

        // Add layer to the map
        this._layer = new L.FeatureGroup();
        this._map.addLayer(this._layer);

        L.FeatureGroup.prototype.onAdd.call(this, map);
      },

      _update: function (e) {
        // Perform updates to markers on map
        var zoom = this._map.getZoom();

        if (zoom >= this.options.minZoomShow && zoom <= this.options.maxZoomShow) {
          this._addMarkers();
          this._cleanupMarkers();
        } else {
          this._removeMarkers();
        }
      },

      _addMarkers: function () {
        // Add select markers to layer; skips existing ones automatically
        var i, marker;

        var markers = this._getMarkersInViewport(this._map);

        for (i = 0; i < markers.length; i++) {
          marker = markers[i];
          this._layer.addLayer(marker);
        }
      },

      _removeMarkers: function () {
        this._layer.clearLayers();
      },

      _cleanupMarkers: function () {
        // Remove out-of-bounds markers
        // Also keep those with popups or in expanded clusters
        var bounds = this._map.getBounds().pad(this.options.viewportPadding);

        this._layer.eachLayer(function (marker) {
          if (!bounds.contains(marker.getLatLng()) && (!marker._popup || !marker._popup._container)) {
            this._layer.removeLayer(marker);
          }
        }, this);
      },

      _getMarkersInViewport: function (map) {
        var markers = [],
          bounds = map.getBounds().pad(this.options.viewportPadding),
          i,
          marker;

        for (i = 0; i < this._markers.length; i++) {
          marker = this._markers[i];
          if (bounds.contains(marker.getLatLng())) {
            markers.push(marker);
          }
        }

        return markers;
      }

    });

    L.conditionalMarkers = function (markers, options) {
      return new L.ConditionalMarkers(markers, options);
    };


   class WaterRegionsService {
      constructor($http, configService, mapService) {
         this.$http = $http;
         this.configService = configService;
         this.mapService = mapService;
      }

      config() {
         return this.configService.getConfig("regions");
      }

      features() {
         return this.config().then(config => this.$http.get(config.regionsUrl, { cache: true }).then(response => response.data.features));
      }

      draw() {
         if (this.promise) {
            return this.promise;
         }

         this.promise = this.config().then(config => this.mapService.getMap().then(map => this.features().then(features => {
            let divisions = this.divisions = [];
            let regions = this.regions = [];
            let divisionsMap = this.divisionsMap = {};
            let layerGroup = L.conditionalMarkers({minZoomShow: 6});

            features.forEach(feature => {
               let name = feature.properties.Division;
               divisionsMap[name] = divisionsMap[name] || [];
               divisionsMap[name].push(feature);
            });

            layerGroup.addTo(map);

            Object.keys(divisionsMap).forEach((key, index) => {
               let features = divisionsMap[key];
               let color = config.divisionColors[index % config.divisionColors.length];

               let division = L.geoJson(features, {
                  onEachFeature: (feature, layer) => {
                     let region = {
                        layer: layer,
                        name: feature.properties.RivRegName,
                        feature: feature,
                        show: function() {
                           this.layer.openPopup();
                        },
                        hide: function() {
                           this.layer._map.closePopup();
                        }
                     };

                     // "bbox":[130.8875,-13.635000001,131.659843179235,-12.0425]
                     let bbox = feature.bbox;
                     let latLng = feature.properties.placement? [feature.properties.placement[1],feature.properties.placement[0]]: [(bbox[1] + bbox[3]) / 2, (bbox[0] + bbox[2]) / 2];

                     marker = L.circleMarker(latLng, {radius:2});
                     layerGroup.addLayer(marker);
                     marker = L.marker(latLng,
                        {icon: L.divIcon({ html: "<div class='regions-icon' title='" +  region.name + "'><div class='ellipsis'>" + region.name + "</div></div>" }) });
                     layerGroup.addLayer(marker);

                     regions.push(region);

                     layer.on("mouseover", () => {
                        console.log("river", layer);
                     });
                  },
                  style: function (feature) {
                     return {
                        color: "black",
                        fillOpacity: 0.2,
                        fillColor: color,
                        weight: 1
                     };
                  }
               });

               let divisionOptions = config.divisionOptions[key] || {
                  center: division.getBounds().getCenter()
               };

               var marker = new L.marker(divisionOptions.center, { opacity: 0.01 });
               marker.bindLabel(key, { noHide: true, className: "regions-label", offset: [0, 0] });
               marker.addTo(map);

               divisions.push({
                  layer: division,
                  name: key,
                  marker,
                  features: features
               });
            });

            let featureGroup = L.featureGroup(divisions.map(division => division.layer), {
               style: function (feature) {
                  return {
                     color: "black",
                     fill: true,
                     fillColor: "red",
                     weight: 1
                  };
               }
            }).on("mouseover", (group) => {
               console.log("division", group);
            });
            featureGroup.addTo(map);
         })));
         return this.promise;
      }

      get divisionColors() {
         return config.divisionColors;
      }
   }
   WaterRegionsService.$invoke = ['$http', 'configService', 'mapService'];

   angular.module("water.regions", ["water.select.division", "water.select.region"])
      .directive("waterRegions", ["$http", "waterRegionsService", "mapService", function ($http, waterRegionsService, mapService) {
         return {
            link: function (scope) {
               let layer;
               waterRegionsService.draw();
            }
         };
      }])

      .service("waterRegionsService", WaterRegionsService);

 }