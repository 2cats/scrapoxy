var Promise = require('bluebird'),
    request = require('request');

module.exports = TestProxy;


////////////

function TestProxy(proxyUrl) {
    this._proxyUrl = proxyUrl;

    this._count = {};
}


TestProxy.prototype.request = function requestFn(callback) {
    var self = this;

    var opts = {
        url: 'http://api.ipify.org',
        proxy: self._proxyUrl,
    };

    return new Promise(function(resolve, reject) {
        request(opts, function (err, response, body) {
            if (err) {
                return reject(err);
            }

            if (response.statusCode !== 200) {
                return reject(response.status + ': ' + body);
            }

            var countIP = self._count[body] || 0;
            self._count[body] = countIP + 1;

            resolve(null);
        });
    });
};


TestProxy.prototype.getCount = function getCountFn() {
    return this._count;
};
