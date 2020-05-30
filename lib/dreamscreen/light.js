'use strict';


var constants = require('../dreamscreen').constants;
var utils = require('../dreamscreen').utils;


/**
 * A representation of a light bulb
 * DreamScreen HD, DreamScreen 4K, SideKick
 * 
 * @class
 * @param {Obj} constr constructor object
 * @param {DreamScreen/Client} constr.client the client the light belongs to
 * @param {String} constr.ipAddress ip address of the light
 */
function Light(constr) {
    this.client = constr.client;

    this.ipAddress = constr.ipAddress;
    this.serialNumber = constr.serialNumber;
    this.productId = constr.productId;                  //devicetype

    this.lastSeen = constr.lastSeen;
    this.isReachable = constr.isReachable;

    this.name = constr.name;                            //devicename
    this.groupName = constr.groupName;                  //groupname
    this.groupNumber = constr.groupNumber;              //groupnumber

    this.mode = constr.mode;                            //mode
    this.brightness = constr.brightness;                //brightness
    this.ambientColor = constr.ambientColor;            //ambientr ambientg ambientb
    this.ambientShow = constr.ambientShow;              //ambientscene
    this.ambientModeType = constr.ambientModeType;      //
    this.hdmiInput = constr.hdmiInput;                  //hdmiinput
    this.hdmiInputName1 = constr.hdmiInputName1;        //hdminame1
    this.hdmiInputName2 = constr.hdmiInputName2;        //hdminame2
    this.hdmiInputName3 = constr.hdmiInputName3;        //hdminame3
}

/**
 * Mode that specifies the behavior of the backlighting LEDs
 * @param {*} mode 1 byte, range 0-3
 * 0 Sleep (Off)
 * 1 Video
 * 2 Music
 * 3 Ambient
 */
Light.prototype.setMode = function (mode, callback) {
    if (this.client.debug) {
        console.log(`${this.name}, setMode ${mode}`);
    }
    
    if (mode !== undefined && typeof mode !== 'number') {
        throw new RangeError('light, setMode method expects mode to be a number');
    } else if (mode < 0 || mode > 3) {
        throw new RangeError('light, setMode method expects mode to be in range 0-3');
    }

    this.mode = mode;
    utils.sendUDPWrite(this, 0x03, 0x01, [mode], false, callback);
};

/**
 * Brightness of the backlighting LEDs
 * @param {*} brightness 1 byte, range 0-100
 */
Light.prototype.setBrightness = function (brightness, callback) {
    if (this.client.debug) {
        console.log(`${this.name}, setBrightness ${brightness}`);
    }
   
    if (brightness !== undefined && typeof brightness !== 'number') {
        throw new RangeError('light, setBrightness method expects brightness to be a number');
    } else if (brightness < 0 || brightness > 100) {
        throw new RangeError('light, setBrightness method expects brightness to be in range 0-100');
    }

    this.brightness = brightness;
    utils.sendUDPWrite(this, 0x03, 0x02, [brightness], false, callback);
};

/**
 * Sets the Ambient mode type, either static or show
 * @param {*} ambientModeType 1 byte, range 0-1
 * 0 Static, 1 Show
 */
Light.prototype.setAmbientModeType = function (ambientModeType, callback) {
    if (this.client.debug) {
        console.log(`${this.name}, setAmbientModeType ${ambientModeType}`);
    }

    if (ambientModeType !== undefined && typeof ambientModeType !== 'number') {
        throw new RangeError('light, setAmbientModeType method expects ambientModeType to be a number');
    } else if (ambientModeType < 0 || ambientModeType > 1) {
        throw new RangeError('light, setAmbientModeType method expects ambientModeType to be in range 0-1');
    }

    this.ambientModeType = ambientModeType;
    utils.sendUDPWrite(this, 0x03, 0x08, [ambientModeType], false, callback);
};

/**
 * The static color displayed in Ambient-static mode
 * @param {*} ambientColor 3 bytes as RGB array, range 0-255
 */
Light.prototype.setAmbientColor = function (ambientColor, callback) {
    if (this.client.debug) {
        console.log(`${this.name}, setAmbientColor ${ambientColor}`);
    }

    if (ambientColor !== undefined && !Array.isArray(ambientColor)) {
        throw new RangeError('light, setAmbientColor method expects ambientColor to be an array');
    } else if (ambientColor.length != 3) {
        throw new RangeError('light, setAmbientColor method expects ambientColor to be an array of length 3');
    }

    this.ambientColor = ambientColor;
    utils.sendUDPWrite(this, 0x03, 0x05, ambientColor, false, callback);
};

/**
 * The show/scene displayed in Ambient-scene mode
 * @param {*} ambientShow 1 byte, range 0-8
 * 0 Random color
 * 1 Fireside
 * 2 Twinkle
 * 3 Ocean
 * 4 Rainbow
 * 5 July 4th
 * 6 Holiday
 * 7 Pop
 * 8 Enchanted Forest
 */
Light.prototype.setAmbientShow = function (ambientShow, callback) {
    if (this.client.debug) {
        console.log(`${this.name}, setAmbientShow ${ambientShow}`);
    }

    if (ambientShow !== undefined && typeof ambientShow !== 'number') {
        throw new RangeError('light, setAmbientShow method expects ambientShow to be a number');
    } else if (ambientShow < 0 || ambientShow > 8) {
        throw new RangeError('light, setAmbientShow method expects ambientShow to be in range 0-8');
    }

    this.ambientShow = ambientShow;
    utils.sendUDPWrite(this, 0x03, 0x0D, [ambientShow], false, callback);
};

/**
 * The active HDMI port that DreamScreen is displaying
 * @param {*} hdmiInput 1 byte, range 0-2
 * value 0: HDMI 1
 * value 1: HDMI 2
 * value 2: HDMI 3
 */
Light.prototype.setHdmiInput = function (hdmiInput, callback) {
    if (this.client.debug) {
        console.log(`${this.name}, setHdmiInput ${hdmiInput}`);
    }

    if (hdmiInput !== undefined && typeof hdmiInput !== 'number') {
        throw new RangeError('light, setHdmiInput method expects hdmiInput to be a number');
    } else if (hdmiInput < 0 || hdmiInput > 2) {
        throw new RangeError('light, setHdmiInput method expects hdmiInput to be in range 0-2');
    }

    this.hdmiInput = hdmiInput;
    utils.sendUDPWrite(this, 0x03, 0x20, [hdmiInput], false, callback);
};

exports.Light = Light;
