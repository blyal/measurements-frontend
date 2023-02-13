//TODO: how to ensure that only one TCP connection is used?

// HTML Elements
const toolStatusElement = document.getElementById('tool-status');
const icmpStatusElement = document.getElementById('icmp-status');
const icmpButton = document.getElementById('icmpTestButton');
const testLabelInput = document.getElementById('testLabel');
const remoteEndpointInput = document.getElementById('remoteEndpoint');
const advertisedDataRateInput = document.getElementById('httpAdvertisedRate');
const icmpTrialsQuantityInput = document.getElementById('icmpTrialsQuant');
const httpTrialsQuantityInput = document.getElementById('httpTrialsQuant');
const runTimeoutInput = document.getElementById('testsTimeout');
const button = document.getElementById('testButton');
const runTestsButtonText = document.getElementById('runTestsText');
const loadingDotsContainer = document.getElementsByClassName('loading')[0];
const resultsElements = document.getElementsByClassName('results');
const elementICMPTrialsAttempted = document.getElementById(
  'elementICMPTrialsAttempted'
);
const elementHttpUpTrialsAttempted = document.getElementById(
  'elementHttpUpTrialsAttempted'
);
const elementHttpDownTrialsAttempted = document.getElementById(
  'elementHttpDownTrialsAttempted'
);
const elementICMPTrialsSuccessful = document.getElementById(
  'elementICMPTrialsSuccessful'
);
const elementHttpUpTrialsSuccessful = document.getElementById(
  'elementHttpUpTrialsSuccessful'
);
const elementHttpDownTrialsSuccessful = document.getElementById(
  'elementHttpDownTrialsSuccessful'
);
const elementTestStartTime = document.getElementById('elementTestStartTime');
const elementTimeElapsed = document.getElementById('elementTimeElapsed');
const elementLatency = document.getElementById('elementLatency');
const elementMinRTT = document.getElementById('elementMinRTT');
const elementMaxRTT = document.getElementById('elementMaxRTT');
const elementPacketLossRatio = document.getElementById(
  'elementPacketLossRatio'
);
const elementMeanUpHttpTime = document.getElementById('elementMeanUpHttpTime');
const elementMinUpHttpTime = document.getElementById('elementMinUpHttpTime');
const elementMaxUpHttpTime = document.getElementById('elementMaxUpHttpTime');
const elementUpThroughput = document.getElementById('elementUpThroughput');
const elementUpUnsuccessfulFileAccess = document.getElementById(
  'elementUpUnsuccessfulFileAccess'
);
const elementMeanDownHttpTime = document.getElementById(
  'elementMeanDownHttpTime'
);
const elementMinDownHttpTime = document.getElementById(
  'elementMinDownHttpTime'
);
const elementMaxDownHttpTime = document.getElementById(
  'elementMaxDownHttpTime'
);
const elementDownThroughput = document.getElementById('elementDownThroughput');
const elementDownUnsuccessfulFileAccess = document.getElementById(
  'elementDownUnsuccessfulFileAccess'
);

// State
const fileSizeInBytes = 513024;
const fileSizeInBits = 4104192;
const localICMPServer = 'http://localhost:1010';
const downlinkFilePath = './get-file';
let fileBlob;
let testStatus = 'Idle';

// Initialise State
downloadFile();

// Update State
const updateTestStatus = (newStatus) => {
  testStatus = newStatus;
  toolStatusElement.innerHTML = newStatus;
  if (newStatus === 'Completed') {
    loadingDotsContainer.classList.add('hidden');
    runTestsButtonText.classList.remove('hidden');
  }
};

//TODO: error handling
// start ICMP trials
function runICMPTest(numberOfTrials, remoteEndpointForTest) {
  let body = JSON.stringify({
    numberOfTrials,
    remoteEndpointForTest,
  });
  try {
    fetch(`${localICMPServer}/start-ping-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });
  } catch (error) {
    console.error(error);
  }
}

// get ICMP trial results
async function getICMPTestResults() {
  try {
    const response = await fetch(`${localICMPServer}/get-ping-test-results`, {
      method: 'GET',
    });
    return await response.json();
  } catch (error) {
    console.error(error);
  }
}

// Download File
//TODO: change default remote endpoint for getting the file (also in HTML)
async function downloadFile(remoteEndpoint = 'http://localhost:1414', signal) {
  try {
    const response = await fetch(`${remoteEndpoint}/${downlinkFilePath}`, {
      method: 'GET',
      signal,
    });
    const data = await response.blob();
    console.log('File retrieved: ', data);
    if (data.size === fileSizeInBytes && !Boolean(signal)) {
      fileBlob = data;
    } else if (data.size !== fileSizeInBytes) {
      throw new Error('There was an error with the file');
    }
    return { data, status: response.status };
  } catch (error) {
    console.error(error);
  }
}

// Downlink Trial
async function downlinkTrial(remoteEndpoint) {
  const controller = new AbortController();
  const signal = controller.signal;
  const startTime = performance.now();

  setTimeout(() => {
    controller.abort();
  }, 120000);

  try {
    const trial = await downloadFile(remoteEndpoint, signal);
    const endTime = performance.now();
    if (trial.status === 200) {
      console.log(
        'File successfully downloaded from server \n Data: ',
        trial.data
      );
    }
    return {
      trialTimeInMs: endTime - startTime,
      trialResult: trial.status === 200 ? 'success' : 'error',
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Trial failed due to speed error');
      return { trialTimeInMs: 120000, trialResult: 'failed' };
    } else {
      console.error('Error downloading file from server: ', error);
      return { trialTimeInMs: null, trialResult: 'error' };
    }
  }
}

// Uplink Trial
const uplinkTrial = async (remoteEndpoint) => {
  const controller = new AbortController();
  const signal = controller.signal;
  const startTime = performance.now();

  setTimeout(() => {
    controller.abort();
  }, 120000);

  return fetch(`${remoteEndpoint}/uplink`, {
    method: 'POST',
    body: fileBlob,
    signal,
  })
    .then((response) => {
      const endTime = performance.now();
      if (response.status === 200) {
        console.log(
          'File successfully received by server \n Response: ',
          response
        );
      }
      return {
        trialTimeInMs: endTime - startTime,
        trialResult: response.status === 200 ? 'success' : 'error',
      };
    })
    .catch((error) => {
      if (error.name === 'AbortError') {
        console.log('Trial failed due to speed error');
        return { trialTimeInMs: 120000, trialResult: 'failed' };
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
    runTestsButtonText.classList.add('hidden');
    loadingDotsContainer.classList.remove('hidden');
    const testLocalStartTime = new Date();

    // function config
    let isRunning = true;
    const runTimeoutInMs = runTimeoutInput.value * 60000;
    const numberOfIcmpTrials = +icmpTrialsQuantityInput.value;
    const numberOfHttpTrials = +httpTrialsQuantityInput.value;
    const advertisedHttpDataRateInMegabitsPerSec =
      +advertisedDataRateInput.value;
    const advertisedHttpDataRateInBitsPerMs =
      advertisedHttpDataRateInMegabitsPerSec * 1000000 * 1000;
    const remoteEndpoint = remoteEndpointInput.value;
    let icmpResults;
    const httpResults = [];

    // data config
    const testUTCStartTime = new Date().toUTCString();
    const testLabel = testLabelInput.value;

    // run timeout
    const timeout = setTimeout(() => {
      isRunning = false;
    }, runTimeoutInMs);

    // call the localserver to conduct the ICMP trials
    runICMPTest(numberOfIcmpTrials, remoteEndpoint);

    // loop for sending the HTTP calls
    for (let i = 0; i < numberOfHttpTrials; i++) {
      if (!isRunning) {
        break;
      }
      if (i % 2 === 1) {
        const { trialTimeInMs, trialResult } = await uplinkTrial(
          remoteEndpoint
        );
        const trialData = {
          testUTCStartTime,
          testLabel,
          trialNumber: i + 1,
          trialResult,
          trialTimeInMs: Math.round(trialTimeInMs),
          trialType: 'uplink',
        };
        httpResults.push(trialData);
      } else {
        const { trialTimeInMs, trialResult } = await downlinkTrial(
          remoteEndpoint
        );
        const trialData = {
          testUTCStartTime,
          testLabel,
          trialNumber: i + 1,
          trialResult,
          trialTimeInMs: Math.round(trialTimeInMs),
          trialType: 'downlink',
        };
        httpResults.push(trialData);
      }
    }

    // handle results
    async function callbackICMP() {
      let icmpData = await getICMPTestResults();
      icmpResults = icmpData.pingTestResults;
      if (isRunning && icmpResults.length !== numberOfIcmpTrials) {
        await callbackICMP();
      }
    }
    await callbackICMP();
    clearTimeout(timeout);
    console.log(httpResults);
    console.log(icmpResults);
    const testLocalEndTime = new Date();
    const minutesElapsed = Math.round(
      (testLocalEndTime - testLocalStartTime) / 60000
    );
    const secondsRemainderElapsed =
      Math.round((testLocalEndTime - testLocalStartTime) / 1000) % 60;
    const uplinkTrialsFailedNumber = httpResults.filter(
      (result) =>
        result.trialResult !== 'success' && result.trialType === 'uplink'
    ).length;
    const downlinkTrialsFailedNumber = httpResults.filter(
      (result) =>
        result.trialResult !== 'success' && result.trialType === 'downlink'
    ).length;

    let testSummary = {
      testLocalStartTime: testLocalStartTime.toLocaleString(),
      timeElapsed: timeElapsed(minutesElapsed, secondsRemainderElapsed),
      ICMPTrialsAttempted: icmpResults.length,
      httpUpTrialsAttempted: uplinkResults(httpResults).length,
      httpDownTrialsAttempted: downlinkResults(httpResults).length,
      successfulICMPTrials: icmpResults.filter(
        (result) => result.trialResult === 'success'
      ).length,
      successfulHttpUpTrials:
        uplinkResults(httpResults).length - uplinkTrialsFailedNumber,
      successfulHttpDownTrials:
        downlinkResults(httpResults).length - downlinkTrialsFailedNumber,
      latency: calculateMeanTime(
        icmpResults,
        icmpResults.filter((result) => result.trialResult !== 'success').length
      ),
      minRTT: Math.round(calculateMinTime(icmpResults)),
      maxRTT: Math.round(calculateMaxTime(icmpResults)),
      packetLossRatio: calculateUnsuccessfulTrialRatio(
        icmpResults.filter((result) => result.trialResult !== 'success').length,
        icmpResults.length
      ),
      meanSuccessHttpUpTime: calculateMeanTime(
        uplinkResults(httpResults),
        uplinkTrialsFailedNumber
      ),
      minSuccessHttpUpTime: calculateMinTime(uplinkResults(httpResults)),
      maxSuccessHttpUpTime: calculateMaxTime(uplinkResults(httpResults)),
      uplinkThroughput: calculateThroughputPercentage(
        uplinkResults(httpResults),
        advertisedHttpDataRateInBitsPerMs
      ),
      uplinkUnsuccessfulFileAccess: calculateUnsuccessfulTrialRatio(
        uplinkTrialsFailedNumber,
        uplinkResults(httpResults).length
      ),
      meanSuccessHttpDownTime: calculateMeanTime(
        downlinkResults(httpResults),
        downlinkTrialsFailedNumber
      ),
      minSuccessHttpDownTime: calculateMinTime(downlinkResults(httpResults)),
      maxSuccessHttpDownTime: calculateMaxTime(downlinkResults(httpResults)),
      downlinkThroughput: calculateThroughputPercentage(
        downlinkResults(httpResults),
        advertisedHttpDataRateInBitsPerMs
      ),
      downlinkUnsuccessfulFileAccess: calculateUnsuccessfulTrialRatio(
        downlinkTrialsFailedNumber,
        downlinkResults(httpResults).length
      ),
    };
    console.log(testSummary);
    updateTestStatus('Completed');
    updateHTMLAfterTestFinished(testSummary);
  }
};

async function testICMPServer() {
  try {
    const response = await fetch(`${localICMPServer}/test`, {
      method: 'GET',
    });
    const testStatus = response.status;
    console.log(testStatus);
    if (testStatus === 200) {
      icmpStatusElement.classList.add('bold');
      icmpStatusElement.classList.add('green');
      icmpStatusElement.classList.remove('red');
      icmpStatusElement.innerHTML = 'Running';
    } else {
      icmpStatusElement.classList.add('bold');
      icmpStatusElement.classList.add('red');
      icmpStatusElement.classList.remove('green');
      icmpStatusElement.innerHTML = 'Not Running';
    }
  } catch (error) {
    console.error(error);
    icmpStatusElement.classList.add('bold');
    icmpStatusElement.classList.add('red');
    icmpStatusElement.classList.remove('green');
    icmpStatusElement.innerHTML = 'Not Running';
  }
}

// HTML Event Handlers
button.addEventListener('click', runTests);
icmpButton.addEventListener('click', testICMPServer);

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
    if (secondsElapsed > 1) timeElapsedStatement += 's';
  }
  return timeElapsedStatement;
};

function filterByTypeOfTrial(trial, trialTypeToFilterFor) {
  return trial.trialType === trialTypeToFilterFor;
}

const uplinkResults = (httpResults) =>
  httpResults.filter((result) => filterByTypeOfTrial(result, 'uplink'));
const downlinkResults = (httpResults) =>
  httpResults.filter((result) => filterByTypeOfTrial(result, 'downlink'));

function calculateMeanTime(results, failedTrialsNumber) {
  let totalTime = 0;
  for (let i = 0; i < results.length; i++) {
    if (results[i].trialResult === 'success') {
      totalTime += results[i].trialTimeInMs;
    }
  }

  if (results.length - failedTrialsNumber === 0) return '-';
  return Math.round(totalTime / (results.length - failedTrialsNumber));
}

function calculateMinTime(results) {
  const successfulResults = results.filter(
    (result) => result.trialResult === 'success'
  );
  if (successfulResults.length === 0) return '-';
  return successfulResults.reduce((prev, curr) =>
    prev.trialTimeInMs < curr.trialTimeInMs ? prev : curr
  ).trialTimeInMs;
}

function calculateMaxTime(results) {
  const successfulResults = results.filter(
    (result) => result.trialResult === 'success'
  );
  if (successfulResults.length === 0) return '-';
  return successfulResults.reduce((prev, curr) =>
    prev.trialTimeInMs > curr.trialTimeInMs ? prev : curr
  ).trialTimeInMs;
}

function calculateThroughputPercentage(
  httpResults,
  advertisedHttpDataRateInBitsPerMs
) {
  const successfulResults = httpResults.filter(
    (result) => result.trialResult === 'success'
  );
  if (successfulResults.length === 0) return '-';
  const prolongedTrials = successfulResults.filter((result) => {
    return (
      fileSizeInBits / result.trialTimeInMs < advertisedHttpDataRateInBitsPerMs
    );
  }).length;
  return 100 * (prolongedTrials / successfulResults.length);
}

function calculateUnsuccessfulTrialRatio(failedTrialsNumber, resultsLength) {
  if (resultsLength === 0) return '-';
  return 100 * (failedTrialsNumber / resultsLength);
}

const updateHTMLAfterTestFinished = (summary) => {
  elementICMPTrialsAttempted.innerHTML = summary.ICMPTrialsAttempted;
  elementHttpUpTrialsAttempted.innerHTML = summary.httpUpTrialsAttempted;
  elementHttpDownTrialsAttempted.innerHTML = summary.httpDownTrialsAttempted;
  elementICMPTrialsSuccessful.innerHTML = summary.successfulICMPTrials;
  elementHttpUpTrialsSuccessful.innerHTML = summary.successfulHttpUpTrials;
  elementHttpDownTrialsSuccessful.innerHTML = summary.successfulHttpDownTrials;

  elementTestStartTime.innerHTML = summary.testLocalStartTime;
  elementTimeElapsed.innerHTML = summary.timeElapsed;
  elementLatency.innerHTML = summary.latency;
  elementMinRTT.innerHTML = summary.minRTT;
  elementMaxRTT.innerHTML = summary.maxRTT;
  elementPacketLossRatio.innerHTML = summary.packetLossRatio;
  elementMeanUpHttpTime.innerHTML = summary.meanSuccessHttpUpTime;
  elementMinUpHttpTime.innerHTML = summary.minSuccessHttpUpTime;
  elementMaxUpHttpTime.innerHTML = summary.maxSuccessHttpUpTime;
  elementUpThroughput.innerHTML = summary.uplinkThroughput;
  elementUpUnsuccessfulFileAccess.innerHTML =
    summary.uplinkUnsuccessfulFileAccess;
  elementMeanDownHttpTime.innerHTML = summary.meanSuccessHttpDownTime;
  elementMinDownHttpTime.innerHTML = summary.minSuccessHttpDownTime;
  elementMaxDownHttpTime.innerHTML = summary.maxSuccessHttpDownTime;
  elementDownThroughput.innerHTML = summary.downlinkThroughput;
  elementDownUnsuccessfulFileAccess.innerHTML =
    summary.downlinkUnsuccessfulFileAccess;
  resultsElements[0].classList.remove('removed');
  resultsElements[1].classList.remove('removed');
};
