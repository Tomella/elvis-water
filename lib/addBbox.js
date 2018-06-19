let fs = require("fs");
var bbox = require('geojson-bbox');



var obj;
fs.readFile('../resources/data/riverRegions.json', 'utf8', function (err, data) {
   if (err) throw err;
   obj =JSON.parse(data);


   obj.features.forEach(element => {
      element.bbox = bbox(element);
   });

   console.log(JSON.stringify(obj));  //, null, 3));
});