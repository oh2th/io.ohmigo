'use strict';

const { Device } = require('homey');
const {
  sleep, checkCapabilities, setCapabilityValuesInterval, clearIntervals,
} = require('../lib/helpers');
const OhmOnWifiAPI = require('../lib/ohmonwifi');

module.exports = class mainDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log(`${this.getName()} - onInit`);
    this.setUnavailable(`Initializing ${this.getName()}`);

    const settings = this.getSettings();
    this.api = new OhmOnWifiAPI();
    this.api.protocol = 'http';
    this.api.host = settings.address;
    this.interval = settings.interval * 1000;
    this.uptimeUpdate = true; // Update uptime only every second interval

    checkCapabilities(this);
    await this.setCapabilityOptions('target_temperature', { min: settings.min_temp, max: settings.max_temp });
    await this.setCapabilityListeners();
    await this.setCapabilityValues(true);
    await this.setFlowListeners();
    await sleep(this.interval);
    setCapabilityValuesInterval(this, this.interval);

    this.log(`${this.getName()} - onInit done`);
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log(`${this.getName()} - onAdded`);
    try {
      const deviceInfo = await this.api.getInfo();
      if (deviceInfo) {
        this.log(`${this.getName()} - onAdded - device => `, deviceInfo);
        await this.setSettings({ type: deviceInfo.type });
        await this.setSettings({ firmware: deviceInfo.firmware });
      }
    } catch (error) {
      this.log(`${this.getName()} - onAdded - error => `, error);
      this.setUnavailable(`Device offline - ${error}`);
    }
    this.log(`${this.getName()} - onAdded done`);
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log(`${this.getName()} - onSettings: ${JSON.stringify(changedKeys)}`);
    if (changedKeys.includes('address')) {
      this.api.host = newSettings.address;
    }
    if (changedKeys.includes('interval')) {
      await clearIntervals(this);
      setCapabilityValuesInterval(this, newSettings.interval * 1000);
    }
    if (changedKeys.includes('type') && newSettings.type !== '99') {
      this.log(`${this.getName()} - onSettings - type: ${newSettings.type}`);
      // Call API to set sensor type together with current temperature
      try {
        this.api.setTemperature(this.getCapabilityValue('target_temperature'), newSettings.type);
      } catch (error) {
        this.log(`${this.getName()} - onSettings - error setting sensor type => `, error);
      }
    }
    if (changedKeys.includes('min_temp')) {
      this.log(`${this.getName()} - onSettings - min_temp: ${newSettings.min_temp}`);
      // Call API to set temperature range
      try {
        this.api.setConfigMinTemp(newSettings.min_temp);
      } catch (error) {
        this.log(`${this.getName()} - onSettings - error setting min_temp => `, error);
      }
    }
    if (changedKeys.includes('max_temp')) {
      this.log(`${this.getName()} - onSettings - max_temp: ${newSettings.max_temp}`);
      // Call API to set temperature range
      try {
        this.api.setConfigMaxTemp(newSettings.max_temp);
      } catch (error) {
        this.log(`${this.getName()} - onSettings - error setting max_temp => `, error);
      }
    }
    this.log(`${this.getName()} - onSettings done`);
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log(`${this.getName()} - onRenamed`);
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log(`${this.getName()} - onDeleted`);
    clearIntervals(this);
  }

  /**
   * Return a truthy value here, if the discovery result matches your device.
   */
  onDiscoveryResult(discoveryResult) {
    this.log(`${this.getName()} - discovered - result: ${discoveryResult.id}.`);
    return discoveryResult.id === this.getData().id;
  }

  /**
   * Method is called once, when the device has been found (onDiscoveryResult returned true)
   */
  async onDiscoveryAvailable(discoveryResult) {
    this.log(`${this.getName()} - available - result: ${discoveryResult.address}.`);
    this.log(`${this.getName()} - type: ${discoveryResult.txt.devicetype}.`);
    await this.setAvailable();
  }

  /**
   * Method is called on the IP address changes.
   * Store the new address in settings for.
   */
  onDiscoveryAddressChanged(discoveryResult) {
    this.log(`${this.getName()} - changed - result: ${discoveryResult.address}.`);
    this.log(`${this.getName()} - type: ${discoveryResult.txt.devicetype}.`);
    // Update your connection details here, reconnect when the device is offline
    this.api.host = discoveryResult.address;
    this.setSettings({ address: this.api.host });
    this.setAvailable();
  }

  /**
   * Method is called after connection has been lost.
   * FIXME: Not quite sure what this method is for.
   */
  onDiscoveryLastSeenChanged(discoveryResult) {
    this.log(`${this.getName()} - offline - result: ${discoveryResult.address}.`);
    this.setUnavailable('Discovery device offline.');
  }

  /**
   * Capability Listeners for UI actions
   */
  async setCapabilityListeners() {
    this.registerCapabilityListener('target_temperature', this.onCapability_TARGET_TEMPERATURE.bind(this));
  }

  /**
   * Capability Listeners for Flow actions
   */
  async setFlowListeners() {
    const action_TARGET_TEMPERATURE = this.homey.flow.getActionCard('set_target_temperature');
    action_TARGET_TEMPERATURE.registerRunListener(async (args, state) => {
      const getCapabilityOptions = this.getCapabilityOptions('target_temperature');
      if (args.temperature < getCapabilityOptions.min || args.temperature > getCapabilityOptions.max) {
        return Promise.reject(new Error(`Temperature must be between ${getCapabilityOptions.min} and ${getCapabilityOptions.max}`));
      }
      await args.device.onCapability_TARGET_TEMPERATURE(args.temperature);
    });
  }

  /**
   * @description onCapability TARGET_TEMPERATURE
   * @param {number} value
   */
  async onCapability_TARGET_TEMPERATURE(value) {
    this.log(`${this.getName()} - onCapability_TARGET_TEMPERATURE: ${value}`);
    try {
      const settings = this.getSettings();
      let sensorType = settings.type;
      if (sensorType === '99') sensorType = null;
      this.api.setTemperature(value, sensorType);
    } catch (error) {
      this.log(`${this.getName()} - onCapability_TARGET_TEMPERATURE - error setting temperature => `, error);
    }
  }

  /**
   * Main info and config update from device poll.
   */
  async setCapabilityValues(check = false) {
    try {
      const deviceInfo = await this.api.getInfo();
      // Check if there was a connection error and throw the error message for catch.
      if (deviceInfo.errno !== undefined) {
        const error = `${deviceInfo.code} ${deviceInfo.address}:${deviceInfo.port}}`;
        throw new Error(error);
      }
      if (deviceInfo.uptime === undefined) {
        const error = 'Couldn\'t get uptime from device, check device.';
        throw new Error(error);
      }
      const deviceConfig = await this.api.getConfig();
      this.log(`deviceInfo: ${typeof deviceInfo} ${JSON.stringify(deviceInfo)}`);
      this.log(`deviceConfig: ${typeof deviceConfig} ${JSON.stringify(deviceConfig)}`);
      if (deviceInfo && deviceConfig) {
        if (this.getAvailable() === false) this.setAvailable();
        const device = { ...deviceInfo, ...deviceConfig };
        const settings = this.getSettings();
        // this.log(`${this.getName()} - setCapabilityValues - device => `, deviceInfo);

        // Update settable temperature range and current temperature setting
        this.updateCapabilityOptions('target_temperature', { min: Number(device.min_temp), max: Number(device.max_temp) });
        this.setValue('target_temperature', Number(device.temperature), check);
        this.setValue('output_temperature', Number(device.temperature), check);
        this.setValue('output_resistance', Number(device.resistance), check);
        this.setValue('measure_type', `${settings.type} - ${device.type_name}`, check);

        // Update uptime information
        if (this.uptimeUpdate) {
          this.setValue('measure_uptime', device.uptime, check);
          this.uptimeUpdate = false;
        } else {
          this.uptimeUpdate = true;
        }

        this.log(`deviceType: OLD ${typeof settings.type} ${settings.type} NEW ${typeof device.type} ${device.type}`);
        // Update firmware and sensortype to settings if needed
        if (device.type !== settings.type) await this.setSettings({ type: device.type });
        if (device.firmware !== settings.firmware) await this.setSettings({ firmware: device.firmware });
      }
    } catch (error) {
      this.log(`${this.getName()} - setCapabilityValues - offline: ${error}`);
      this.setUnavailable(`Device offline - ${error}`);
    }
  }

  /**
   * Set capability options when needed.
   * @param {string} key
   * @param {object} newOptions
   */
  async updateCapabilityOptions(key, newOptions) {
    if (this.hasCapability(key)) {
      try {
        const oldOptions = this.getCapabilityOptions(key);
        let update = false;
        Object.entries(newOptions).forEach((entry) => {
          const [opt, value] = entry;
          if (oldOptions[opt] !== value && oldOptions[opt] !== undefined) {
            this.log(`${this.getName()} - updateCapabilityOptions - ${key} - oldValue=${oldOptions[opt]}, newValue=${value}`);
            update = true;
          }
        });
        if (update) {
          this.log(`${this.getName()} - updateCapabilityOptions - ${key} - updateOpts => `, newOptions);
          this.setCapabilityOptions(key, newOptions);
        }
      } catch (error) {
        this.log(`${this.getName()} - updateCapabilityOptions - error: ${error}`);
      }
    }
  }

  /**
   * Set capability value and trigger flow cards if needed.
   */
  async setValue(key, value, firstRun = false, delay = 10) {
    if (this.hasCapability(key)) {
      const oldVal = await this.getCapabilityValue(key);

      if (oldVal !== value) {
        this.log(`${this.getName()} - oldValue=${oldVal}, newValue=${value} => ${key}`);
      }

      if (delay) await sleep(delay);

      await this.setCapabilityValue(key, value);

      //
      // Capability triggers
      //

      // Boolean capabilities where id starts with 'is_'.
      // if (typeof value === 'boolean' && key.startsWith('is_') && oldVal !== value && !firstRun) {
      //   const newKey = key.replace(/\./g, '_');
      //   const { triggers } = this.homey.manifest.flow;
      //   const triggerExists = triggers.find((trigger) => trigger.id === `${newKey}_changed`);

      //   if (triggerExists) {
      //     await this.homey.flow
      //       .getDeviceTriggerCard(`${newKey}_changed`)
      //       .trigger(this, { [`${key}`]: value })
      //       .catch(this.error)
      //       .then(this.log(`[Device] ${this.getName()} - setValue ${newKey}_changed - Triggered: "${newKey} | ${value}"`));
      //   }
      // }

      // Number capabilities.
      // if (typeof value === 'number' && key.startsWith('num_') && oldVal !== value && !firstRun) {
      //   const newKey = key.replace(/\./g, '_');
      //   const { triggers } = this.homey.manifest.flow;
      //   const triggerExists = triggers.find((trigger) => trigger.id === `${newKey}_changed`);

      //   if (triggerExists) {
      //     await this.homey.flow
      //       .getDeviceTriggerCard(`${newKey}_changed`)
      //       .trigger(this, { [`${key}`]: value })
      //       .catch(this.error)
      //       .then(this.log(`[Device] ${this.getName()} - setValue ${newKey}_changed - Triggered: "${newKey} | ${value}"`));
      //   }
      // }
    }
  }

};
