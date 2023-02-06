//TODO: how to ensure that only one TCP connection is used?

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
const elementICMPTrialsAttempted = document.getElementById(
  'elementICMPTrialsAttempted'
);
const elementhttpUpTrialsAttempted = document.getElementById(
  'elementhttpUpTrialsAttempted'
);
const elementHttpDownTrialsAttempted = document.getElementById(
  'elementHttpDownTrialsAttempted'
);
const elementTestStartTime = document.getElementById('elementTestStartTime');
const elementTimeElapsed = document.getElementById('elementTimeElapsed');
const elementMeanRTT = document.getElementById('elementMeanRTT');
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
const fileSize = 513024;
const downlinkFilePath = './get-file';
let fileBlob;
let testStatus = 'Idle';

// Initialise State
downloadFile();

// Update State
const updateTestStatus = (newStatus) => {
  testStatus = newStatus;
  testStatusElement.innerHTML = newStatus;
};

// Download File
async function downloadFile(signal) {
  try {
    const response = await fetch(downlinkFilePath, {
      method: 'GET',
      signal,
    });
    const data = await response.blob();
    console.log('File retrieved: ', data);
    if (data.size === fileSize && !Boolean(signal)) {
      fileBlob = data;
    } else if (data.size !== fileSize) {
      throw new Error('There was an error with the file');
    }
    return { data, status: response.status };
  } catch (error) {
    console.error(error);
  }
}

// Downlink Trial
async function downlinkTrial() {
  const controller = new AbortController();
  const signal = controller.signal;
  const startTime = performance.now();

  setTimeout(() => {
    controller.abort();
  }, 120000);

  try {
    const trial = await downloadFile(signal);
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
const uplinkTrial = async () => {
  const controller = new AbortController();
  const signal = controller.signal;
  const startTime = performance.now();

  setTimeout(() => {
    controller.abort();
  }, 120000);

  return fetch('http://localhost:1414/uplink', {
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
    const testLocalStartTime = new Date();

    // function config
    let isRunning = true;
    const runTimeoutInMs = runTimeoutInput.value * 60000;
    const numberOfIcmpTrials = +icmpTrialsQuantityInput.value;
    const numberOfHttpTrials = +httpTrialsQuantityInput.value;
    const advertisedHttpDataRateInKBps = +advertisedDataRateInput.value;
    const advertisedHttpDataRateInBpms =
      (advertisedHttpDataRateInKBps * 1024) / 1000;
    const maximumTrialTimeInMsReAdvertisedHttpRate =
      fileSize / advertisedHttpDataRateInBpms;
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
      if (i % 2 === 1) {
        const { trialTimeInMs, trialResult } = await uplinkTrial();
        const trialData = {
          testUTCStartTime,
          testLabel,
          trialNumber: i + 1,
          trialResult,
          trialTimeInMs: Math.round(trialTimeInMs),
          trialType: 'uplink',
        };
        results.push(trialData);
        if (!isRunning) {
          break;
        }
      } else {
        const { trialTimeInMs, trialResult } = await downlinkTrial();
        const trialData = {
          testUTCStartTime,
          testLabel,
          trialNumber: i + 1,
          trialResult,
          trialTimeInMs: Math.round(trialTimeInMs),
          trialType: 'downlink',
        };
        results.push(trialData);
        if (!isRunning) {
          break;
        }
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
    const uplinkTrialsFailed = results.filter(
      (result) =>
        result.trialResult !== 'success' && result.trialType === 'uplink'
    ).length;
    const downlinkTrialsFailed = results.filter(
      (result) =>
        result.trialResult !== 'success' && result.trialType === 'downlink'
    ).length;

    let testSummary = {
      testLocalStartTime: testLocalStartTime.toLocaleString(),
      timeElapsed: timeElapsed(minutesElapsed, secondsRemainderElapsed),
      ICMPTrialsAttempted: 0,
      httpUpTrialsAttempted: uplinkResults(results).length,
      httpDownTrialsAttempted: downlinkResults(results).length,
      failedHttpUpTrials: uplinkTrialsFailed,
      failedHttpDownTrials: downlinkTrialsFailed,
      meanRTT: undefined,
      minRTT: undefined,
      maxRTT: undefined,
      packetLossRatio: undefined,
      meanSuccessHttpUpTime: calculateMeanHttpTime(
        uplinkResults(results),
        uplinkTrialsFailed
      ),
      minSuccessHttpUpTime: uplinkResults(results).reduce((prev, curr) =>
        prev.trialTimeInMs < curr.trialTimeInMs ? prev : curr
      ).trialTimeInMs,
      maxSuccessHttpUpTime: uplinkResults(results).reduce((prev, curr) =>
        prev.trialTimeInMs > curr.trialTimeInMs ? prev : curr
      ).trialTimeInMs,
      uplinkThroughput: calculateThroughputPercentage(
        uplinkResults(results),
        maximumTrialTimeInMsReAdvertisedHttpRate
      ),
      uplinkUnsuccessfulFileAccess:
        100 * (uplinkTrialsFailed / uplinkResults(results).length),
      meanSuccessHttpDownTime: calculateMeanHttpTime(
        downlinkResults(results),
        downlinkTrialsFailed
      ),
      minSuccessHttpDownTime: downlinkResults(results).reduce((prev, curr) =>
        prev.trialTimeInMs < curr.trialTimeInMs ? prev : curr
      ).trialTimeInMs,
      maxSuccessHttpDownTime: downlinkResults(results).reduce((prev, curr) =>
        prev.trialTimeInMs > curr.trialTimeInMs ? prev : curr
      ).trialTimeInMs,
      downlinkThroughput: calculateThroughputPercentage(
        downlinkResults(results),
        maximumTrialTimeInMsReAdvertisedHttpRate
      ),
      downlinkUnsuccessfulFileAccess:
        100 * (downlinkTrialsFailed / downlinkResults(results).length),
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
    if (secondsElapsed > 1) timeElapsedStatement += 's';
  }
  return timeElapsedStatement;
};

function filterByTypeOfTrial(trial, trialTypeToFilterFor) {
  return trial.trialType === trialTypeToFilterFor;
}

const uplinkResults = (results) =>
  results.filter((result) => filterByTypeOfTrial(result, 'uplink'));
const downlinkResults = (results) =>
  results.filter((result) => filterByTypeOfTrial(result, 'downlink'));

function calculateMeanHttpTime(results, failedTrials) {
  let totalHttpTime = 0;
  for (let i = 0; i < results.length; i++) {
    if (results[i].trialResult === 'success') {
      totalHttpTime += results[i].trialTimeInMs;
    }
  }
  return Math.round(totalHttpTime / (results.length - failedTrials));
}

function calculateThroughputPercentage(results, maxTime) {
  const prolongedTrials = results.filter(
    (result) => result.timeElapsed < maxTime
  );
  return 100 * (prolongedTrials / results.length);
}

const updateHTMLAfterTestFinished = (summary) => {
  elementICMPTrialsAttempted.innerHTML = summary.ICMPTrialsAttempted;
  elementhttpUpTrialsAttempted.innerHTML = summary.httpUpTrialsAttempted;
  elementHttpDownTrialsAttempted.innerHTML = summary.httpDownTrialsAttempted;

  elementTestStartTime.innerHTML = summary.testLocalStartTime;
  elementTimeElapsed.innerHTML = summary.timeElapsed;
  elementMeanRTT.innerHTML = summary.meanRTT;
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
  resultsElements[0].classList.remove('hidden');
  resultsElements[1].classList.remove('hidden');
};
