{
   angular.module("water.select.division", ["water.regions"])

      .directive("selectDivision", ["waterRegionsService", function (waterRegionsService) {
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