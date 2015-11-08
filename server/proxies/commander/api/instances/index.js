'use strict';

var express = require('express');


module.exports = createRouter;


////////////

function createRouter(manager) {
    var router = express.Router();

    router.get('/', getInstances);
    router.post('/stop', deleteInstance);

    return router;


    ////////////

    function getInstances(req, res) {
        var stats = manager.getInstancesStats();

        res.status(200).send(stats);
    }

    function deleteInstance(req, res) {
        var name = req.body['name'];
        if (!name || name.length <= 0) {
            return res.status(500).send('Name not found');
        }

        var promise = manager.deleteInstance(name);
        if (!promise) {
            return res.status(404).send('Proxy ' + name + ' not found');
        }

        promise
            .then(function() {
                var payload = {
                    alive: manager.getAliveInstances().length,
                };

                res.status(200).send(payload);
            })
            .catch(function(err) {
                res.status(500).send(err.toString());
            });
    }


}