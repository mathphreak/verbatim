const child = require('child_process');
const fs = require('fs');
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

  const cwdFile = document.querySelector('input[name="cwd"]').files[0];
  const cwdPath = cwdFile === undefined ? undefined : cwdFile.path;

  const cliArgs = document.querySelector('input[name="args"]').value;

  const options = {
    subjectPath,
    truthPath,
    cwd: cwdPath,
    args: shellQuote.parse(cliArgs)
  };

  Array.from(document.querySelectorAll('.exe-output')).forEach(x => {
    x.innerHTML = '';
  });
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
