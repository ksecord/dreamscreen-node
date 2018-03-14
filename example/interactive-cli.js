'use strict';

var DreamScreenClient = require('../lib/dreamscreen').Client;
var client = new DreamScreenClient();


client.on('light-new', function (light) {
    console.log(`client, new light found ${light.ipAddress}`);
});

client.on('light-updated', function (light) {
    console.log(`client, light updated ${light.name}`);
});

//TODO 
// client.on('light-online', function (light) {
//     console.log('Light back online. ID:' + light.id + ', IP:' + light.address + ':' + light.port + '\n');
// });
// client.on('light-offline', function (light) {
//     console.log('Light offline. ID:' + light.id + ', IP:' + light.address + ':' + light.port + '\n');
// });

client.on('listening', function () {
    console.log(`Started listening for DreamScreens`);
});

client.init();


console.log('Sets the mode for all discovered devices.\n');
console.log('Keys:');
console.log('Press 0, set all sleep mode');
console.log('Press 1, set all video mode');
console.log('Press 2, set all music mode');
console.log('Press 3, set all ambient mode');
console.log('Press r, set all red');
console.log('Press g, set all green');
console.log('Press D to show debug messages');
console.log('Press d to hide debug messages (default is hidden)');
console.log('Press q or [CTRL + C] to exit\n');

process.stdin.setEncoding('utf8');
process.stdin.setRawMode(true);

process.stdin.on('data', function (key) {

    if (key === '0') {
        client.lights().forEach(function (light) {
            light.setMode(0, function (err) {
                if (err) {
                    console.log(`${light.name} set Sleep Mode 0 failed`);
                }
                console.log(`${light.name} set Sleep Mode 0 success`);
            });
        });
    }
    else if (key === '1') {
        client.lights().forEach(function (light) {
            light.setMode(1, function (err) {
                if (err) {
                    console.log(`${light.name} set Video Mode 1 failed`);
                }
                console.log(`${light.name} set Video Mode 1 success`);
            });
        });
    }
    else if (key === '2') {
        client.lights().forEach(function (light) {
            light.setMode(2, function (err) {
                if (err) {
                    console.log(`${light.name} set Music Mode 2 failed`);
                }
                console.log(`${light.name} set Music Mode 2 success`);
            });
        });
    }
    else if (key === '3') {
        client.lights().forEach(function (light) {
            light.setMode(3, function (err) {
                if (err) {
                    console.log(`${light.name} set Ambient Mode 3 failed`);
                }
                console.log(`${light.name} set Ambient Mode 3 success`);
            });
        });
    }

    else if (key === 'r') {
        client.lights().forEach(function (light) {
            light.setAmbientColor([255, 0, 0], function (err) {
                if (err) {
                    console.log(`${light.name} set red failed`);
                }
                console.log(`${light.name} set red success`);
            });
        });
    }
    else if (key === 'g') {
        client.lights().forEach(function (light) {
            light.setAmbientColor([0, 255, 0], function (err) {
                if (err) {
                    console.log(`${light.name} set green failed`);
                }
                console.log(`${light.name} set green success`);
            });
        });
    }

    else if (key === 'D') {
        client.setDebug(true);
        console.log('Debug messages are now shown');
    } else if (key === 'd') {
        client.setDebug(false);
        console.log('Debug messages are now hidden');
    }

    else if (key === '\u0003' || key === 'q') { // Ctrl + C
        client.destroy();
        process.exit(); // eslint-disable-line no-process-exit
    }
});
