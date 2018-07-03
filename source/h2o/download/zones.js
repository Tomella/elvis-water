/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
{
   angular.module("h2o.zone", [])

   .factory('zoneService', ['$http', '$q', 'configService', function($http, $q, configService) {
      return {
         counts: function(searched) {
            return  configService.getConfig("download").then(({outCoordSys}) => {
               return this.intersections(searched).then(zones => {
                  return zones.map(zone => zone.zone);
               });
            });
         },
         intersections: function(searched) {
            return configService.getConfig().then(function(config) {
               let outCoordSys = config.download.outCoordSys;

               let zones = outCoordSys;
               let bounds = searched.bounds;
               let xMin = bounds[0][0];
               let xMax = bounds[1][0];
               let yMin = bounds[0][1];
               let yMax = bounds[1][1];

               let responses = zones.filter(zone => {
                  return !zone.extent || (xMin <= zone.extent.xMax &&
                        xMax >= zone.extent.xMin &&
                        yMin <= zone.extent.yMax &&
                        yMax >= zone.extent.yMin);
               }).map(zone => {
                  return {
                     zone,
                     get bounds() {
                        return zone.extent? {
                           xMin: xMin > zone.extent.xMin ? xMin : zone.extent.xMin,
                           xMax: xMax < zone.extent.xMax ? xMax : zone.extent.xMax,
                           yMin: yMin > zone.extent.yMin ? yMin : zone.extent.yMin,
                           yMax: yMax < zone.extent.yMax ? yMax : zone.extent.yMax
                        }: null;
                     }
                  };
               });


               return responses;
            });
         }
      };
   }]);
}