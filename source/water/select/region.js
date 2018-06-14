/*!
 * Copyright 2017 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
{
   angular.module("water.select.region", ['water.select.service'])

      .directive("selectRegion", ["waterRegionsService", function (waterRegionsService) {
         return {
            templateUrl: "water/select/region.html",
            scope: {
               state: "="
            },
            link: function (scope) {
               waterRegionsService.draw().then(function() {
                  scope.regions = waterRegionsService.regions.sort((a, b) => a.name > b.name ? 1 : -1);
               });

               scope.hilight = function(region) {
                  region.show();
               }

               scope.lolight = function(region) {
                  region.hide();
               };
            }
         };
      }]);
}
