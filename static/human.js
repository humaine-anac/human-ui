const socket = new WebSocketClient();
const ingredients = ["egg", "flour", "milk", "sugar", "chocolate", "vanilla", "blueberry"];

let roundNumber = 0;
let startingMoney = 30;
const durations = {
  warmUp: 0,
  round: 0,
  post: 0,
}

let interval;

function updateOffer(data) {
  const agent = data.agent;
  document.getElementById(`offer-${agent}-cost`).innerText = data.cost;
  for (const ingredient in data.ingredients) {
    document.getElementById(`offer-${agent}-${ingredient}`).innerText = data.ingredients[ingredient];
  }
}

function acceptOffer(data) {
  const agent = data.agent;
  const moneyElem = document.getElementById('money');
  moneyElem.innerText = parseFloat(moneyElem.innerText) - data.cost;
  document.getElementById(`offer-${agent}-cost`).innerText = 0;
  for (const ingredient in data.ingredients) {
    document.getElementById(`offer-${agent}-${ingredient}`).innerText = 0;

    const elem = document.getElementById(`${ingredient}-have`);
    elem.innerText = parseInt(elem.innerText) + data.ingredients[ingredient];
  }
}

function updateBid(data) {
  const offer = {
    agent: data.seller.toLowerCase(),
    cost: data.bid.price.value,
    ingredients: data.bid.quantity
  };

  console.log(offer);
  console.log(data.bid.type);

  if (data.bid.type === 'SellOffer') {
    updateOffer(offer);
  }
  else if (data.bid.type === 'Accept') {
    acceptOffer(offer);
  }
}

function startTimer(timer) {
  const elem = document.getElementById(timer);
  interval = setInterval(() => {
    const newTime = parseInt(elem.textContent) - 1;
    if (newTime >= 0) {
      elem.textContent = newTime;
    }

    if (newTime <= 0) {
      clearInterval(interval);
      if (timer === 'warmup-time') {
        startTimer('round-time');
      }
      else if (timer === 'round-time') {
        document.getElementById('save-allocation').style.display = 'inline-block';
        startTimer('post-time');
      }
      else if (timer === 'post-time') {
        //document.getElementById('save-allocation').style.display = 'none';
      }
    }
  }, 1000);
}

function setUtility(data) {
  const utility = data.utility;
  for (const food in utility) {
    document.getElementById(`utility-${food}-value`).innerText = utility[food].parameters.unitvalue || utility[food].parameters.unitcost;
    for (const supplement in utility[food].parameters.supplement) {
      const params = utility[food].parameters.supplement[supplement].parameters;
      document.getElementById(`utility-${food}-${supplement}-quantity`).innerText = `${params.minQuantity} - ${params.maxQuantity}`;
      document.getElementById(`utility-${food}-${supplement}-value`).innerText = `${params.minValue} - ${params.maxValue}`;
    }
  }
}

function startRound() {
  if (interval) {
    clearInterval(interval);
  }

  document.getElementById('round-number').textContent = roundNumber;
  document.getElementById('money').textContent = startingMoney;

  document.getElementById('warmup-time').textContent = durations.warmUp;
  document.getElementById('round-time').textContent = durations.round;
  document.getElementById('post-time').textContent = durations.post;

  const ingredients = ['egg', 'flour', 'milk', 'sugar', 'chocolate', 'vanilla', 'blueberry'];
  for (const ingredient of ingredients) {
    document.getElementById(`${ingredient}-required`).textContent = 0;
    document.getElementById(`${ingredient}-have`).textContent = 0;
    document.getElementById(`${ingredient}-need`).textContent = 0;
    document.getElementById(`${ingredient}-need`).classList.remove('sufficient', 'insufficient');
  }

  document.getElementById('save-allocation').style.display = 'none';
  startTimer('warmup-time');
}

function setRoundMetadata(data) {
  roundNumber = data.roundNumber;
  startingMoney = data.humanBudget.value;
  durations.warmUp = parseInt(data.durations.warmUp);
  durations.round = parseInt(data.durations.round);
  durations.post = parseInt(data.durations.post);

  startRound();
}

function updateIngredientsNeeds(data) {
  if (!data.rationale) {
    for (const ingredient of ingredients) {
      document.getElementById(`${ingredient}-required`).textContent = 0;
      const elem = document.getElementById(`${ingredient}-need`);
      elem.classList.remove('insufficient');
      elem.classList.add('sufficient');
      elem.innerText = '0';
    }
    return;
  }

  for (const ingredient of ingredients) {
    const rationale = data.rationale[ingredient];
    document.getElementById(`${ingredient}-required`).textContent = rationale.need;
    const elem = document.getElementById(`${ingredient}-need`);
    if (!rationale) {
      elem.classList.remove('sufficient');
      elem.classList.remove('insufficient');
      continue;
    }
    if (rationale.need > rationale.have) {
      elem.classList.add('insufficient');
      elem.classList.remove('sufficient');
    }
    else {
      elem.classList.remove('insufficient');
      elem.classList.add('sufficient');
    }

    elem.innerText = Math.max(0, rationale.need - rationale.have);
  }
}

document.querySelector('input[name="cakes"]').addEventListener('change', (event) => {
  const value = event.target.value;
  const additives = document.getElementById('cake-additives');
  const old = additives.children.length;
  if (value < old) {
    for (let i = 0; i < (old - value); i++) {
      additives.children[additives.children.length-1].remove();
    }
  }
  else if (value > old) {
    for (let i = (old + 1); i <= value; i++) {
      const elem = document.createElement('tr');
      elem.innerHTML = `
<td colspan="2">
  <h4>Cake ${i} Additives</h4>
  <table>
      <tr>
          <td>Chocolate (oz)</td>
          <td><input type="number" name="cakes-${i}-chocolate" value="0" min="0" /></td>
      </tr>
      <tr>
          <td>Vanilla (tsp)</td>
          <td><input type="number" name="cakes-${i}-vanilla" value="0" min="0" /></td>
      </tr>
  </table>
</td>
    `;
      additives.appendChild(elem);
    }
  }
});

document.querySelector('input[name="pancakes"]').addEventListener('change', (event) => {
  const value = event.target.value;
  const additives = document.getElementById('pancake-additives');
  const old = additives.children.length;
  if (value < old) {
    for (let i = 0; i < (old - value); i++) {
      additives.children[additives.children.length-1].remove();
    }
  }
  else if (value > old) {
    for (let i = (old + 1); i <= value; i++) {
      const elem = document.createElement('tr');
      elem.innerHTML = `
<td colspan="2">
  <h4>Pancake ${i} Additives</h4>
  <table>
    <tr>
      <td>Chocolate (oz)</td>
      <td><input type="number" name="pancakes-${i}-chocolate" value="0" min="0" /></td>
    </tr>
    <tr>
      <td>blueberry (packet)</td>
      <td><input type="number" name="pancakes-${i}-blueberry" value="0" min="0" /></td>
    </tr>
  </table>
</td>
    `;
      additives.appendChild(elem);
    }
  }
});

function constructCalculatePayload() {
  const obj = {
    currencyUnit: "USD",
    allocation: {
      products: {
        cake: {
          unit: "each",
          quantity: 0,
          supplement: []
        },
        pancake: {
          unit: "each",
          quantity: 0,
          supplement: []
        }
      }
    },
    ingredients: {
      egg: 0,
      flour: 0,
      milk: 0,
      sugar: 0,
      chocolate: 0,
      vanilla: 0,
      blueberry: 0
    }
  };

  const cakes = parseInt(document.querySelector('input[name="cakes"]').value);
  obj.allocation.products.cake.quantity = cakes;
  for (let i = 1; i <= cakes; i++) {
    obj.allocation.products.cake.supplement.push({
      chocolate: {
        unit: "ounce",
        quantity: parseInt(document.querySelector(`input[name="cakes-${i}-chocolate"]`).value)
      },
      vanilla: {
        unit: "teaspoon",
        quantity: parseInt(document.querySelector(`input[name="cakes-${i}-vanilla"]`).value)
      }
    });
  }

  const pancakes = parseInt(document.querySelector('input[name="pancakes"]').value);
  obj.allocation.products.pancake.quantity = pancakes;
  for (let i = 1; i <= pancakes; i++) {
    obj.allocation.products.pancake.supplement.push({
      blueberry: {
        unit: "packet",
        quantity: parseInt(document.querySelector(`input[name="pancakes-${i}-blueberry"]`).value)
      },
      chocolate: {
        unit: "ounce",
        quantity: parseInt(document.querySelector(`input[name="pancakes-${i}-chocolate"]`).value)
      }
    });
  }

  for (const type in obj.ingredients) {
    obj.ingredients[type] = parseInt(document.getElementById(`${type}-have`).innerText);
  }

  return obj;
}

document.getElementById('calculate-utility').addEventListener('click', () => {
  socket.send({type: 'checkAllocation', payload: constructCalculatePayload()});
});

document.getElementById('save-allocation').addEventListener('click', () => {
  socket.send({type: 'saveAllocation', payload: constructCalculatePayload()});
});

socket.onmessage = (msg) => {
  console.log(msg);
  switch (msg.type) {
    case 'setUtility':
      setUtility(msg.payload);
      break;
    case 'startRound':
      //startRound(msg.payload);
      break;
    case 'checkAllocationReturn':
      updateIngredientsNeeds(msg.payload.allocation);
      document.getElementById('potential-score').innerText = msg.payload.utility.value || 0;
      break;
    case 'saveAllocationResult':
      if (msg.accepted) {
        //document.getElementById('score').textContent = msg.value;
      }
      //updateIngredientsNeeds(msg.payload);
      break;
    case 'updateBid':
      updateBid(msg.payload);
      break;
    case 'updateOffer':
      updateOffer(msg.payload);
      break;
    case 'acceptOffer':
      acceptOffer(msg.payload);
      break;
    case 'setRoundMetadata':
      setRoundMetadata(msg.payload);
      break;
  }
};
socket.open(location.href.replace('http', 'ws'));
