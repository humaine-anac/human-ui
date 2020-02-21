const {logExpression} = require('@cisl/zepto-logger');
const appSettings = require('./appSettings');
const fetch = require('node-fetch');

function constructUrl(parts) {
  let url = `${parts.protocol ? parts.protocol : 'http'}://${parts.host ? parts.host : 'localhost'}`;
  if (parts.port) {
    url += `:${parts.port}`;
  }
  return url;
}

module.exports.postToService = async (service, route, data) => {
  logExpression(`post to ${service} on ${route}`, 2);
  logExpression(data, 2);
  if (!appSettings.serviceMap[service]) {
    throw new Error(`Unrecognized service: ${service}`)
  }

  const service_url = constructUrl(appSettings.serviceMap[service]);

  if (route[0] !== '/') {
    route = '/' + route;
  }

  const res = await fetch(`${service_url}${route}`, {
    method: 'post',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  try {
    return await res.json();
  }
  catch (exc) {
    logExpression('Could not parse response', 2);
    logExpression(await res.text(), 2);
    throw exc;
  }
};
