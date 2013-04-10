/**
 * Node.js transfer module for Geierlein.
 *
 * @author Stefan Siegl
 *
 * Copyright (c) 2012, 2013 Stefan Siegl <stesie@brokenpipe.de>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

(function() {

var ipAddrs = [
    '62.157.211.58',
    '62.157.211.59',
    '193.109.238.26',
    '193.109.238.27'
];

function getRandomIpAddress() {
    var i = Math.floor(Math.random() * ipAddrs.length);
    return ipAddrs[i];
}

var geierlein = {};

if(typeof(window) !== 'undefined') {
    geierlein = window.geierlein = window.geierlein || {};

    geierlein.transferDirect = function(encData, callback) {
        var targetUrl = 'http://' + getRandomIpAddress() +
            '/Elster2/EMS/ElsterAnmeldung';
        _doXhr(targetUrl, encData, callback);
    };

    geierlein.transferReverseProxy = function(encData, callback) {
        _doXhr('proxy/Elster2/EMS/ElsterAnmeldung', encData, callback);
    };

    geierlein.transfer = geierlein.transferReverseProxy;

    function _doXhr(targetUrl, encData, callback) {
        $.ajax(targetUrl, {
            type: 'POST',
            data: encData,
            dataType: 'text',   // jQuery should not process the result itself
            contentType: 'text/xml',
            error: function(xhr, status, err) {
                callback(false);
            },
            success: function(data, status, xhr) {
                /* Rewrite encoding from ISO8859-1 (as specified in the XML)
                   to UTF-8, since the XHR already converted it for us. */
                callback(geierlein.util.rewriteEncoding(data, 'UTF-8'));
            }
        });
    };
}
// define node.js module
else if(typeof(module) !== 'undefined' && module.exports) {
    geierlein = {
        util: require('./util.js')
    };

    var Iconv = require('iconv').Iconv;

    module.exports = function(encData, callback) {
        var http = require('http');
        var ipaddr = getRandomIpAddress();
        var post_options = {
            host: ipaddr,
            port: '80',
            path: '/Elster2/EMS/ElsterAnmeldung',
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml',
                'Content-Length': encData.length
            }
        };

        var post_request = http.request(post_options, function(res) {
            if(res.statusCode != 200) {
                callback(false);
                return;
            }

            var buf = new Buffer(parseInt(res.headers['content-length'], 10));
            var ptr = 0;

            /* Receive chunks and add them to the Buffer object. */
            res.on('data', function(chunk) {
                chunk.copy(buf, ptr);
                ptr += chunk.length;
            });

            /* Convert buffer from ISO8859-1 to UTF-8 to conveniently
               handle it in Node.js. */
            res.on('end', function() {
                var iconv = new Iconv('ISO8859-1', 'UTF-8');
                var resData = iconv.convert(buf).toString('utf8');
                callback(geierlein.util.rewriteEncoding(resData, 'UTF-8'));
            });
        });

        post_request.write(encData);
        post_request.end();
    };
}

})();