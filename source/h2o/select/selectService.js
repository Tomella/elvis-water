/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
{
   angular.module("h2o.select.service", [])
      .factory("selectService", SelectService);

   SelectService.$inject = ['$http', '$q', '$rootScope', '$timeout', 'mapService', 'configService'];
   function SelectService($http, $q, $rootScope, $timeout, mapService, configService) {
   }

}