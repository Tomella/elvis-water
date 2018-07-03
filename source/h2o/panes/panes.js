/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
{
   angular.module("h2o.panes", [])

      .directive("h2oPanes", ['$rootScope', '$timeout', 'mapService', function ($rootScope, $timeout, mapService) {
         return {
            templateUrl: "h2o/panes/panes.html",
            transclude: true,
            restrict: "AE",
            scope: {
               defaultItem: "@",
               data: "="
            },
            link: function(scope) {
               console.log("HHHHHHHHHHHHHH4H")
            },
            controller: ['$scope', function ($scope) {
               var changeSize = false;

               $rootScope.$on('side.panel.change', (event) => {
                  emitter();
                  $timeout(emitter, 100);
                  $timeout(emitter, 200);
                  $timeout(emitter, 300);
                  $timeout(emitter, 500);
                  function emitter() {
                     let evt = document.createEvent("HTMLEvents");
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
      }])

      .directive("icsmTabs", [function () {
         return {
            templateUrl: "h2o/panes/tabs.html",
            require: "^icsmPanes"
         };
      }])

      .controller("PaneCtrl", PaneCtrl)
      .factory("paneService", PaneService);

   PaneCtrl.$inject = ["paneService"];
   function PaneCtrl(paneService) {
      paneService.data().then(data => {
         this.data = data;
      });
   }

   PaneService.$inject = [];
   function PaneService() {
      var data = {
      };

      return {
         add: function (item) {
         },

         remove: function (item) {
         }
      };
   }

}