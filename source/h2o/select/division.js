/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
{
   angular.module("h2o.select.division", ["h2o.regions"])

      .directive("selectDivision", ["h2oRegionsService", function (waterRegionsService) {
         return {
            templateUrl: "water/select/division.html",
            scope: {
               state: "=",
               open: "="
            },
            link: function (scope) {
               waterRegionsService.draw().then(function() {
                  scope.divisions = waterRegionsService.divisions.sort((a, b) => a.name > b.name ? 1 : -1);
               });


               scope.$watch("open", function(selected) {
                  console.log("selected", selected);
               });

               scope.hilight = function(division) {
                  division.marker.label._container.classList.add("over");
               }

               scope.lolight = function(division) {
                  division.marker.label._container.classList.remove("over");
               };
            }
         };
      }]);
}