const path = require('path');
const express = require('express');
const WebSocketServer = require('ws').Server;
const {setLogLevel, logExpression} = require('@cisl/zepto-logger');
const {createServer} = require('http');
const uuidv4 = require('uuid/v4');
const {postToService} = require('./utils');

let myPort = 7040;
let logLevel = 1;
process.argv.forEach((val, index, array) => {
  if (val === '-port') {
    myPort = parseInt(array[index + 1]);
  }
  if (val === '-level') {
    logLevel = array[index + 1];
    logExpression('Setting log level to ' + logLevel, 1);
  }
});
setLogLevel(logLevel);

const app = express();
app.set('port', myPort);
app.set('view engine', 'ejs');
app.set('json spaces', 2);
// We need to expressly set this for when we package the human-ui
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'static')));

const httpServer = createServer(app);
const wsServer = new WebSocketServer({server: httpServer});

const sockets = {};
let humanUtilityFunction;

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/receiveMessage', (req, res) => {
  logExpression('Inside /receiveMessage', 2);
  logExpression(req.body, 2);
  if (req.body.bid && req.body.role === 'seller') {
    for (let socket in sockets) {
      sockets[socket].send(JSON.stringify({
        type: 'updateBid',
        payload: {
          bid: req.body.bid,
          seller: req.body.speaker
        }
      }));
    }
  }
  res.json({'status': 'acknowledged'});
});

app.post('/setUtility', (req, res) => {
  logExpression('Inside /setUtility', 2);
  logExpression(req.body, 2);
  humanUtilityFunction = req.body;
  for (let socket in sockets) {
    sockets[socket].send(JSON.stringify({type: 'setUtility', payload: req.body}));
  }
  res.json({'status': 'acknowledged'});
});

app.post('/receiveRejection', (req, res) => {
  logExpression('Inside /receiveRejection', 2);
  logExpression(req.body, 2);
  res.json({'status': 'acknowledged'})
});

app.post('/startRound', (req, res) => {
  logExpression('Inside /startRound', 2);
  logExpression(req.body, 2);
  for (let socket in sockets) {
    sockets[socket].send(JSON.stringify({type: 'startRound', payload: req.body}));
  }
  res.json({'status': 'acknowledged'});
})

app.post('/endRound', (req, res) => {
  logExpression('Inside /endRound', 2);
  logExpression(req.body, 2);
  res.json({'status': 'acknowledged'});
});

app.post('/sendRoundMetadata', (req, res) => {
  logExpression('Inside /sendRoundMetadata', 2);
  logExpression(req.body, 2);
  for (let socket in sockets) {
    sockets[socket].send(JSON.stringify({type: 'setRoundMetadata', payload: req.body}));
  }
  res.json({'status': 'acknowledged'});
});

app.post('/receiveRoundTotals', (req, res) => {
  logExpression('Inside /receiveRoundTotals', 2);
  logExpression(req.body, 2);
  res.json({'status': 'acknowledged'});
});

function checkAllocation(data, socket) {
  let promises = [];
  promises.push(postToService('utility-generator', '/checkAllocation', data));
  const payload = {
    currencyUnit: "USD",
    utility: humanUtilityFunction.utility,
    bundle: {
      products: data.allocation.products
    }
  };
  promises.push(postToService('utility-generator', '/calculateUtility/buyer', payload));

  Promise.all(promises).then((results) => {
    socket.send(JSON.stringify({type: 'checkAllocationReturn', payload: {allocation: results[0], utility: results[1]}}));
  });
}

function saveAllocation(data, socket) {
  postToService('utility-generator', '/checkAllocation', data).then((result) => {
    if (result.sufficient) {
      const payload = {
        currencyUnit: "USD",
        utility: humanUtilityFunction.utility,
        bundle: {
          products: data.allocation.products
        }
      };

      console.log(JSON.stringify(payload, null, 2));

      postToService('utility-generator', '/calculateUtility/human', payload).then((result) => {
        socket.send(JSON.stringify({
          type: 'saveAllocationResult',
          accepted: true,
          value: result.value,
          data: result
        }));
      });

      postToService('environment-orchestrator', '/receiveHumanAllocation', payload.bundle.products).then((result) => {
        logExpression(result, 1);
      });
    }
    else {
      socket.send(JSON.stringify({type: 'saveAllocationResult', accepted: false, data: body}));
    }
  });
}

wsServer.on('connection', (socket) => {
  if (!socket.uuid) {
    socket.uuid = uuidv4();
  }
  sockets[socket.uuid] = socket;

  socket.on('message', (data) => {
    data = JSON.parse(data);
    switch (data.type) {
      case 'checkAllocation':
        checkAllocation(data.payload, socket);
        break;
      case 'saveAllocation':
        saveAllocation(data.payload, socket);
        break;
      case 'updateOffer':
        break;
      case 'acceptOffer':
        acceptOffer(data.data);
        break;
      default:
        break;
    }
  });

  socket.on('close', () => {
    delete sockets[socket.uuid];
  });
});


httpServer.listen(app.get('port'), () => {
  logExpression(`Express server listening on port ${app.get('port')}`, 1);
});
