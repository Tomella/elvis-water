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

/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
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

   angular.module("WaterApp", ['common.catchment', 'common.cc', 'common.header', 'common.navigation', 'common.scroll', 'common.storage', 'common.templates', 'common.toolbar', 'explorer.config', 'explorer.confirm', 'explorer.drag', 'explorer.enter', 'explorer.flasher', 'explorer.googleanalytics', 'explorer.httpdata', 'explorer.info', 'explorer.message', 'explorer.modal', 'explorer.tabs', 'explorer.version', 'explorer.map.templates', 'exp.search.map.service', 'exp.ui.templates', 'geo.draw', 'geo.elevation', 'geo.geosearch', 'geo.map', 'geo.maphelper', 'geo.measure', 'h2o.catchment', 'h2o.contributors', 'h2o.download', 'h2o.list', 'h2o.panes', 'h2o.regions', 'h2o.side-panel', 'h2o.templates', 'h2o.toolbar', 'ui.bootstrap', 'ui.bootstrap-slider', 'ngAutocomplete', 'ngRoute', 'ngSanitize', 'page.footer'])

   // Set up all the service providers here.
   .config(['configServiceProvider', 'projectsServiceProvider', 'versionServiceProvider', function (configServiceProvider, projectsServiceProvider, versionServiceProvider) {
      configServiceProvider.location("icsm/resources/config/config.json");
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
"use strict";

/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
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

   angular.module('h2o.contributors', []).directive("h2oContributors", ["$interval", "contributorsService", function ($interval, contributorsService) {
      return {
         templateUrl: "h2o/contributors/contributors.html",
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
         templateUrl: "h2o/contributors/show.html",
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

/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
{
   angular.module("h2o.download", ['h2o.zone']).directive("h2oDownload", ["flashService", "messageService", "h2oDownloadService", "zoneService", function (flashService, messageService, h2oDownloadService, zoneService) {
      return {
         templateUrl: "h2o/download/download.html",
         scope: {
            data: "="
         },
         link: function link(scope) {
            scope.processing = h2oDownloadService.data;
            // Gets the counts per zone but they can be a bit iffy so we use them for a guide only
            zoneService.counts(scope.data).then(function (results) {
               scope.outCoordSys = results;
            });

            scope.$watch("processing.filename", testFilename);

            scope.submit = function () {
               var flasher = flashService.add("Submitting your job for processing", null, true);
               if (scope.processing.outFormat.restrictCoordSys) {
                  scope.processing.outCoordSys = scope.processing.config.outCoordSys.find(function (coord) {
                     return coord.code === scope.processing.outFormat.restrictCoordSys;
                  });
                  messageService.warn(scope.processing.outFormat.restrictMessage);
               }

               h2oDownloadService.submit(scope.data.params).then(function (_ref) {
                  var data = _ref.data;

                  flasher.remove();
                  if (data.serviceResponse.statusInfo.status === "success") {
                     messageService.success("Your job has successfuly been queued for processing.");
                  } else {
                     messageService.warn("The request has failed. Please try again later and if problems persist please contact us");
                  }
               }).catch(function () {
                  flasher.remove();
                  messageService.warn("The request has failed. Please try again later and if problems persist please contact us");
               });
            };

            testFilename();

            function testFilename(value) {
               if (scope.processing.filename && scope.processing.filename.length > 16) {
                  scope.processing.filename = scope.processing.filename.substr(0, 16);
               }
               scope.processing.validFilename = !scope.processing.filename || scope.processing.filename.match(/^[a-zA-Z0-9\_\-]+$/);
            }
         }
      };
   }]).factory("h2oDownloadService", ["$http", "configService", "storageService", function ($http, configService, storageService) {
      var EMAIL_KEY = "download_email";

      var service = {
         data: {
            show: false,
            email: null,
            validFilename: false,
            dataFields: "common",

            get valid() {
               return this.percentComplete === 100;
            },

            get validEmail() {
               return this.email;
            },

            get validProjection() {
               return this.outCoordSys;
            },

            get validFormat() {
               return this.outFormat;
            },

            get percentComplete() {
               return (this.validEmail ? 25 : 0) + (this.validFilename ? 25 : 0) + (this.validProjection ? 25 : 0) + (this.validFormat ? 25 : 0);
            }
         },

         submit: function submit(_ref2) {
            var fq = _ref2.fq,
                q = _ref2.q;

            var postData = {
               file_name: this.data.filename ? this.data.filename : "output_filename",
               file_format_vector: this.data.outFormat.code,
               coord_sys: this.data.outCoordSys.code,
               data_fields: this.data.dataFields,
               email_address: this.data.email,
               params: {
                  q: q,
                  fq: fq
               }
            };

            this.setEmail(this.data.email);
            if (this.data.fileName) {
               postData.file_name = this.data.fileName;
            }

            return $http({
               url: this.data.config.serviceUrl,
               method: 'POST',
               //assign content-type as undefined, the browser
               //will assign the correct boundary for us
               //prevents serializing payload.  don't do it.
               headers: {
                  "Content-Type": "application/json"
               },
               data: postData
            });
         },

         setEmail: function setEmail(email) {
            storageService.setItem(EMAIL_KEY, email);
         },

         getEmail: function getEmail() {
            return storageService.getItem(EMAIL_KEY).then(function (value) {
               service.data.email = value;
               return value;
            });
         }
      };

      configService.getConfig("download").then(function (config) {
         return service.data.config = config;
      });
      service.getEmail().then(function (email) {
         return service.data.email = email;
      });

      return service;
   }]).filter("productIntersect", function () {
      return function intersecting(collection, extent) {
         // The extent may have missing numbers so we don't restrict at that point.
         if (!extent || !collection) {
            return collection;
         }

         return collection.filter(function (item) {
            // We know these have valid numbers if it exists
            if (!item.extent) {
               return true;
            }

            var _item$extent = item.extent,
                xMax = _item$extent.xMax,
                xMin = _item$extent.xMin,
                yMax = _item$extent.yMax,
                yMin = _item$extent.yMin,
                response = void 0;

            try {
               response = extent.intersects([[yMin, xMin], [yMax, xMax]]);
            } catch (e) {
               console.error("Couldn't test for intersects", e);
               return false;
            }
            return response;
         });
      };
   });
}
'use strict';

/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
{
   angular.module("h2o.zone", []).factory('zoneService', ['$http', '$q', 'configService', function ($http, $q, configService) {
      return {
         counts: function counts(searched) {
            var _this = this;

            return configService.getConfig("download").then(function (_ref) {
               var outCoordSys = _ref.outCoordSys;

               return _this.intersections(searched).then(function (zones) {
                  return zones.map(function (zone) {
                     return zone.zone;
                  });
               });
            });
         },
         intersections: function intersections(searched) {
            return configService.getConfig().then(function (config) {
               var outCoordSys = config.download.outCoordSys;

               var zones = outCoordSys;
               var bounds = searched.bounds;
               var xMin = bounds[0][0];
               var xMax = bounds[1][0];
               var yMin = bounds[0][1];
               var yMax = bounds[1][1];

               var responses = zones.filter(function (zone) {
                  return !zone.extent || xMin <= zone.extent.xMax && xMax >= zone.extent.xMin && yMin <= zone.extent.yMax && yMax >= zone.extent.yMin;
               }).map(function (zone) {
                  return {
                     zone: zone,
                     get bounds() {
                        return zone.extent ? {
                           xMin: xMin > zone.extent.xMin ? xMin : zone.extent.xMin,
                           xMax: xMax < zone.extent.xMax ? xMax : zone.extent.xMax,
                           yMin: yMin > zone.extent.yMin ? yMin : zone.extent.yMin,
                           yMax: yMax < zone.extent.yMax ? yMax : zone.extent.yMax
                        } : null;
                     }
                  };
               });

               return responses;
            });
         }
      };
   }]);
}
"use strict";

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
{
   angular.module("h2o.list", []).directive("h2oList", ['$rootScope', function ($rootScope) {
      var pageSize = 30;

      return {
         templateUrl: "h2o/list/list.html",
         link: function link(scope, element, attrs) {
            $rootScope.$on("search.performed", function (evetn, details) {
               scope.results = details;
               scope.list = details.regions.slice(0, pageSize);

               var poly = details.polygon.coordinates[0];
               scope.state = {
                  showDownload: false,
                  bounds: [poly[0], poly[2]]
               };
            });
            //console.log("Hello select!");


            scope.more = function () {
               var _scope$list;

               (_scope$list = scope.list).push.apply(_scope$list, _toConsumableArray(scope.results.regions.slice(scope.list.length, scope.list.length + pageSize)));
            };

            scope.clear = function () {
               scope.results = null;
            };
         }
      };
   }]).directive("h2oResultsDownload", [function () {
      return {
         template: "<h2o-download data='data'></h2o-download>",
         scope: {
            data: "="
         }
      };
   }]).directive("h2oItem", ['h2oItemService', function (h2oItemService) {

      return {
         restrict: "AE",
         templateUrl: "h2o/list/item.html",
         bindToController: {
            item: "="
         },
         controller: function controller() {
            console.log("Creating an item scope");
            this.showPan = function (feature) {
               h2oItemService.showPan(this.item);
            };

            this.download = function (type) {
               h2oItemService[type](this);
            };

            this.leave = function () {
               h2oItemService.hideFeature();
            };

            this.enter = function () {
               h2oItemService.showFeature(this.item);
            };

            this.$destroy = function () {
               console.log("searchService.hide(");
            };
         },
         controllerAs: "vm"
      };
   }]).factory('h2oItemService', ['$http', 'configService', 'h2oRegionsService', 'mapService', function ($http, configService, h2oRegionsService, mapService) {
      var service = {
         showFeature: function showFeature(feature) {
            var _this = this;

            this.hideFeature();
            mapService.getMap().then(function (map) {
               _this.layer = L.geoJson(feature.geojson, {
                  style: function style(feature) {
                     return { color: "red", weight: 3 };
                  }
               }).addTo(map);
            });
         },
         hideFeature: function hideFeature() {
            var _this2 = this;

            if (this.layer) {
               mapService.getMap().then(function (map) {
                  map.removeLayer(_this2.layer);
                  _this2.layer = null;
               });
            }
         },
         showPan: function showPan(feature) {
            mapService.getMap().then(function (map) {
               var layer = L.geoJson(feature.geojson);
               map.fitBounds(layer.getBounds(), { animate: true, padding: [100, 100] });
            });
         },
         wfs: function wfs(vm) {
            configService.getConfig("results").then(function (_ref) {
               var wfsTemplate = _ref.wfsTemplate;

               $http.get(wfsTemplate.replace("${id}", vm.item.recordId)).then(function (response) {
                  var blob = new Blob([response.data], { type: "application/json;charset=utf-8" });
                  saveAs(blob, "gazetteer-wfs-feature-" + vm.item.recordId + ".xml");
               });
            });
         }
      };
      return service;
   }]).filter("toFixed", function () {
      return function (num) {
         return num.toFixed(4);
      };
   }).filter("byDistance", function () {
      return function (items, centre) {
         return items.sort();
      };
   }).filter("albersArea", function () {
      return function (sqm) {
         var area = +sqm;
         if (area > 1000000) {
            return (area / 1000000).toFixed(2) + " sq km";
         } else if (area > 10000) {
            return (area / 10000).toFixed(2) + " hectares";
         } else {
            return area.toFixed(2) + " sq m";
         }
      };
   });
}
"use strict";

/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
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

   angular.module("h2o.panes", []).directive("h2oPanes", ['$rootScope', '$timeout', 'mapService', function ($rootScope, $timeout, mapService) {
      return {
         templateUrl: "h2o/panes/panes.html",
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
         templateUrl: "h2o/panes/tabs.html",
         require: "^icsmPanes"
      };
   }]).controller("PaneCtrl", PaneCtrl).factory("paneService", PaneService);

   PaneCtrl.$inject = ["paneService"];


   PaneService.$inject = [];
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

   var H2oRegionsService = function () {
      function H2oRegionsService($http, $q, configService, mapService) {
         var _this = this;

         _classCallCheck(this, H2oRegionsService);

         this.$http = $http;
         this.$q = $q;
         this.configService = configService;
         this.mapService = mapService;
         this.featuresPromise = $q.defer();

         this._features().then(function (features) {
            _this.featuresObj = features;
            _this._featuresMap(features);
            _this.featuresPromise.resolve(features);
            _this.featuresPromise = null;
         });
      }

      _createClass(H2oRegionsService, [{
         key: "config",
         value: function config() {
            return this.configService.getConfig("regions");
         }
      }, {
         key: "features",
         value: function features() {
            if (this.featuresPromise) return this.featuresPromise.promise;
            var deferred = this.$q.defer();

            deferred.resolve(this.featuresObj);

            return deferred.promise;
         }

         /*
            {
               "id": "16",
               "name": "ADELAIDE RIVER",
               "bbox": {
                  "complete": true,
                  "xMin": 130.8875,
                  "xMax": 131.659843179235,
                  "yMin": -13.635000001,
                  "yMax": -12.0425
               }
            }
         */

      }, {
         key: "catchments",
         value: function catchments() {
            return this.features().then(function (features) {
               return features.map(function (feature) {
                  return {
                     id: feature.properties.RivRegNum,
                     name: feature.properties.RivRegName,
                     OBJECTID: feature.properties.OBJECTID,
                     bbox: {
                        complete: true,
                        xMin: feature.bbox[0],
                        xMax: feature.bbox[2],
                        yMin: feature.bbox[1],
                        yMax: feature.bbox[3]
                     },
                     geojson: feature
                  };
               });
            });
         }
      }, {
         key: "_features",
         value: function _features() {
            var _this2 = this;

            return this.config().then(function (config) {
               return _this2.$http.get(config.regionsUrl, { cache: true }).then(function (response) {
                  return response.data.features;
               });
            });
         }
      }, {
         key: "feature",
         value: function feature(id) {
            var _this3 = this;

            return this.features().then(function (features) {
               return _this3.featuresById[id];
            });
         }
      }, {
         key: "_featuresMap",
         value: function _featuresMap(features) {
            var _this4 = this;

            if (!this.featuresById) {
               this.featuresById = {};
               features.forEach(function (feature) {
                  _this4.featuresById[feature.properties.OBJECTID] = feature;
               });
            }
         }
      }, {
         key: "draw",
         value: function draw() {
            var _this5 = this;

            if (this.promise) {
               return this.promise;
            }

            this.promise = this.config().then(function (config) {
               return _this5.mapService.getMap().then(function (map) {
                  return _this5.features().then(function (features) {
                     var divisions = _this5.divisions = [];
                     var regions = _this5.regions = [];
                     var divisionsMap = _this5.divisionsMap = {};
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

      return H2oRegionsService;
   }();

   H2oRegionsService.$invoke = ['$http', '$q', 'configService', 'mapService'];

   angular.module("h2o.regions", ["h2o.select.division", "h2o.select.region"]).directive("h2oRegions", ["$http", "h2oRegionsService", "mapService", function ($http, waterRegionsService, mapService) {
      return {
         link: function link(scope) {
            var layer = void 0;
            waterRegionsService.draw();
         }
      };
   }]).service("h2oRegionsService", H2oRegionsService);
}
"use strict";

/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
{
   angular.module("h2o.select.division", ["h2o.regions"]).directive("selectDivision", ["h2oRegionsService", function (waterRegionsService) {
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
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
{
   angular.module("h2o.select.region", ['h2o.select.service']).directive("selectRegion", ["waterRegionsService", function (waterRegionsService) {
      return {
         templateUrl: "h2o/select/region.html",
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

/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
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

   angular.module("h2o.select", []).directive("h2oSelect", [function () {
      return {
         templateUrl: "h2o/select/select.html",
         link: function link(scope, element, attrs) {
            //console.log("Hello select!");
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

/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
{
   var SelectService = function SelectService($http, $q, $rootScope, $timeout, mapService, configService) {};

   angular.module("h2o.select.service", []).factory("selectService", SelectService);

   SelectService.$inject = ['$http', '$q', '$rootScope', '$timeout', 'mapService', 'configService'];
}
"use strict";

/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
{

   angular.module("h2o.toolbar", []).directive("elevationToolbar", [function () {
      return {
         restrict: "AE",
         templateUrl: "h2o/toolbar/toolbar.html",
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

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
{
   var filter = function filter(list, _filter, map, max) {
      var response = [],
          lowerFilter,
          count;
      if (!_filter) {
         return response;
      }
      if (!max) {
         max = 50;
      }
      lowerFilter = _filter.toLowerCase();
      if (list) {

         var _count = 0;
         list.some(function (item) {
            if (item.name.toLowerCase().indexOf(lowerFilter) > -1) {

               if (map && map.getBounds) {
                  var bounds = map.getBounds();
                  var bbox = item.bbox;

                  if (overlap(bbox, bounds)) {
                     response.push(item);
                     _count++;
                  }
               } else {
                  response.push(item);
                  _count++;
               }
            }
            return _count > max;
         });
      }
      return response;
   };

   var overlap = function overlap(bbox, bounds) {
      if (bbox.xMax < bounds.getWest()) return false;
      if (bbox.xMin > bounds.getEast()) return false;
      if (bbox.yMax < bounds.getSouth()) return false;
      if (bbox.yMin > bounds.getNorth()) return false;
      return true; // boxes overlap
   };

   var CatchmentsearchServiceProvider = function CatchmentsearchServiceProvider() {
      var catchmentData = {};
      this.setReferenceUrl = function (url) {
         catchmentsUrl = url;
      };
      this.setShapeUrl = function (url) {
         catchmentShapeUrl = url;
      };
      this.setBaseUrl = function (url) {
         baseUrl = url;
      };
      this.$get = ['$q', '$rootScope', '$timeout', 'h2oRegionsService', 'searchMapService', function catchmentServiceFactory($q, $rootScope, $timeout, h2oRegionsService, searchMapService) {
         var service = {
            load: function load() {
               return h2oRegionsService.catchments().then(function (response) {
                  catchmentData.catchments = response;
                  return catchmentData;
               });
            },

            zoomToLocation: function zoomToLocation(region) {
               this.zoomToLocations(region.name, [region]);
            },

            zoomToLocations: function zoomToLocations(searchStr, regions) {
               var bbox = {
                  complete: regions.every(function (region) {
                     return region.bbox.complete;
                  }),
                  xMax: Math.max.apply(Math, _toConsumableArray(regions.map(function (region) {
                     return region.bbox.xMax;
                  }))),
                  xMin: Math.min.apply(Math, _toConsumableArray(regions.map(function (region) {
                     return region.bbox.xMin;
                  }))),
                  yMax: Math.max.apply(Math, _toConsumableArray(regions.map(function (region) {
                     return region.bbox.yMax;
                  }))),
                  yMin: Math.min.apply(Math, _toConsumableArray(regions.map(function (region) {
                     return region.bbox.yMin;
                  })))
               };

               var polygon = {
                  type: "Polygon",
                  coordinates: [[[bbox.xMin, bbox.yMin], [bbox.xMin, bbox.yMax], [bbox.xMax, bbox.yMax], [bbox.xMax, bbox.yMin], [bbox.xMin, bbox.yMin]]]
               };
               var broadcastData = {
                  from: "Catchments search",
                  type: "GeoJSONUrl",
                  pan: pan,
                  show: true,
                  search: searchStr,
                  regions: regions,
                  polygon: polygon,
                  centre: [(bbox.xMax + bbox.xMin) / 2, (bbox.yMax + bbox.yMin) / 2]
               };
               $rootScope.$broadcast('search.performed', broadcastData);
               console.log(broadcastData);
               pan();
               function pan() {
                  searchMapService.goTo(polygon);
               }
            }
         };
         return service;
      }];
   };

   angular.module("h2o.catchment", ['geo.draw']).directive("h2oCatchmentSearch", ['$log', '$timeout', 'catchmentService', 'mapService', function ($log, $timeout, catchmentService, mapService) {
      return {
         restrict: "AE",
         transclude: true,
         templateUrl: "h2o/search/catchment.html",
         link: function link(scope, element) {
            var timeout;
            mapService.getMap().then(function (map) {
               return scope.map = map;
            });

            catchmentService.load().then(function (data) {
               scope.catchmentData = data;
            });
            scope.changing = function () {
               $log.info("Cancel close");
               $timeout.cancel(timeout);
            };
            scope.cancel = cancel;
            scope.zoomToLocation = function (region) {
               catchmentService.zoomToLocation(region);
               cancel();
            };

            scope.search = function () {
               var list = scope.catchmentData.catchments;
               var filteredList = void 0;

               if (scope.nameFilter) {
                  filteredList = filter(list, scope.nameFilter, scope.map, 1000);
               } else {
                  filteredList = list.reduce(function (acc, item) {
                     var bounds = map.getBounds();
                     if (overlap(item.bbox, bounds)) {
                        acc.push(item);
                     }
                     return acc;
                  }, []);
               }
               catchmentService.zoomToLocations(scope.nameFilter, filteredList);
               scope.nameFilter = "";
            };

            function cancel() {
               $timeout.cancel(timeout);
               timeout = $timeout(function () {
                  $log.info("Clear filter");
                  scope.nameFilter = "";
               }, 7000);
            }
         }
      };
   }]).provider("catchmentService", CatchmentsearchServiceProvider).filter("catchmentFilterList", function () {
      return filter;
   });

   ;
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
			templateUrl: "h2o/vector/geoprocess.html",
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
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
{
   angular.module("water.vector", []).directive('vectorSelect', [function () {
      return {
         templateUrl: "h2o/vector/vector.html",
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

/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
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
			templateUrl: "h2o/vector/popup.html",
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
			templateUrl: "h2o/vector/popup.html",
			link: function link() {
				//console.log("What the download...");
			}
		};
	}]).directive("commonVectorDownload", ['vectorDownloadService', function (vectorDownloadService) {
		return {
			templateUrl: "h2o/vector/download.html",
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
			templateUrl: "h2o/vector/add.html",
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
'use strict';

/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
{
   angular.module("h2o.side-panel", []).factory('panelSideFactory', ['$rootScope', '$timeout', function ($rootScope, $timeout) {
      var state = {
         left: {
            active: null,
            width: 0
         },

         right: {
            active: null,
            width: 0
         }
      };

      function setSide(state, value) {
         var response = state.active;

         if (response === value) {
            state.active = null;
            state.width = 0;
         } else {
            state.active = value;
         }
         return !response;
      }

      return {
         state: state,
         setLeft: function setLeft(value) {
            var result = setSide(state.left, value);
            if (result) {
               state.left.width = 320; // We have a hard coded width at the moment we will probably refactor to parameterize it.
            }
            return result;
         },

         setRight: function setRight(data) {
            state.right.width = data.width;
            var response = setSide(state.right, data.name);
            $rootScope.$broadcast('side.panel.change', {
               side: "right",
               data: state.right,
               width: data.width
            });
            return response;
         }
      };
   }]).directive('sidePanelRightOppose', ["panelSideFactory", function (panelSideFactory) {
      return {
         restrict: 'E',
         transclude: true,
         template: '<div class="contentContainer" ng-attr-style="right:{{right.width}}" ng-transclude>' + '</div>',
         link: function link(scope) {
            scope.right = panelSideFactory.state.right;
         }
      };
   }]).directive('sidePanelRight', ["panelSideFactory", function (panelSideFactory) {
      return {
         restrict: 'E',
         transclude: true,
         templateUrl: 'h2o/side-panel/side-panel-right.html',
         link: function link(scope) {
            scope.right = panelSideFactory.state.right;

            scope.closePanel = function () {
               panelSideFactory.setRight({ name: null, width: 0 });
            };
         }
      };
   }]).directive('panelTrigger', ["panelSideFactory", function (panelSideFactory) {
      return {
         restrict: 'E',
         transclude: true,
         templateUrl: 'h2o/side-panel/trigger.html',
         scope: {
            default: "@?",
            panelWidth: "@",
            name: "@",
            iconClass: "@",
            panelId: "@"
         },
         link: function link(scope) {
            scope.toggle = function () {
               panelSideFactory.setRight({
                  width: scope.panelWidth,
                  name: scope.panelId
               });
            };
            if (scope.default) {
               panelSideFactory.setRight({
                  width: scope.panelWidth,
                  name: scope.panelId
               });
            }
         }
      };
   }]).directive('panelOpenOnEvent', ["$rootScope", "panelSideFactory", function ($rootScope, panelSideFactory) {
      return {
         restrict: 'E',
         scope: {
            panelWidth: "@",
            eventName: "@",
            panelId: "@",
            side: "@?"
         },
         link: function link(scope) {
            if (!scope.side) {
               scope.side = "right";
            }
            $rootScope.$on(scope.eventName, function (event, data) {
               var state = panelSideFactory.state[scope.side];
               if (state && (!state.active || scope.panelId !== state.active)) {
                  var params = {
                     width: scope.panelWidth,
                     name: scope.panelId
                  };

                  if (scope.side === "right") {
                     panelSideFactory.setRight(params);
                  } else {
                     panelSideFactory.setLeft(params);
                  }
               }
            });
         }
      };
   }]).directive('panelCloseOnEvent', ["$rootScope", "panelSideFactory", function ($rootScope, panelSideFactory) {
      return {
         restrict: 'E',
         scope: {
            eventName: "@",
            side: "@?",
            onlyOn: "@?"
         },
         link: function link(scope) {
            if (!scope.side) {
               scope.side = "right";
            }
            $rootScope.$on(scope.eventName, function (event, data) {
               var state = panelSideFactory.state[scope.side];
               if (scope.onlyOn && state.active !== scope.onlyOn) {
                  return;
               }

               if (state && state.active) {
                  var params = {
                     name: null
                  };

                  if (scope.side === "right") {
                     panelSideFactory.setRight(params);
                  } else {
                     panelSideFactory.setLeft(params);
                  }
               }
            });
         }
      };
   }]).directive('sidePanelLeft', ['panelSideFactory', function (panelSideFactory) {
      return {
         restrict: 'E',
         transclude: true,
         templateUrl: 'h2o/side-panel/side-panel-left.html',
         link: function link(scope) {
            scope.left = panelSideFactory.state.left;

            scope.closeLeft = function () {
               panelSideFactory.setLeft(null);
            };
         }
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
         templateUrl: "h2o/view/view.html",
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
angular.module("h2o.templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("h2o/contributors/contributors.html","<span class=\"contributors\" ng-mouseenter=\"over()\" ng-mouseleave=\"out()\"\r\n      ng-class=\"(contributors.show || contributors.ingroup || contributors.stick) ? \'transitioned-down\' : \'transitioned-up\'\">\r\n   <button class=\"undecorated contributors-unstick\" ng-click=\"unstick()\" style=\"float:right\">X</button>\r\n   <div ng-repeat=\"contributor in contributors.orgs | activeContributors\" style=\"text-align:cnter\">\r\n      <a ng-href=\"{{contributor.href}}\" name=\"contributors{{$index}}\" title=\"{{contributor.title}}\" target=\"_blank\">\r\n         <img ng-src=\"{{contributor.image}}\" alt=\"{{contributor.title}}\" class=\"elvis-logo\" ng-class=\"contributor.class\"></img>\r\n      </a>\r\n   </div>\r\n</span>");
$templateCache.put("h2o/contributors/show.html","<a ng-mouseenter=\"over()\" ng-mouseleave=\"out()\" class=\"contributors-link\" title=\"Click to lock/unlock contributors list.\"\r\n      ng-click=\"toggleStick()\" href=\"#contributors0\">Contributors</a>");
$templateCache.put("h2o/download/download.html","<div class=\"container-fluid\">\r\n      <div class=\"row\">\r\n         <div class=\"col-md-4\">\r\n            <label for=\"geoprocessOutCoordSys\">\r\n               Coordinate System\r\n            </label>\r\n         </div>\r\n         <div class=\"col-md-8\">\r\n            <select style=\"width:95%\" ng-model=\"processing.outCoordSys\" id=\"geoprocessOutCoordSys\"\r\n               ng-options=\"opt.value for opt in outCoordSys\"></select>\r\n         </div>\r\n      </div>\r\n\r\n      <div class=\"row\">\r\n         <div class=\"col-md-4\">\r\n            <label for=\"geoprocessOutputFormat\">\r\n               Output Format\r\n            </label>\r\n         </div>\r\n         <div class=\"col-md-8\">\r\n            <select style=\"width:95%\" ng-model=\"processing.outFormat\" id=\"geoprocessOutputFormat\" ng-options=\"opt.value for opt in processing.config.outFormat\"></select>\r\n         </div>\r\n      </div>\r\n\r\n      <div class=\"row\">\r\n         <div class=\"col-md-4\">\r\n            <label for=\"geoprocessOutputFormat\">\r\n               File name\r\n            </label>\r\n         </div>\r\n         <div class=\"col-md-8\">\r\n            <input type=\"text\" ng-model=\"processing.filename\" class=\"download-control\" placeholder=\"Optional filename\" title=\"Alphanumeric, hyphen or dash characters, maximium of 16 characters\">\r\n         </div>\r\n      </div>\r\n      <div class=\"row\">\r\n         <div class=\"col-md-4\">\r\n            <label for=\"geoprocessOutputFormat\">\r\n               Email\r\n            </label>\r\n         </div>\r\n         <div class=\"col-md-8\">\r\n            <input required=\"required\" type=\"email\" ng-model=\"processing.email\" class=\"download-control\" placeholder=\"Email address to send download link\">\r\n         </div>\r\n      </div>\r\n\r\n      <div class=\"row\">\r\n         <div class=\"col-md-5\" style=\"padding-top:7px\">\r\n            <div class=\"progress\">\r\n               <div class=\"progress-bar\" role=\"progressbar\" aria-valuenow=\"{{processing.percentComplete}}\" aria-valuemin=\"0\" aria-valuemax=\"100\"\r\n                  style=\"width: {{processing.percentComplete}}%;\">\r\n                  <span class=\"sr-only\"></span>\r\n               </div>\r\n            </div>\r\n         </div>\r\n         <div class=\"col-md-5\" style=\"padding-top:7px\">\r\n            <span style=\"padding-right:10px\" uib-tooltip=\"Select a valid coordinate system for area.\" tooltip-placement=\"bottom\">\r\n               <i class=\"fa fa-file-video-o fa-2x\" ng-class=\"{\'product-valid\': processing.validProjection, \'product-invalid\': !processing.validProjection}\"></i>\r\n            </span>\r\n            <span style=\"padding-right:10px\" uib-tooltip=\"Select a valid download format.\" tooltip-placement=\"bottom\">\r\n               <i class=\"fa fa-files-o fa-2x\" ng-class=\"{\'product-valid\': processing.validFormat, \'product-invalid\': !processing.validFormat}\"></i>\r\n            </span>\r\n            <span style=\"padding-right:10px\" uib-tooltip=\"Optional custom filename (alphanumeric, max length 8 characters)\" tooltip-placement=\"bottom\">\r\n               <i class=\"fa fa-save fa-2x\" ng-class=\"{\'product-valid\': processing.validFilename, \'product-invalid\': !processing.validFilename}\"></i>\r\n            </span>\r\n            <span style=\"padding-right:10px\" uib-tooltip=\"Provide an email address.\" tooltip-placement=\"bottom\">\r\n               <i class=\"fa fa-envelope fa-2x\" ng-class=\"{\'product-valid\': processing.validEmail, \'product-invalid\': !processing.validEmail}\"></i>\r\n            </span>\r\n         </div>\r\n         <div class=\"col-md-2\">\r\n            <button class=\"btn btn-primary pull-right\" ng-disabled=\"!processing.valid\" ng-click=\"submit()\">Submit</button>\r\n         </div>\r\n      </div>\r\n   </div>");
$templateCache.put("h2o/list/item.html","<div ng-mouseenter=\"vm.enter()\" ng-mouseleave=\"vm.leave()\">\r\n      <div class=\"container-fluid\">\r\n         <div class=\"row\">\r\n            <div class=\"col-md-12 list-header\" >\r\n               <button type=\"button\" class=\"undecorated\" ng-click=\"vm.showPan(vm.item)\"\r\n                      tooltip-append-to-body=\"true\" title=\"Zoom to river region.\" tooltip-placement=\"left\" uib-tooltip=\"Zoom to river region\">\r\n                  <i class=\"fa fa-lg fa-flag-o\"></i>\r\n               </button>\r\n               <span>{{vm.item.name}}</span>\r\n               <span class=\"pull-right\">River region ID: {{vm.item.id}}</span>\r\n            </div>\r\n         </div>\r\n      </div>\r\n      <div class=\"container-fluid\">\r\n         <div class=\"row\">\r\n            <div class=\"col-md-4\">Division</div>\r\n            <div class=\"col-md-8\">\r\n               <span class=\"pn-numeric\" title=\" Drainage Division Name\">\r\n                     {{doc.geojson.properties.Division}}\r\n               </span>\r\n            </div>\r\n         </div>\r\n         <div class=\"row\">\r\n            <div class=\"col-md-4\">Area</div>\r\n            <div class=\"col-md-8\">\r\n               <span class=\"pn-numeric\" title=\"Catchment area size\">\r\n                     {{doc.geojson.properties.AlbersArea | albersArea}}\r\n               </span>\r\n            </div>\r\n         </div>\r\n         <div class=\"row\">\r\n            <div class=\"col-md-4\">Source</div>\r\n            <div class=\"col-md-8\">\r\n               <span class=\"pn-numeric\" title=\"Name of agency that originally captured the spatial object.\">\r\n                     {{doc.geojson.properties.FSource}}\r\n               </span>\r\n            </div>\r\n         </div>\r\n         <div class=\"row\">\r\n            <div class=\"col-md-4\">Attribute Source</div>\r\n            <div class=\"col-md-8\">\r\n               <span class=\"pn-numeric\" title=\"Name of agency that originally captured the attribute object.\">\r\n                     {{doc.geojson.properties.AttrSource}}\r\n               </span>\r\n            </div>\r\n         </div>\r\n         <div class=\"row\">\r\n            <div class=\"col-md-4\">Bounded (S/W/N/E)</div>\r\n            <div class=\"col-md-8\">\r\n               <span class=\"pn-numeric\" title=\"South / West / North / East\"s>\r\n                     {{vm.item.bbox.yMin | toFixed}}&deg; / {{vm.item.bbox.xMin | toFixed}}&deg; / {{vm.item.bbox.yMax | toFixed}}&deg; / {{vm.item.bbox.xMax | toFixed}}&deg;\r\n               </span>\r\n            </div>\r\n         </div>\r\n\r\n      </div>");
$templateCache.put("h2o/list/list.html","<div class=\"pn-results-heading\" style=\"min-height:25px\" ng-if=\"results\">\r\n   <span ng-if=\"results.regions.length == 1\">\r\n      Showing matched river regions\r\n   </span>\r\n   <span ng-if=\"results.regions.length > 1\">\r\n      Matched {{results.regions.length}} river regions\r\n   </span>\r\n   <span class=\"pull-right\">\r\n      <button class=\"btn btn-primary\" style=\"padding:0 10px\" ng-click=\"state.showDownload = !state.showDownload\">\r\n         <span ng-if=\"!state.showDownload\">Download...</span>\r\n         <span ng-if=\"state.showDownload\">Hide download details</span>\r\n      </button>\r\n      <button class=\"btn btn-primary\" style=\"padding:0 10px\" ng-if=\"results.regions.length && !state.showDownload\" ng-click=\"clear()\">\r\n         Clear results\r\n      </button>\r\n   </span>\r\n</div>\r\n<div class=\"panel panel-default pn-container\" ng-if=\"results\" common-scroller buffer=\"200\" more=\"more()\">\r\n   <div class=\"panel-heading\">\r\n      <div style=\"padding-top:5px; padding-bottom:5px\">\r\n         <span ng-if=\"results.search\">Matching river region names like \"{{results.search}}\"</span>\r\n      </div>\r\n      <div style=\"padding-top:5px; padding-bottom:5px\" ng-if=\"state.showDownload\">\r\n         <h2o-download data=\"state\"></h2o-download>\r\n      </div>\r\n   </div>\r\n\r\n   <div class=\"panel-default panel-body\">\r\n      <div class=\"pn-results-list\" ng-repeat=\"doc in results.regions\">\r\n         <h2o-item item=\"doc\"></h2o-item>\r\n      </div>\r\n   </div>\r\n</div>\r\n<div class=\"panel panel-default pn-container\" ng-if=\"!results\">\r\n   <div class=\"panel-heading\" style=\"min-height:25px\">\r\n      <span style=\"font-weight:bold\">\r\n         Need help on how to search?\r\n      </span>\r\n   </div>\r\n   <div class=\"panel-body\">\r\n      Searching is conducted on the current map view. Pan and zoom the map to your area of interest\r\n      <br/>\r\n      <br/>\r\n      Use the search input to restrict your search.\r\n      <br/><strong>Hint:</strong>\r\n      <ul>\r\n         <li>You can load all river regions in an area by leaving the search input blank,\r\n            panning and zooming to your area of interest and hitting the search button.</li>\r\n         <li>You can restrict to a single river region by clicking it on the list of hints for the search input.</li>\r\n      </ul>\r\n   </div>\r\n</div>");
$templateCache.put("h2o/panes/panes.html","<div class=\"mapContainer\" class=\"col-md-12\" style=\"padding-right:0\"  ng-attr-style=\"right:{{right.width}}\">\r\n   <span common-baselayer-control class=\"baselayer-slider\" max-zoom=\"16\" title=\"Satellite to Topography bias on base map.\"></span>\r\n   <div class=\"panesMapContainer\" geo-map configuration=\"data.map\">\r\n      <geo-extent></geo-extent>\r\n      <common-feature-info></common-feature-info>\r\n      <icsm-layerswitch></icsm-layerswitch>\r\n   </div>\r\n   <div class=\"base-layer-controller\">\r\n      <div geo-draw data=\"data.map.drawOptions\" line-event=\"elevation.plot.data\" rectangle-event=\"bounds.drawn\"></div>\r\n   </div>\r\n   <h2o-regions></h2o-regions>\r\n   <restrict-pan bounds=\"data.map.position.bounds\"></restrict-pan>\r\n</div>");
$templateCache.put("h2o/panes/tabs.html","<!-- tabs go here -->\r\n<div id=\"panesTabsContainer\" class=\"paneRotateTabs\" style=\"opacity:0.9\" ng-style=\"{\'right\' : contentLeft +\'px\'}\">\r\n\r\n   <div class=\"paneTabItem\" style=\"width:60px; opacity:0\">\r\n\r\n   </div>\r\n   <div class=\"paneTabItem\" ng-class=\"{\'bold\': view == \'download\'}\" ng-click=\"setView(\'download\')\">\r\n      <button class=\"undecorated\">Datasets Download</button>\r\n   </div>\r\n   <div class=\"paneTabItem\" ng-class=\"{\'bold\': view == \'downloader\'}\" ng-click=\"setView(\'downloader\')\">\r\n      <button class=\"undecorated\">Products Download</button>\r\n   </div>\r\n   <div class=\"paneTabItem\" ng-class=\"{\'bold\': view == \'glossary\'}\" ng-click=\"setView(\'glossary\')\">\r\n      <button class=\"undecorated\">Glossary</button>\r\n   </div>\r\n   <div class=\"paneTabItem\" ng-class=\"{\'bold\': view == \'help\'}\" ng-click=\"setView(\'help\')\">\r\n      <button class=\"undecorated\">Help</button>\r\n   </div>\r\n</div>");
$templateCache.put("h2o/select/division.html","<div class=\"row\" ng-repeat=\"division in divisions\">\r\n   <div class=\"col-md-12\" ng-mouseenter=\"hilight(division)\" ng-mouseleave=\"lolight(division)\">\r\n      <label>\r\n         <input type=\"radio\" ng-model=\"state.division\" name=\"divisionsRadio\" value=\"{{division.name}}\">\r\n         {{division.name}}\r\n      </label>\r\n   </div>\r\n</div>");
$templateCache.put("h2o/select/doc.html","<div ng-class-odd=\"\'odd\'\" ng-class-even=\"\'even\'\" ng-mouseleave=\"select.lolight(doc)\" ng-mouseenter=\"select.hilight(doc)\">\r\n	<span ng-class=\"{ellipsis:!expanded}\" tooltip-enable=\"!expanded\" style=\"width:100%;display:inline-block;\"\r\n			tooltip-class=\"selectAbstractTooltip\" tooltip=\"{{doc.abstract | truncate : 250}}\" tooltip-placement=\"bottom\">\r\n		<button type=\"button\" class=\"undecorated\" ng-click=\"expanded = !expanded\" title=\"Click to see more about this dataset\">\r\n			<i class=\"fa pad-right fa-lg\" ng-class=\"{\'fa-caret-down\':expanded,\'fa-caret-right\':(!expanded)}\"></i>\r\n		</button>\r\n		<download-add item=\"doc\" group=\"group\"></download-add>\r\n		<common-wms data=\"doc\"></common-wms>\r\n		<common-bbox data=\"doc\" ng-if=\"doc.showExtent\"></common-bbox>\r\n		<common-cc></common-cc>\r\n		<common-metaview url=\"\'https://ecat.ga.gov.au/geonetwork/srv/eng/search#!\' + doc.primaryId + \'/xml\'\" container=\"select\" item=\"doc\"></common-metaview>\r\n		<a href=\"https://ecat.ga.gov.au/geonetwork/srv/eng/search#!{{doc.primaryId}}\" target=\"_blank\" ><strong>{{doc.title}}</strong></a>\r\n	</span>\r\n	<span ng-class=\"{ellipsis:!expanded}\" style=\"width:100%;display:inline-block;padding-right:15px;\">\r\n		{{doc.abstract}}\r\n	</span>\r\n	<div ng-show=\"expanded\" style=\"padding-bottom: 5px;\">\r\n		<h5>Keywords</h5>\r\n		<div>\r\n			<span class=\"badge\" ng-repeat=\"keyword in doc.keywords track by $index\">{{keyword}}</span>\r\n		</div>\r\n	</div>\r\n</div>");
$templateCache.put("h2o/select/group.html","<div class=\"panel panel-default\" style=\"margin-bottom:-5px;\" >\r\n	<div class=\"panel-heading\"><common-wms data=\"group\"></common-wms> <strong>{{group.title}}</strong></div>\r\n	<div class=\"panel-body\">\r\n   		<div ng-repeat=\"doc in group.docs\">\r\n   			<div select-doc doc=\"doc\" group=\"group\"></div>\r\n		</div>\r\n	</div>\r\n</div>\r\n");
$templateCache.put("h2o/select/region.html","<div class=\"row\" ng-repeat=\"region in regions\">\r\n   <div class=\"col-md-12\" ng-mouseenter=\"hilight(region)\" ng-mouseleave=\"lolight(region)\">\r\n      <label>\r\n         <input type=\"radio\" ng-model=\"state.region\" name=\"regionsRadio\" value=\"{{region.name}}\">\r\n         {{region.name}}\r\n      </label>\r\n   </div>\r\n</div>");
$templateCache.put("h2o/select/select.html","Fred");
$templateCache.put("h2o/toolbar/toolbar.html","<div class=\"elevation-toolbar noPrint\">\r\n   <div class=\"toolBarContainer\">\r\n      <div>\r\n         <ul class=\"left-toolbar-items\">\r\n            <div class=\"btn-group searchBar\" ng-show=\"root.whichSearch === \'google\'\">\r\n               <div class=\"input-group input-group-custom\" geo-search >\r\n                  <input type=\"text\" ng-autocomplete ng-model=\"values.from.description\" options=\'{country:\"au\"}\' size=\"32\" title=\"Select a locality to pan the map to.\"\r\n                     class=\"form-control\" aria-label=\"...\">\r\n                  <div class=\"input-group-btn\">\r\n                     <button ng-click=\"zoom(false)\" exp-ga=\"[\'send\', \'event\', \'icsm\', \'click\', \'zoom to location\']\" class=\"btn btn-default\" title=\"Pan and potentially zoom to location.\">\r\n                        <i class=\"fa fa-search\"></i>\r\n                     </button>\r\n                     <button ng-click=\"root.whichSearch = \'region\'\" exp-ga=\"[\'send\', \'event\', \'icsm\', \'click\', \'zoom to location\']\" class=\"btn btn-default\" title=\"Switch to search by catchment area.\">\r\n                        <i class=\"fa fa-toggle-on\"></i>\r\n                     </button>\r\n                  </div>\r\n               </div>\r\n            </div>\r\n            <h2o-catchment-search ng-show=\"root.whichSearch !== \'google\'\"></h2o-catchment-search>\r\n         </ul>\r\n         <ul class=\"right-toolbar-items\">\r\n            <li>\r\n               <panel-trigger panel-id=\"download\" panel-width=\"590px\" name=\"Download\" default=\"default\" icon-class=\"fa-list\" title=\"Select an area of interest and select datasets for download\"></panel-trigger>\r\n            </li>\r\n            <li>\r\n               <panel-trigger panel-id=\"help\" panel-width=\"590px\" name=\"Help\" icon-class=\"fa-question-circle-o\" title=\"Show help\"></panel-trigger>\r\n            </li>\r\n            <li>\r\n               <panel-trigger panel-id=\"glossary\" panel-width=\"590px\" name=\"Glossary\" icon-class=\"fa-book\" title=\"Show glossary\"></panel-trigger>\r\n            </li>\r\n            <li reset-page></li>\r\n         </ul>\r\n      </div>\r\n   </div>\r\n</div>");
$templateCache.put("h2o/search/catchment.html","<div class=\"btn-group searchBar\">\r\n   <div class=\"input-group input-group-custom\">\r\n		<input type=\"text\" size=\"32\" class=\"form-control\"\r\n            ng-keyup=\"keyup($event)\" ng-focus=\"changing()\" ng-model=\"nameFilter\" placeholder=\"Find a catchment of interest\">\r\n      <div class=\"input-group-btn\">\r\n         <button ng-click=\"search()\" class=\"btn btn-default\" title=\"Switch to search by google search\">\r\n            <i class=\"fa fa-search\" aria-hidden=\"true\" ></i>\r\n         </button>\r\n         <button ng-click=\"root.whichSearch = \'google\'\" class=\"btn btn-default\" title=\"Switch to search by google search\">\r\n            <i class=\"fa fa-toggle-on\"></i>\r\n         </button>\r\n      </div>\r\n      <div style=\"width:24em; top:31px; position:absolute;left:15px;color:black\">\r\n         <div class=\"row\" ng-repeat=\"region in catchmentData.catchments | catchmentFilterList : nameFilter : map: 20 | orderBy : \'name\'\"\r\n                style=\"background-color:white;\">\r\n            <div class=\"col-md-12 rw-sub-list-trigger\">\r\n               <button class=\"undecorated zoomButton\" ng-click=\"zoomToLocation(region);\">{{region.name}}</button>\r\n            </div>\r\n         </div>\r\n      </div>\r\n   </div>\r\n</div>");
$templateCache.put("h2o/vector/add.html","<button type=\'button\' ng-disabled=\'!someSelected()\' class=\'undecorated vector-add\' ng-click=\'toggle()\'>\r\n   <span class=\'fa-stack\' tooltip-placement=\'right\' uib-tooltip=\'Extract data from one or more vector types.\'>\r\n	   <i class=\'fa fa-lg fa-download\' ng-class=\'{active:item.download}\'></i>\r\n	</span>\r\n</button>");
$templateCache.put("h2o/vector/download.html","");
$templateCache.put("h2o/vector/geoprocess.html","<div class=\"container-fluido\" style=\"overflow-x:hidden\" ng-form>\r\n	<div ng-show=\"stage==\'bbox\'\">\r\n		<div class=\"row\">\r\n			<div class=\"col-md-12\">\r\n            <div uib-accordion>\r\n               <div uib-accordion-group class=\"panel\" heading=\"By drawn bounding box\" is-open=\"data.processing.bboxSelected\">\r\n				      <wizard-clip trigger=\"stage == \'bbox\'\" drawn=\"drawn()\" clip=\"data.processing.clip\" bounds=\"data.bounds\" open=\"data.processing.bboxSelected\"></wizard-clip>\r\n               </div>\r\n               <div uib-accordion-group class=\"panel\" heading=\"By division\" is-open=\"data.processing.divisionSelected\">\r\n                  <select-division state=\"data.processing\" open=\"data.processing.divisionSelected\"></select-division>\r\n               </div>\r\n               <div uib-accordion-group class=\"panel\" heading=\"By river region\" is-open=\"data.processing.regionSelected\">\r\n                  <select-region state=\"data.processing\" open=\"data.processing.regionSelected\"></select-region>\r\n               </div>\r\n            </div>\r\n			</div>\r\n		</div>\r\n		<div class=\"row\" style=\"height:55px\">\r\n 			<div class=\"col-md-12\">\r\n				<button class=\"btn btn-primary pull-right\"\r\n                  ng-disabled=\"(data.processing.bboxSelected &&  (!validClip(data) || checkingOrFailed)) || (data.processing.divisionSelected && ! data.processing.division) || (data.processing.regionSelected && ! data.processing.region)\"\r\n                  ng-click=\"stage=\'formats\'\">Next</button>\r\n			</div>\r\n		</div>\r\n		<div class=\"well\">\r\n			<strong style=\"font-size:120%\">Select an area of interest.</strong> There are two ways to select your area of interest:\r\n			<ol>\r\n				<li>Draw an area on the map with the mouse by clicking a corner and while holding the left mouse button\r\n					down drag diagonally across the map to the opposite corner or</li>\r\n				<li>Type your co-ordinates into the areas above.</li>\r\n			</ol>\r\n			Once drawn the points can be modified by the overwriting the values above or drawing another area by clicking the draw button again.\r\n			Ensure you select from the highlighted areas as the data can be quite sparse for some data.<br/>\r\n			<p style=\"padding-top:5px\">\r\n			<strong>Warning:</strong> Some extracts can be huge. It is best if you start with a small area to experiment with first. An email will be sent\r\n			with the size of the extract. Download judiciously.\r\n			</p>\r\n			<p style=\"padding-top\"><strong>Hint:</strong> If the map has focus, you can use the arrow keys to pan the map.\r\n				You can zoom in and out using the mouse wheel or the \"+\" and \"-\" map control on the top left of the map. If you\r\n				don\'t like the position of your drawn area, hit the \"Draw\" button and draw a new bounding box.\r\n			</p>\r\n		</div>\r\n	</div>\r\n\r\n	<div ng-show=\"stage==\'formats\'\">\r\n		<div class=\"well\">\r\n		<div class=\"row\">\r\n  			<div class=\"col-md-3\">\r\n				<label for=\"vectorGeoprocessOutputFormat\">\r\n					Output Format\r\n				</label>\r\n			</div>\r\n			<div class=\"col-md-9\">\r\n				<select id=\"vectorGeoprocessOutputFormat\" style=\"width:95%\" ng-model=\"data.processing.outFormat\" ng-options=\"opt.value for opt in config.refData.vectorFileFormat\"></select>\r\n			</div>\r\n		</div>\r\n		<div class=\"row\">\r\n			<div class=\"col-md-3\">\r\n				<label for=\"geoprocessOutCoordSys\">\r\n					Coordinate System\r\n				</label>\r\n			</div>\r\n			<div class=\"col-md-9\">\r\n				<select id=\"vectorGeoprocessOutCoordSys\" style=\"width:95%\" ng-model=\"data.processing.outCoordSys\" ng-options=\"opt.value for opt in config.refData.outCoordSys | sysIntersect : data.processing.clip\"></select>\r\n			</div>\r\n		</div>\r\n		</div>\r\n		<div class=\"row\" style=\"height:55px\">\r\n			<div class=\"col-md-6\">\r\n				<button class=\"btn btn-primary\" ng-click=\"stage=\'bbox\'\">Previous</button>\r\n			</div>\r\n			<div class=\"col-md-6\">\r\n				<button class=\"btn btn-primary pull-right\" ng-disabled=\"!validSansEmail(data)\" ng-click=\"stage=\'email\'\">Next</button>\r\n   			</div>\r\n		</div>\r\n\r\n		<div class=\"well\">\r\n			<strong style=\"font-size:120%\">Data representation.</strong> Select how you want your data presented.<br/>\r\n			Output format is the structure of the data and you should choose a format compatible with the tools that you will use to manipulate the data.\r\n			<ul>\r\n				<li ng-repeat=\"format in outFormats\"><strong>{{format.value}}</strong> - {{format.description}}</li>\r\n			</ul>\r\n			Select what <i>coordinate system</i> or projection you would like. If in doubt select WGS84.<br/>\r\n			Not all projections cover all of Australia. If the area you select is not covered by a particular projection then the option to download in that projection will not be available.\r\n		</div>\r\n	</div>\r\n\r\n	<div ng-show=\"stage==\'email\'\">\r\n		<div class=\"well\" exp-enter=\"stage=\'confirm\'\">\r\n			<div download-email></div>\r\n			<br/>\r\n			<div download-filename data=\"data.processing\"></div>\r\n		</div>\r\n		<div class=\"row\" style=\"height:55px\">\r\n			<div class=\"col-md-6\">\r\n				<button class=\"btn btn-primary\" ng-click=\"stage=\'formats\'\">Previous</button>\r\n			</div>\r\n			<div class=\"col-md-6\">\r\n				<button class=\"btn btn-primary pull-right\" ng-disabled=\"!allDataSet(data)\" ng-click=\"stage=\'confirm\'\">Submit</button>\r\n   			</div>\r\n		</div>\r\n		<div class=\"well\">\r\n			<strong style=\"font-size:120%\">Email notification</strong> The extract of data can take some time. By providing an email address we will be able to notify you when the job is complete. The email will provide a link to the extracted\r\n			data which will be packaged up as a single file. To be able to proceed you need to have provided:\r\n			<ul>\r\n				<li>An area of interest to extract the data (referred to as a bounding box).</li>\r\n				<li>An output format.</li>\r\n				<li>A valid coordinate system or projection.</li>\r\n				<li>An email address to receive the details of the extraction.</li>\r\n				<li><strong>Note:</strong>Email addresses need to be and are stored in the system.</li>\r\n			</ul>\r\n			<strong style=\"font-size:120%\">Optional filename</strong> The extract of data can take some time. By providing an optional filename it will allow you\r\n			to associate extracted data to your purpose for downloading data. For example:\r\n			<ul>\r\n				<li>myHouse will have a file named myHouse.zip</li>\r\n				<li>Sorrento would result in a file named Sorrento.zip</li>\r\n			</ul>\r\n		</div>\r\n	</div>\r\n\r\n	<div ng-show=\"stage==\'confirm\'\">\r\n		<div class=\"row\">\r\n			<div class=\"col-md-12 abstractContainer\">\r\n				{{data.abstract}}\r\n			</div>\r\n		</div>\r\n		<h3>You have chosen:</h3>\r\n		<table class=\"table table-striped\">\r\n			<tbody>\r\n				<tr ng-if=\"data.processing.bboxSelected\">\r\n					<th>Area</th>\r\n					<td>\r\n						<span style=\"display:inline-block; width: 10em\">Lower left (lat/lng&deg;):</span> {{data.processing.clip.yMin | number : 6}}, {{data.processing.clip.xMin | number : 6}}<br/>\r\n						<span style=\"display:inline-block;width: 10em\">Upper right (lat/lng&deg;):</span> {{data.processing.clip.yMax | number : 6}}, {{data.processing.clip.xMax | number : 6}}\r\n					</td>\r\n				</tr>\r\n				<tr ng-if=\"data.processing.divisionSelected\">\r\n					<th>Division</th>\r\n					<td>\r\n						{{data.processing.division}}\r\n               </td>\r\n				</tr>\r\n				<tr ng-if=\"data.processing.regionSelected\">\r\n					<th>River Region</th>\r\n					<td>\r\n						{{data.processing.region}}\r\n					</td>\r\n				</tr>\r\n				<tr>\r\n					<th>Output format</th>\r\n					<td>{{data.processing.outFormat.value}}</td>\r\n				</tr>\r\n				<tr>\r\n					<th>Coordinate system</th>\r\n					<td>{{data.processing.outCoordSys.value}}</td>\r\n				</tr>\r\n				<tr>\r\n					<th>Email address</th>\r\n					<td>{{email}}</td>\r\n				</tr>\r\n				<tr ng-show=\"data.processing.filename\">\r\n					<th>Filename</th>\r\n					<td>{{data.processing.filename}}</td>\r\n				</tr>\r\n			</tbody>\r\n		</table>\r\n		<div class=\"row\" style=\"height:55px\">\r\n			<div class=\"col-md-6\">\r\n				<button class=\"btn btn-primary\" style=\"width:6em\" ng-click=\"stage=\'email\'\">Back</button>\r\n			</div>\r\n			<div class=\"col-md-6\">\r\n				<button class=\"btn btn-primary pull-right\" ng-click=\"startExtract()\">Confirm</button>\r\n   			</div>\r\n		</div>\r\n	</div>\r\n</div>");
$templateCache.put("h2o/vector/popup.html","<exp-modal icon-class=\"fa-download\"  is-open=\"data.item.download\" title=\"Download wizard\" on-close=\"vdl.remove()\">\r\n	<div class=\"container-fluid downloadInner\" >\r\n		<div class=\"row\">\r\n  			<div class=\"col-md-12\">\r\n				<h4><common-wms data=\"vdl.data.item\"></common-wms>\r\n					<a href=\"https://ecat.ga.gov.au/geonetwork/srv/eng/catalog.search#/metadata/{{vdl.data.item.primaryId}}\" target=\"_blank\"><strong class=\"ng-binding\">{{vdl.data.item.title}}</strong></a>\r\n				</h4>\r\n   			</div>\r\n		</div>\r\n		<vector-geoprocess data=\"vdl.data.item\"></vector-geoprocess>\r\n	</div>\r\n</exp-modal>");
$templateCache.put("h2o/vector/vector.html","<div style=\"margin-bottom:-5px;\">\r\n   <div class=\"vector-heading\">\r\n		<vector-add group=\"vect.group\"></vector-add>\r\n      <common-tile data=\"vect.group\"></common-tile>\r\n		<common-bbox data=\"vect.group\"></common-bbox>\r\n		<common-cc></common-cc>\r\n      <strong>{{vect.group.title}}</strong>\r\n   </div>\r\n   <div class=\"vector-body\">\r\n      <div ng-repeat=\"doc in vect.group.docs\">\r\n         <div ng-class-odd=\"\'odd\'\" ng-class-even=\"\'even\'\" style=\"padding-left:12px\" ng-mouseleave=\"vect.lolight(doc)\" ng-mouseenter=\"vect.hilight(doc)\" >\r\n            <span style=\"width:100%;display:inline-block;padding-bottom:8px\">\r\n               <input type=\"checkbox\" class=\"vector-checkbox\" ng-model=\"doc.selected\">\r\n		         <common-metaview url=\"\'https://ecat.ga.gov.au/geonetwork/srv/eng/search#!\' + doc.primaryId + \'/xml\'\" container=\"select\" item=\"doc\"></common-metaview>\r\n		         <a href=\"https://ecat.ga.gov.au/geonetwork/srv/eng/catalog.search#/metadata/{{doc.primaryId}}\" target=\"_blank\" tooltip-append-to-body=\"true\"\r\n                           uib-tooltip=\"{{doc.abstract}}\" tooltip-placement=\"auto bottom\" tooltip-class=\"vector-tooltip\">\r\n                  <strong>{{doc.title}}</strong>\r\n               </a>\r\n	         </span>\r\n         </div>\r\n      </div>\r\n   </div>\r\n</div>");
$templateCache.put("h2o/side-panel/side-panel-left.html","<div class=\"cbp-spmenu cbp-spmenu-vertical cbp-spmenu-left\" style=\"width: {{left.width}}px;\" ng-class=\"{\'cbp-spmenu-open\': left.active}\">\r\n    <a href=\"\" title=\"Close panel\" ng-click=\"closeLeft()\" style=\"z-index: 1200\">\r\n        <span class=\"glyphicon glyphicon-chevron-left pull-right\"></span>\r\n    </a>\r\n    <div ng-show=\"left.active === \'legend\'\" class=\"left-side-menu-container\">\r\n        <legend url=\"\'img/AustralianTopogaphyLegend.png\'\" title=\"\'Map Legend\'\"></legend>\r\n    </div>\r\n</div>");
$templateCache.put("h2o/side-panel/side-panel-right.html","<div class=\"cbp-spmenu cbp-spmenu-vertical cbp-spmenu-right noPrint\" ng-attr-style=\"width:{{right.width}}\" ng-class=\"{\'cbp-spmenu-open\': right.active}\">\r\n    <a href=\"\" title=\"Close panel\" ng-click=\"closePanel()\" style=\"z-index: 1\">\r\n        <span class=\"glyphicon glyphicon-chevron-right pull-left\"></span>\r\n    </a>\r\n\r\n    <div class=\"right-side-menu-container\" ng-show=\"right.active === \'download\'\" h2o-list></div>\r\n    <div class=\"right-side-menu-container\" ng-show=\"right.active === \'glossary\'\" icsm-glossary></div>\r\n    <div class=\"right-side-menu-container\" ng-show=\"right.active === \'help\'\" icsm-help></div>\r\n    <panel-close-on-event only-on=\"search\" event-name=\"clear.button.fired\"></panel-close-on-event>\r\n</div>\r\n");
$templateCache.put("h2o/side-panel/trigger.html","<button ng-click=\"toggle()\" type=\"button\" class=\"map-tool-toggle-btn\">\r\n   <span class=\"hidden-sm\">{{name}}</span>\r\n   <ng-transclude></ng-transclude>\r\n   <i class=\"fa fa-lg\" ng-class=\"iconClass\"></i>\r\n</button>");
$templateCache.put("h2o/view/view.html","<div class=\"container-fluid downloadPane\">\r\n   <water-clip data=\"data.item\"></water-clip>\r\n   <div class=\"list-container\">\r\n      <water-select></water-select>\r\n   </div>\r\n   <div class=\"downloadCont\" icsm-search-continue></div>\r\n</div>");}]);