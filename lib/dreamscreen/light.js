'use strict';

//todo finish range checking all setters

var constants = require('../dreamscreen').constants;
var utils = require('../dreamscreen').utils;
//var packet = require('../lifx').packet;
//var _ = require('lodash');

/**
 * A representation of a light bulb
 * @class
 * @param {Obj} constr constructor object
 * @param {Lifx/Client} constr.client the client the light belongs to
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
 * 
 * @param {*} mode 
 */
Light.prototype.setMode = function (mode, callback) {
    if (mode !== undefined && typeof mode !== 'number') {
        throw new RangeError('light, setMode method expects mode to be a number');
    } else if (mode < 0 || mode > 3) {
        throw new RangeError('light, setMode method expects mode to be in range 0-3');
    }

    this.mode = mode;
    console.log(`light, setMode ${mode}`);
    utils.sendUDPWrite(this, 0x03, 0x01, [mode], false, callback);
};

Light.prototype.setBrightness = function (brightness, callback) {
    if (brightness !== undefined && typeof brightness !== 'number') {
        throw new RangeError('light, setBrightness method expects brightness to be a number');
    } else if (brightness < 0 || brightness > 100) {
        throw new RangeError('light, setBrightness method expects brightness to be in range 0-100');
    }

    this.brightness
    console.log(`light, setBrightness ${brightness}`);
    utils.sendUDPWrite(this, 0x03, 0x02, [brightness], false, callback);
};

/**
 * 
 * @param {*} ambientModeType 0 static rgb, 1 show
 */
Light.prototype.setAmbientModeType = function (ambientModeType, callback) {
    if (ambientModeType !== undefined && typeof ambientModeType !== 'number') {
        throw new RangeError('light, setAmbientModeType method expects ambientModeType to be a number');
    } else if (ambientModeType < 0 || ambientModeType > 1) {
        throw new RangeError('light, setAmbientModeType method expects ambientModeType to be in range 0-1');
    }

    this.ambientModeType = ambientModeType;
    console.log(`light, setAmbientModeType ${ambientModeType}`);
    utils.sendUDPWrite(this, 0x03, 0x08, [ambientModeType], false, callback);
};

/**
 * 
 * @param {*} ambientColor 3 byte RGB array
 */
Light.prototype.setAmbientColor = function (ambientColor, callback) {
    if (ambientColor !== undefined && !Array.isArray(ambientColor)) {
        throw new RangeError('light, setAmbientColor method expects ambientColor to be an array');
    } else if (ambientColor.length != 3) {
        throw new RangeError('light, setAmbientColor method expects ambientColor to be an array of length 3');
    }

    this.ambientColor = ambientColor;
    console.log(`light, setAmbientColor ${ambientColor}`);
    utils.sendUDPWrite(this, 0x03, 0x05, [ambientColor], false, callback);
};

/**
 * 
 * @param {*} ambientShow 
 * 0 random color
 * 1 fireside
 * 2 twinkle
 * ...
 */
Light.prototype.setAmbientShow = function (ambientShow) {
    if (ambientShow !== undefined && typeof ambientShow !== 'number') {
        throw new RangeError('light, setAmbientShow method expects ambientShow to be a number');
    } else if (hdmiInput < 0 || ambientShow > 8) {
        throw new RangeError('light, setAmbientShow method expects ambientShow to be in range 0-8');
    }

    this.ambientShow = ambientShow;
    console.log(`light, setAmbientShow ${ambientShow}`);
    utils.sendUDPWrite(this, 0x03, 0x0D, [ambientShow], false, callback);
};

/**
 * The active HDMI port that DreamScreen is displaying
 * @param {*} hdmiInput 1 byte, range 0-2
 * value 0: HDMI 1
 * value 1: HDMI 2
 * value 2: HDMI 3
 */
Light.prototype.setHdmiInput = function (hdmiInput) {
    if (hdmiInput !== undefined && typeof hdmiInput !== 'number') {
        throw new RangeError('light, setHdmiInput method expects hdmiInput to be a number');
    } else if (hdmiInput < 0 || hdmiInput > 2) {
        throw new RangeError('light, setHdmiInput method expects hdmiInput to be in range 0-2');
    }

    this.hdmiInput = hdmiInput;
    console.log(`light, setHdmiInput ${hdmiInput}`);
    utils.sendUDPWrite(this, 0x03, 0x20, [hdmiInput], false, callback);
};

exports.Light = Light;