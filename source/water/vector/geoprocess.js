{

angular.module("water.vector.geoprocess", [])

.directive("vectorGeoprocess", ['$http', '$q', '$timeout', 'vectorGeoprocessService', 'flashService', 'messageService', 'vectorService',
                                function($http, $q, $timeout, vectorGeoprocessService, flashService, messageService, vectorService) {
	return {
		restrict :"AE",
		templateUrl : "water/vector/geoprocess.html",
		scope: {
			data: "=",
         open: "="
		},
		link : function(scope) {
			let clipMessage, clipTimeout, referenceLayer;

			vectorService.outFormats().then(function(data) {
				scope.outFormats = data;
			});

			scope.$watch("data", function(newData, oldData) {
				if(oldData) {
					vectorGeoprocessService.removeClip();
					removeReferenceLayer();
				}
				if(newData && newData !== oldData) {
					scope.stage = "bbox";
					drawReferenceLayer();
				}
			});

         scope.$watch("open", open => {
            console.log("pone" + open);
         });

			scope.$watchGroup(["data.processing.clip.xMax", "data.processing.clip.xMin", "data.processing.clip.yMax", "data.processing.clip.yMin"],
					function(newValues, oldValues, scope) {
				var result, url;

				if(clipTimeout) {
					$timeout.cancel(clipTimeout);
					clipTimeout = null;
				}
				if(scope.data && scope.data.processing && scope.data.processing.clip && scope.data.processing.clip.xMax !== null) {
					clipMessage = flashService.add("Validating selected area...", 3000);

					// Make really sure that all our stop points set this appropriately. We don't want the button locked out for ever.
					scope.checkingOrFailed = !!url; // We only apply this to records that have a URL to check intersection against.
					clipTimeout = $timeout(function() {
						checkSize().then(function(result) {
							try {
								if(result && result.code == "success") {
									vectorGeoprocessService.handleShowClip(scope.data.processing.clip);
									scope.checkingOrFailed = false;
									}
							} catch(e) {
								// Very paranoid about setting it to block.
								scope.checkingOrFailed = false;
							}
						});
					}, 2000);
				}

				function checkSize() {
					let deferred = $q.defer();

					result = scope.drawn();
					if(result && result.code) {
						switch(result.code) {
							case "oversize":
								$timeout(function() {
									flashService.remove(clipMessage);
									messageService.error("The selected area is too large to process. Please restrict to approximately " +
											Math.sqrt(scope.data.restrictSize) + " degrees square.");
									scope.stage = "bbox";
									drawReferenceLayer();
									deferred.resolve(result);
								});
								break;

							case "undersize":
								$timeout(function() {
									flashService.remove(clipMessage);
									messageService.error("X Min and Y Min should be smaller than X Max and Y Max, respectively. Please update the drawn area.");
									scope.stage = "bbox";
									drawReferenceLayer();
									deferred.resolve(result);
								});
								break;
							default:
								return $q.when(result);
						}
					}
					return deferred.promise;
				}
			});

         scope.selectedDivision = function() {
            console.log("selected division")
         };

         scope.selectedRegion = function() {
            console.log("selected region")
         };

			scope.drawn = function() {
				vectorGeoprocessService.removeClip();
				forceNumbers(scope.data.processing.clip);
				//flashService.remove(clipMessage);
				if(constrainBounds(scope.data.processing.clip, scope.data.bounds)) {
					clipMessage = flashService.add("Redrawn to fit within data extent", 5000);
				}

				if(overSizeLimit(scope.data.processing.clip)) {
					return {code: "oversize"};
				}

				if(underSizeLimit(scope.data.processing.clip)) {
					return {code: "undersize"};
				}

				if(scope.data.processing.clip.xMax === null) {
					return {code: "incomplete"};
				}

				//if(this.data.queryLayer) {
				//	vectorGeoprocessService.queryLayer(scope.data.queryLayer, scope.data.processing.clip).then(function(response) {
				//	});
				//} else
				if(validClip(scope.data.processing.clip)) {
					return {code: "success"};
				}
				return {code: "invalid"};
			};

			scope.startExtract = function() {
				if(scope.allDataSet()) {
					messageService.info("Your request has been sent for processing. You will be notified by email on completion of the job.");
					flashService.add("You can select another area for processing.", 10000);
					vectorGeoprocessService.initiateJob(scope.data, scope.email);
					scope.data.download = false;
				}
			};

			scope.allDataSet = function() {
				var proc = scope.data && scope.data.processing?scope.data.processing:null;
				// For it to be OK we need.
				return proc && scope.email &&
					(
                  (proc.divisionSelected && proc.division)
                  || (proc.regionSelected && proc.region)
                  || (proc.bboxSelected && validClip(proc.clip))
               ) &&
					proc.outCoordSys && proc.outFormat;
			};

			scope.validSansEmail = function() {
				var proc = scope.data && scope.data.processing?scope.data.processing:null;
				// For it to be OK we need.
				return proc &&
					(
                  (proc.divisionSelected && proc.division)
                  || (proc.regionSelected && proc.region)
                  || (proc.bboxSelected && validClip(proc.clip))
               ) && proc.outCoordSys && proc.outFormat;
			};

			scope.validClip = function(data) {
				return data && data.processing && validClip(data.processing.clip);
			};

			vectorGeoprocessService.getConfig().then(function(config) {
				scope.config = config;
			});

			function drawReferenceLayer() {
				removeReferenceLayer();
				if(scope.data.referenceLayer) {
					referenceLayer = vectorGeoprocessService.addLayer(scope.data.referenceLayer);
				}
			}

			function removeReferenceLayer() {
				if(referenceLayer) {
					vectorGeoprocessService.removeLayer(referenceLayer);
				}
			}

			function underSizeLimit(clip) {
				var size = (clip.xMax - clip.xMin) * (clip.yMax - clip.yMin);
				return size < 0.00000000001 || clip.xMax < clip.xMin;
			}

			function overSizeLimit(clip) {
				// Shouldn't need abs but it doesn't hurt.
				var size = Math.abs((clip.xMax - clip.xMin) * (clip.yMax - clip.yMin));

				return scope.data.restrictSize && size > scope.data.restrictSize;
			}

			function constrainBounds(c, p) {
				var flag = false,
					ret = false;
				// Have we read the parameters yet?

				if(!p || empty(c.xMax) || empty(c.xMin) || empty(c.yMax) || empty(c.yMin)) {
					return false;
				}

				ret = flag = +c.xMax < +p.xMin;
				if(flag) {
					c.xMax = +p.xMin;
				}

				flag = +c.xMax > +p.xMax;
				ret = ret || flag;

				if(flag) {
					c.xMax = +p.xMax;
				}

				flag = +c.xMin < +p.xMin;
				ret = ret || flag;
				if(flag) {
					c.xMin = +p.xMin;
				}

				flag = +c.xMin > +c.xMax;
				ret = ret || flag;
				if(flag) {
					c.xMin = c.xMax;
				}

				// Now for the Y's
				flag = +c.yMax < +p.yMin;
				ret = ret || flag;
				if(flag) {
					c.yMax = +p.yMin;
				}

				flag = +c.yMax > +p.yMax;
				ret = ret || flag;
				if(flag) {
					c.yMax = +p.yMax;
				}

				flag = +c.yMin < +p.yMin;
				ret = ret || flag;
				if(flag) {
					c.yMin = +p.yMin;
				}

				flag = +c.yMin > +c.yMax;
				ret = ret || flag;
				if(flag) {
					c.yMin = +c.yMax;
				}

				return ret;

				function empty(val) {
					return angular.isUndefined(val) ||
						val === "" ||
						val === null;
				}
			}

			function forceNumbers(clip) {
				clip.xMax = clip.xMax === null?null:+clip.xMax;
				clip.xMin = clip.xMin === null?null:+clip.xMin;
				clip.yMax = clip.yMax === null?null:+clip.yMax;
				clip.yMin = clip.yMin === null?null:+clip.yMin;
			}

			// The input validator takes care of order and min/max constraints. We just check valid existance.
			function validClip(clip) {
				return clip &&
					angular.isNumber(clip.xMax) &&
					angular.isNumber(clip.xMin) &&
					angular.isNumber(clip.yMax) &&
					angular.isNumber(clip.yMin) &&
					!overSizeLimit(clip) &&
					!underSizeLimit(clip);
			}
		}
	};
}])

.factory("vectorGeoprocessService", VectorGeoprocessService)

.filter("sysIntersect", function() {
	return function(collection, extent) {
		// The extent may have missing numbers so we don't restrict at that point.
		if(!extent ||
				!angular.isNumber(extent.xMin) ||
				!angular.isNumber(extent.xMax) ||
				!angular.isNumber(extent.yMin) ||
				!angular.isNumber(extent.yMax)) {
			return collection;
		}

		return collection.filter(function(item) {

			// We know these have valid numbers if it exists
			if(!item.extent) {
				return true;
			}
			// We have a restriction
			return item.extent.xMin <= extent.xMin &&
				item.extent.xMax >= extent.xMax &&
				item.extent.yMin <= extent.yMin &&
				item.extent.yMax >= extent.yMax;
		});
	};
});

VectorGeoprocessService.$invoke = ['$http', '$q', '$timeout', 'configService', 'downloadService', 'ga', 'mapService', 'storageService', 'vectorService'];
function VectorGeoprocessService($http, $q, $timeout, configService, downloadService, ga, mapService, storageService, vectorService) {
	var DEFAULT_DATASET = "dems1sv1_0", // TODO: We have to get this from the metadata somehow.
		geoprocessingTemplates,
		clipLayer = null,
		map;

	vectorService.config().then(function(data) {
		geoprocessingTemplates = data.serviceUrlTemplate;
	});


	mapService.getMap().then(function(lMap) {
		map = lMap;
	});

	function getUrl(data) {
		return geoprocessingTemplates;
	}

	return {
		queryLayer: function(query, clip) {
			var deferred = $q.defer();

			var layer = L.esri.featureLayer({
			    url: query.url
			});

			var bounds = L.latLngBounds(
				[clip.yMin, clip.xMin],	// top left
				[clip.yMax, clip.xMax]  // bottom right
			);

			layer.query().intersects(bounds).ids(function(error, ids) {
				if(error) {
					deferred.reject(error);
				} else {
					deferred.resolve(ids);
				}
			});
			return deferred.promise;
		},

		outFormats: function() {
			return vectorService.outFormats();
		},

		handleShowClip : function(clip) {
			this.removeClip();

			clipLayer = L.rectangle([
			    [clip.yMin, clip.xMin],
			    [clip.yMax, clip.xMax]
			], {
				weight:2,
				opacity:0.9,
				fill:false,
				color: "#000000",
				width:3,
				clickable: false
			});

			clipLayer.addTo(map);
		},

		removeClip : function() {
			if(clipLayer) {
				map.removeLayer(clipLayer);
				clipLayer = null;
			}
		},

		addLayer: function(data) {
			return L.tileLayer.wms(data.parameters[0], data.parameters[1]).addTo(map);
		},

		removeLayer: function(layer) {
			map.removeLayer(layer);
		},

		initiateJob : function(data, email) {
			var dataset = DEFAULT_DATASET,  // TODO Replace with real dataset file name from metadata.
				win, workingString = getUrl(data),
				processing = data.processing;

         let clip = processing.bboxSelected ? processing.clip :{
            yMin: null,
            yMax: null,
            xMax: null,
            xMin: null
         };

			let log = {
					bbox : {
						yMin : clip.yMin,
						yMax : clip.yMax,
						xMin : clip.xMin,
						xMax : clip.xMax,
					},
					geocatId : data.primaryId,
					crs : processing.outCoordSys.code,
					format : processing.outFormat.code
				},
            geocatNumbers = [],
            featuresSelected = [];

         data.docs.forEach(doc => {
            if(doc.selected) {
               geocatNumbers.push(doc.primaryId);
               featuresSelected.push(doc.code);
            }
         });


			angular.forEach({
            id: geocatNumbers.join(" "),
            features_selected: featuresSelected.join(" "),
				filename : processing.filename?processing.filename:"",
            outFormat: processing.outFormat.code,
            file_format_raster: "",
				ymin : clip.yMin,
				ymax : clip.yMax,
				xmin : clip.xMin,
				xmax : clip.xMax,
            division_name: processing.divisionSelected ? processing.division : "",
            river_reg_name: processing.regionSelected ? processing.region : "",
            outCoordSys: processing.outCoordSys.code,
				email : email
			}, function(item, key) {
				workingString = workingString.replace("{" + key + "}", item);
			});


         //console.log(clip);
         //console.log(processing);
         //console.log(workingString);

			$("#launcher")[0].src = workingString;

			downloadService.setEmail(email);

			ga('send', 'event', 'nedf', 'click', 'FME data export: ' + JSON.stringify(log));
		},

		getConfig : function() {
			return vectorService.config();
		}
	};
}

}
