'use strict';


var _ = require('lodash'),
    EventEmitter = require('events').EventEmitter,
    InstanceModel = require('./instance.model'),
    pinger = require('../../common/pinger'),
    util = require('util'),
    useragent = require('./useragent'),
    winston = require('winston');



module.exports = Instance;


////////////

function Instance(manager, cloud, config) {
    var self = this;

    EventEmitter.call(self);

    self._manager = manager;
    self._cloud = cloud;
    self._config = config;

    self._model = null;
    self._alive = false;


    // Register event
    self.on('status:changed', function(newstatus) {
        // Alive
        if (newstatus === InstanceModel.STARTED) {
            // Start monitor
            winston.debug('[Instance/%s] checkAlive every %d secs', self._model.getName(), self._config.checkAliveDelay);
            self._checkAliveTimeout = setInterval(checkAlive, self._config.checkAliveDelay);

            var delay = Math.floor(self._config.autorestart.minDelay +  Math.random() * (self._config.autorestart.maxDelay - self._config.autorestart.minDelay));
            winston.debug('[Instance/%s] autorestart in %d secs', self._model.getName(), delay);
            self._checkRestartTimeout = setTimeout(autorestart, delay);

            // Set useragent
            self._useragent = useragent.generate();
        }
        else {
            // Stop monitor
            if (self._checkAliveTimeout) {
                clearInterval(self._checkAliveTimeout);
                self._checkAliveTimeout = void 0;
            }

            if (self._checkRestartTimeout) {
                clearTimeout(self._checkRestartTimeout);
                self._checkRestartTimeout = void 0;
            }

            // Unset useragent
            self._useragent = void 0;

            // Set alive status
            changeAlive(false);
        }

        // Error
        if (newstatus === InstanceModel.ERROR) {
            self._cloud.stopInstance(self._model)
                .catch(function(err) {
                    winston.error('[Instance/%s] error: ', self._model.getName(), err);
                });
        }

        // Restart if stopped
        if (newstatus === InstanceModel.STOPPED) {
            self._cloud.startInstance(self._model)
                .catch(function(err) {
                    winston.error('[Instance/%s] error: ', self._model.getName(), err);
                });
        }
    });

    // Crash
    self.on('alive:changed', function(alive) {
        if (alive) {
            if (self._checkStopIfCrashedTimeout) {
                clearTimeout(self._checkStopIfCrashedTimeout);
                self._checkStopIfCrashedTimeout = void 0;
            }
        }
        else {
            self._checkStopIfCrashedTimeout = setTimeout(stopIfCrashed, self._config.stopIfCrashedDelay);
        }
    });


    ////////////

    function checkAlive() {
        pinger.ping(self._model.getAddress())
            .then(function() {
                changeAlive(true);
            })
            .catch(function() {
                changeAlive(false);
            });
    }

    function changeAlive(alive) {
        winston.debug('[Instance/%s] changeAlive: %s => %s', self._model.getName(), self._alive, alive);

        if (self._alive !== alive) {
            self._alive = alive;

            self.emit('alive:changed', alive);
        }
    }

    function autorestart() {
        winston.debug('[Instance/%s] autorestart', self._model.getName());

        if (self._model.hasStatus(InstanceModel.STARTED)) {
            if (self._manager.getAliveInstances().length > 1) {
                winston.debug('[Instance/%s] autorestart => cancelled (only 1 instance)', self._model.getName());

                self.stop()
                    .catch(function(err) {
                        winston.error('[Instance/%s] error: ', self._model.getName(), err);
                    });
            }
            else {
                var delay = Math.floor(self._config.autorestart.minDelay +  Math.random() * (self._config.autorestart.maxDelay - self._config.autorestart.minDelay));

                winston.debug('[Instance/%s] autorestarting in %d secs...', self._model.getName(), delay);

                self._checkRestartTimeout = setTimeout(autorestart, delay);
            }
        }
    }

    function stopIfCrashed() {
        winston.debug('[Instance/%s] stopIfCrashed', self._model.getName());

        if (self._model.hasStatus(InstanceModel.STARTED)) {
            self.stop()
                .catch(function(err) {
                    winston.error('[Instance/%s] error: ', self._model.getName(), err);
                });
        }
    }
}
util.inherits(Instance, EventEmitter);


Instance.prototype.getName = function getNameFn() {
    return this._model.getName();
};


Instance.prototype.getModel = function getModelFn() {
    return this._model;
};


Instance.prototype.getProxyParameters = function getProxyParametersFn() {
    var address = this._model.getAddress();

    return {
        'hostname': address.hostname,
        'port': address.port,
        'username': this._config.username,
        'password': this._config.password,
    };
};


Instance.prototype.setModel = function setModelFn(model) {
    var oldstatus = this._model ? this._model.getStatus() : void 0;

    this._model = model;

    if (!this._model.hasStatus(oldstatus)) {
        this.emit('status:changed', this._model.getStatus(), oldstatus);
    }
};


Instance.prototype.removedFromManager = function removedFromManagerFn() {
    this._model.setStatus(InstanceModel.REMOVED);

    this.emit('status:changed', InstanceModel.REMOVED, this._model.getStatus());
};


Instance.prototype.stop = function stopFn() {
    return this._cloud.stopInstance(this._model);
};


Instance.prototype.getStats = function getStatsFn() {
    return _.assign(this._model.getStats(), {
        alive: this._alive,
        useragent: this._useragent,
    });
};


Instance.prototype.updateHeaders = function updateHeadersFn(req) {
    req.headers['user-agent'] = this._useragent;

    delete req.headers['x-cache-proxyname'];
};


Instance.prototype.toString = function toStringFn() {
    return this._model.toString();
};
