/**
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
*/

'use strict';

{
   var RootCtrl = function RootCtrl($http, configService) {
      var self = this;
      configService.getConfig().then(function (data) {
         self.data = data;
         // If its got WebGL its got everything we need.
         try {
            var canvas = document.createElement('canvas');
            data.modern = !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
         } catch (e) {
            data.modern = false;
         }
      });
   };

   angular.module("WaterApp", ['common.altthemes', 'common.basin', 'common.catchment', 'common.cc', 'common.download', 'common.header', 'common.navigation', 'common.panes', 'common.storage', 'common.templates', 'common.toolbar', 'explorer.config', 'explorer.confirm', 'explorer.drag', 'explorer.enter', 'explorer.flasher', 'explorer.googleanalytics', 'explorer.httpdata', 'explorer.info', 'explorer.message', 'explorer.modal', 'explorer.tabs', 'explorer.version', 'explorer.map.templates', 'exp.search.map.service', 'exp.ui.templates', 'geo.draw', 'geo.elevation', 'geo.geosearch', 'geo.map', 'geo.maphelper', 'geo.measure', 'icsm.contributors', 'icsm.side-panel', 'water.clip', 'water.download', 'water.panes', "water.regions", 'water.select', 'water.templates', 'water.toolbar', 'water.vector', 'water.vector.download', 'water.view', 'ui.bootstrap', 'ui.bootstrap-slider', 'ngAutocomplete', 'ngRoute', 'ngSanitize', 'page.footer'])

   // Set up all the service providers here.
   .config(['configServiceProvider', 'projectsServiceProvider', 'versionServiceProvider', function (configServiceProvider, projectsServiceProvider, versionServiceProvider) {
      configServiceProvider.location("icsm/resources/config/config.json");
      configServiceProvider.dynamicLocation("icsm/resources/config/appConfig.json?t=");
      versionServiceProvider.url("icsm/assets/package.json");
      projectsServiceProvider.setProject("icsm");
   }]).factory("userService", [function () {
      return {
         login: noop,
         hasAcceptedTerms: noop,
         setAcceptedTerms: noop,
         getUsername: function getUsername() {
            return "anon";
         }
      };
      function noop() {
         return true;
      }
   }]).controller("RootCtrl", RootCtrl);

   RootCtrl.$invoke = ['$http', 'configService'];
}
'use strict';

{
   angular.module("water.clip", ['geo.draw']).directive('waterInfoBbox', function () {
      return {
         restrict: 'AE',
         templateUrl: 'water/clip/infobbox.html'
      };
   }).directive("waterClip", ['$rootScope', '$timeout', 'clipService', 'messageService', 'mapService', function ($rootScope, $timeout, clipService, messageService, mapService) {
      return {
         templateUrl: "water/clip/clip.html",
         scope: {
            bounds: "=",
            trigger: "=",
            drawn: "&"
         },
         link: function link(scope, element) {
            var timer = void 0;

            scope.clip = clipService.data.clip;

            scope.typing = false;

            if (typeof scope.showBounds === "undefined") {
               scope.showBounds = false;
            }
            mapService.getMap().then(function (map) {
               scope.$watch("bounds", function (bounds) {
                  if (bounds && scope.trigger) {
                     $timeout(function () {
                        scope.initiateDraw();
                     });
                  } else if (!bounds) {
                     clipService.cancelDraw();
                  }
               });
            });

            $rootScope.$on('icsm.clip.draw', function (event, data) {
               if (data && data.message === "oversize") {
                  scope.oversize = true;
                  $timeout(function () {
                     delete scope.oversize;
                  }, 6000);
               } else {
                  delete scope.oversize;
               }
            });

            scope.initiateDraw = function () {
               messageService.info("Click on the map and drag to define your area of interest.");
               clipService.initiateDraw();
            };
         }
      };
   }]).factory("clipService", ['$q', '$rootScope', 'drawService', function ($q, $rootScope, drawService) {
      var options = {
         maxAreaDegrees: 4
      },
          service = {
         data: {
            clip: {}
         },
         initiateDraw: function initiateDraw() {
            $rootScope.$broadcast("clip.initiate.draw", { started: true });
            var clip = this.data.clip;
            delete clip.xMin;
            delete clip.xMax;
            delete clip.yMin;
            delete clip.yMax;
            delete clip.area;
            return drawService.drawRectangle({
               retryOnOversize: false
            });
         },

         cancelDraw: function cancelDraw() {
            drawService.cancelDrawRectangle();
         },

         setClip: function setClip(data) {
            return drawComplete(data);
         }
      };

      $rootScope.$on("bounds.drawn", function (event, data) {
         console.log("data", data);
         service.setClip(data);
         var c = service.data.clip;

         $rootScope.$broadcast('icsm.clip.drawn', c); // Let people know it is drawn
         $rootScope.$broadcast('icsm.bounds.draw', [c.xMin, c.yMin, c.xMax, c.yMax]); // Draw it
      });

      return service;

      function drawComplete(data) {
         var clip = service.data.clip;
         clip.xMax = data.bounds.getEast().toFixed(5);
         clip.xMin = data.bounds.getWest().toFixed(5);
         clip.yMax = data.bounds.getNorth().toFixed(5);
         clip.yMin = data.bounds.getSouth().toFixed(5);

         service.data.area = (clip.xMax - clip.xMin) * (clip.yMax - clip.yMin);

         return service.data;
      }
   }]);
}
"use strict";

{
   var PaneCtrl = function PaneCtrl(paneService) {
      var _this = this;

      paneService.data().then(function (data) {
         _this.data = data;
      });
   };

   var PaneService = function PaneService() {
      var data = {};

      return {
         add: function add(item) {},

         remove: function remove(item) {}
      };
   };

   angular.module("water.panes", []).directive("waterPanes", ['$rootScope', '$timeout', 'mapService', function ($rootScope, $timeout, mapService) {
      return {
         templateUrl: "water/panes/panes.html",
         transclude: true,
         restrict: "AE",
         scope: {
            defaultItem: "@",
            data: "="
         },
         link: function link(scope) {
            console.log("HHHHHHHHHHHHHH4H");
         },
         controller: ['$scope', function ($scope) {
            var changeSize = false;

            $rootScope.$on('side.panel.change', function (event) {
               emitter();
               $timeout(emitter, 100);
               $timeout(emitter, 200);
               $timeout(emitter, 300);
               $timeout(emitter, 500);
               function emitter() {
                  var evt = document.createEvent("HTMLEvents");
                  evt.initEvent("resize", false, true);
                  window.dispatchEvent(evt);
               }
            });

            $scope.view = $scope.defaultItem;

            $rootScope.$broadcast("view.changed", $scope.view, null);

            $scope.setView = function (what) {
               var oldView = $scope.view;

               if ($scope.view === what) {
                  if (what) {
                     changeSize = true;
                  }
                  $scope.view = "";
               } else {
                  if (!what) {
                     changeSize = true;
                  }
                  $scope.view = what;
               }

               $rootScope.$broadcast("view.changed", $scope.view, oldView);

               if (changeSize) {
                  mapService.getMap().then(function (map) {
                     map._onResize();
                  });
               }
            };
            $timeout(function () {
               $rootScope.$broadcast("view.changed", $scope.view, null);
            }, 50);
         }]
      };
   }]).directive("icsmTabs", [function () {
      return {
         templateUrl: "water/panes/tabs.html",
         require: "^icsmPanes"
      };
   }]).controller("PaneCtrl", PaneCtrl).factory("paneService", PaneService);

   PaneCtrl.$inject = ["paneService"];


   PaneService.$inject = [];
}
"use strict";

{
   var ContributorsService = function ContributorsService($http) {
      var state = {
         show: false,
         ingroup: false,
         stick: false
      };

      $http.get("icsm/resources/config/contributors.json").then(function (response) {
         state.orgs = response.data;
      });

      return {
         getState: function getState() {
            return state;
         }
      };
   };

   angular.module('icsm.contributors', []).directive("icsmContributors", ["$interval", "contributorsService", function ($interval, contributorsService) {
      return {
         templateUrl: "water/contributors/contributors.html",
         scope: {},
         link: function link(scope, element) {
            var timer = void 0;

            scope.contributors = contributorsService.getState();

            scope.over = function () {
               $interval.cancel(timer);
               scope.contributors.ingroup = true;
            };

            scope.out = function () {
               timer = $interval(function () {
                  scope.contributors.ingroup = false;
               }, 1000);
            };

            scope.unstick = function () {
               scope.contributors.ingroup = scope.contributors.show = scope.contributors.stick = false;
               element.find("a").blur();
            };
         }
      };
   }]).directive("icsmContributorsLink", ["$interval", "contributorsService", function ($interval, contributorsService) {
      return {
         restrict: "AE",
         templateUrl: "water/contributors/show.html",
         scope: {},
         link: function link(scope) {
            var timer = void 0;
            scope.contributors = contributorsService.getState();
            scope.over = function () {
               $interval.cancel(timer);
               scope.contributors.show = true;
            };

            scope.toggleStick = function () {
               scope.contributors.stick = !scope.contributors.stick;
               if (!scope.contributors.stick) {
                  scope.contributors.show = scope.contributors.ingroup = false;
               }
            };

            scope.out = function () {
               timer = $interval(function () {
                  scope.contributors.show = false;
               }, 700);
            };
         }
      };
   }]).factory("contributorsService", ContributorsService).filter("activeContributors", function () {
      return function (contributors) {
         if (!contributors) {
            return [];
         }
         return contributors.filter(function (contributor) {
            return contributor.enabled;
         });
      };
   });

   ContributorsService.$inject = ["$http"];
}
"use strict";

{
   var DownloadCtrl = function DownloadCtrl(downloadService) {
      downloadService.data().then(function (data) {
         this.data = data;
      }.bind(this));

      this.remove = function () {
         downloadService.clear();
      };

      this.changeEmail = function (email) {
         downloadService.setEmail(email);
      };
   };

   var DownloadService = function DownloadService($http, $q, $rootScope, mapService, storageService) {
      var key = "download_email",
          downloadLayerGroup = "Download Layers",
          mapState = {
         zoom: null,
         center: null,
         layer: null
      },
          _data = null,
          service = {
         getLayerGroup: function getLayerGroup() {
            return mapService.getGroup(downloadLayerGroup);
         },

         setState: function setState(data) {
            if (data) {
               prepare();
            } else {
               restore();
            }

            function prepare() {

               var bounds = [[data.bounds.yMin, data.bounds.xMin], [data.bounds.yMax, data.bounds.xMax]];

               if (mapState.layer) {
                  mapService.getGroup(downloadLayerGroup).removeLayer(mapState.layer);
               }
            }
            function restore(map) {
               if (mapState.layer) {
                  mapService.clearGroup(downloadLayerGroup);
                  mapState.layer = null;
               }
            }
         },

         decorate: function decorate() {
            var item = _data.item;
            _data.item.download = true;
            if (!item.processsing) {
               item.processing = {
                  clip: {
                     xMax: null,
                     xMin: null,
                     yMax: null,
                     yMin: null
                  }
               };
            }
         },

         setEmail: function setEmail(email) {
            storageService.setItem(key, email);
         },

         getEmail: function getEmail() {
            return storageService.getItem(key).then(function (value) {
               _data.email = value;
               return value;
            });
         },

         data: function data() {
            if (_data) {
               return $q.when(_data);
            }

            return $http.get('icsm/resources/config/icsm.json').then(function (response) {
               _data = response.data;
               service.decorate();
               return _data;
            });
         }
      };

      return service;
   };

   angular.module("water.download", []).controller("DownloadCtrl", DownloadCtrl).factory("downloadService", DownloadService);

   DownloadCtrl.$inject = ["downloadService"];


   DownloadService.$inject = ['$http', '$q', '$rootScope', 'mapService', 'storageService'];
}
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

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

      initialize: function initialize(options) {
         L.Util.setOptions(this, options);
      },

      addLayer: function addLayer(layer) {
         this._markers.push(layer);
         this._update();
      },

      removeLayer: function removeLayer(layer) {
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

      onAdd: function onAdd(map) {
         this._map = map;
         var self = this;

         map.on("moveend", function (e) {
            self._update.call(self, e);
         });
         map.on("zoomend", function (e) {
            self._update.call(self, e);
         });

         // Add layer to the map
         this._layer = new L.FeatureGroup();
         this._map.addLayer(this._layer);

         L.FeatureGroup.prototype.onAdd.call(this, map);
      },

      _update: function _update(e) {
         // Perform updates to markers on map
         var zoom = this._map.getZoom();

         if (zoom >= this.options.minZoomShow && zoom <= this.options.maxZoomShow) {
            this._addMarkers();
            this._cleanupMarkers();
         } else {
            this._removeMarkers();
         }
      },

      _addMarkers: function _addMarkers() {
         // Add select markers to layer; skips existing ones automatically
         var i, marker;

         var markers = this._getMarkersInViewport(this._map);

         for (i = 0; i < markers.length; i++) {
            marker = markers[i];
            this._layer.addLayer(marker);
         }
      },

      _removeMarkers: function _removeMarkers() {
         this._layer.clearLayers();
      },

      _cleanupMarkers: function _cleanupMarkers() {
         // Remove out-of-bounds markers
         // Also keep those with popups or in expanded clusters
         var bounds = this._map.getBounds().pad(this.options.viewportPadding);

         this._layer.eachLayer(function (marker) {
            if (!bounds.contains(marker.getLatLng()) && (!marker._popup || !marker._popup._container)) {
               this._layer.removeLayer(marker);
            }
         }, this);
      },

      _getMarkersInViewport: function _getMarkersInViewport(map) {
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

   var WaterRegionsService = function () {
      function WaterRegionsService($http, configService, mapService) {
         _classCallCheck(this, WaterRegionsService);

         this.$http = $http;
         this.configService = configService;
         this.mapService = mapService;
      }

      _createClass(WaterRegionsService, [{
         key: "config",
         value: function config() {
            return this.configService.getConfig("regions");
         }
      }, {
         key: "features",
         value: function features() {
            var _this = this;

            return this.config().then(function (config) {
               return _this.$http.get(config.regionsUrl, { cache: true }).then(function (response) {
                  return response.data.features;
               });
            });
         }
      }, {
         key: "draw",
         value: function draw() {
            var _this2 = this;

            if (this.promise) {
               return this.promise;
            }

            this.promise = this.config().then(function (config) {
               return _this2.mapService.getMap().then(function (map) {
                  return _this2.features().then(function (features) {
                     var divisions = _this2.divisions = [];
                     var regions = _this2.regions = [];
                     var divisionsMap = _this2.divisionsMap = {};
                     var layerGroup = L.conditionalMarkers({ minZoomShow: 6 });

                     features.forEach(function (feature) {
                        var name = feature.properties.Division;
                        divisionsMap[name] = divisionsMap[name] || [];
                        divisionsMap[name].push(feature);
                     });

                     layerGroup.addTo(map);

                     Object.keys(divisionsMap).forEach(function (key, index) {
                        var features = divisionsMap[key];
                        var color = config.divisionColors[index % config.divisionColors.length];

                        var division = L.geoJson(features, {
                           onEachFeature: function onEachFeature(feature, layer) {

                              var createOutMarker = function createOutMarker() {
                                 var label = L.marker(latLng, {
                                    icon: L.divIcon({
                                       html: "<div class='regions-icon' title='" + region.name + "'><div class='ellipsis'>" + region.name + "</div></div>"
                                    })
                                 });
                                 return label;
                              };

                              var mouseEnter = function mouseEnter() {
                                 layer.setStyle({
                                    weight: 3,
                                    color: 'red'
                                 });

                                 if (marker && marker._icon) {
                                    console.log(marker._icon.firstChild);
                                    marker._icon.firstChild.classList.add("over");
                                 }
                              };

                              var mouseOut = function mouseOut() {
                                 layer.setStyle({
                                    weight: 1,
                                    color: 'black'
                                 });

                                 if (marker && marker._icon) {
                                    marker._icon.firstChild.classList.remove("over");
                                 }
                              };

                              var region = {
                                 layer: layer,
                                 name: feature.properties.RivRegName,
                                 feature: feature,
                                 show: function show() {
                                    this.layer.openPopup();
                                 },
                                 hide: function hide() {
                                    this.layer._map.closePopup();
                                 }
                              };

                              // "bbox":[130.8875,-13.635000001,131.659843179235,-12.0425]
                              var bbox = feature.bbox;
                              var latLng = feature.properties.placement ? [feature.properties.placement[1], feature.properties.placement[0]] : [(bbox[1] + bbox[3]) / 2, (bbox[0] + bbox[2]) / 2];

                              var circle = L.circleMarker(latLng, { radius: 2 });
                              layerGroup.addLayer(circle);

                              var marker = createOutMarker();

                              layerGroup.addLayer(marker);

                              regions.push(region);

                              layer.on("mouseover", mouseEnter);

                              layer.on("mouseout", mouseOut);
                           },
                           style: function style(feature) {
                              return {
                                 color: "black",
                                 fillOpacity: 0.2,
                                 fillColor: color,
                                 weight: 1
                              };
                           }
                        });

                        var divisionOptions = config.divisionOptions[key] || {
                           center: division.getBounds().getCenter()
                        };

                        var marker = new L.marker(divisionOptions.center, { opacity: 0.01 });
                        marker.bindLabel(key, { noHide: true, className: "regions-label", offset: [0, 0] });
                        marker.addTo(map);

                        divisions.push({
                           layer: division,
                           name: key,
                           marker: marker,
                           features: features
                        });
                     });

                     var featureGroup = L.featureGroup(divisions.map(function (division) {
                        return division.layer;
                     }), {
                        style: function style(feature) {
                           return {
                              color: "black",
                              fill: true,
                              fillColor: "red",
                              weight: 1
                           };
                        }
                     }).on("mouseover", function (group) {
                        console.log("division", group);
                     });
                     featureGroup.addTo(map);
                  });
               });
            });
            return this.promise;
         }
      }, {
         key: "divisionColors",
         get: function get() {
            return config.divisionColors;
         }
      }]);

      return WaterRegionsService;
   }();

   WaterRegionsService.$invoke = ['$http', 'configService', 'mapService'];

   angular.module("water.regions", ["water.select.division", "water.select.region"]).directive("waterRegions", ["$http", "waterRegionsService", "mapService", function ($http, waterRegionsService, mapService) {
      return {
         link: function link(scope) {
            var layer = void 0;
            waterRegionsService.draw();
         }
      };
   }]).service("waterRegionsService", WaterRegionsService);
}
"use strict";

{
   angular.module("water.select.division", ["water.regions"]).directive("selectDivision", ["waterRegionsService", function (waterRegionsService) {
      return {
         templateUrl: "water/select/division.html",
         scope: {
            state: "=",
            open: "="
         },
         link: function link(scope) {
            waterRegionsService.draw().then(function () {
               scope.divisions = waterRegionsService.divisions.sort(function (a, b) {
                  return a.name > b.name ? 1 : -1;
               });
            });

            scope.$watch("open", function (selected) {
               console.log("selected", selected);
            });

            scope.hilight = function (division) {
               division.marker.label._container.classList.add("over");
            };

            scope.lolight = function (division) {
               division.marker.label._container.classList.remove("over");
            };
         }
      };
   }]);
}
"use strict";

/*!
 * Copyright 2017 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
{
   angular.module("water.select.region", ['water.select.service']).directive("selectRegion", ["waterRegionsService", function (waterRegionsService) {
      return {
         templateUrl: "water/select/region.html",
         scope: {
            state: "="
         },
         link: function link(scope) {
            waterRegionsService.draw().then(function () {
               scope.regions = waterRegionsService.regions.sort(function (a, b) {
                  return a.name > b.name ? 1 : -1;
               });
            });

            scope.hilight = function (region) {
               region.show();
            };

            scope.lolight = function (region) {
               region.hide();
            };
         }
      };
   }]);
}
"use strict";

{
   var SelectService = function SelectService($http, $q, $rootScope, $timeout, mapService, configService) {
      var LAYER_GROUP_KEY = "Search Layers",
          baseUrl = "icsm/resources/config/water_select.json",
          parameters = {
         text: "",
         daterange: {
            enabled: false,
            upper: null,
            lower: null
         },
         bbox: {
            fromMap: true,
            intersects: true,
            yMax: null,
            yMin: null,
            xMax: null,
            xMin: null
         },
         defaultKeywords: [],
         keywords: []
      },
          timeout = void 0,
          cache = void 0,
          allDocs = {},
          busy = false,
          layers = {},
          selectLayerGroup = void 0,
          normalLayerColor = "#ff7800",
          hilightLayerColor = 'darkblue',
          service = {

         getSelectCriteria: function getSelectCriteria() {
            return parameters;
         },

         getLayerGroup: function getLayerGroup() {
            // Prime the layer group
            if (!selectLayerGroup) {
               selectLayerGroup = mapService.getGroup(LAYER_GROUP_KEY);
            }
            return selectLayerGroup;
         },

         setKeywords: function setKeywords(keywords) {},

         setFilter: function setFilter(filter) {},

         refresh: function refresh() {},

         getDaterange: function getDaterange() {
            return parameters.daterange;
         },

         more: function more() {},

         _executeQuery: function _executeQuery() {
            // Give them the lot as they will want the criteria as well
            $http.get(baseUrl, { cache: true }).then(function (response) {
               service.getLayerGroup();

               var data = response.data;

               data.response.docs.forEach(function (dataset) {
                  service._decorateDataset(dataset);
                  if (dataset.type === "group") {
                     dataset.docs.forEach(function (data) {
                        service._decorateDataset(data);
                     });
                  }
               });

               $rootScope.$broadcast("select.facet.counts", data);
               $rootScope.$broadcast("select.results.received", data);
            });
         },

         createLayer: function createLayer(dataset, color) {
            var bbox = dataset.bbox,
                key = dataset.primaryId,
                parts = void 0,
                bounds = void 0,
                layer = void 0;

            layer = layers[key];
            if (!layer) {

               if (!bbox) {
                  return null;
               }

               parts = bbox.split(" ");
               if (parts.length !== 4) {
                  return null;
               }

               if (!color) {
                  color = normalLayerColor;
               }
               bounds = [[+parts[1], +parts[0]], [+parts[3], +parts[2]]];

               // create a black rectangle
               layer = L.rectangle(bounds, {
                  fill: false,
                  color: "#000000",
                  width: 3,
                  clickable: false
               });

               layers[key] = layer;
            }
            this._decorateDataset(dataset);
            selectLayerGroup.addLayer(layer);
            return layer;
         },

         _decorateDataset: function _decorateDataset(dataset) {
            var layer = layers[dataset.primaryId];
            if (layer) {
               dataset.layer = layer;
               dataset.showLayer = true;
            } else {
               dataset.layer = null;
               dataset.showLayer = false;
               // Do we add the services to it?
               dataset.services = servicesFactory(dataset.dcUris);
               dataset.bounds = getBounds(dataset.bbox);
            }

            function getBounds(bbox) {
               var parts = void 0;
               if (!bbox) {
                  return null;
               } else {
                  parts = bbox.split(/\s/g);
                  return {
                     xMin: +parts[0],
                     xMax: +parts[2],
                     yMax: +parts[3],
                     yMin: +parts[1]
                  };
               }
            }
         },

         showWithin: function showWithin(datasets) {
            datasets.forEach(function (dataset) {
               var box = dataset.bbox,
                   coords = void 0,
                   xmin = void 0,
                   ymin = void 0,
                   xmax = void 0,
                   ymax = void 0;

               if (!box) {
                  service.removeLayer(dataset);
               } else {
                  coords = box.split(" ");
                  if (coords.length === 4 && within(+coords[0], +coords[1], +coords[2], +coords[3])) {
                     // show
                     service.createLayer(dataset);
                  } else {
                     // hide
                     service.removeLayer(dataset);
                  }
               }
            });

            function within(xmin, ymin, xmax, ymax) {
               var bbox = parameters.bbox;

               return xmin > bbox.xMin && xmax < bbox.xMax && ymin > bbox.yMin && ymax < bbox.yMax;
            }
         },

         toggle: function toggle(dataset) {
            if (dataset.showLayer) {
               this.removeLayer(dataset);
            } else {
               this.createLayer(dataset);
            }
         },

         toggleAll: function toggleAll(datasets) {
            var self = this,
                someNotShowing = datasets.some(function (dataset) {
               return !dataset.showLayer;
            });

            datasets.forEach(function (dataset) {
               if (someNotShowing) {
                  if (!dataset.showLayer) {
                     self.createLayer(dataset);
                  }
               } else {
                  if (dataset.showLayer) {
                     self.removeLayer(dataset);
                  }
               }
            });
            return !someNotShowing;
         },

         hideAll: function hideAll(datasets) {
            datasets.forEach(function (dataset) {
               if (dataset.showLayer) {
                  service.removeLayer(dataset);
               }
            });
         },

         hilight: function hilight(layer) {
            layer.setStyle({ color: hilightLayerColor });
         },

         lolight: function lolight(layer) {
            layer.setStyle({ color: normalLayerColor });
         },

         removeLayer: function removeLayer(dataset) {
            var key = dataset.primaryId,
                layer = layers[key];

            if (layer) {
               selectLayerGroup.removeLayer(layer);
               delete layers[key];
            }
            this._decorateDataset(dataset);
         }
      };

      execute();
      return service;

      function execute() {
         $timeout(function () {
            service._executeQuery();
         }, 100);
      }
   };

   var servicesFactory = function servicesFactory(uris) {
      var protocols = {
         WCS: "OGC:WCS",
         WFS: "OGC:WFS",
         WMS: "OGC:WMS"
      };

      return new Services(uris);

      function Services(uris) {
         var _this = this;

         this.uris = uris;
         this.container = {
            wcs: null,
            wms: null
         };

         if (uris) {
            this.services = uris.map(function (uri) {
               var service = new Service(uri);

               _this.container.wcs = service.isWcs() ? service : _this.container.wcs;
               _this.container.wms = service.isWms() ? service : _this.container.wms;
               return service;
            });
         } else {
            this.services = [];
         }

         this.hasWcs = function () {
            return this.container.wcs !== null;
         };

         this.hasWms = function () {
            return this.container.wms !== null;
         };

         this.getWcs = function () {
            return this.container.wcs;
         };

         this.getWms = function () {
            return this.container.wms;
         };

         this.remove = function () {
            this.services.forEach(function (service) {
               service.remove();
            });
         };
      }

      function Service(doc) {
         var xmlDoc = $(doc);

         this.protocol = xmlDoc.attr("protocol");
         this.url = xmlDoc.text();
         this.layerNames = xmlDoc.attr("layerNames");
         this.name = xmlDoc.attr("name");
         this.description = xmlDoc.attr("description");
         this.handlers = [];

         this.isWcs = function () {
            // console.log("Checking results:" + (this.protocol == protocols.WCS));
            return this.protocol === protocols.WCS;
         };

         this.isWfs = function () {
            return this.protocol === protocols.WFS;
         };

         this.isWms = function () {
            return this.protocol === protocols.WMS;
         };

         this.isSupported = function () {
            return typeof protocols[this.protocol] === "undefined";
         };

         this.addHandler = function (callback) {
            this.handlers.push(callback);
         };

         this.removeHandler = function (callback) {
            this.handlers.push(callback);
         };

         this.remove = function () {
            var _this2 = this;

            this.handlers.forEach(function (callback) {
               // They should all have a remove but you never know.
               if (callback.remove) {
                  callback.remove(_this2);
               }
            });
            this.handlers = [];
         };

         this.getUrl = function () {
            if (url) {
               if (url.indexOf("?") < 0) {
                  return;
               } else {
                  return url.substr(0, url.indexOf("?"));
               }
            }
            return null;
         };
      };
   };

   angular.module("water.select.service", []).factory("selectService", SelectService);

   SelectService.$inject = ['$http', '$q', '$rootScope', '$timeout', 'mapService', 'configService'];
}
"use strict";

{
	var SelectCriteriaCtrl = function SelectCriteriaCtrl(selectService) {
		this.criteria = selectService.getSelectCriteria();

		this.refresh = function () {
			selectService.refresh();
		};
	};

	var SelectCtrl = function SelectCtrl($rootScope, configService, flashService, selectService) {
		var _this = this;

		var flasher = void 0;

		$rootScope.$on("select.results.received", function (event, data) {
			//console.log("Received response")
			flashService.remove(flasher);
			_this.data = data;
		});

		configService.getConfig("facets").then(function (config) {
			_this.hasKeywords = config && config.keywordMapped && config.keywordMapped.length > 0;
		});

		this.select = function () {
			flashService.remove(flasher);
			flasher = flashService.add("Selecting", 3000, true);
			selectService.setFilter(this.filter);
		};

		this.toggle = function (result) {
			selectService.toggle(result);
		};

		this.toggleAll = function () {
			selectService.toggleAll(this.data.response.docs);
		};

		this.showWithin = function () {
			selectService.showWithin(this.data.response.docs);
		};

		this.allShowing = function () {
			if (!this.data || !this.data.response) {
				return false;
			}
			return !this.data.response.docs.some(function (dataset) {
				return !dataset.showLayer;
			});
		};

		this.anyShowing = function () {
			if (!this.data || !this.data.response) {
				return false;
			}
			return this.data.response.docs.some(function (dataset) {
				return dataset.showLayer;
			});
		};

		this.hideAll = function () {
			selectService.hideAll(this.data.response.docs);
		};

		this.hilight = function (doc) {
			if (doc.layer) {
				selectService.hilight(doc.layer);
			}
		};

		this.lolight = function (doc) {
			if (doc.layer) {
				selectService.lolight(doc.layer);
			}
		};
	};

	angular.module("water.select", ['water.select.service']).controller("SelectCtrl", SelectCtrl).controller("SelectCriteriaCtrl", SelectCriteriaCtrl).directive("waterSelect", [function () {
		return {
			templateUrl: "water/select/select.html",
			link: function link(scope, element, attrs) {
				//console.log("Hello select!");
			}
		};
	}]).directive("selectDoc", [function () {
		return {
			templateUrl: "water/select/doc.html",
			link: function link(scope, element, attrs) {
				//console.log("What's up doc!");
			}
		};
	}]).directive("selectGroup", [function () {
		return {
			templateUrl: "water/select/group.html",
			scope: {
				group: "="
			},
			link: function link(scope, element, attrs) {
				//console.log("What's up doc!");
			}
		};
	}])

	/**
  * Format the publication date
  */
	.filter("pubDate", function () {
		return function (string) {
			var date;
			if (string) {
				date = new Date(string);
				return date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear();
			}
			return "-";
		};
	})

	/**
  * Format the array of authors
  */
	.filter("authors", function () {
		return function (auth) {
			if (auth) {
				return auth.join(", ");
			}
			return "-";
		};
	})

	/**
  * If the text is larger than a certain size truncate it and add some dots to the end.
  */
	.filter("truncate", function () {
		return function (text, length) {
			if (text && text.length > length - 3) {
				return text.substr(0, length - 3) + "...";
			}
			return text;
		};
	});

	SelectCriteriaCtrl.$inject = ["selectService"];


	SelectCtrl.$inject = ['$rootScope', 'configService', 'flashService', 'selectService'];
}
"use strict";

{

   angular.module("water.toolbar", []).directive("elevationToolbar", [function () {
      return {
         restrict: "AE",
         templateUrl: "water/toolbar/toolbar.html",
         controller: 'toolbarLinksCtrl',
         transclude: true
      };
   }]).controller("toolbarLinksCtrl", ["$scope", "configService", function ($scope, configService) {
      var self = this;
      configService.getConfig().then(function (config) {
         self.links = config.toolbarLinks;
      });

      $scope.item = "";
      $scope.toggleItem = function (item) {
         $scope.item = $scope.item === item ? "" : item;
      };
   }]);
}
"use strict";

{
   var DownloadCtrl = function DownloadCtrl(downloadService) {
      downloadService.data().then(function (data) {
         this.data = data;
      }.bind(this));

      this.remove = function () {
         downloadService.clear();
      };

      this.changeEmail = function (email) {
         downloadService.setEmail(email);
      };
   };

   var DownloadService = function DownloadService($http, $q, $rootScope, mapService, storageService) {
      var key = "download_email",
          downloadLayerGroup = "Download Layers",
          mapState = {
         zoom: null,
         center: null,
         layer: null
      },
          _data = null,
          service = {
         getLayerGroup: function getLayerGroup() {
            return mapService.getGroup(downloadLayerGroup);
         },

         setState: function setState(data) {
            if (data) {
               prepare();
            } else {
               restore();
            }

            function prepare() {

               var bounds = [[data.bounds.yMin, data.bounds.xMin], [data.bounds.yMax, data.bounds.xMax]];

               if (mapState.layer) {
                  mapService.getGroup(downloadLayerGroup).removeLayer(mapState.layer);
               }
            }
            function restore(map) {
               if (mapState.layer) {
                  mapService.clearGroup(downloadLayerGroup);
                  mapState.layer = null;
               }
            }
         },

         decorate: function decorate() {
            var item = _data.item;
            _data.item.download = true;
            if (!item.processsing) {
               item.processing = {
                  clip: {
                     xMax: null,
                     xMin: null,
                     yMax: null,
                     yMin: null
                  }
               };
            }
         },

         setEmail: function setEmail(email) {
            storageService.setItem(key, email);
         },

         getEmail: function getEmail() {
            return storageService.getItem(key).then(function (value) {
               _data.email = value;
               return value;
            });
         },

         data: function data() {
            if (_data) {
               return $q.when(_data);
            }

            return $http.get('icsm/resources/config/icsm.json').then(function (response) {
               _data = response.data;
               service.decorate();
               return _data;
            });
         }
      };

      return service;
   };

   angular.module("water.view", []).directive("waterView", ['downloadService', function (downloadService) {
      return {
         templateUrl: "water/view/view.html",
         controller: "DownloadCtrl",
         link: function link(scope, element) {
            downloadService.data().then(function (data) {
               scope.data = data;
            });

            scope.$watch("data.item", function (item, old) {
               if (item || old) {
                  downloadService.setState(item);
               }
            });
         }
      };
   }]).controller("DownloadCtrl", DownloadCtrl).factory("downloadService", DownloadService);

   DownloadCtrl.$inject = ["downloadService"];


   DownloadService.$inject = ['$http', '$q', '$rootScope', 'mapService', 'storageService'];
}
"use strict";

{
	var VectorGeoprocessService = function VectorGeoprocessService($http, $q, $timeout, configService, downloadService, ga, mapService, storageService, vectorService) {
		var DEFAULT_DATASET = "dems1sv1_0",
		    // TODO: We have to get this from the metadata somehow.
		geoprocessingTemplates,
		    clipLayer = null,
		    map;

		vectorService.config().then(function (data) {
			geoprocessingTemplates = data.serviceUrlTemplate;
		});

		mapService.getMap().then(function (lMap) {
			map = lMap;
		});

		function getUrl(data) {
			return geoprocessingTemplates;
		}

		return {
			queryLayer: function queryLayer(query, clip) {
				var deferred = $q.defer();

				var layer = L.esri.featureLayer({
					url: query.url
				});

				var bounds = L.latLngBounds([clip.yMin, clip.xMin], // top left
				[clip.yMax, clip.xMax] // bottom right
				);

				layer.query().intersects(bounds).ids(function (error, ids) {
					if (error) {
						deferred.reject(error);
					} else {
						deferred.resolve(ids);
					}
				});
				return deferred.promise;
			},

			outFormats: function outFormats() {
				return vectorService.outFormats();
			},

			handleShowClip: function handleShowClip(clip) {
				this.removeClip();

				clipLayer = L.rectangle([[clip.yMin, clip.xMin], [clip.yMax, clip.xMax]], {
					weight: 2,
					opacity: 0.9,
					fill: false,
					color: "#000000",
					width: 3,
					clickable: false
				});

				clipLayer.addTo(map);
			},

			removeClip: function removeClip() {
				if (clipLayer) {
					map.removeLayer(clipLayer);
					clipLayer = null;
				}
			},

			addLayer: function addLayer(data) {
				return L.tileLayer.wms(data.parameters[0], data.parameters[1]).addTo(map);
			},

			removeLayer: function removeLayer(layer) {
				map.removeLayer(layer);
			},

			initiateJob: function initiateJob(data, email) {
				var dataset = DEFAULT_DATASET,
				    // TODO Replace with real dataset file name from metadata.
				win,
				    workingString = getUrl(data),
				    processing = data.processing;

				var clip = processing.bboxSelected ? processing.clip : {
					yMin: null,
					yMax: null,
					xMax: null,
					xMin: null
				};

				var log = {
					bbox: {
						yMin: clip.yMin,
						yMax: clip.yMax,
						xMin: clip.xMin,
						xMax: clip.xMax
					},
					geocatId: data.primaryId,
					crs: processing.outCoordSys.code,
					format: processing.outFormat.code
				},
				    geocatNumbers = [],
				    featuresSelected = [];

				data.docs.forEach(function (doc) {
					if (doc.selected) {
						geocatNumbers.push(doc.primaryId);
						featuresSelected.push(doc.code);
					}
				});

				angular.forEach({
					id: geocatNumbers.join(" "),
					features_selected: featuresSelected.join(" "),
					filename: processing.filename ? processing.filename : "",
					outFormat: processing.outFormat.code,
					file_format_raster: "",
					ymin: clip.yMin,
					ymax: clip.yMax,
					xmin: clip.xMin,
					xmax: clip.xMax,
					division_name: processing.divisionSelected ? processing.division : "",
					river_reg_name: processing.regionSelected ? processing.region : "",
					outCoordSys: processing.outCoordSys.code,
					email: email
				}, function (item, key) {
					workingString = workingString.replace("{" + key + "}", item);
				});

				//console.log(clip);
				//console.log(processing);
				//console.log(workingString);

				$("#launcher")[0].src = workingString;

				downloadService.setEmail(email);

				ga('send', 'event', 'nedf', 'click', 'FME data export: ' + JSON.stringify(log));
			},

			getConfig: function getConfig() {
				return vectorService.config();
			}
		};
	};

	angular.module("water.vector.geoprocess", []).directive("vectorGeoprocess", ['$http', '$q', '$timeout', 'vectorGeoprocessService', 'flashService', 'messageService', 'vectorService', function ($http, $q, $timeout, vectorGeoprocessService, flashService, messageService, vectorService) {
		return {
			restrict: "AE",
			templateUrl: "water/vector/geoprocess.html",
			scope: {
				data: "=",
				open: "="
			},
			link: function link(scope) {
				var clipMessage = void 0,
				    clipTimeout = void 0,
				    referenceLayer = void 0;

				vectorService.outFormats().then(function (data) {
					scope.outFormats = data;
				});

				scope.$watch("data", function (newData, oldData) {
					if (oldData) {
						vectorGeoprocessService.removeClip();
						removeReferenceLayer();
					}
					if (newData && newData !== oldData) {
						scope.stage = "bbox";
						drawReferenceLayer();
					}
				});

				scope.$watch("open", function (open) {
					console.log("pone" + open);
				});

				scope.$watchGroup(["data.processing.clip.xMax", "data.processing.clip.xMin", "data.processing.clip.yMax", "data.processing.clip.yMin"], function (newValues, oldValues, scope) {
					var result, url;

					if (clipTimeout) {
						$timeout.cancel(clipTimeout);
						clipTimeout = null;
					}
					if (scope.data && scope.data.processing && scope.data.processing.clip && scope.data.processing.clip.xMax !== null) {
						clipMessage = flashService.add("Validating selected area...", 3000);

						// Make really sure that all our stop points set this appropriately. We don't want the button locked out for ever.
						scope.checkingOrFailed = !!url; // We only apply this to records that have a URL to check intersection against.
						clipTimeout = $timeout(function () {
							checkSize().then(function (result) {
								try {
									if (result && result.code == "success") {
										vectorGeoprocessService.handleShowClip(scope.data.processing.clip);
										scope.checkingOrFailed = false;
									}
								} catch (e) {
									// Very paranoid about setting it to block.
									scope.checkingOrFailed = false;
								}
							});
						}, 2000);
					}

					function checkSize() {
						var deferred = $q.defer();

						result = scope.drawn();
						if (result && result.code) {
							switch (result.code) {
								case "oversize":
									$timeout(function () {
										flashService.remove(clipMessage);
										messageService.error("The selected area is too large to process. Please restrict to approximately " + Math.sqrt(scope.data.restrictSize) + " degrees square.");
										scope.stage = "bbox";
										drawReferenceLayer();
										deferred.resolve(result);
									});
									break;

								case "undersize":
									$timeout(function () {
										flashService.remove(clipMessage);
										messageService.error("X Min and Y Min should be smaller than X Max and Y Max, respectively. Please update the drawn area.");
										scope.stage = "bbox";
										drawReferenceLayer();
										deferred.resolve(result);
									});
									break;
								default:
									return $q.when(result);
							}
						}
						return deferred.promise;
					}
				});

				scope.selectedDivision = function () {
					console.log("selected division");
				};

				scope.selectedRegion = function () {
					console.log("selected region");
				};

				scope.drawn = function () {
					vectorGeoprocessService.removeClip();
					forceNumbers(scope.data.processing.clip);
					//flashService.remove(clipMessage);
					if (constrainBounds(scope.data.processing.clip, scope.data.bounds)) {
						clipMessage = flashService.add("Redrawn to fit within data extent", 5000);
					}

					if (overSizeLimit(scope.data.processing.clip)) {
						return { code: "oversize" };
					}

					if (underSizeLimit(scope.data.processing.clip)) {
						return { code: "undersize" };
					}

					if (scope.data.processing.clip.xMax === null) {
						return { code: "incomplete" };
					}

					//if(this.data.queryLayer) {
					//	vectorGeoprocessService.queryLayer(scope.data.queryLayer, scope.data.processing.clip).then(function(response) {
					//	});
					//} else
					if (validClip(scope.data.processing.clip)) {
						return { code: "success" };
					}
					return { code: "invalid" };
				};

				scope.startExtract = function () {
					if (scope.allDataSet()) {
						messageService.info("Your request has been sent for processing. You will be notified by email on completion of the job.");
						flashService.add("You can select another area for processing.", 10000);
						vectorGeoprocessService.initiateJob(scope.data, scope.email);
						scope.data.download = false;
					}
				};

				scope.allDataSet = function () {
					var proc = scope.data && scope.data.processing ? scope.data.processing : null;
					// For it to be OK we need.
					return proc && scope.email && (proc.divisionSelected && proc.division || proc.regionSelected && proc.region || proc.bboxSelected && validClip(proc.clip)) && proc.outCoordSys && proc.outFormat;
				};

				scope.validSansEmail = function () {
					var proc = scope.data && scope.data.processing ? scope.data.processing : null;
					// For it to be OK we need.
					return proc && (proc.divisionSelected && proc.division || proc.regionSelected && proc.region || proc.bboxSelected && validClip(proc.clip)) && proc.outCoordSys && proc.outFormat;
				};

				scope.validClip = function (data) {
					return data && data.processing && validClip(data.processing.clip);
				};

				vectorGeoprocessService.getConfig().then(function (config) {
					scope.config = config;
				});

				function drawReferenceLayer() {
					removeReferenceLayer();
					if (scope.data.referenceLayer) {
						referenceLayer = vectorGeoprocessService.addLayer(scope.data.referenceLayer);
					}
				}

				function removeReferenceLayer() {
					if (referenceLayer) {
						vectorGeoprocessService.removeLayer(referenceLayer);
					}
				}

				function underSizeLimit(clip) {
					var size = (clip.xMax - clip.xMin) * (clip.yMax - clip.yMin);
					return size < 0.00000000001 || clip.xMax < clip.xMin;
				}

				function overSizeLimit(clip) {
					// Shouldn't need abs but it doesn't hurt.
					var size = Math.abs((clip.xMax - clip.xMin) * (clip.yMax - clip.yMin));

					return scope.data.restrictSize && size > scope.data.restrictSize;
				}

				function constrainBounds(c, p) {
					var flag = false,
					    ret = false;
					// Have we read the parameters yet?

					if (!p || empty(c.xMax) || empty(c.xMin) || empty(c.yMax) || empty(c.yMin)) {
						return false;
					}

					ret = flag = +c.xMax < +p.xMin;
					if (flag) {
						c.xMax = +p.xMin;
					}

					flag = +c.xMax > +p.xMax;
					ret = ret || flag;

					if (flag) {
						c.xMax = +p.xMax;
					}

					flag = +c.xMin < +p.xMin;
					ret = ret || flag;
					if (flag) {
						c.xMin = +p.xMin;
					}

					flag = +c.xMin > +c.xMax;
					ret = ret || flag;
					if (flag) {
						c.xMin = c.xMax;
					}

					// Now for the Y's
					flag = +c.yMax < +p.yMin;
					ret = ret || flag;
					if (flag) {
						c.yMax = +p.yMin;
					}

					flag = +c.yMax > +p.yMax;
					ret = ret || flag;
					if (flag) {
						c.yMax = +p.yMax;
					}

					flag = +c.yMin < +p.yMin;
					ret = ret || flag;
					if (flag) {
						c.yMin = +p.yMin;
					}

					flag = +c.yMin > +c.yMax;
					ret = ret || flag;
					if (flag) {
						c.yMin = +c.yMax;
					}

					return ret;

					function empty(val) {
						return angular.isUndefined(val) || val === "" || val === null;
					}
				}

				function forceNumbers(clip) {
					clip.xMax = clip.xMax === null ? null : +clip.xMax;
					clip.xMin = clip.xMin === null ? null : +clip.xMin;
					clip.yMax = clip.yMax === null ? null : +clip.yMax;
					clip.yMin = clip.yMin === null ? null : +clip.yMin;
				}

				// The input validator takes care of order and min/max constraints. We just check valid existance.
				function validClip(clip) {
					return clip && angular.isNumber(clip.xMax) && angular.isNumber(clip.xMin) && angular.isNumber(clip.yMax) && angular.isNumber(clip.yMin) && !overSizeLimit(clip) && !underSizeLimit(clip);
				}
			}
		};
	}]).factory("vectorGeoprocessService", VectorGeoprocessService).filter("sysIntersect", function () {
		return function (collection, extent) {
			// The extent may have missing numbers so we don't restrict at that point.
			if (!extent || !angular.isNumber(extent.xMin) || !angular.isNumber(extent.xMax) || !angular.isNumber(extent.yMin) || !angular.isNumber(extent.yMax)) {
				return collection;
			}

			return collection.filter(function (item) {

				// We know these have valid numbers if it exists
				if (!item.extent) {
					return true;
				}
				// We have a restriction
				return item.extent.xMin <= extent.xMin && item.extent.xMax >= extent.xMax && item.extent.yMin <= extent.yMin && item.extent.yMax >= extent.yMax;
			});
		};
	});

	VectorGeoprocessService.$invoke = ['$http', '$q', '$timeout', 'configService', 'downloadService', 'ga', 'mapService', 'storageService', 'vectorService'];
}
"use strict";

/*!
 * Copyright 2016 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */

{
   angular.module("water.vector", []).directive('vectorSelect', [function () {
      return {
         templateUrl: "water/vector/vector.html",
         controllerAs: "vect",
         controller: "VectorCtrl"
      };
   }]).controller('VectorCtrl', ['selectService', 'vectorService', function (selectService, vectorService) {
      var _this = this;

      vectorService.config().then(function (data) {
         _this.config = data;
         _this.group = data.group;
      });

      this.hilight = function (doc) {
         if (doc.layer) {
            selectService.hilight(doc.layer);
         }
      };

      this.lolight = function (doc) {
         if (doc.layer) {
            selectService.lolight(doc.layer);
         }
      };
   }]).factory('vectorService', ['$http', '$q', function ($http, $q) {
      var waiters,
          config,
          service = {};

      service.config = function () {
         if (config) {
            return $q.when(config);
         }
         var waiter = $q.defer();

         if (!waiters) {
            waiters = [waiter];
            $http.get('icsm/resources/config/water_vector.json', { cache: true }).then(function (response) {
               config = response.data;
               waiters.forEach(function (waiter) {
                  waiter.resolve(config);
               });
            });
         } else {
            waiters.push(waiter);
         }
         return waiter.promise;
      };

      service.outFormats = function () {
         return service.config().then(function (data) {
            return data.refData.vectorFileFormat;
         });
      };

      return service;
   }]);
}
"use strict";

{
	var VectorDownloadCtrl = function VectorDownloadCtrl(vectorDownloadService) {
		var _this = this;

		vectorDownloadService.data().then(function (data) {
			_this.data = data;
		});

		this.remove = function () {
			vectorDownloadService.clear();
		};

		this.changeEmail = function (email) {
			vectorDownloadService.setEmail(email);
		};
	};

	var VectorDownloadService = function VectorDownloadService($http, $q, $rootScope, mapService, storageService) {
		var key = "download_email",
		    downloadLayerGroup = "Download Layers",
		    mapState = {
			zoom: null,
			center: null,
			layer: null
		},
		    _data = {
			email: null,
			item: null
		},
		    service = {
			getLayerGroup: function getLayerGroup() {
				return mapService.getGroup(downloadLayerGroup);
			},

			setState: function setState(data) {
				if (data) {
					prepare();
				} else {
					restore(map);
				}

				function prepare() {
					var bounds = [[data.bounds.yMin, data.bounds.xMin], [data.bounds.yMax, data.bounds.xMax]];

					if (mapState.layer) {
						mapService.getGroup(downloadLayerGroup).removeLayer(mapState.layer);
					}
					if (!data.queryLayer) {
						mapState.layer = L.rectangle(bounds, { color: "black", fill: false });
						mapService.getGroup(downloadLayerGroup).addLayer(mapState.layer);
					}
				}

				function restore(map) {
					mapService.clearGroup(downloadLayerGroup);
					mapState.layer = null;
				}
			},

			add: function add(item) {
				this.clear();
				_data.item = item;
				_data.item.download = true;
				if (!item.processsing) {
					item.processing = {
						clip: {
							xMax: null,
							xMin: null,
							yMax: null,
							yMin: null
						}
					};
				}
			},

			clear: function clear() {
				if (_data.item) {
					_data.item.download = false;
					_data.item = null;
				}
			},

			setEmail: function setEmail(email) {
				storageService.setItem(key, email);
			},

			getEmail: function getEmail() {
				return storageService.getItem(key).then(function (value) {
					_data.email = value;
					return value;
				});
			},

			data: function data() {
				return $q.when(_data);
			}
		};

		return service;
	};

	angular.module("water.vector.download", ['common.geoprocess']).directive("vectorPopup", ["vectorDownloadService", function (vectorDownloadService) {
		return {
			restrict: "AE",
			templateUrl: "water/vector/popup.html",
			link: function link(scope) {
				vectorDownloadService.data().then(function (data) {
					scope.data = data;

					scope.$watch("data.item", function (newValue, oldValue) {
						if (newValue) {
							scope.stage = "bbox";
						}

						if (newValue || oldValue) {
							vectorDownloadService.setState(newValue);
						}
					});
				});
			}
		};
	}]).directive("vectorDownload", ["vectorDdownloadService", function (vectorDownloadService) {
		return {
			restrict: "AE",
			controller: "VectorDownloadCtrl",
			templateUrl: "water/vector/popup.html",
			link: function link() {
				//console.log("What the download...");
			}
		};
	}]).directive("commonVectorDownload", ['vectorDownloadService', function (vectorDownloadService) {
		return {
			templateUrl: "water/vector/download.html",
			controller: "VectorDownloadCtrl",
			link: function link(scope, element) {
				vectorDownloadService.data().then(function (data) {
					scope.data = data;
				});

				scope.$watch("data.item", function (item, old) {
					if (item || old) {
						vectorDownloadService.setState(item);
					}
				});
			}
		};
	}]).directive("vectorAdd", ['$rootScope', 'vectorDownloadService', 'flashService', function ($rootScope, vectorDownloadService, flashService) {
		return {
			templateUrl: "water/vector/add.html",
			restrict: "AE",
			scope: {
				group: "="
			},
			link: function link(scope, element) {
				scope.toggle = function () {
					if (scope.group.download) {
						vectorDownloadService.clear(scope.group);
					} else {
						flashService.add("Select an area of interest that intersects the highlighted areas.");
						vectorDownloadService.add(scope.group);
						if (scope.group.sysId) {
							$rootScope.$broadcast('hide.wms', scope.group.sysId);
						}
					}
				};

				scope.someSelected = function () {
					if (!scope.group || !scope.group.docs) {
						return false;
					}

					var result = scope.group.docs.some(function (doc) {
						return doc.selected;
					});
					return result;
				};
			}
		};
	}]).controller("VectorDownloadCtrl", VectorDownloadCtrl).factory("vectorDownloadService", VectorDownloadService);

	VectorDownloadCtrl.$inject = ["vectorDownloadService"];


	VectorDownloadService.$inject = ['$http', '$q', '$rootScope', 'mapService', 'storageService'];
}
angular.module("water.templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("water/clip/clip.html","<div class=\"well well-sm\" style=\"margin-bottom:5px\">\r\n	<div class=\"container-fluid\">\r\n		<div class=\"row\">\r\n			<div class=\"col-md-12\" style=\"padding:0\">\r\n				<div class=\"\" role=\"group\" aria-label=\"...\">\r\n					<button ng-click=\"initiateDraw()\" ng-disable=\"client.drawing\"\r\n                      tooltip-append-to-body=\"true\" tooltip-placement=\"bottom\" uib-tooltip=\"Enable drawing of a bounding box. On enabling, click on the map and drag diagonally\"\r\n						class=\"btn btn-primary btn-default\">Select an area...</button>\r\n					<button ng-click=\"showInfo = !showInfo\" tooltip-placement=\"bottom\" uib-tooltip=\"Information.\" style=\"float:right\" class=\"btn btn-primary btn-default\"><i class=\"fa fa-info\"></i></button>\r\n				</div>\r\n				<exp-info title=\"Selecting an area\" show-close=\"true\" style=\"width:450px;position:fixed;top:200px;right:40px\" is-open=\"showInfo\">\r\n					<icsm-info-bbox></icsm-info-bbox>\r\n            </exp-info>\r\n            <div class=\"row\" ng-hide=\"(!clip.xMin && clip.xMin !== 0) || oversize\" style=\"padding-top:7px;\">\r\n               <div class=\"col-md-12 ng-binding\">\r\n                  Selected bounds: {{clip.xMin | number : 4}}° west,\r\n                     {{clip.yMax | number : 4}}° north,\r\n                     {{clip.xMax | number : 4}}° east,\r\n                     {{clip.yMin | number : 4}}° south\r\n               </div>\r\n            </div>\r\n			</div>\r\n		</div>\r\n	</div>\r\n</div>");
$templateCache.put("water/clip/infobbox.html","<div class=\"\">\r\n	<strong style=\"font-size:120%\">Select an area of interest.</strong>\r\n   By hitting the \"Select an area...\" button an area on the map can be selected with the mouse by clicking a\r\n   corner and while holding the left mouse button\r\n	down drag diagonally across the map to the opposite corner.\r\n	<br/>\r\n	Clicking the \"Select an area...\" button again allows replacing a previous area selection. <br/>\r\n	<strong>Notes:</strong>\r\n   <ul>\r\n      <li>The data does not cover all of Australia.</li>\r\n      <li>Restrict a search area to below four square degrees. eg 2x2 or 1x4</li>\r\n   </ul>\r\n	<p style=\"padding-top:5px\"><strong>Hint:</strong> If the map has focus, you can use the arrow keys to pan the map.\r\n		You can zoom in and out using the mouse wheel or the \"+\" and \"-\" map control on the top left of the map. If you\r\n		don\'t like the position of your drawn area, hit the \"Draw\" button and draw a new bounding box.\r\n	</p>\r\n</div>");
$templateCache.put("water/panes/panes.html","<div class=\"mapContainer\" class=\"col-md-12\" style=\"padding-right:0\"  ng-attr-style=\"right:{{right.width}}\">\r\n   <span common-baselayer-control class=\"baselayer-slider\" max-zoom=\"16\" title=\"Satellite to Topography bias on base map.\"></span>\r\n   <div class=\"panesMapContainer\" geo-map configuration=\"data.map\">\r\n      <geo-extent></geo-extent>\r\n      <common-feature-info></common-feature-info>\r\n      <icsm-layerswitch></icsm-layerswitch>\r\n   </div>\r\n   <div class=\"base-layer-controller\">\r\n      <div geo-draw data=\"data.map.drawOptions\" line-event=\"elevation.plot.data\" rectangle-event=\"bounds.drawn\"></div>\r\n   </div>\r\n   <water-regions></water-regions>\r\n   <restrict-pan bounds=\"data.map.position.bounds\"></restrict-pan>\r\n</div>");
$templateCache.put("water/panes/tabs.html","<!-- tabs go here -->\r\n<div id=\"panesTabsContainer\" class=\"paneRotateTabs\" style=\"opacity:0.9\" ng-style=\"{\'right\' : contentLeft +\'px\'}\">\r\n\r\n   <div class=\"paneTabItem\" style=\"width:60px; opacity:0\">\r\n\r\n   </div>\r\n   <div class=\"paneTabItem\" ng-class=\"{\'bold\': view == \'download\'}\" ng-click=\"setView(\'download\')\">\r\n      <button class=\"undecorated\">Datasets Download</button>\r\n   </div>\r\n   <!--\r\n	<div class=\"paneTabItem\" ng-class=\"{\'bold\': view == \'search\'}\" ng-click=\"setView(\'search\')\">\r\n		<button class=\"undecorated\">Search</button>\r\n	</div>\r\n	<div class=\"paneTabItem\" ng-class=\"{\'bold\': view == \'maps\'}\" ng-click=\"setView(\'maps\')\">\r\n		<button class=\"undecorated\">Layers</button>\r\n	</div>\r\n   -->\r\n   <div class=\"paneTabItem\" ng-class=\"{\'bold\': view == \'downloader\'}\" ng-click=\"setView(\'downloader\')\">\r\n      <button class=\"undecorated\">Products Download</button>\r\n   </div>\r\n   <div class=\"paneTabItem\" ng-class=\"{\'bold\': view == \'glossary\'}\" ng-click=\"setView(\'glossary\')\">\r\n      <button class=\"undecorated\">Glossary</button>\r\n   </div>\r\n   <div class=\"paneTabItem\" ng-class=\"{\'bold\': view == \'help\'}\" ng-click=\"setView(\'help\')\">\r\n      <button class=\"undecorated\">Help</button>\r\n   </div>\r\n</div>");
$templateCache.put("water/contributors/contributors.html","<span class=\"contributors\" ng-mouseenter=\"over()\" ng-mouseleave=\"out()\"\r\n      ng-class=\"(contributors.show || contributors.ingroup || contributors.stick) ? \'transitioned-down\' : \'transitioned-up\'\">\r\n   <button class=\"undecorated contributors-unstick\" ng-click=\"unstick()\" style=\"float:right\">X</button>\r\n   <div ng-repeat=\"contributor in contributors.orgs | activeContributors\" style=\"text-align:cnter\">\r\n      <a ng-href=\"{{contributor.href}}\" name=\"contributors{{$index}}\" title=\"{{contributor.title}}\" target=\"_blank\">\r\n         <img ng-src=\"{{contributor.image}}\" alt=\"{{contributor.title}}\" class=\"elvis-logo\" ng-class=\"contributor.class\"></img>\r\n      </a>\r\n   </div>\r\n</span>");
$templateCache.put("water/contributors/show.html","<a ng-mouseenter=\"over()\" ng-mouseleave=\"out()\" class=\"contributors-link\" title=\"Click to lock/unlock contributors list.\"\r\n      ng-click=\"toggleStick()\" href=\"#contributors0\">Contributors</a>");
$templateCache.put("water/select/division.html","<div class=\"row\" ng-repeat=\"division in divisions\">\r\n   <div class=\"col-md-12\" ng-mouseenter=\"hilight(division)\" ng-mouseleave=\"lolight(division)\">\r\n      <label>\r\n         <input type=\"radio\" ng-model=\"state.division\" name=\"divisionsRadio\" value=\"{{division.name}}\">\r\n         {{division.name}}\r\n      </label>\r\n   </div>\r\n</div>");
$templateCache.put("water/select/doc.html","<div ng-class-odd=\"\'odd\'\" ng-class-even=\"\'even\'\" ng-mouseleave=\"select.lolight(doc)\" ng-mouseenter=\"select.hilight(doc)\">\r\n	<span ng-class=\"{ellipsis:!expanded}\" tooltip-enable=\"!expanded\" style=\"width:100%;display:inline-block;\"\r\n			tooltip-class=\"selectAbstractTooltip\" tooltip=\"{{doc.abstract | truncate : 250}}\" tooltip-placement=\"bottom\">\r\n		<button type=\"button\" class=\"undecorated\" ng-click=\"expanded = !expanded\" title=\"Click to see more about this dataset\">\r\n			<i class=\"fa pad-right fa-lg\" ng-class=\"{\'fa-caret-down\':expanded,\'fa-caret-right\':(!expanded)}\"></i>\r\n		</button>\r\n		<download-add item=\"doc\" group=\"group\"></download-add>\r\n		<common-wms data=\"doc\"></common-wms>\r\n		<common-bbox data=\"doc\" ng-if=\"doc.showExtent\"></common-bbox>\r\n		<common-cc></common-cc>\r\n		<common-metaview url=\"\'https://ecat.ga.gov.au/geonetwork/srv/eng/search#!\' + doc.primaryId + \'/xml\'\" container=\"select\" item=\"doc\"></common-metaview>\r\n		<a href=\"https://ecat.ga.gov.au/geonetwork/srv/eng/search#!{{doc.primaryId}}\" target=\"_blank\" ><strong>{{doc.title}}</strong></a>\r\n	</span>\r\n	<span ng-class=\"{ellipsis:!expanded}\" style=\"width:100%;display:inline-block;padding-right:15px;\">\r\n		{{doc.abstract}}\r\n	</span>\r\n	<div ng-show=\"expanded\" style=\"padding-bottom: 5px;\">\r\n		<h5>Keywords</h5>\r\n		<div>\r\n			<span class=\"badge\" ng-repeat=\"keyword in doc.keywords track by $index\">{{keyword}}</span>\r\n		</div>\r\n	</div>\r\n</div>");
$templateCache.put("water/select/group.html","<div class=\"panel panel-default\" style=\"margin-bottom:-5px;\" >\r\n	<div class=\"panel-heading\"><common-wms data=\"group\"></common-wms> <strong>{{group.title}}</strong></div>\r\n	<div class=\"panel-body\">\r\n   		<div ng-repeat=\"doc in group.docs\">\r\n   			<div select-doc doc=\"doc\" group=\"group\"></div>\r\n		</div>\r\n	</div>\r\n</div>\r\n");
$templateCache.put("water/select/region.html","<div class=\"row\" ng-repeat=\"region in regions\">\r\n   <div class=\"col-md-12\" ng-mouseenter=\"hilight(region)\" ng-mouseleave=\"lolight(region)\">\r\n      <label>\r\n         <input type=\"radio\" ng-model=\"state.region\" name=\"regionsRadio\" value=\"{{region.name}}\">\r\n         {{region.name}}\r\n      </label>\r\n   </div>\r\n</div>");
$templateCache.put("water/select/select.html","<div ng-controller=\"SelectCtrl as select\">\r\n	<div style=\"position:relative;padding:5px;padding-left:10px;\" class=\"scrollPanel\" ng-if=\"!select.selected\">\r\n		<div class=\"panel panel-default\" style=\"margin-bottom:-5px\">\r\n  			<div class=\"panel-heading\">\r\n  				<h3 class=\"panel-title\">Available datasets</h3>\r\n  			</div>\r\n  			<div class=\"panel-body\">\r\n				<div ng-repeat=\"doc in select.data.response.docs\" style=\"padding-bottom:7px\">\r\n					<div select-doc ng-if=\"doc.type == \'dataset\'\" doc=\"doc\"></div>\r\n					<select-group ng-if=\"doc.type == \'group\'\" group=\"doc\"></select-group>\r\n				</div>\r\n				<div vector-select></div>\r\n  			</div>\r\n		</div>\r\n	</div>\r\n	<div style=\"position:relative;padding:5px;padding-left:10px;\" class=\"scrollPanel\" ng-if=\"select.selected\" common-item-metaview container=\"select\"></div>\r\n</div>");
$templateCache.put("water/side-panel/side-panel-left.html","<div class=\"cbp-spmenu cbp-spmenu-vertical cbp-spmenu-left\" style=\"width: {{left.width}}px;\" ng-class=\"{\'cbp-spmenu-open\': left.active}\">\r\n    <a href=\"\" title=\"Close panel\" ng-click=\"closeLeft()\" style=\"z-index: 1200\">\r\n        <span class=\"glyphicon glyphicon-chevron-left pull-right\"></span>\r\n    </a>\r\n    <div ng-show=\"left.active === \'legend\'\" class=\"left-side-menu-container\">\r\n        <legend url=\"\'img/AustralianTopogaphyLegend.png\'\" title=\"\'Map Legend\'\"></legend>\r\n    </div>\r\n</div>");
$templateCache.put("water/side-panel/side-panel-right.html","<div class=\"cbp-spmenu cbp-spmenu-vertical cbp-spmenu-right noPrint\" ng-attr-style=\"width:{{right.width}}\" ng-class=\"{\'cbp-spmenu-open\': right.active}\">\r\n    <a href=\"\" title=\"Close panel\" ng-click=\"closePanel()\" style=\"z-index: 1\">\r\n        <span class=\"glyphicon glyphicon-chevron-right pull-left\"></span>\r\n    </a>\r\n\r\n    <div class=\"right-side-menu-container\" ng-show=\"right.active === \'download\'\" water-view></div>\r\n    <div class=\"right-side-menu-container\" ng-show=\"right.active === \'glossary\'\" icsm-glossary></div>\r\n    <div class=\"right-side-menu-container\" ng-show=\"right.active === \'help\'\" icsm-help></div>\r\n    <panel-close-on-event only-on=\"search\" event-name=\"clear.button.fired\"></panel-close-on-event>\r\n</div>\r\n");
$templateCache.put("water/toolbar/toolbar.html","<div class=\"elevation-toolbar noPrint\">\r\n   <div class=\"toolBarContainer\">\r\n      <div>\r\n         <ul class=\"left-toolbar-items\">\r\n            <div class=\"btn-group searchBar\" ng-show=\"root.whichSearch !== \'region\'\">\r\n               <div class=\"input-group input-group-custom\" geo-search >\r\n                  <input type=\"text\" ng-autocomplete ng-model=\"values.from.description\" options=\'{country:\"au\"}\' size=\"32\" title=\"Select a locality to pan the map to.\"\r\n                     class=\"form-control\" aria-label=\"...\">\r\n                  <div class=\"input-group-btn\">\r\n                     <button ng-click=\"zoom(false)\" exp-ga=\"[\'send\', \'event\', \'icsm\', \'click\', \'zoom to location\']\" class=\"btn btn-default\" title=\"Pan and potentially zoom to location.\">\r\n                        <i class=\"fa fa-search\"></i>\r\n                     </button>\r\n                     <button ng-click=\"root.whichSearch = \'region\'\" exp-ga=\"[\'send\', \'event\', \'icsm\', \'click\', \'zoom to location\']\" class=\"btn btn-default\" title=\"Switch to search by catchment area.\">\r\n                        <i class=\"fa fa-toggle-on\"></i>\r\n                     </button>\r\n                  </div>\r\n               </div>\r\n            </div>\r\n            <common-catchment-search ng-show=\"root.whichSearch === \'region\'\"></common-catchment-search>\r\n         </ul>\r\n         <ul class=\"right-toolbar-items\">\r\n            <li>\r\n               <panel-trigger panel-id=\"download\" panel-width=\"590px\" name=\"Download\" default=\"default\" icon-class=\"fa-list\" title=\"Select an area of interest and select datasets for download\"></panel-trigger>\r\n            </li>\r\n            <li>\r\n               <panel-trigger panel-id=\"help\" panel-width=\"590px\" name=\"Help\" icon-class=\"fa-question-circle-o\" title=\"Show help\"></panel-trigger>\r\n            </li>\r\n            <li>\r\n               <panel-trigger panel-id=\"glossary\" panel-width=\"590px\" name=\"Glossary\" icon-class=\"fa-book\" title=\"Show glossary\"></panel-trigger>\r\n            </li>\r\n            <li reset-page></li>\r\n         </ul>\r\n      </div>\r\n   </div>\r\n</div>");
$templateCache.put("water/view/view.html","<div class=\"container-fluid downloadPane\">\r\n   <water-clip data=\"data.item\"></water-clip>\r\n   <div class=\"list-container\">\r\n      <water-select></water-select>\r\n   </div>\r\n   <div class=\"downloadCont\" icsm-search-continue></div>\r\n</div>");
$templateCache.put("water/vector/add.html","<button type=\'button\' ng-disabled=\'!someSelected()\' class=\'undecorated vector-add\' ng-click=\'toggle()\'>\r\n   <span class=\'fa-stack\' tooltip-placement=\'right\' uib-tooltip=\'Extract data from one or more vector types.\'>\r\n	   <i class=\'fa fa-lg fa-download\' ng-class=\'{active:item.download}\'></i>\r\n	</span>\r\n</button>");
$templateCache.put("water/vector/download.html","");
$templateCache.put("water/vector/geoprocess.html","<div class=\"container-fluido\" style=\"overflow-x:hidden\" ng-form>\r\n	<div ng-show=\"stage==\'bbox\'\">\r\n		<div class=\"row\">\r\n			<div class=\"col-md-12\">\r\n            <div uib-accordion>\r\n               <div uib-accordion-group class=\"panel\" heading=\"By drawn bounding box\" is-open=\"data.processing.bboxSelected\">\r\n				      <wizard-clip trigger=\"stage == \'bbox\'\" drawn=\"drawn()\" clip=\"data.processing.clip\" bounds=\"data.bounds\" open=\"data.processing.bboxSelected\"></wizard-clip>\r\n               </div>\r\n               <div uib-accordion-group class=\"panel\" heading=\"By division\" is-open=\"data.processing.divisionSelected\">\r\n                  <select-division state=\"data.processing\" open=\"data.processing.divisionSelected\"></select-division>\r\n               </div>\r\n               <div uib-accordion-group class=\"panel\" heading=\"By river region\" is-open=\"data.processing.regionSelected\">\r\n                  <select-region state=\"data.processing\" open=\"data.processing.regionSelected\"></select-region>\r\n               </div>\r\n            </div>\r\n			</div>\r\n		</div>\r\n		<div class=\"row\" style=\"height:55px\">\r\n 			<div class=\"col-md-12\">\r\n				<button class=\"btn btn-primary pull-right\"\r\n                  ng-disabled=\"(data.processing.bboxSelected &&  (!validClip(data) || checkingOrFailed)) || (data.processing.divisionSelected && ! data.processing.division) || (data.processing.regionSelected && ! data.processing.region)\"\r\n                  ng-click=\"stage=\'formats\'\">Next</button>\r\n			</div>\r\n		</div>\r\n		<div class=\"well\">\r\n			<strong style=\"font-size:120%\">Select an area of interest.</strong> There are two ways to select your area of interest:\r\n			<ol>\r\n				<li>Draw an area on the map with the mouse by clicking a corner and while holding the left mouse button\r\n					down drag diagonally across the map to the opposite corner or</li>\r\n				<li>Type your co-ordinates into the areas above.</li>\r\n			</ol>\r\n			Once drawn the points can be modified by the overwriting the values above or drawing another area by clicking the draw button again.\r\n			Ensure you select from the highlighted areas as the data can be quite sparse for some data.<br/>\r\n			<p style=\"padding-top:5px\">\r\n			<strong>Warning:</strong> Some extracts can be huge. It is best if you start with a small area to experiment with first. An email will be sent\r\n			with the size of the extract. Download judiciously.\r\n			</p>\r\n			<p style=\"padding-top\"><strong>Hint:</strong> If the map has focus, you can use the arrow keys to pan the map.\r\n				You can zoom in and out using the mouse wheel or the \"+\" and \"-\" map control on the top left of the map. If you\r\n				don\'t like the position of your drawn area, hit the \"Draw\" button and draw a new bounding box.\r\n			</p>\r\n		</div>\r\n	</div>\r\n\r\n	<div ng-show=\"stage==\'formats\'\">\r\n		<div class=\"well\">\r\n		<div class=\"row\">\r\n  			<div class=\"col-md-3\">\r\n				<label for=\"vectorGeoprocessOutputFormat\">\r\n					Output Format\r\n				</label>\r\n			</div>\r\n			<div class=\"col-md-9\">\r\n				<select id=\"vectorGeoprocessOutputFormat\" style=\"width:95%\" ng-model=\"data.processing.outFormat\" ng-options=\"opt.value for opt in config.refData.vectorFileFormat\"></select>\r\n			</div>\r\n		</div>\r\n		<div class=\"row\">\r\n			<div class=\"col-md-3\">\r\n				<label for=\"geoprocessOutCoordSys\">\r\n					Coordinate System\r\n				</label>\r\n			</div>\r\n			<div class=\"col-md-9\">\r\n				<select id=\"vectorGeoprocessOutCoordSys\" style=\"width:95%\" ng-model=\"data.processing.outCoordSys\" ng-options=\"opt.value for opt in config.refData.outCoordSys | sysIntersect : data.processing.clip\"></select>\r\n			</div>\r\n		</div>\r\n		</div>\r\n		<div class=\"row\" style=\"height:55px\">\r\n			<div class=\"col-md-6\">\r\n				<button class=\"btn btn-primary\" ng-click=\"stage=\'bbox\'\">Previous</button>\r\n			</div>\r\n			<div class=\"col-md-6\">\r\n				<button class=\"btn btn-primary pull-right\" ng-disabled=\"!validSansEmail(data)\" ng-click=\"stage=\'email\'\">Next</button>\r\n   			</div>\r\n		</div>\r\n\r\n		<div class=\"well\">\r\n			<strong style=\"font-size:120%\">Data representation.</strong> Select how you want your data presented.<br/>\r\n			Output format is the structure of the data and you should choose a format compatible with the tools that you will use to manipulate the data.\r\n			<ul>\r\n				<li ng-repeat=\"format in outFormats\"><strong>{{format.value}}</strong> - {{format.description}}</li>\r\n			</ul>\r\n			Select what <i>coordinate system</i> or projection you would like. If in doubt select WGS84.<br/>\r\n			Not all projections cover all of Australia. If the area you select is not covered by a particular projection then the option to download in that projection will not be available.\r\n		</div>\r\n	</div>\r\n\r\n	<div ng-show=\"stage==\'email\'\">\r\n		<div class=\"well\" exp-enter=\"stage=\'confirm\'\">\r\n			<div download-email></div>\r\n			<br/>\r\n			<div download-filename data=\"data.processing\"></div>\r\n		</div>\r\n		<div class=\"row\" style=\"height:55px\">\r\n			<div class=\"col-md-6\">\r\n				<button class=\"btn btn-primary\" ng-click=\"stage=\'formats\'\">Previous</button>\r\n			</div>\r\n			<div class=\"col-md-6\">\r\n				<button class=\"btn btn-primary pull-right\" ng-disabled=\"!allDataSet(data)\" ng-click=\"stage=\'confirm\'\">Submit</button>\r\n   			</div>\r\n		</div>\r\n		<div class=\"well\">\r\n			<strong style=\"font-size:120%\">Email notification</strong> The extract of data can take some time. By providing an email address we will be able to notify you when the job is complete. The email will provide a link to the extracted\r\n			data which will be packaged up as a single file. To be able to proceed you need to have provided:\r\n			<ul>\r\n				<li>An area of interest to extract the data (referred to as a bounding box).</li>\r\n				<li>An output format.</li>\r\n				<li>A valid coordinate system or projection.</li>\r\n				<li>An email address to receive the details of the extraction.</li>\r\n				<li><strong>Note:</strong>Email addresses need to be and are stored in the system.</li>\r\n			</ul>\r\n			<strong style=\"font-size:120%\">Optional filename</strong> The extract of data can take some time. By providing an optional filename it will allow you\r\n			to associate extracted data to your purpose for downloading data. For example:\r\n			<ul>\r\n				<li>myHouse will have a file named myHouse.zip</li>\r\n				<li>Sorrento would result in a file named Sorrento.zip</li>\r\n			</ul>\r\n		</div>\r\n	</div>\r\n\r\n	<div ng-show=\"stage==\'confirm\'\">\r\n		<div class=\"row\">\r\n			<div class=\"col-md-12 abstractContainer\">\r\n				{{data.abstract}}\r\n			</div>\r\n		</div>\r\n		<h3>You have chosen:</h3>\r\n		<table class=\"table table-striped\">\r\n			<tbody>\r\n				<tr ng-if=\"data.processing.bboxSelected\">\r\n					<th>Area</th>\r\n					<td>\r\n						<span style=\"display:inline-block; width: 10em\">Lower left (lat/lng&deg;):</span> {{data.processing.clip.yMin | number : 6}}, {{data.processing.clip.xMin | number : 6}}<br/>\r\n						<span style=\"display:inline-block;width: 10em\">Upper right (lat/lng&deg;):</span> {{data.processing.clip.yMax | number : 6}}, {{data.processing.clip.xMax | number : 6}}\r\n					</td>\r\n				</tr>\r\n				<tr ng-if=\"data.processing.divisionSelected\">\r\n					<th>Division</th>\r\n					<td>\r\n						{{data.processing.division}}\r\n               </td>\r\n				</tr>\r\n				<tr ng-if=\"data.processing.regionSelected\">\r\n					<th>River Region</th>\r\n					<td>\r\n						{{data.processing.region}}\r\n					</td>\r\n				</tr>\r\n				<tr>\r\n					<th>Output format</th>\r\n					<td>{{data.processing.outFormat.value}}</td>\r\n				</tr>\r\n				<tr>\r\n					<th>Coordinate system</th>\r\n					<td>{{data.processing.outCoordSys.value}}</td>\r\n				</tr>\r\n				<tr>\r\n					<th>Email address</th>\r\n					<td>{{email}}</td>\r\n				</tr>\r\n				<tr ng-show=\"data.processing.filename\">\r\n					<th>Filename</th>\r\n					<td>{{data.processing.filename}}</td>\r\n				</tr>\r\n			</tbody>\r\n		</table>\r\n		<div class=\"row\" style=\"height:55px\">\r\n			<div class=\"col-md-6\">\r\n				<button class=\"btn btn-primary\" style=\"width:6em\" ng-click=\"stage=\'email\'\">Back</button>\r\n			</div>\r\n			<div class=\"col-md-6\">\r\n				<button class=\"btn btn-primary pull-right\" ng-click=\"startExtract()\">Confirm</button>\r\n   			</div>\r\n		</div>\r\n	</div>\r\n</div>");
$templateCache.put("water/vector/popup.html","<exp-modal icon-class=\"fa-download\"  is-open=\"data.item.download\" title=\"Download wizard\" on-close=\"vdl.remove()\">\r\n	<div class=\"container-fluid downloadInner\" >\r\n		<div class=\"row\">\r\n  			<div class=\"col-md-12\">\r\n				<h4><common-wms data=\"vdl.data.item\"></common-wms>\r\n					<a href=\"https://ecat.ga.gov.au/geonetwork/srv/eng/catalog.search#/metadata/{{vdl.data.item.primaryId}}\" target=\"_blank\"><strong class=\"ng-binding\">{{vdl.data.item.title}}</strong></a>\r\n				</h4>\r\n   			</div>\r\n		</div>\r\n		<vector-geoprocess data=\"vdl.data.item\"></vector-geoprocess>\r\n	</div>\r\n</exp-modal>");
$templateCache.put("water/vector/vector.html","<div style=\"margin-bottom:-5px;\">\r\n   <div class=\"vector-heading\">\r\n		<vector-add group=\"vect.group\"></vector-add>\r\n      <common-tile data=\"vect.group\"></common-tile>\r\n		<common-bbox data=\"vect.group\"></common-bbox>\r\n		<common-cc></common-cc>\r\n      <strong>{{vect.group.title}}</strong>\r\n   </div>\r\n   <div class=\"vector-body\">\r\n      <div ng-repeat=\"doc in vect.group.docs\">\r\n         <div ng-class-odd=\"\'odd\'\" ng-class-even=\"\'even\'\" style=\"padding-left:12px\" ng-mouseleave=\"vect.lolight(doc)\" ng-mouseenter=\"vect.hilight(doc)\" >\r\n            <span style=\"width:100%;display:inline-block;padding-bottom:8px\">\r\n               <input type=\"checkbox\" class=\"vector-checkbox\" ng-model=\"doc.selected\">\r\n		         <common-metaview url=\"\'https://ecat.ga.gov.au/geonetwork/srv/eng/search#!\' + doc.primaryId + \'/xml\'\" container=\"select\" item=\"doc\"></common-metaview>\r\n		         <a href=\"https://ecat.ga.gov.au/geonetwork/srv/eng/catalog.search#/metadata/{{doc.primaryId}}\" target=\"_blank\" tooltip-append-to-body=\"true\"\r\n                           uib-tooltip=\"{{doc.abstract}}\" tooltip-placement=\"auto bottom\" tooltip-class=\"vector-tooltip\">\r\n                  <strong>{{doc.title}}</strong>\r\n               </a>\r\n	         </span>\r\n         </div>\r\n      </div>\r\n   </div>\r\n</div>");}]);