'use strict';

var os = require('os');
var constants = require('../dreamscreen').constants;
//var productDetailList = require('./products.json');
var utils = exports;


/**
 * Function to get a specific string from a buffer, with all whitespacing/extra nulls removed
 * @param {*} _startIndex 
 * @param {*} _length 
 * @param {*} _data 
 */
utils.subBufferString = function (_startIndex, _length, _data) {
    let data = "";
    for (var i = _startIndex; i < _startIndex + _length; i++) {
        data = data + String.fromCharCode(_data[i]);
    }

    return data.trim().replace(/\0/g, '');  //removes whitespace and extra nulls
}

/**
* Builds a DreamScreen message and sends it over UDP
* @param light the light to which send the command
* @param command1 specifies command namespace
* @param command2 specifies individal command within namespace
* @param payload payload of the message, length depending upon the context of the Command
* @param broadcastingToGroup true if message should be UDP broadcasted, false if message to be UDP unicasted
*/
utils.sendUDPWrite = function (light, commandUpper, commandLower, payload, broadcastingToGroup, callback) {

    let response = [];
    response.push(0xFC);
    response.push(0x05 + payload.length);
    response.push(light.groupNumber);   //0xFF

    if (broadcastingToGroup) response.push(0b00100001);
    else response.push(0b00010001);

    response.push(commandUpper);
    response.push(commandLower);
    response = response.concat(payload);
    response.push(utils.uartComm_calculate_crc8(response));

    let buf = new Buffer(response);
    if (broadcastingToGroup) {  //broadcast
        light.client.send(buf, light.client.broadcastIp, callback);
    } else {    //unicast
        light.client.send(buf, light.ipAddress, callback);
    }
}

/**
 * Calculates the 8 bit crc for the message
 * @param {*} data 
 */
utils.uartComm_calculate_crc8 = function (data) {
    let size = (data[1] + 0x01);
    let cntr = 0x00;
    let crc = 0x00;
    while (cntr < size) {
        let f = (crc ^ (data[cntr])) & 0xFF
        crc = constants.uartComm_crc8_table[f];
        cntr++;
    }
    return crc;
}

/**
 * Return all ip addresses of the machine
 * @return {Array} list containing ip address info
 */
utils.getHostIPs = function () {
    var ips = [];
    var ifaces = os.networkInterfaces();
    Object.keys(ifaces).forEach(function (ifname) {
        ifaces[ifname].forEach(function (iface) {
            ips.push(iface.address);
        });
    });
    return ips;
};

/**
 * Validates a given ip address is IPv4 format
 * @param  {String} ip IP address to validate
 * @return {Boolean}   is IPv4 format?
 */
utils.isIpv4Format = function (ip) {
    var ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    return ipv4Regex.test(ip);
};
