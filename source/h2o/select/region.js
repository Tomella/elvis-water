/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
{
   angular.module("h2o.select.region", ['h2o.select.service'])

      .directive("selectRegion", ["waterRegionsService", function (waterRegionsService) {
         return {
            templateUrl: "h2o/select/region.html",
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
