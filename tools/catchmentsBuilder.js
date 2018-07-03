// Pipe the output to wherever you want.

// This is redundant now. We build it on client side.

let fs = require("fs");

fs.readFile("../resources/data/riverRegions.json", (error, data) =>{

   let json = JSON.parse(data);
   let features = json.features;

/*

      {
         "name": "BURNETT RIVER",
         "bbox": {
            "xMin": 150.30499999521976,
            "xMax": 152.42749999438155,
            "yMin": -26.947500005878187,
            "yMax": -24.39000000722514,
            "complete": true
         },
         "id": 67
      },
*/

   let response = features.map((feature) => {
      let properties = feature.properties;
      // "bbox":[130.8875,-13.635000001,131.659843179235,-12.0425]
      let bbox = feature.bbox;

      return {
         id: properties.RivRegNum,
         name: properties.RivRegName,
         bbox: {
            complete: true,
            xMin: bbox[0],
            xMax: bbox[2],
            yMin: bbox[1],
            yMax: bbox[3]
         }
      }
   })


   console.log(JSON.stringify({ catchments:response}, null, 3));
});