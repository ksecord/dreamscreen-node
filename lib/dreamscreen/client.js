'use strict';

var util = require('util');
var dgram = require('dgram');
var EventEmitter = require('eventemitter3');
var _ = require('lodash');

//var Packet = require('../dreamscreen').message;
var Light = require('../dreamscreen').Light;
var utils = require('../dreamscreen').utils;
var constants = require('../dreamscreen').constants;


/**
 * Creates a dreamscreen client
 * @extends EventEmitter
 */
function Client() {
    EventEmitter.call(this);

    this.debug = true;  //false
    this.socket = dgram.createSocket('udp4');
    this.isSocketBound = false;
    this.devices = {};
    this.port = constants.DREAMSCREEN_PORT;
    this.discoveryTimer = null;
    this.messageHandlers = [];
    this.messageHandlerTimeout = 5000; // 45000 45 sec
    this.broadcastIp = constants.DEFAULT_BROADCAST_IP;
}
util.inherits(Client, EventEmitter);


/**
 * Creates a new socket and starts discovery
 * @example
 * init({debug: true}, function() {
 *   console.log('Client started');
 * })
 * @param {Object} [options] Configuration to use
 * @param {String} [options.address] The IPv4 address to bind to
 * @param {Number} [options.port] The port to bind to
 * @param {Boolean} [options.debug] Show debug output
 * @param {Array} [options.lights] Pre set list of ip addresses of known addressable lights
 * @param {String} [options.broadcast] The broadcast address to use for light discovery
 * @param {Number} [options.sendPort] The port to send messages to
 * @param {Function} [callback] Called after initialation
 */
Client.prototype.init = function (options, callback) {
    var defaults = {
        address: '0.0.0.0',
        port: constants.DREAMSCREEN_PORT,
        debug: false,
        // lightOfflineTolerance: 3,
        // messageHandlerTimeout: 45000,
        // source: '',
        startDiscovery: true,
        lights: [],
        broadcastIp: constants.DEFAULT_BROADCAST_IP,
        sendPort: constants.DREAMSCREEN_PORT
        // resendPacketDelay: 150,
        // resendMaxTimes: 3
    };

    options = options || {};
    var opts = _.defaults(options, defaults);

    // if (typeof opts.port !== 'number') {
    //     throw new TypeError('DreamScreen Client port option must be a number');
    // } else if (opts.port > 65535 || opts.port < 0) {
    //     throw new RangeError('DreamScreen Client port option must be between 0 and 65535');
    // }

    if (typeof opts.debug !== 'boolean') {
        throw new TypeError('DreamScreen Client debug option must be a boolean');
    }
    this.debug = opts.debug;

    // if (typeof opts.lightOfflineTolerance !== 'number') {
    //     throw new TypeError('DreamScreen Client lightOfflineTolerance option must be a number');
    // }
    // this.lightOfflineTolerance = opts.lightOfflineTolerance;

    // if (typeof opts.messageHandlerTimeout !== 'number') {
    //     throw new TypeError('DreamScreen Client messageHandlerTimeout option must be a number');
    // }
    // this.messageHandlerTimeout = opts.messageHandlerTimeout;

    if (typeof opts.broadcastIp !== 'string') {
        throw new TypeError('DreamScreen Client broadcast option must be a string');
    } else if (!utils.isIpv4Format(opts.broadcastIp)) {
        throw new TypeError('DreamScreen Client broadcast option does only allow IPv4 address format');
    }
    this.broadcastIp = opts.broadcastIp;

    // if (typeof opts.sendPort !== 'number') {
    //     throw new TypeError('DreamScreen Client sendPort option must be a number');
    // } else if (opts.sendPort > 65535 || opts.sendPort < 1) {
    //     throw new RangeError('DreamScreen Client sendPort option must be between 1 and 65535');
    // }
    // this.sendPort = opts.sendPort;

    if (!_.isArray(opts.lights)) {
        throw new TypeError('DreamScreen Client lights option must be an array');
    } else {
        opts.lights.forEach(function (light) {
            if (!utils.isIpv4Format(light)) {
                throw new TypeError('DreamScreen Client lights option array element \'' + light + '\' is not expected IPv4 format');
            }
        });
    }

    // if (opts.source !== '') {
    //     if (typeof opts.source === 'string') {
    //         if (/^[0-9A-F]{8}$/.test(opts.source)) {
    //             this.source = opts.source;
    //         } else {
    //             throw new RangeError('DreamScreen Client source option must be 8 hex chars');
    //         }
    //     } else {
    //         throw new TypeError('DreamScreen Client source option must be given as string');
    //     }
    // }

    this.socket.on('error', function (err) {
        this.isSocketBound = false;
        console.error('DreamScreen Client UDP error');
        console.trace(err);
        this.socket.close();
        this.emit('error', err);
    }.bind(this));

    this.socket.on('message', function (msg, rinfo) {

        if (utils.getHostIPs().indexOf(rinfo.address) >= 0 || !Buffer.isBuffer(msg)) {  // Ignore own messages and false formats
            return;
        }

        this.handleReceivedPacket(msg, rinfo);

        this.emit('message', msg, rinfo);

    }.bind(this));

    this.socket.bind(opts.port, opts.address, function () {
        this.isSocketBound = true;
        this.socket.setBroadcast(true);
        this.emit('listening');
        this.port = opts.port;

        // Start scanning
        if (opts.startDiscovery) {
            this.startDiscovery(opts.lights);
        }
        if (typeof callback === 'function') {
            return callback();
        }
    }.bind(this));
};


/**
 * Destroy an instance
 */
Client.prototype.destroy = function () {
    this.stopDiscovery();
    //this.stopSendingProcess();
    if (this.isSocketBound) {
        this.socket.close();
    }
};


Client.prototype.handleReceivedPacket = function (received, rinfo) {
    if (received.length < 7) return;    //automatically ignore any messages that do not have any payload

    let senderIp = rinfo.address;
    if (this.debug) {
        console.log(`handleReceivedPacket ${senderIp} - ${received[4]} ${received[5]}`);
    }

    let length = received[1];
    if (length != (received.length - 2)) {
        if (this.debug) {
            console.log("bad length, ignoring");
        }
        return;
    }
    let crc = received[length + 1];    //should always be last byte in packet
    let calculatedCRC = utils.uartComm_calculate_crc8(received);
    if (crc != calculatedCRC) { //crc is incorrect
        if (this.debug) {
            console.log("bad crc in received packet");
        }
        return;
    }

    if (received[0] != 0xFC || length < 6) {    // must have atleast 1 byte of payload  //validates length
        if (this.debug) {
            console.log("bad packet, ignoring");
        }
        return;
    }

    let commandReceived = (received[4] << 8) + received[5];
    let payload = received.slice(6, received.length - 1);


    var light = this.devices[senderIp];
    if (!light) {   //new device
        if (this.debug) {
            console.log('received from unknown device');
        }
        let isResponse = ((received[3] >> 6) & 1) == 1; //parsing flags
        let isResponseRequested = ((received[3] >> 4) & 1) == 1;

        if ((commandReceived == 0x010A) && (!isResponseRequested && isResponse)) {  //0x010A, received Get State payload
            let productId = payload[payload.length - 1];

            if (productId == 1 || productId == 2) { //Dreamscreen HD, DreamScreen 4K

                light = new Light({
                    client: this,

                    ipAddress: senderIp,
                    productId: productId,
                    lastSeen: 0,   //?
                    isReachable: true,

                    name: utils.subBufferString(0, 16, payload),
                    groupName: utils.subBufferString(16, 16, payload),
                    groupNumber: payload[32],

                    mode: payload[33],
                    brightness: payload[34],
                    ambientColor: payload.slice(40, 43),
                    ambientShow: payload[62],
                    hdmiInput: payload[73],
                    hdmiInputName1: utils.subBufferString(75, 16, payload),
                    hdmiInputName2: utils.subBufferString(91, 16, payload),
                    hdmiInputName3: utils.subBufferString(107, 16, payload)
                });

            } else if (productId == 3) {

                light = new Light({
                    client: this,

                    ipAddress: senderIp,
                    productId: productId,
                    lastSeen: 0,   //?
                    isReachable: true,

                    name: utils.subBufferString(0, 16, payload),
                    groupName: utils.subBufferString(16, 16, payload),
                    groupNumber: payload[32],

                    mode: payload[33],
                    brightness: payload[34],
                    ambientColor: payload.slice(35, 38),
                    ambientShow: payload[60]
                });

            } else {
                if (this.debug) {
                    console.log(`received unsupported productId ${productId}`);
                }
                return;
            }


            this.devices[senderIp] = light;
            this.emit('light-new', light);

            if (this.debug) {
                console.log(`Added new light: ${light.name}`);
                console.log(`sending Get Serial Number packet to new light ${senderIp}`);
            }

            let getSerialBuffer = new Buffer(constants.GET_SERIAL_PACKET);
            this.send(getSerialBuffer, senderIp);

        }


    } else {    //update state of light

        if (commandReceived == 0x0103) {
            let serialNumber = utils.subBufferString(0, 4, payload);
            serialNumber = Buffer.from(serialNumber, 'utf8').toString('hex');
            if (this.debug) {
                console.log(`0x0103 serial number received`); 
            }

            light.serialNumber = serialNumber;

            light.lastSeen = Date.now();
            light.isReachable = true;

        } else if (commandReceived == 0x010A) {  //0x010A, received Get State payload
            let productId = payload[payload.length - 1];
            let lightUpdated = false;
            let temp;

            light.lastSeen = Date.now();
            light.isReachable = true;

            temp = utils.subBufferString(0, 16, payload);
            if (light.name !== temp) {
                light.name = temp;
                lightUpdated = true;
            }

            temp = utils.subBufferString(16, 16, payload);
            if (light.groupName !== temp) {
                light.groupName = temp;
                lightUpdated = true;
            }

            temp = payload[32];
            if (light.groupNumber !== temp) {
                light.groupNumber = temp;
                lightUpdated = true;
            }

            temp = payload[33];
            if (light.mode !== temp) {
                light.mode = temp;
                lightUpdated = true;
            }

            temp = payload[34];
            if (light.brightness !== temp) {
                light.brightness = temp;
                lightUpdated = true;
            }

            if (productId == 1 || productId == 2) { //Dreamscreen HD, DreamScreen 4K specific payload indexing
                temp = payload.slice(40, 43);
                if (!(light.ambientColor[0] === temp[0] && light.ambientColor[1] === temp[1] && light.ambientColor[2] === temp[2])) {
                    light.ambientColor = temp.slice();
                    lightUpdated = true;
                }

                temp = payload[62];
                if (light.ambientShow !== temp) {
                    light.ambientShow = temp;
                    lightUpdated = true;
                }

                temp = payload[73];
                if (light.hdmiInput !== temp) {
                    light.hdmiInput = temp;
                    lightUpdated = true;
                }

                temp = utils.subBufferString(75, 16, payload);
                if (light.hdmiInputName1 !== temp) {
                    light.hdmiInputName1 = temp;
                    lightUpdated = true;
                }

                temp = utils.subBufferString(91, 16, payload);
                if (light.hdmiInputName2 !== temp) {
                    light.hdmiInputName2 = temp;
                    lightUpdated = true;
                }

                temp = utils.subBufferString(107, 16, payload);
                if (light.hdmiInputName3 !== temp) {
                    light.hdmiInputName3 = temp;
                    lightUpdated = true;
                }

            } else if (productId == 3) {    //SideKick specific payload indexing
                temp = payload.slice(35, 38);
                if (!(light.ambientColor[0] === temp[0] && light.ambientColor[1] === temp[1] && light.ambientColor[2] === temp[2])) {
                    light.ambientColor = temp.slice();
                    lightUpdated = true;
                }

                temp = payload[60];
                if (light.ambientShow !== temp) {
                    light.ambientShow = temp;
                    lightUpdated = true;
                }
            }


            if (lightUpdated) {
                if (this.debug) {
                    console.log(`${light.name} updated attribute(s)`);
                }
                this.emit('light-updated', light);
            }

        }
    }


    this.processMessageHandlers(received[4], received[5], payload, rinfo)

}


/**
 * Start discovery of lights
 * This will keep the list of lights updated, finds new lights and sets lights
 * offline if no longer found
 * @param {Array} [lights] Pre set list of ip addresses of known addressable lights to request directly
 */
Client.prototype.startDiscovery = function (lights) {
    lights = lights || [];

    var sendDiscoveryPacket = function () {
        if (this.debug) {
            console.log("sending discovery packet");
        }
        let discoveryBuffer = new Buffer(constants.DISCOVERY_PACKET);
        this.send(discoveryBuffer, this.broadcastIp);
    }.bind(this);

    this.discoveryTimer = setInterval(
        sendDiscoveryPacket,
        constants.DISCOVERY_INTERVAL
    );

    sendDiscoveryPacket();
};


/**
 * This stops the discovery process
 * The client will be no longer updating the state of lights or find lights
 */
Client.prototype.stopDiscovery = function () {
    clearInterval(this.discoveryTimer);
    this.discoveryTimer = null;
};


/**
 * Checks all registered message handlers if they request the given message
 * @param  {Number} commandUpper the upper command that was received
 * @param  {Number} commandLower the lower command that was received
 * @param  {Object} payload the payload that was received
 * @param  {Object} rinfo rinfo address info to check handler for
 */
Client.prototype.processMessageHandlers = function (commandUpper, commandLower, payload, rinfo) {

    // Check each message handler to see if the received command is requested
    this.messageHandlers.forEach(function (handler, hdlrIndex) {

        if (commandUpper === handler.commandUpper && commandLower === handler.commandLower) {
            this.messageHandlers.splice(hdlrIndex, 1);

            return handler.callback(null, payload, rinfo);  // Call the function requesting the packet
        }

        // Check for expired request handlers for specific packages after the
        // messageHandlerTimeout set in options, to specify an error
        if (Date.now() > (handler.timestamp + this.messageHandlerTimeout)) {
            this.messageHandlers.splice(hdlrIndex, 1);

            var err = new Error('No DreamScreen response in time');
            return handler.callback(err, null, null);
        }
    }, this);
};


Client.prototype.send = function (message, ipAddress, callback) {
    this.socket.send(message, 0, message.length, constants.DREAMSCREEN_PORT, ipAddress);

    if (typeof callback === 'function') {
        this.addMessageHandler(message[4], message[5], callback);
    }
};


/**
 * Get network address data from connection
 * @return {Object} Network address data
 */
Client.prototype.address = function () {
    var address = null;
    try {
        address = this.socket.address();
    } catch (e) { }
    return address;
};


/**
 * Sets debug on or off at runtime
 * @param  {boolean} debug debug messages on
 */
Client.prototype.setDebug = function (debug) {
    if (typeof debug !== 'boolean') {
        throw new TypeError('DreamScreen Client setDebug expects boolean as parameter');
    }
    this.debug = debug;
};


/**
 * Adds a message handler that calls a function when the requested
 * info was received
 * @param {Number} commandUpper The upper command to listen for
 * @param {Number} commandLower The lower command to listen for
 * @param {Function} callback the function to call if the packet was received,
 *                   this will be called with parameters msg and rinfo
 */
Client.prototype.addMessageHandler = function (commandUpper, commandLower, callback) {
    if (typeof commandUpper !== 'number') {
        throw new TypeError('DreamScreen Client addMessageHandler expects commandUpper parameter to be number');
    }
    if (typeof commandLower !== 'number') {
        throw new TypeError('DreamScreen Client addMessageHandler expects commandLower parameter to be number');
    }
    if (typeof callback !== 'function') {
        throw new TypeError('DreamScreen Client addMessageHandler expects callback parameter to be a function');
    }

    var handler = {
        commandUpper: commandUpper,
        commandLower: commandLower,
        callback: callback.bind(this),
        timestamp: Date.now()
    };

    this.messageHandlers.push(handler);
};


/**
 * Returns the list of all known lights
 * @return {Array} Lights
 */
Client.prototype.lights = function () {
    var result = [];
    _.forEach(this.devices, function (light) {
        result.push(light);
    });
    return result;
};


/**
 * Find a light by label, id or ip
 * @param {String} identifier label, id or ip to search for
 * @return {Object|Boolean} the light object or false if not found
 */
Client.prototype.light = function (identifier) {
    var result;
    if (typeof identifier !== 'string') {
        throw new TypeError('DreamScreen Client light expects identifier for DreamScreen light to be a string');
    }

    // There is no ip or id longer than 45 chars
    if (identifier.length > 45) {   //ipv4 address is max 15 characters? eg 111.111.111.111
        return false;
    }

    // Dots or colons is high likely an ip
    if (identifier.indexOf('.') >= 0 || identifier.indexOf(':') >= 0) {
        result = _.find(this.devices, { ipAddress: identifier }) || false;
        if (result !== false) {
            return result;
        }
    }

    // Search serial number
    result = _.find(this.devices, { serialNumber: identifier }) || false;
    if (result !== false) {
        return result;
    }

    // Search name
    result = _.find(this.devices, { name: identifier }) || false;

    return result;
};

exports.Client = Client;
