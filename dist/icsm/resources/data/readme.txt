River regions json can be found here.
http://geofabric.bom.gov.au/simplefeatures/ows?service=WFS&version=1.0.0&request=GetFeature&typeNames=ahgf_hrr:RiverRegion&outputFormat=application/json

The above request gets GeoJSON. The data has been altered slightly.
1) Each feature has had a bbox added to save doing it on each load
2) There was an encoding issue with a thing that looked like a hyphen so the 95 cases were converted to hyphens.

The bbox was added by lib/addBbox.js and piped to a file. Nothing fancy.