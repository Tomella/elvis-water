/*!
 * Copyright 2018 Geoscience Australia (http://www.ga.gov.au/copyright.html)
 */
{
   angular.module("h2o.config", [])

   .provider("configService", function ConfigServiceProvider() {
      var baseUrl = "service/appConfig/config";

      this.location = function(where) {
         baseUrl = where;
      };

      this.$get = ['$q', '$http', 'waiting', function configServiceFactory($q, $http, waiting) {
         return  {
            getConfig : function(child) {
               return $http.get(baseUrl, {cache:true}).then(function(response) {
                  if(child) {
                     return response.data[child];
                  } else {
                     return response.data;
                  }
               });
            }
         };
      }];
   });
}