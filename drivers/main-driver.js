'use strict';

const Homey = require('homey');
const OhmOnWifiAPI = require('../lib/ohmonwifi');

module.exports = class mainDriver extends Homey.Driver {

  onInit() {
    this.log('Driver init', this.id);
  }

  async onPair(session) {
    let deviceArray = {};

    session.setHandler('list_devices', async () => {
      try {
        this.log('mDNS discovery');

        const discoveryStrategy = this.getDiscoveryStrategy();
        const discoveryResults = discoveryStrategy.getDiscoveryResults();
        const numResults = Object.keys(discoveryResults).length;
        this.log(`mDNS ${numResults} results.`);

        if (numResults > 0) {
          this.log(`mDNS discovered: ${JSON.stringify(discoveryResults)}`);
          const devices = Object.values(discoveryResults).map((discoveryResult) => {
            if (discoveryResult.txt.devicename === discoveryResult.txt.devicetype) {
              discoveryResult.txt.devicename = `${discoveryResult.txt.devicename} ${discoveryResult.txt.deviceid.slice(-4)}`;
            }
            return {
              name: discoveryResult.txt.devicename,
              data: {
                id: discoveryResult.id,
              },
              settings: {
                address: discoveryResult.address,
                serial: discoveryResult.txt.deviceid,
                firmware: discoveryResult.txt.firmware,
              },
              store: {},
            };
          });
          return devices;
        }
        session.showView('select_pairing');
        return [];
      } catch (error) {
        return Promise.reject(error);
      }
    });

    session.setHandler('manual_pairing', async (data) => {
      const api = new OhmOnWifiAPI();
      api.protocol = 'http';
      api.host = data.address;
      const initialInfo = await api.getInfo();
      console.log(initialInfo);
      try {
        deviceArray = {
          name: initialInfo.deviceName,
          data: {
            id: initialInfo.deviceID,
          },
          settings: {
            address: initialInfo.deviceIP,
            serial: initialInfo.deviceID,
            firmware: initialInfo.firmware,
          },
          store: {},
        };
        return Promise.resolve(deviceArray);
      } catch (error) {
        return Promise.reject(error);
      }
    });

    session.setHandler('add_device', async (data) => {
      try {
        return Promise.resolve(deviceArray);
      } catch (error) {
        return Promise.reject(error);
      }
    });
  }

};
