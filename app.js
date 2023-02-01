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
const elementICMPTrialsCompleted = document.getElementsByClassName(
  'elementICMPTrialsCompleted'
);
const elementHttpUpTrialsCompleted = document.getElementsByClassName(
  'elementHttpUpTrialsCompleted'
);
const elementHttpDownTrialsCompleted = document.getElementsByClassName(
  'elementHttpDownTrialsCompleted'
);
const elementTestStartTime = document.getElementsByClassName(
  'elementTestStartTime'
);
const elementTimeElapsed =
  document.getElementsByClassName('elementTimeElapsed');
const elementMeanRTT = document.getElementsByClassName('elementMeanRTT');
const elementMinRTT = document.getElementsByClassName('elementMinRTT');
const elementMaxRTT = document.getElementsByClassName('elementMaxRTT');
const elementPacketLossRatio = document.getElementsByClassName(
  'elementPacketLossRatio'
);
const elementMeanUpHttpTime = document.getElementsByClassName(
  'elementMeanUpHttpTime'
);
const elementMinUpHttpTime = document.getElementsByClassName(
  'elementMinUpHttpTime'
);
const elementMaxUpHttpTime = document.getElementsByClassName(
  'elementMaxUpHttpTime'
);
const elementUpThroughput = document.getElementsByClassName(
  'elementUpThroughput'
);
const elementUpUnsuccessfulFileAccess = document.getElementsByClassName(
  'elementUpUnsuccessfulFileAccess'
);
const elementMeanDownHttpTime = document.getElementsByClassName(
  'elementMeanDownHttpTime'
);
const elementMinDownHttpTime = document.getElementsByClassName(
  'elementMinDownHttpTime'
);
const elementMaxDownHttpTime = document.getElementsByClassName(
  'elementMaxDownHttpTime'
);
const elementDownThroughput = document.getElementsByClassName(
  'elementDownThroughput'
);
const elementDownUnsuccessfulFileAccess = document.getElementsByClassName(
  'elementDownUnsuccessfulFileAccess'
);

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
    const testLocalStartTime = new Date();

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
    const testUTCStartTime = new Date().toUTCString();
    const testLabel = testLabelInput.value;

    // run timeout
    setTimeout(() => {
      isRunning = false;
    }, runTimeoutInMs);

    // loop for sending the calls
    for (let i = 0; i < numberOfHttpTrials; i++) {
      const { trialTimeInMs, trialResult } = await uplinkTrial(
        httpTrialTimeLimitInMs
      );
      const trialData = {
        testUTCStartTime,
        testLabel,
        trialNumber: i + 1,
        trialResult,
        trialTimeInMs: Math.round(trialTimeInMs),
      };
      results.push(trialData);
      if (!isRunning) {
        break;
      }
    }

    // handle results
    console.log(results);
    const testLocalEndTime = new Date();
    const minutesElapsed = Math.round(
      (testLocalEndTime - testLocalStartTime) / 60000
    );
    const secondsRemainderElapsed =
      Math.round((testLocalEndTime - testLocalStartTime) / 1000) % 60;

    let testSummary = {
      testLocalStartTime: testLocalStartTime.toLocaleString(),
      timeElapsed: timeElapsed(minutesElapsed, secondsRemainderElapsed),
      icmpTrialsCompleted: 0,
      //TODO: this has to change. Not all results are upTrials
      httpUpTrialsCompleted: results.length,
      httpDownTrialsCompleted: 0,
      meanRTT: undefined,
      minRTT: undefined,
      maxRTT: undefined,
      packetLossRatio: undefined,
      meanHttpUpTime: calculateMeanHttpTime(results),
      minHttpUpTime: results.reduce((prev, curr) =>
        prev.trialTimeInMs < curr.trialTimeInMs ? prev : curr
      ).trialTimeInMs,
      maxHttpUpTime: results.reduce((prev, curr) =>
        prev.trialTimeInMs > curr.trialTimeInMs ? prev : curr
      ).trialTimeInMs,
      uplinkThroughput: undefined,
      uplinkUnsuccessfulFileAccess: undefined,
      meanHttpDownTime: undefined,
      minHttpDownTime: undefined,
      maxHttpDownTime: undefined,
      downlinkThroughput: undefined,
      downlinkUnsuccessfulFileAccess: undefined,
    };
    console.log(testSummary);
    updateTestStatus('Completed');
    updateHTMLAfterTestFinished(testSummary);
  }
};

// HTML Event Handlers
button.addEventListener('click', runTests);

// helper functions
const timeElapsed = (minutesElapsed, secondsElapsed) => {
  if (minutesElapsed === 0 && secondsElapsed === 0) {
    return 'There was an error with the test';
  }

  let timeElapsedStatement;

  if (minutesElapsed > 0) {
    timeElapsedStatement = `${minutesElapsed} minute`;
    if (minutesElapsed > 1) timeElapsedStatement += 's';
    if (secondsElapsed === 0) {
      timeElapsedStatement += ' precisely';
    } else {
      timeElapsedStatement += `and ${secondsElapsed} second`;
      if (secondsElapsed > 1) timeElapsedStatement += 's';
    }
  } else {
    timeElapsedStatement = `${secondsElapsed} second`;
    if (minutesElapsed > 1) timeElapsedStatement += 's';
  }
  return timeElapsedStatement;
};

function calculateMeanHttpTime(results) {
  let totalHttpTime;
  for (let i = 0; i < results.length; i++) {
    totalHttpTime += results[i].trialTimeInMs;
  }
  return totalHttpTime / results.length;
}

const updateHTMLAfterTestFinished = (testSummary) => {
  resultICMPTrialsCompleted.innerHTML = testSummary.icmpTrialsCompleted;
  resultHttpUpTrialsCompleted.innerHTML =
    testSummary.resultHttpUpTrialsCompleted;
  resultHttpDownTrialsCompleted.innerHTML =
    testSummary.resultHttpDownTrialsCompleted;

  elementTestStartTime.innerHTML = testSummary.testLocalStartTime;
  elementTimeElapsed.innerHTML = testSummary.timeElapsed;
  elementMeanRTT.innerHTML = testSummary.meanRTT;
  elementMinRTT.innerHTML = testSummary.minRTT;
  elementMaxRTT.innerHTML = testSummary.maxRTT;
  elementPacketLossRatio.innerHTML = testSummary.packetLossRatio;
  elementMeanUpHttpTime.innerHTML = testSummary.meanHttpUpTime;
  elementMinUpHttpTime.innerHTML = testSummary.minHttpUpTime;
  elementMaxUpHttpTime.innerHTML = testSummary.maxHttpUpTime;
  elementUpThroughput.innerHTML = testSummary.uplinkThroughput;
  elementUpUnsuccessfulFileAccess.innerHTML =
    testSummary.uplinkUnsuccessfulFileAccess;
  elementMeanDownHttpTime.innerHTML = testSummary.meanHttpDownTime;
  elementMinDownHttpTime.innerHTML = testSummary.minHttpDownTime;
  elementMaxDownHttpTime.innerHTML = testSummary.maxHttpDownTime;
  elementDownThroughput.innerHTML = testSummary.downlinkThroughput;
  elementDownUnsuccessfulFileAccess.innerHTML =
    testSummary.downlinkUnsuccessfulFileAccess;
  resultsElements[0].classList.remove('hidden');
  resultsElements[1].classList.remove('hidden');
};
