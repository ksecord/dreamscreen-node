'use strict';

var DreamScreenClient = require('../lib/dreamscreen').Client;
var client = new DreamScreenClient();


//for testing only
var Light = require('../lib/dreamscreen').Light;   //to be removed 


client.on('light-new', function (light) {
    console.log(`client, new light found ${light.ipAddress}`);

    //todo

    // light.getState(function (err, info) {
    //     if (err) {
    //         console.log(err);
    //     }
    //     console.log('Label: ' + info.label);
    //     console.log('Power:', (info.power === 1) ? 'on' : 'off');
    //     console.log('Color:', info.color);
    // });

    // light.getHardwareVersion(function (err, info) {
    //     if (err) {
    //         console.log(err);
    //     }
    //     console.log('Device Info: ' + info.vendorName + ' - ' + info.productName);
    //     console.log('Features: ', info.productFeatures, '\n');
    // });
});

client.on('light-online', function (light) {
    console.log('Light back online. ID:' + light.id + ', IP:' + light.address + ':' + light.port + '\n');
});

client.on('light-offline', function (light) {
    console.log('Light offline. ID:' + light.id + ', IP:' + light.address + ':' + light.port + '\n');
});

client.on('listening', function () {
    var address = client.address();
    console.log(
        'Started DreamScreen listening on ' +
        address.address + ':' + address.port + '\n'
    );
});

client.init();

console.log('Sets the mode for all discovered devices.\n');
console.log('Keys:');
console.log('Press 0, set all sleep mode');
console.log('Press 1, set all video mode');
console.log('Press 2, set all music mode');
console.log('Press 3, set all ambient mode');

// console.log('Press 8 to show debug messages');
// console.log('Press 9 to hide debug messages');
console.log('Press q or [CTRL + C] to exit\n');

process.stdin.setEncoding('utf8');
process.stdin.setRawMode(true);

var sideKick = new Light({
    client: client,
    ipAddress: "10.1.10.231"
});

process.stdin.on('data', function (key) {

    if (key === '0') {
        client.lights().forEach(function (light) {
            //light.setMode(0);

            light.setMode(0, function (err) {
                if (err) {
                    console.log(`${light.name} set Mode 0 failed`);
                }
                console.log(`${light.name} set Mode 0 success`);
            });
        });
    }
    else if (key === '1') {
        client.lights().forEach(function (light) {
            //light.setMode(1);

            light.setMode(1, function (err) {
                if (err) {
                    console.log(`${light.name} set Mode 1 failed`);
                }
                console.log(`${light.name} set Mode 1 success`);
            });
        });
    }
    else if (key === '2') {
        client.lights().forEach(function (light) {
            //light.setMode(2);

            light.setMode(2, function (err) {
                if (err) {
                    console.log(`${light.name} set Mode 2 failed`);
                }
                console.log(`${light.name} set Mode 2 success`);
            });
        });
    }
    else if (key === '3') {
        client.lights().forEach(function (light) {
            //light.setMode(3);

            light.setMode(3, function (err) {
                if (err) {
                    console.log(`${light.name} set Mode 3 failed`);
                }
                console.log(`${light.name} set Mode 3 success`);
            });
        });
    }


    // else if (key === '2') {
    //     client.lights().forEach(function (light) {
    //         light.off(0, function (err) {
    //             if (err) {
    //                 console.log('Turning light ' + light.id + ' off failed');
    //             }
    //             console.log('Turned light ' + light.id + ' off');
    //         });
    //     });
    // } else if (key === '3') {
    //     client.lights().forEach(function (light) {
    //         light.color(0, 100, 100, 3500, 0, function (err) {
    //             if (err) {
    //                 console.log('Turning light ' + light.id + ' red failed');
    //             }
    //             console.log('Turned light ' + light.id + ' red');
    //         });
    //     });
    // } else if (key === '4') {
    //     client.lights().forEach(function (light) {
    //         light.color(120, 100, 100, 3500, 0, function (err) {
    //             if (err) {
    //                 console.log('Turning light ' + light.id + ' green failed');
    //             }
    //             console.log('Turned light ' + light.id + ' green');
    //         });
    //     });
    // } else if (key === '5') {
    //     client.lights().forEach(function (light) {
    //         light.color(240, 100, 100, 3500, 0, function (err) {
    //             if (err) {
    //                 console.log('Turning light ' + light.id + ' blue failed');
    //             }
    //             console.log('Turned light ' + light.id + ' blue');
    //         });
    //     });
    // } else if (key === '6') {
    //     client.lights().forEach(function (light) {
    //         light.color(0, 0, 100, 9000, 0, function (err) {
    //             if (err) {
    //                 console.log('Turning light ' + light.id + ' bright bluish white failed');
    //             }
    //             console.log('Turned light ' + light.id + ' bright bluish white');
    //         });
    //     });
    // } else if (key === '7') {
    //     client.lights().forEach(function (light) {
    //         light.color(0, 0, 100, 2500, 0, function (err) {
    //             if (err) {
    //                 console.log('Turning light ' + light.id + ' bright reddish white failed');
    //             }
    //             console.log('Turned light ' + light.id + ' bright reddish white');
    //         });
    //     });
    // } 

    // else if (key === '8') {
    //     client.setDebug(true);
    //     console.log('Debug messages are shown');
    // } else if (key === '9') {
    //     client.setDebug(false);
    //     console.log('Debug messages are hidden');
    // } 

    else if (key === '\u0003' || key === 'q') { // Ctrl + C
        client.destroy();
        process.exit(); // eslint-disable-line no-process-exit
    }
});


// client.destroy();
// process.exit(); // eslint-disable-line no-process-exit
