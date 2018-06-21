{

   angular.module("WaterApp", [
      'common.altthemes',
		'common.basin',
		'common.catchment',
      'common.header',
      'common.navigation',
      'common.panes',
      'common.storage',
      'common.templates',
      'common.toolbar',

      'explorer.config',
      'explorer.confirm',
      'explorer.drag',
      'explorer.enter',
      'explorer.flasher',
      'explorer.googleanalytics',
      'explorer.httpdata',
      'explorer.info',
      'explorer.message',
      'explorer.modal',
      'explorer.tabs',
      'explorer.version',
      'explorer.map.templates',
      'exp.search.map.service',
      'exp.ui.templates',

		'geo.draw',
		'geo.elevation',
		'geo.geosearch',
		'geo.map',
		'geo.maphelper',
      'geo.measure',

      'icsm.contributors',
      'icsm.side-panel',

      'water.clip',
      'water.download',
      'water.panes',
      "water.regions",
      'water.templates',
      'water.toolbar',
      'water.vector',
      'water.view',

      'ui.bootstrap',
      'ui.bootstrap-slider',
      'ngAutocomplete',
      'ngRoute',
      'ngSanitize',
      'page.footer'

   ])

      // Set up all the service providers here.
      .config(['configServiceProvider', 'projectsServiceProvider', 'versionServiceProvider',
         function (configServiceProvider, projectsServiceProvider, versionServiceProvider) {
            configServiceProvider.location("icsm/resources/config/config.json");
            configServiceProvider.dynamicLocation("icsm/resources/config/appConfig.json?t=");
            versionServiceProvider.url("icsm/assets/package.json");
            projectsServiceProvider.setProject("icsm");
         }])

      .factory("userService", [function () {
         return {
            login: noop,
            hasAcceptedTerms: noop,
            setAcceptedTerms: noop,
            getUsername: function () {
               return "anon";
            }
         };
         function noop() { return true; }
      }])

      .controller("RootCtrl", RootCtrl);

   RootCtrl.$invoke = ['$http', 'configService'];
   function RootCtrl($http, configService) {
      var self = this;
      configService.getConfig().then((data) => {
         self.data = data;
         // If its got WebGL its got everything we need.
         try {
            var canvas = document.createElement('canvas');
            data.modern = !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
         } catch (e) {
            data.modern = false;
         }
      });
   }

}