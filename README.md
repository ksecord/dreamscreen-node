# DreamScreen Node.js Library

## Example
```
var DreamScreenClient = require('../lib/dreamscreen').Client;
var client = new DreamScreenClient();

client.on('light-new', function (light) {
   light.setMode(3, function (err) {
      if (!err) {
         console.log(`${light.name} set Mode 3 success`);
      }
   });
});
```

## Special Thanks
- Niels de Klerk as a contributor and his usage of the library to develop DreamScreen-NEEO integration https://github.com/nklerk/neeo_driver-DreamScreen
- Marius Rumpf as this work was influenced by his Node.js implementation of the LIFX protocol https://github.com/MariusRumpf/node-lifx
