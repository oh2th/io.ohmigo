'use strict';

const http = require('http.min');

module.exports = class ohmOnWifi {

  /**
   * @description Get device info
   *
   * @returns {Object} Device info: deviceName, deviceID, deviceIP, firmware, uptime, temp, rout
   */
  async getInfo() {
    try {
      const result = await http({
        uri: `${this.protocol}://${this.host}/info`,
        json: true,
      });
      return result.data;
    } catch (error) {
      return error;
    }
  }

  /**
   * @description Get device configuration
   *
   * @returns {Object} Device config: device_name, min_temp, max_temp
   */
  async getConfig() {
    try {
      const result = await http({
        uri: `${this.protocol}://${this.host}/getconfig`,
        json: true,
      });
      return result.data;
    } catch (error) {
      return error;
    }
  }

  /**
   * @description Get supported sensor types
   *
   */
  async getSensorTypes() {
    try {
      const result = await http({
        uri: `${this.protocol}://${this.host}/getconfig`,
        json: true,
      });
      return result.data.types;
    } catch (error) {
      return error;
    }
  }

  /**
   * @description Set device name
   *
   * @param {String} device_name Device name
   * @returns {Object} result
   */
  async setConfigName(device_name) {
    try {
      const result = await http({
        uri: `${this.protocol}://${this.host}/setconfig/?device_name=${device_name}`,
        json: true,
      });
      return result.data;
    } catch (error) {
      return error;
    }
  }

  /**
   * @description Configure minimum temperature
   *
   * @param {String} min_temp Minimum temperature
   * @returns {Object} result
   */
  async setConfigMinTemp(min_temp) {
    try {
      const result = await http({
        uri: `${this.protocol}://${this.host}/setconfig/?min_temp=${min_temp}`,
        json: true,
      });
      return result.data;
    } catch (error) {
      return error;
    }
  }

  /**
   * @description Configure maximum temperature
   *
   * @param {String} max_temp Maximum temperature
   * @returns {Object} result
   */
  async setConfigMaxTemp(max_temp) {
    try {
      const result = await http({
        uri: `${this.protocol}://${this.host}/setconfig/?max_temp=${max_temp}`,
        json: true,
      });
      return result.data;
    } catch (error) {
      return error;
    }
  }

  /**
   * @description Set Rout to resistance in ohms
   *
   * @param {Number} r Resistance in ohms
   * @returns {Object} result
   */
  async setRoutResistance(r) {
    try {
      const result = await http({
        uri: `${this.protocol}://${this.host}/setconfig/?rout=${r}`,
        json: true,
      });
      result.data.ack = String(result.data.ack).replace('\r\n', '');
      if (result.data.ack === 'ok') {
        return result.data;
      }
      return result.data.ack;
    } catch (error) {
      return error;
    }
  }

  /**
   * @description Set the temperature in °C using default Temperature - resistance table
   *
   * @param {Number} t Temperature in °C using default Temperature - resistance table
   * @param {Number} type Sensor type as Ohmigo TTL (see ohmOnWifi.sensorTypes)
   * @returns {Object} result
   */
  async setTemperature(t, type = null) {
    try {
      let request = `${this.protocol}://${this.host}/AT/?T=${t}`;
      if (type !== null) {
        request += `&TYPE=${type}`;
        await http({
          uri: `${this.protocol}://${this.host}/copydefault/?TYPE=${type}`,
        });
      }
      const result = await http({
        uri: request,
        json: true,
      });
      result.data.ack = String(result.data.ack).replace('\r\n', '');
      if (result.data.ack === 'ok') {
        return result.data;
      }
      return result.data.ack;
    } catch (error) {
      return error;
    }
  }

};
