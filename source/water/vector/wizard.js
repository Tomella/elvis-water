{
	angular.module("water.vector.download", ['common.geoprocess'])

		.directive("vectorPopup", ["vectorDownloadService", function (vectorDownloadService) {
			return {
				restrict: "AE",
				templateUrl: "water/vector/popup.html",
				link: function (scope) {
					vectorDownloadService.data().then(function (data) {
						scope.data = data;

						scope.$watch("data.item", function (newValue, oldValue) {
							if (newValue) {
								scope.stage = "bbox";
							}

							if (newValue || oldValue) {
								vectorDownloadService.setState(newValue);
							}
						});
					});
				}
			};
		}])

		.directive("vectorDownload", ["vectorDdownloadService", function (vectorDownloadService) {
			return {
				restrict: "AE",
				controller: "VectorDownloadCtrl",
				templateUrl: "water/vector/popup.html",
				link: function () {
					//console.log("What the download...");
				}
			};
		}])

		.directive("commonVectorDownload", ['vectorDownloadService', function (vectorDownloadService) {
			return {
				templateUrl: "water/vector/download.html",
				controller: "VectorDownloadCtrl",
				link: function (scope, element) {
					vectorDownloadService.data().then(function (data) {
						scope.data = data;
					});

					scope.$watch("data.item", function (item, old) {
						if (item || old) {
							vectorDownloadService.setState(item);
						}
					});
				}
			};
		}])

		.directive("vectorAdd", ['$rootScope', 'vectorDownloadService', 'flashService', function ($rootScope, vectorDownloadService, flashService) {
			return {
				templateUrl: "water/vector/add.html",
				restrict: "AE",
				scope: {
					group: "="
				},
				link: function (scope, element) {
					scope.toggle = function () {
						if (scope.group.download) {
							vectorDownloadService.clear(scope.group);
						} else {
							flashService.add("Select an area of interest that intersects the highlighted areas.");
							vectorDownloadService.add(scope.group);
							if (scope.group.sysId) {
								$rootScope.$broadcast('hide.wms', scope.group.sysId);
							}
						}
					};

					scope.someSelected = () => {
						if (!scope.group || !scope.group.docs) {
							return false;
						}

						let result = scope.group.docs.some(function (doc) {
							return doc.selected;
						});
						return result;
					};

				}
			};
		}])

		.controller("VectorDownloadCtrl", VectorDownloadCtrl)
		.factory("vectorDownloadService", VectorDownloadService);

	VectorDownloadCtrl.$inject = ["vectorDownloadService"];
	function VectorDownloadCtrl(vectorDownloadService) {
		vectorDownloadService.data().then(data => {
			this.data = data;
		});

		this.remove = function () {
			vectorDownloadService.clear();
		};

		this.changeEmail = function (email) {
			vectorDownloadService.setEmail(email);
		};
	}

	VectorDownloadService.$inject = ['$http', '$q', '$rootScope', 'mapService', 'storageService'];
	function VectorDownloadService($http, $q, $rootScope, mapService, storageService) {
		let key = "download_email",
			downloadLayerGroup = "Download Layers",

			mapState = {
				zoom: null,
				center: null,
				layer: null
			},

			data = {
				email: null,
				item: null
			},

			service = {
				getLayerGroup: function () {
					return mapService.getGroup(downloadLayerGroup);
				},

				setState: function (data) {
					if (data) {
						prepare();
					} else {
						restore(map);
					}

					function prepare() {
						let bounds = [
							[data.bounds.yMin, data.bounds.xMin],
							[data.bounds.yMax, data.bounds.xMax]
						];

						if (mapState.layer) {
							mapService.getGroup(downloadLayerGroup).removeLayer(mapState.layer);
						}
						if (!data.queryLayer) {
							mapState.layer = L.rectangle(bounds, { color: "black", fill: false });
							mapService.getGroup(downloadLayerGroup).addLayer(mapState.layer);
						}
					}

					function restore(map) {
						mapService.clearGroup(downloadLayerGroup);
						mapState.layer = null;
					}
				},

				add: function (item) {
					this.clear();
					data.item = item;
					data.item.download = true;
					if (!item.processsing) {
						item.processing = {
							clip: {
								xMax: null,
								xMin: null,
								yMax: null,
								yMin: null
							}
						};
					}
				},

				clear: function () {
					if (data.item) {
						data.item.download = false;
						data.item = null;
					}
				},

				setEmail: function (email) {
					storageService.setItem(key, email);
				},

				getEmail: function () {
					return storageService.getItem(key).then(function (value) {
						data.email = value;
						return value;
					});
				},

				data: function () {
					return $q.when(data);
				}
			};

		return service;
	}

}
