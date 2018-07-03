/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
{

   angular.module("h2o.catchment", ['geo.draw'])

      .directive("h2oCatchmentSearch", ['$log', '$timeout', 'catchmentService', 'mapService', function ($log, $timeout, catchmentService, mapService) {
         return {
            restrict: "AE",
            transclude: true,
            templateUrl: "h2o/search/catchment.html",
            link: function (scope, element) {
               var timeout;
               mapService.getMap().then(map => scope.map = map);

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

               scope.search = () => {
                  let list = scope.catchmentData.catchments;
                  let filteredList;

                  if (scope.nameFilter) {
                     filteredList = filter(list, scope.nameFilter, scope.map, 1000);
                  } else {
                     filteredList = list.reduce((acc, item) => {
                        let bounds = map.getBounds();
                        if (overlap(item.bbox, bounds)) {
                           acc.push(item);
                        }
                        return acc;
                     }, []);
                  }
                  catchmentService.zoomToLocations(scope.nameFilter, filteredList);
                  scope.nameFilter = "";
               }

               function cancel() {
                  $timeout.cancel(timeout);
                  timeout = $timeout(function () {
                     $log.info("Clear filter");
                     scope.nameFilter = "";
                  }, 7000);
               }
            }
         };
      }])

      .provider("catchmentService", CatchmentsearchServiceProvider)

      .filter("catchmentFilterList", () => filter);

   function filter(list, filter, map, max) {
      var response = [], lowerFilter, count;
      if (!filter) {
         return response;
      }
      if (!max) {
         max = 50;
      }
      lowerFilter = filter.toLowerCase();
      if (list) {

         let count = 0;
         list.some(function (item) {
            if (item.name.toLowerCase().indexOf(lowerFilter) > -1) {

               if (map && map.getBounds) {
                  let bounds = map.getBounds();
                  let bbox = item.bbox;

                  if (overlap(bbox, bounds)) {
                     response.push(item);
                     count++;
                  }

               } else {
                  response.push(item);
                  count++;
               }
            }
            return count > max;
         });
      }
      return response;
   };

   function overlap(bbox, bounds) {
      if (bbox.xMax < bounds.getWest()) return false;
      if (bbox.xMin > bounds.getEast()) return false;
      if (bbox.yMax < bounds.getSouth()) return false;
      if (bbox.yMin > bounds.getNorth()) return false;
      return true; // boxes overlap
   }

   function CatchmentsearchServiceProvider() {
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
      this.$get = ['$q', '$rootScope', '$timeout', 'h2oRegionsService', 'searchMapService',
         function catchmentServiceFactory($q, $rootScope, $timeout, h2oRegionsService, searchMapService) {
            var service = {
               load: function () {
                  return h2oRegionsService.catchments().then(function (response) {
                     catchmentData.catchments = response;
                     return catchmentData;
                  });
               },

               zoomToLocation: function (region) {
                  this.zoomToLocations(region.name, [region]);
               },

               zoomToLocations: function (searchStr, regions) {
                  var bbox = {
                     complete: regions.every(region => region.bbox.complete),
                     xMax: Math.max(...regions.map(region => region.bbox.xMax)),
                     xMin: Math.min(...regions.map(region => region.bbox.xMin)),
                     yMax: Math.max(...regions.map(region => region.bbox.yMax)),
                     yMin: Math.min(...regions.map(region => region.bbox.yMin)),
                  };

                  var polygon = {
                     type: "Polygon",
                     coordinates: [[
                        [bbox.xMin, bbox.yMin],
                        [bbox.xMin, bbox.yMax],
                        [bbox.xMax, bbox.yMax],
                        [bbox.xMax, bbox.yMin],
                        [bbox.xMin, bbox.yMin]
                     ]]
                  };
                  var broadcastData = {
                     from: "Catchments search",
                     type: "GeoJSONUrl",
                     pan,
                     show: true,
                     search: searchStr,
                     regions,
                     polygon,
                     centre: [(bbox.xMax + bbox.xMin) / 2, (bbox.yMax + bbox.yMin) / 2]
                  };
                  $rootScope.$broadcast('search.performed', broadcastData);
                  console.log(broadcastData)
                  pan();
                  function pan() {
                     searchMapService.goTo(polygon);
                  }
               }
            };
            return service;
         }];
   }

}
