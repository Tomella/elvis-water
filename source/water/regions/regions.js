{
   class WaterRegionsService {
      constructor($http, configService, mapService) {
         this.$http = $http;
         this.configService = configService;
         this.mapService = mapService;
      }

      config() {
         return this.configService.getConfig("regions");
      }

      features() {
         return this.config().then(config => this.$http.get(config.regionsUrl, { cache: true }).then(response => response.data.features));
      }

      draw() {
         if (this.promise) {
            return this.promise;
         }

         this.promise = this.config().then(config => this.mapService.getMap().then(map => this.features().then(features => {
            let divisions = this.divisions = [];
            let regions = this.regions = [];
            let divisionsMap = this.divisionsMap = {};

            features.forEach(feature => {
               let name = feature.properties.Division;
               divisionsMap[name] = divisionsMap[name] || [];
               divisionsMap[name].push(feature);
            });

            Object.keys(divisionsMap).forEach((key, index) => {
               let features = divisionsMap[key];
               let color = config.divisionColors[index % config.divisionColors.length];
               let division = L.geoJson(features, {
                  onEachFeature: (feature, layer) => {
                     let region = {
                        layer: layer,
                        name: feature.properties.RivRegName,
                        feature: feature,
                        show: function() {
                           this.layer.openPopup();
                        },
                        hide: function() {
                           this.layer._map.closePopup();
                        }
                     };

                     layer.bindPopup(region.name);
                     regions.push(region);

                     layer.on("mouseover", () => {
                        console.log("river", layer);
                     });
                  },
                  style: function (feature) {
                     return {
                        color: "black",
                        fillOpacity: 0.2,
                        fillColor: color,
                        weight: 1
                     };
                  }
               });

               let divisionOptions = config.divisionOptions[key] || {
                  center: division.getBounds().getCenter()
               };

               var marker = new L.marker(divisionOptions.center, { opacity: 0.01 });
               marker.bindLabel(key, { noHide: true, className: "regions-label", offset: [0, 0] });
               marker.addTo(map);

               divisions.push({
                  layer: division,
                  name: key,
                  marker,
                  features: features
               });
            });

            let featureGroup = L.featureGroup(divisions.map(division => division.layer), {
               style: function (feature) {
                  return {
                     color: "black",
                     fill: true,
                     fillColor: "red",
                     weight: 1
                  };
               }
            }).on("mouseover", (group) => {
               console.log("division", group);
            });
            featureGroup.addTo(map);
         })));
         return this.promise;
      }

      get divisionColors() {
         return config.divisionColors;
      }
   }
   WaterRegionsService.$invoke = ['$http', 'configService', 'mapService'];

   angular.module("water.regions", ["water.select.division", "water.select.region"])
      .directive("waterRegions", ["$http", "waterRegionsService", "mapService", function ($http, waterRegionsService, mapService) {
         return {
            link: function (scope) {
               let layer;
               waterRegionsService.draw();
            }
         };
      }])

      .service("waterRegionsService", WaterRegionsService);
}