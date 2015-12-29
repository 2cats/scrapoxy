'use strict';

const _ = require('lodash'),
    Promise = require('bluebird'),
    API = require('./api'),
    InstanceModel = require('../../proxies/manager/instance.model'),
    winston = require('winston');


module.exports = class ProviderDigitalOcean {
    constructor(config, instancePort) {
        if (!config || !instancePort) {
            throw new Error('[ProviderDigitalOcean] should be instanced with config and instancePort');
        }

        this._config = config;
        this._instancePort = instancePort;

        this.name = 'digitalocean';

        this._imagePromise = void 0;
        this._sshKeyPromise = void 0;

        this._api = new API(this._config.token);
    }


    static get ST_NEW() {
        return 'new';
    }

    static get ST_ACTIVE() {
        return 'active';
    }

    static get ST_OFF() {
        return 'off';
    }

    static get ST_ARCHIVE() {
        return 'archive';
    }


    get models() {
        const self = this;

        return self._api.getAllDroplets()
            .then(summarizeInfo)
            .then(excludeArchive)
            .then(excludeOutscope)
            .then(convertToModel);


        ////////////


        function summarizeInfo(droplets) {
            return _.map(droplets, (droplet) => ({
                id: droplet.id,
                status: droplet.status,
                ip: droplet.networks.v4[0].ip_address,
                name: droplet.name,
            }));
        }

        function excludeArchive(droplets) {
            return _.filter(droplets, (droplet) => droplet.status !== ProviderDigitalOcean.ST_ARCHIVE);
        }

        function excludeOutscope(droplets) {
            return _.filter(droplets,
                (droplet) => droplet.name && droplet.name.indexOf(self._config.name) === 0
            );
        }

        function convertToModel(droplets) {
            return _.map(droplets, (droplet) => new InstanceModel(
                droplet.id,
                self.name,
                convertStatus(droplet.status),
                buildAddress(droplet.ip),
                droplet
            ));


            ////////////

            function buildAddress(ip) {
                if (!ip) {
                    return;
                }

                return {
                    hostname: ip,
                    port: self._instancePort,
                };
            }

            function convertStatus(status) {
                switch (status) {
                    case ProviderDigitalOcean.ST_NEW:
                    {
                        return InstanceModel.STARTING;
                    }
                    case ProviderDigitalOcean.ST_ACTIVE:
                    {
                        return InstanceModel.STARTED;
                    }
                    case ProviderDigitalOcean.ST_OFF:
                    {
                        return InstanceModel.STOPPED;
                    }
                    default:
                    {
                        winston.error('[ProviderDigitalOcean] Unknown status: ', status);

                        return InstanceModel.ERROR;
                    }
                }
            }
        }
    }

    createInstances(count) {
        const self = this;

        winston.debug('[ProviderDigitalOcean] createInstances: count=%d', count);

        return this._api.getAllDroplets()
            .then((droplets) => {
                const actualCount = _(droplets)
                    .filter((droplet) => droplet.status !== ProviderDigitalOcean.ST_ARCHIVE)
                    .size();

                winston.debug('[ProviderDigitalOcean] createInstances: actualCount=%d', actualCount);

                if (this._config.maxRunningInstances && actualCount + count > this._config.maxRunningInstances) {
                    throw new Error(
                        `[ProviderDigitalOcean] createInstances: Cannot start instances (limit reach): ${actualCount} + ${count} > ${this._config.maxRunningInstances}`
                    );
                }

                return init()
                    .spread((image, sshKey) => createInstances(count, image.id, sshKey.id));
            });


        ////////////

        function init() {
            // Get image id
            if (!self._imagePromise) {
                self._imagePromise = getImageByName(self._config.imageName);
            }

            // Get ssh key id
            if (!self._sshKeyPromise) {
                self._sshKeyPromise = getSSHkeyByName(self._config.sshKeyName);
            }

            return Promise.all([
                self._imagePromise,
                self._sshKeyPromise,
            ]);


            ////////////

            function getImageByName(name) {
                return self._api.getAllImages(true)
                    .then((images) => {
                        const image = _.findWhere(images, {name});
                        if (!image) {
                            throw new Error(`Cannot find image by name '${name}'`);
                        }

                        return image;
                    });
            }

            function getSSHkeyByName(name) {
                return self._api.getAllSSHkeys()
                    .then((sshKeys) => {
                        const sshKey = _.findWhere(sshKeys, {name});
                        if (!sshKey) {
                            throw new Error(`Cannot find ssh_key by name '${name}'`);
                        }

                        return sshKey;
                    });
            }

        }

        function createInstances(countOfDroplets, imageId, sshKeyId) {
            const names = Array(countOfDroplets);
            _.fill(names, self._config.name);

            const createOptions = {
                names,
                region: self._config.region,
                size: self._config.size,
                image: imageId,
                ssh_keys: [sshKeyId],
            };

            return self._api.createDroplet(createOptions);
        }
    }


    startInstance(model) {
        winston.debug('[ProviderDigitalOcean] startInstance: model=', model.toString());

        return this._api.powerOnDroplet(model.providerOpts.id);
    }


    removeInstance(model) {
        winston.debug('[ProviderDigitalOcean] removeInstance: model=', model.toString());

        return this._api.removeDroplet(model.providerOpts.id);
    }

    removeInstances(models) {
        winston.debug('[ProviderDigitalOcean] removeInstances: models=',
            _.map(models, (model) => model.toString())
        );

        if (models.length <= 0) {
            return;
        }

        return Promise.map(models, (model) => this._api.removeDroplet(model.providerOpts.id));
    }
};
