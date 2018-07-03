/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
{

   angular.module("h2o.toolbar", [])

      .directive("elevationToolbar", [function () {
         return {
            restrict: "AE",
            templateUrl: "h2o/toolbar/toolbar.html",
            controller: 'toolbarLinksCtrl',
            transclude: true
         };
      }])

      .controller("toolbarLinksCtrl", ["$scope", "configService", function ($scope, configService) {
         let self = this;
         configService.getConfig().then(function (config) {
            self.links = config.toolbarLinks;
         });

         $scope.item = "";
         $scope.toggleItem = function (item) {
            $scope.item = ($scope.item === item) ? "" : item;
         };

      }]);

}