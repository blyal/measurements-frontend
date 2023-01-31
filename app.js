//TODO: how to ensure that only one TCP connection is used?

// Initialise File for sending
const filePath = './get-file';
let fileData;
let fileSize;
fetch(filePath)
  .then((response) => response.blob())
  .then((data) => {
    console.log('File retrieved: ', data);
    fileData = data;
    fileSize = data.size;
  });

// HTML Elements
const testStatusElement = document.getElementById('status');
const testLabelInput = document.getElementById('testLabel');
const remoteEndpointInput = document.getElementById('remoteEndpoint');
const advertisedDataRateInput = document.getElementById('httpAdvertisedRate');
const icmpTrialsQuantityInput = document.getElementById('icmpTrialsQuant');
const httpTrialsQuantityInput = document.getElementById('httpTrialsQuant');
const runTimeoutInput = document.getElementById('testsTimeout');
const button = document.getElementById('runTests');
const resultsElements = document.getElementsByClassName('results');

// State
let testStatus = 'Idle';
const updateTestStatus = (newStatus) => {
  testStatus = newStatus;
  testStatusElement.innerHTML = newStatus;
};

// Uplink Trial
const uplinkTrial = async (httpTrialTimeLimitInMs) => {
  const controller = new AbortController();
  const signal = controller.signal;
  const startTime = performance.now();

  setTimeout(() => {
    controller.abort();
  }, httpTrialTimeLimitInMs);

  return fetch('http://localhost:1414/uplink', {
    method: 'POST',
    body: fileData,
    signal,
  })
    .then((response) => {
      console.log(
        'File successfully received by server \n Response: ',
        response
      );
      const endTime = performance.now();
      return { trialTimeInMs: endTime - startTime, trialResult: 'success' };
    })
    .catch((error) => {
      if (error.name === 'AbortError') {
        console.log('Trial failed due to speed error');
        return { trialTimeInMs: httpTrialTimeLimitInMs, trialResult: 'failed' };
      } else {
        console.error('Error sending file to server: ', error);
        return { trialTimeInMs: null, trialResult: 'error' };
      }
    });
};

const runTests = async () => {
  if (
    !Boolean(testLabelInput.value) ||
    !Boolean(remoteEndpointInput.value) ||
    !Boolean(runTimeoutInput.value)
  ) {
    alert('Please fill out all the required configuration fields');
  } else if (
    Number(runTimeoutInput.value) < 0 ||
    Number(icmpTrialsQuantityInput.value < 0) ||
    Number(httpTrialsQuantityInput.value) < 0 ||
    Number(advertisedDataRateInput.value) < 0
  ) {
    alert('Numerical values cannot be lower than 0');
  } else if (
    !Boolean(icmpTrialsQuantityInput.value) &&
    !Boolean(httpTrialsQuantityInput.value)
  ) {
    alert('There must be at least one number of trials to run');
  } else if (
    Boolean(httpTrialsQuantityInput.value) &&
    Number(advertisedDataRateInput.value) <= 0
  ) {
    alert(
      'You must provide an advertised HTTP data rate in order to run HTTP trials'
    );
  } else {
    // init
    updateTestStatus('Running');

    // function config
    let isRunning = true;
    const runTimeoutInMs = runTimeoutInput.value * 60000;
    const numberOfIcmpTrials = +icmpTrialsQuantityInput.value;
    const numberOfHttpTrials = +httpTrialsQuantityInput.value;
    const advertisedHttpDataRateInKBps = +advertisedDataRateInput.value;
    //kBps should be the same as Bpms
    //const advertisedHttpDataRateInBps = advertisedHttpDataRateInKBps * 1000;
    //const advertisedHttpDataRateInBpms = advertisedHttpDataRateInBps / 1000;
    const httpTrialTimeLimitInMs = fileSize / advertisedHttpDataRateInKBps;
    //TODO: do something with this remote endpoint
    const remoteEndpoint = remoteEndpointInput.value;
    const results = [];

    // data config
    const testStartTime = new Date().toUTCString();
    const testLabel = testLabelInput.value;

    // run timeout
    setTimeout(() => {
      console.log('Stop');
      isRunning = false;
    }, runTimeoutInMs);

    // loop for sending the calls
    for (let i = 0; i < numberOfHttpTrials; i++) {
      const { trialTimeInMs, trialResult } = await uplinkTrial(
        httpTrialTimeLimitInMs
      );
      const trialData = {
        testStartTime,
        testLabel,
        trialNumber: i + 1,
        trialResult,
        trialTimeInMs: Math.round(trialTimeInMs),
      };
      results.push(trialData);
      if (!isRunning) {
        console.log('Break');
        break;
      }
    }

    // handle results
    console.log(results);
    updateTestStatus('Completed');
    resultsElements[0].classList.remove('hidden');
    resultsElements[1].classList.remove('hidden');
  }
};

// HTML Event Handlers
button.addEventListener('click', runTests);
