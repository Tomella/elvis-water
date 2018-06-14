/*!
 * Copyright 2016 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */

{
   angular.module("water.vector", [])

      .directive('vectorSelect', [function () {
         return {
            templateUrl: "water/vector/vector.html",
            controllerAs: "vect",
            controller: "VectorCtrl"
         };
      }])

      .controller('VectorCtrl', ['selectService', 'vectorService', function (selectService, vectorService) {
         vectorService.config().then(data => {
            this.config = data;
            this.group = data.group;
         });

         this.hilight = function (doc) {
            if (doc.layer) {
               selectService.hilight(doc.layer);
            }
         };

         this.lolight = function (doc) {
            if (doc.layer) {
               selectService.lolight(doc.layer);
            }
         };

      }])

      .factory('vectorService', ['$http', '$q', function ($http, $q) {
         var waiters, config, service = {};

         service.config = function () {
            if (config) {
               return $q.when(config);
            }
            let waiter = $q.defer();

            if (!waiters) {
               waiters = [waiter];
               $http.get('icsm/resources/config/water_vector.json', { cache: true }).then(response => {
                  config = response.data;
                  waiters.forEach(function (waiter) {
                     waiter.resolve(config);
                  });
               });
            } else {
               waiters.push(waiter);
            }
            return waiter.promise;
         };

         service.outFormats = function () {
            return service.config().then(data => {
               return data.refData.vectorFileFormat;
            });
         };

         return service;
      }]);
}