const child = require('child_process');
const fs = require('fs');
const concat = require('concat-stream');
const merge = require('merge-stream');
const _ = require('lodash');

let runningProcesses = [];
let subjectWatcher;

function updateForms() {
  if (runningProcesses.length > 0 || subjectWatcher !== undefined) {
    document.getElementById('run').innerText = 'Stop!';
  } else {
    document.getElementById('run').innerText = 'Run!';
  }

  Array.from(document.querySelectorAll('input')).forEach(e => {
    e.disabled = (subjectWatcher !== undefined);
  });
}

function run(exePath, inputFile, handleOutput) {
  function finished(result) {
    handleOutput(result.toString('utf8'));
  }
  const output = concat(finished);
  const input = fs.createReadStream(inputFile);
  const process = child.spawn(exePath);
  runningProcesses.push(process);
  input.pipe(process.stdin);
  merge(process.stdout, process.stderr).pipe(output);
  process.on('error', err => console.log(err));
  process.on('exit', () => {
    runningProcesses = runningProcesses.filter(p => p !== process);
    updateForms();
  });
  updateForms();
}

function compare(subjectPath, truthPath, testCase) {
  const results = {};
  run(subjectPath, testCase, out => {
    results.subject = out;
    handleResults();
  });
  run(truthPath, testCase, out => {
    results.truth = out;
    handleResults();
  });

  function handleResults() {
    if (results.subject !== undefined && results.truth !== undefined) {
      const className = (results.subject === results.truth ? 'success' : 'failure');
      const subjectNode = document.createElement('pre');
      const truthNode = document.createElement('pre');
      subjectNode.innerText = results.subject;
      truthNode.innerText = results.truth;
      const subjectParent = document.createElement('div');
      const truthParent = document.createElement('div');
      subjectParent.className = truthParent.className = className;
      subjectParent.appendChild(subjectNode);
      truthParent.appendChild(truthNode);
      document.querySelector('.exe-output.subject').appendChild(subjectParent);
      document.querySelector('.exe-output.truth').appendChild(truthParent);
    }
  }
}

function runTest() {
  runningProcesses.forEach(p => p.kill());
  const subjectPath = document.querySelector('input[name="subject"]').files[0].path;
  const truthPath = document.querySelector('input[name="truth"]').files[0].path;
  const testCases = Array.from(document.querySelectorAll('input[name="testcase"]')).map(x => Array.from(x.files)).reduce((a, b) => a.concat(b)).map(x => x.path);

  Array.from(document.querySelectorAll('.exe-output')).forEach(x => {
    x.innerHTML = '';
  });
  for (const tcPath of testCases) {
    compare(subjectPath, truthPath, tcPath);
  }
}

document.getElementById('run').addEventListener('click', () => {
  if (document.getElementById('run').innerText === 'Run!') {
    if (document.querySelector('input[name="watch-subject"]').checked) {
      const subjectPath = document.querySelector('input[name="subject"]').files[0].path;
      subjectWatcher = fs.watch(subjectPath, _.debounce(runTest, 2000, {trailing: true}));
    }
    runTest();
  } else {
    runningProcesses.forEach(p => p.kill());
    if (subjectWatcher !== undefined) {
      subjectWatcher.close();
      subjectWatcher = undefined;
    }
    updateForms();
  }
});
