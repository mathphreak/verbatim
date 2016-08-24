const child = require('child_process');
const fs = require('fs');
const path = require('path');

const concat = require('concat-stream');
const merge = require('merge-stream');
const shellQuote = require('shell-quote');
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

function run(exePath, inputFile, options, handleOutput) {
  function finished(result) {
    handleOutput(result.toString('utf8'));
  }
  const output = concat(finished);
  const input = fs.createReadStream(inputFile);
  const process = child.spawn(exePath, options.args, {cwd: options.cwd});
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

function buildResultNode(text, childClass, parentClass) {
  const node = document.createElement('pre');
  node.innerText = text;
  const child = document.createElement('div');
  child.className = childClass;
  child.appendChild(node);
  const parent = document.createElement('div');
  parent.className = parentClass;
  parent.appendChild(child);
  return parent;
}

function buildResults(results, testCase) {
  const className = (results.subject === results.truth ? 'success' : 'failure');
  const row = document.createElement('div');
  row.className = 'row';
  row.appendChild(buildResultNode(results.subject, className, 'exe-output subject'));
  row.appendChild(buildResultNode(results.truth, className, 'exe-output truth'));
  const label = document.createElement('p');
  label.innerText = path.parse(testCase).base;
  const result = document.createElement('div');
  result.className = 'exe-output';
  result.appendChild(label);
  result.appendChild(row);
  return result;
}

function compare(options, testCase) {
  const results = {};
  run(options.subjectPath, testCase, options, out => {
    results.subject = out;
    handleResults();
  });
  run(options.truthPath, testCase, options, out => {
    results.truth = out;
    handleResults();
  });

  function handleResults() {
    if (results.subject !== undefined && results.truth !== undefined) {
      document.getElementById('output').appendChild(buildResults(results, testCase));
    }
  }
}

function runTest() {
  runningProcesses.forEach(p => p.kill());
  const subjectPath = document.querySelector('input[name="subject"]').files[0].path;
  const truthPath = document.querySelector('input[name="truth"]').files[0].path;
  const testCases = Array.from(document.querySelectorAll('input[name="testcase"]')).map(x => Array.from(x.files)).reduce((a, b) => a.concat(b)).map(x => x.path);

  const cwdFile = document.querySelector('input[name="cwd"]').files[0];
  const cwdPath = cwdFile === undefined ? undefined : cwdFile.path;

  const cliArgs = document.querySelector('input[name="args"]').value;

  const options = {
    subjectPath,
    truthPath,
    cwd: cwdPath,
    args: shellQuote.parse(cliArgs)
  };

  document.getElementById('output').innerHTML = '';
  for (const tcPath of testCases) {
    compare(options, tcPath);
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
