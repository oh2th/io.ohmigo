'use strict';

const axios = require('axios').default;

module.exports = class ohmOnWifi {

  /**
   * @description Get device info
   *
   * @returns {Object} Device info: deviceName, deviceID, deviceIP, firmware, uptime, temp, rout
   */
  async getInfo() {
    try {
      const response = await axios.get(`${this.protocol}://${this.host}/info`);
      return Promise.resolve(response.data);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * @description Get device configuration
   *
   * @returns {Object} Device config: device_name, min_temp, max_temp
   */
  async getConfig() {
    try {
      const config = await axios.get(`${this.protocol}://${this.host}/getconfig`);
      return Promise.resolve(config.data);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * @description Get supported sensor types
   *
   */
  async getSensorTypes() {
    try {
      const config = await axios.get(`${this.protocol}://${this.host}/getconfig`);
      return Promise.resolve(config.data.types);
    } catch (error) {
      return Promise.reject(error);
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
      const response = await axios.get(`${this.protocol}://${this.host}/setconfig/?device_name=${device_name}`);
      return Promise.resolve(response.data);
    } catch (error) {
      return Promise.reject(error);
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
      const response = await axios.get(`${this.protocol}://${this.host}/setconfig/?min_temp=${min_temp}`);
      return Promise.resolve(response.data);
    } catch (error) {
      return Promise.reject(error);
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
      const response = await axios.get(`${this.protocol}://${this.host}/setconfig/?max_temp=${max_temp}`);
      return Promise.resolve(response.data);
    } catch (error) {
      return Promise.reject(error);
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
      const response = await axios.get(`${this.protocol}://${this.host}/AT/?R=${r}`);
      response.data.ack = String(response.data.ack).replace('\r\n', '');
      if (response.data.ack === 'ok') {
        return Promise.resolve(response.data);
      }
      return Promise.reject(response.data.ack);
    } catch (error) {
      return Promise.reject(error);
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
    let request = `${this.protocol}://${this.host}/AT/?T=${t}`;
    if (type !== null) request += `&TYPE=${type}`;
    try {
      const response = await axios.get(request);
      response.data.ack = String(response.data.ack).replace('\r\n', '');
      if (response.data.ack === 'ok') {
        return Promise.resolve(response.data);
      }
      return Promise.reject(response.data.ack);
    } catch (error) {
      return Promise.reject(error);
    }
  }

};
