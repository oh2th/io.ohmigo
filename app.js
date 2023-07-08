'use strict';

const Homey = require('homey');
const { Log } = require('homey-log');

module.exports = class OhmigoApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.myAppIdVersion = `${this.homey.manifest.id}/${this.homey.manifest.version}`;
    this.homeyLog = new Log({ homey: this.homey });
    this.log(`${this.myAppIdVersion} - onInit - starting...`);
  }

};
