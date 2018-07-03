/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
{
   angular.module("h2o.list", [])

      .directive("h2oList", ['$rootScope', function ($rootScope) {
         const pageSize = 30;

         return {
            templateUrl: "h2o/list/list.html",
            link: function (scope, element, attrs) {
               $rootScope.$on("search.performed", ((evetn, details) => {
                  scope.results = details;
                  scope.list = details.regions.slice(0, pageSize);

                  let poly = details.polygon.coordinates[0];
                  scope.state = {
                     showDownload:false,
                     bounds: [
                        poly[0],
                        poly[2]
                     ]
                  }
               }));
               //console.log("Hello select!");


               scope.more = () => {
                  scope.list.push(...scope.results.regions.slice(scope.list.length, scope.list.length + pageSize));
               }

               scope.clear = () => {
                  scope.results = null;
               }
            }
         };
      }])

      .directive("h2oResultsDownload", [function () {
         return {
            template: "<h2o-download data='data'></h2o-download>",
            scope: {
               data: "="
            }
         };
      }])

      .directive("h2oItem", ['h2oItemService',
         function (h2oItemService) {

            return {
               restrict: "AE",
               templateUrl: "h2o/list/item.html",
               bindToController: {
                  item: "="
               },
               controller: function () {
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
         }])

      .factory('h2oItemService', ['$http', 'configService', 'h2oRegionsService', 'mapService', function ($http, configService, h2oRegionsService, mapService) {
         let service = {
            showFeature(feature) {
               this.hideFeature();
               mapService.getMap().then(map => {
                  this.layer = L.geoJson(feature.geojson, {
                     style: function (feature) {
                         return {color: "red", weight:3};
                     }
                  }).addTo(map);
               });
            },
            hideFeature() {
               if(this.layer) {
                  mapService.getMap().then(map => {
                     map.removeLayer(this.layer);
                     this.layer = null;
                  })
               }
            },
            showPan(feature) {
               mapService.getMap().then(map => {
                  let layer = L.geoJson(feature.geojson);
                  map.fitBounds(layer.getBounds(), {animate: true, padding: [100, 100]});
               });
            },
            wfs(vm) {
               configService.getConfig("results").then(({ wfsTemplate }) => {
                  $http.get(wfsTemplate.replace("${id}", vm.item.recordId)).then(response => {
                     let blob = new Blob([response.data], { type: "application/json;charset=utf-8" });
                     saveAs(blob, "gazetteer-wfs-feature-" + vm.item.recordId + ".xml");
                  });
               });
            }
         };
         return service;
      }])

      .filter("toFixed", function () {
         return function (num) {
            return num.toFixed(4);
         };
      })

      .filter("byDistance", function () {
         return function (items, centre) {
            return items.sort();
         };
      })

      .filter("albersArea", function () {
         return function (sqm) {
            let area = +sqm;
            if(area > 1000000) {
               return (area/1000000).toFixed(2) + " sq km";
            } else if(area > 10000) {
               return (area/10000).toFixed(2) + " hectares";
            } else {
               return area.toFixed(2) + " sq m";
            }
         };
      });

}