{

   angular.module("water.select.service", [])
      .factory("selectService", SelectService);

   SelectService.$inject = ['$http', '$q', '$rootScope', '$timeout', 'mapService', 'configService'];
   function SelectService($http, $q, $rootScope, $timeout, mapService, configService) {
      let LAYER_GROUP_KEY = "Search Layers",
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
         timeout,
         cache,
         allDocs = {},
         busy = false,
         layers = {},
         selectLayerGroup,
         normalLayerColor = "#ff7800",
         hilightLayerColor = 'darkblue',

         service = {

            getSelectCriteria: function () {
               return parameters;
            },

            getLayerGroup: function () {
               // Prime the layer group
               if (!selectLayerGroup) {
                  selectLayerGroup = mapService.getGroup(LAYER_GROUP_KEY);
               }
               return selectLayerGroup;
            },

            setKeywords: function (keywords) {
            },

            setFilter: function (filter) {
            },

            refresh: function () {
            },

            getDaterange: function () {
               return parameters.daterange;
            },

            more: function () {
            },

            _executeQuery: function () {
               // Give them the lot as they will want the criteria as well
               $http.get(baseUrl, { cache: true }).then(response => {
                  service.getLayerGroup();

                  let data = response.data;

                  data.response.docs.forEach(dataset => {
                     service._decorateDataset(dataset);
                     if (dataset.type === "group") {
                        dataset.docs.forEach(data => {
                           service._decorateDataset(data);
                        });
                     }
                  });

                  $rootScope.$broadcast("select.facet.counts", data);
                  $rootScope.$broadcast("select.results.received", data);
               });
            },

            createLayer: function (dataset, color) {
               let bbox = dataset.bbox,
                  key = dataset.primaryId,
                  parts, bounds, layer;

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

            _decorateDataset: function (dataset) {
               let layer = layers[dataset.primaryId];
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
                  let parts;
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

            showWithin: function (datasets) {
               datasets.forEach(dataset => {
                  let box = dataset.bbox,
                     coords, xmin, ymin, xmax, ymax;

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
                  let bbox = parameters.bbox;

                  return xmin > bbox.xMin &&
                     xmax < bbox.xMax &&
                     ymin > bbox.yMin &&
                     ymax < bbox.yMax;
               }
            },

            toggle: function (dataset) {
               if (dataset.showLayer) {
                  this.removeLayer(dataset);
               } else {
                  this.createLayer(dataset);
               }
            },

            toggleAll: function (datasets) {
               let self = this,
                  someNotShowing = datasets.some(dataset => {
                     return !dataset.showLayer;
                  });

               datasets.forEach(dataset => {
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

            hideAll: function (datasets) {
               datasets.forEach(dataset => {
                  if (dataset.showLayer) {
                     service.removeLayer(dataset);
                  }
               });
            },

            hilight: function (layer) {
               layer.setStyle({ color: hilightLayerColor });
            },

            lolight: function (layer) {
               layer.setStyle({ color: normalLayerColor });
            },

            removeLayer: function (dataset) {
               let key = dataset.primaryId,
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

   }

   function servicesFactory(uris) {
      let protocols = {
         WCS: "OGC:WCS",
         WFS: "OGC:WFS",
         WMS: "OGC:WMS"
      };

      return new Services(uris);

      function Services(uris) {
         this.uris = uris;
         this.container = {
            wcs: null,
            wms: null
         };

         if (uris) {
            this.services = uris.map(uri => {
               let service = new Service(uri);

               this.container.wcs = service.isWcs() ? service : this.container.wcs;
               this.container.wms = service.isWms() ? service : this.container.wms;
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
            this.services.forEach(service => {
               service.remove();
            });
         };
      }

      function Service(doc) {
         let xmlDoc = $(doc);

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
            this.handlers.forEach(callback => {
               // They should all have a remove but you never know.
               if (callback.remove) {
                  callback.remove(this);
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
         }
      };
   }

}