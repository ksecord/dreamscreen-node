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
    //this.discoveryPacketSequence = 0;
    //this.source = utils.getRandomHexString(8);
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
        debug: true,    //false
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
    //     throw new TypeError('LIFX Client port option must be a number');
    // } else if (opts.port > 65535 || opts.port < 0) {
    //     throw new RangeError('LIFX Client port option must be between 0 and 65535');
    // }

    if (typeof opts.debug !== 'boolean') {
        throw new TypeError('LIFX Client debug option must be a boolean');
    }
    this.debug = opts.debug;

    // if (typeof opts.lightOfflineTolerance !== 'number') {
    //     throw new TypeError('LIFX Client lightOfflineTolerance option must be a number');
    // }
    // this.lightOfflineTolerance = opts.lightOfflineTolerance;

    // if (typeof opts.messageHandlerTimeout !== 'number') {
    //     throw new TypeError('LIFX Client messageHandlerTimeout option must be a number');
    // }
    // this.messageHandlerTimeout = opts.messageHandlerTimeout;

    if (typeof opts.broadcastIp !== 'string') {
        throw new TypeError('LIFX Client broadcast option must be a string');
    } else if (!utils.isIpv4Format(opts.broadcastIp)) {
        throw new TypeError('LIFX Client broadcast option does only allow IPv4 address format');
    }
    this.broadcastIp = opts.broadcastIp;

    // if (typeof opts.sendPort !== 'number') {
    //     throw new TypeError('LIFX Client sendPort option must be a number');
    // } else if (opts.sendPort > 65535 || opts.sendPort < 1) {
    //     throw new RangeError('LIFX Client sendPort option must be between 1 and 65535');
    // }
    // this.sendPort = opts.sendPort;

    if (!_.isArray(opts.lights)) {
        throw new TypeError('LIFX Client lights option must be an array');
    } else {
        opts.lights.forEach(function (light) {
            if (!utils.isIpv4Format(light)) {
                throw new TypeError('LIFX Client lights option array element \'' + light + '\' is not expected IPv4 format');
            }
        });
    }

    // if (opts.source !== '') {
    //     if (typeof opts.source === 'string') {
    //         if (/^[0-9A-F]{8}$/.test(opts.source)) {
    //             this.source = opts.source;
    //         } else {
    //             throw new RangeError('LIFX Client source option must be 8 hex chars');
    //         }
    //     } else {
    //         throw new TypeError('LIFX Client source option must be given as string');
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
        // Ignore own messages and false formats
        if (utils.getHostIPs().indexOf(rinfo.address) >= 0 || !Buffer.isBuffer(msg)) {
            return;
        }

        // /* istanbul ignore if  */
        // if (this.debug) {
        //     console.log('DEBUG - ' + msg.toString('hex') + ' from ' + rinfo.address);
        // }

        this.handleReceivedPacket(msg, rinfo.address);

        this.emit('message', msg, rinfo); //needed?

        // // Parse packet to object
        // var parsedMsg = Packet.toObject(msg);

        // // Check if packet is read successfully
        // if (parsedMsg instanceof Error) {
        //     console.error('LIFX Client invalid packet header error');
        //     console.error('Packet: ', msg.toString('hex'));
        //     console.trace(parsedMsg);
        // } else {
        //     // Convert type before emitting
        //     var messageTypeName = _.result(_.find(Packet.typeList, { id: parsedMsg.type }), 'name');
        //     if (messageTypeName !== undefined) {
        //         parsedMsg.type = messageTypeName;
        //     }
        //     // Check for handlers of given message and rinfo
        //     this.processMessageHandlers(parsedMsg, rinfo);

        //     this.emit('message', parsedMsg, rinfo);
        // }
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

Client.prototype.handleReceivedPacket = function (received, senderIp) {
    if (received.length < 7) return;    //automatically ignore any messages that do not have any payload
    console.log(`handleReceivedPacket ${senderIp} - ${received[4]} ${received[5]}`);

    let length = received[1];
    if (length != (received.length - 2)) {
        console.log("bad length, ignoring");
        return;
    }
    let crc = received[length + 1];    //should always be last byte in packet
    let calculatedCRC = utils.uartComm_calculate_crc8(received);
    if (crc != calculatedCRC) { //crc is incorrect
        console.log("bad crc in received packet");
        return;
    }

    if (received[0] != 0xFC || length < 6) {    // must have atleast 1 byte of payload  //validates length
        console.log("bad packet, ignoring");
        return;
    }


    let commandReceived = (received[4] << 8) + received[5];



    var light = this.devices[senderIp];
    if (!light) {   //new device
        console.log('received from unknown device');
        let isResponse = ((received[3] >> 6) & 1) == 1; //parsing flags
        let isResponseRequested = ((received[3] >> 4) & 1) == 1;

        if ((commandReceived == 0x010A) && (!isResponseRequested && isResponse)) {  //0x010A, received Get State payload
            var payload = received.slice(6, received.length - 1);
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
                    ambientColor: received.slice(40, 43),
                    ambientShow: payload[62],
                    hdmiInput: payload[73],
                    hdmiInputName1: utils.subBufferString(75, 16, payload),
                    hdmiInputName2: utils.subBufferString(91, 16, payload),
                    hdmiInputName3: utils.subBufferString(107, 16, payload)
                });

                this.devices[senderIp] = light;

                console.log(`Added new dreamscreen: ${light.name}`);
                this.emit('light-new', light);

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
                    ambientColor: received.slice(35, 38),
                    ambientShow: payload[60]
                });

                this.devices[senderIp] = light;

                console.log(`Added new sidekick: ${light.name}`);
                this.emit('light-new', light);
            }


        }

    } else {    //update state of light
        console.log(`TODO Updating device: ${light.name}`);
    }



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
        console.log("sending discovery packet");
        let discoveryBuffer = new Buffer(constants.DISCOVERY_PACKET);
        this.sendMessage(discoveryBuffer, this.broadcastIp);

        // // Sign flag on inactive lights
        // _.forEach(this.devices, _.bind(function (info, deviceId) {
        //     if (this.devices[deviceId].status !== 'off') {
        //         var diff = this.discoveryPacketSequence - info.seenOnDiscovery;
        //         if (diff >= this.lightOfflineTolerance) {
        //             this.devices[deviceId].status = 'off';
        //             this.emit('bulb-offline', info); // deprecated
        //             this.emit('light-offline', info);
        //         }
        //     }
        // }, this));

        // // Send a discovery packet broadcast
        // this.send(Packet.create('getService', {}, this.source));

        // // Send a discovery packet to each light given directly
        // lights.forEach(function (lightAddress) {
        //     var msg = Packet.create('getService', {}, this.source);
        //     msg.address = lightAddress;
        //     this.send(msg);
        // }, this);

        // // Keep track of a sequent number to find not answering lights
        // if (this.discoveryPacketSequence >= Number.MAX_VALUE) {
        //     this.discoveryPacketSequence = 0;
        // } else {
        //     this.discoveryPacketSequence += 1;
        // }
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


Client.prototype.sendMessage = function (message, ipAddress) {
    console.log(`client, sendMessage to ${ipAddress}`);
    this.socket.send(message, 0, message.length, constants.DREAMSCREEN_PORT, ipAddress);
};

// /**
//  * Sends a packet from the messages queue or stops the sending process
//  * if queue is empty
//  **/
// Client.prototype.sendingProcess = function () {
//     if (!this.isSocketBound) {
//         this.stopSendingProcess();
//         console.log('LIFX Client stopped sending due to unbound socket');
//         return;
//     }

//     if (this.messagesQueue.length > 0) {
//         var msg = this.messagesQueue.pop();
//         if (msg.address === undefined) {
//             msg.address = this.broadcastAddress;
//         }
//         if (msg.transactionType === constants.PACKET_TRANSACTION_TYPES.ONE_WAY) {
//             this.socket.send(msg.data, 0, msg.data.length, this.sendPort, msg.address);
//             /* istanbul ignore if  */
//             if (this.debug) {
//                 console.log('DEBUG - ' + msg.data.toString('hex') + ' to ' + msg.address);
//             }
//         } else if (msg.transactionType === constants.PACKET_TRANSACTION_TYPES.REQUEST_RESPONSE) {
//             if (msg.timesSent < this.resendMaxTimes) {
//                 if (Date.now() > (msg.timeLastSent + this.resendPacketDelay)) {
//                     this.socket.send(msg.data, 0, msg.data.length, this.sendPort, msg.address);
//                     msg.timesSent += 1;
//                     msg.timeLastSent = Date.now();
//                     /* istanbul ignore if  */
//                     if (this.debug) {
//                         console.log(
//                             'DEBUG - ' + msg.data.toString('hex') + ' to ' + msg.address +
//                             ', send ' + msg.timesSent + ' time(s)'
//                         );
//                     }
//                 }
//                 // Add to the end of the queue again
//                 this.messagesQueue.unshift(msg);
//             } else {
//                 this.messageHandlers.forEach(function (handler, hdlrIndex) {
//                     if (handler.type === 'acknowledgement' && handler.sequenceNumber === msg.sequence) {
//                         this.messageHandlers.splice(hdlrIndex, 1);
//                         var err = new Error('No LIFX response after max resend limit of ' + this.resendMaxTimes);
//                         return handler.callback(err, null, null);
//                     }
//                 }.bind(this));
//             }
//         }
//     } else {
//         this.stopSendingProcess();
//     }
// };

// /**
//  * Starts the sending of all packages in the queue
//  */
// Client.prototype.startSendingProcess = function () {
//     if (this.sendTimer === null) { // Already running?
//         this.sendTimer = setInterval(this.sendingProcess.bind(this), constants.MESSAGE_RATE_LIMIT);
//     }
// };

// /**
//  * Stops sending of all packages in the queue
//  */
// Client.prototype.stopSendingProcess = function () {
//     if (this.sendTimer !== null) {
//         clearInterval(this.sendTimer);
//         this.sendTimer = null;
//     }
// };



// /**
//  * Checks all registered message handlers if they request the given message
//  * @param  {Object} msg message to check handler for
//  * @param  {Object} rinfo rinfo address info to check handler for
//  */
// Client.prototype.processMessageHandlers = function (msg, rinfo) {
//     // Process only packages for us
//     if (msg.source.toLowerCase() !== this.source.toLowerCase()) {
//         return;
//     }
//     // We check our message handler if the answer received is requested
//     this.messageHandlers.forEach(function (handler, hdlrIndex) {
//         if (msg.type === handler.type) {
//             if (handler.sequenceNumber !== undefined) {
//                 if (handler.sequenceNumber === msg.sequence) {
//                     // Remove if specific packet was request, since it should only be called once
//                     this.messageHandlers.splice(hdlrIndex, 1);
//                     this.messagesQueue.forEach(function (packet, packetIndex) {
//                         if (packet.transactionType === constants.PACKET_TRANSACTION_TYPES.REQUEST_RESPONSE &&
//                             packet.sequence === msg.sequence) {
//                             this.messagesQueue.splice(packetIndex, 1);
//                         }
//                     }.bind(this));

//                     // Call the function requesting the packet
//                     return handler.callback(null, msg, rinfo);
//                 }
//             } else {
//                 // Call the function requesting the packet
//                 return handler.callback(null, msg, rinfo);
//             }
//         }

//         // We want to call expired request handlers for specific packages after the
//         // messageHandlerTimeout set in options, to specify an error
//         if (handler.sequenceNumber !== undefined) {
//             if (Date.now() > (handler.timestamp + this.messageHandlerTimeout)) {
//                 this.messageHandlers.splice(hdlrIndex, 1);

//                 var err = new Error('No LIFX response in time');
//                 return handler.callback(err, null, null);
//             }
//         }
//     }, this);
// };

// /**
//  * Processes a discovery report packet to update internals
//  * @param  {Object} err Error if existant
//  * @param  {Object} msg The discovery report package
//  * @param  {Object} rinfo Remote host details
//  */
// Client.prototype.processDiscoveryPacket = function (err, msg, rinfo) {
//     if (err) {
//         return;
//     }
//     if (msg.service === 'udp' && msg.port === constants.DREAMSCREEN_PORT) { //LIFX_DEFAULT_PORT
//         // Add / update the found gateway
//         if (!this.devices[msg.target]) {
//             var lightDevice = new Light({
//                 client: this,
//                 id: msg.target,
//                 address: rinfo.address,
//                 port: msg.port,
//                 seenOnDiscovery: this.discoveryPacketSequence
//             });
//             this.devices[msg.target] = lightDevice;

//             // Request label
//             var labelRequest = Packet.create('getLabel', {}, this.source);
//             labelRequest.target = msg.target;
//             this.send(labelRequest);

//             this.emit('bulb-new', lightDevice); // deprecated
//             this.emit('light-new', lightDevice);
//         } else {
//             if (this.devices[msg.target].status === 'off') {
//                 this.devices[msg.target].status = 'on';
//                 this.emit('bulb-online', this.devices[msg.target]); // deprecated
//                 this.emit('light-online', this.devices[msg.target]);
//             }
//             this.devices[msg.target].address = rinfo.address;
//             this.devices[msg.target].seenOnDiscovery = this.discoveryPacketSequence;
//         }
//     }
// };

// /**
//  * Processes a state label packet to update internals
//  * @param {Object} err Error if existant
//  * @param {Object} msg The state label package
//  */
// Client.prototype.processStatePacket = function (err, msg) {
//     if (err) {
//         return;
//     }

//     //todo
// };

// /**
//  * Processes a state label packet to update internals
//  * @param {Object} err Error if existant
//  * @param {Object} msg The state label package
//  */
// Client.prototype.processLabelPacket = function (err, msg) {
//     if (err) {
//         return;
//     }
//     if (this.devices[msg.target] !== undefined) {
//         this.devices[msg.target].label = msg.label;
//     }
// };

// /**
//  * Send a LIFX message objects over the network
//  * @param  {Object} msg A message object or multiple with data to send
//  * @param  {Function} [callback] Function to handle error and success after send
//  * @return {Number} The sequence number of the request
//  */
// Client.prototype.send = function (msg, callback) {
//     var packet = {
//         timeCreated: Date.now(),
//         timeLastSent: 0,
//         timesSent: 0,
//         transactionType: constants.PACKET_TRANSACTION_TYPES.ONE_WAY
//     };

//     // Add the target ip address if target given
//     if (msg.address !== undefined) {
//         packet.address = msg.address;
//     }
//     if (msg.target !== undefined) {
//         var targetBulb = this.light(msg.target);
//         if (targetBulb) {
//             packet.address = targetBulb.address;
//             // If we would exceed the max value for the int8 field start over again
//             if (this.sequenceNumber >= constants.PACKET_HEADER_SEQUENCE_MAX) {
//                 this.sequenceNumber = 0;
//             } else {
//                 this.sequenceNumber += 1;
//             }
//         }
//     }

//     msg.sequence = this.sequenceNumber;
//     packet.sequence = this.sequenceNumber;
//     if (typeof callback === 'function') {
//         msg.ackRequired = true;
//         this.addMessageHandler('acknowledgement', callback, msg.sequence);
//         packet.transactionType = constants.PACKET_TRANSACTION_TYPES.REQUEST_RESPONSE;
//     }
//     packet.data = Packet.toBuffer(msg);
//     this.messagesQueue.unshift(packet);
//     this.startSendingProcess();

//     return this.sequenceNumber;
// };

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
        throw new TypeError('LIFX Client setDebug expects boolean as parameter');
    }
    this.debug = debug;
};

/**
 * Returns the list of all known lights
 * @example client.lights()
 * @param {String} [status='on'] Status to filter for, empty string for all
 * @return {Array} Lights
 */
Client.prototype.lights = function (status) {
    //todo

    // if (status === undefined) {
    //     status = 'on';
    // } else if (typeof status !== 'string') {
    //     throw new TypeError('LIFX Client lights expects status to be a string');
    // }

    // if (status.length > 0) {
    //     if (status !== 'on' && status !== 'off') {
    //         throw new TypeError('Lifx Client lights expects status to be \'on\', \'off\' or \'\'');
    //     }

    //     var result = [];
    //     _.forEach(this.devices, function (light) {
    //         if (light.status === status) {
    //             result.push(light);
    //         }
    //     });
    //     return result;
    // }

    var result = [];
    _.forEach(this.devices, function (light) {
        result.push(light);
    });
    return result;
};

// /**
//  * Find a light by label, id or ip
//  * @param {String} identifier label, id or ip to search for
//  * @return {Object|Boolean} the light object or false if not found
//  */
// Client.prototype.light = function (identifier) {
//     var result;
//     if (typeof identifier !== 'string') {
//         throw new TypeError('LIFX Client light expects identifier for LIFX light to be a string');
//     }

//     // There is no ip or id longer than 45 chars
//     if (identifier.length > 45) {   //ipv4 address is max 15 characters? eg 111.111.111.111
//         return false;
//     }

//     // Dots or colons is high likely an ip
//     if (identifier.indexOf('.') >= 0 || identifier.indexOf(':') >= 0) {
//         result = _.find(this.devices, { address: identifier }) || false;
//         if (result !== false) {
//             return result;
//         }
//     }

//     // // Search id
//     // result = _.find(this.devices, { id: identifier }) || false;
//     // if (result !== false) {
//     //     return result;
//     // }

//     // // Search label
//     // result = _.find(this.devices, { label: identifier }) || false;

//     return result;
// };

exports.Client = Client;
