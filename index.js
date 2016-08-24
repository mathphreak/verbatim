const child = require('child_process');
const fs = require('fs');
const concat = require('concat-stream');
const merge = require('merge-stream');

function run(exePath, inputFile, handleOutput) {
  function finished(result) {
    handleOutput(result.toString('utf8'));
  }
  const output = concat(finished);
  const input = fs.createReadStream(inputFile);
  const process = child.spawn(exePath);
  input.pipe(process.stdin);
  merge(process.stdout, process.stderr).pipe(output);
  process.on('error', err => console.log(err));
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

document.getElementById('run').addEventListener('click', () => {
  const subjectPath = document.querySelector('input[name="subject"]').files[0].path;
  const truthPath = document.querySelector('input[name="truth"]').files[0].path;
  const testCases = Array.from(document.querySelectorAll('input[name="testcase"]')).map(x => Array.from(x.files)).reduce((a, b) => a.concat(b)).map(x => x.path);

  Array.from(document.querySelectorAll('.exe-output')).forEach(x => {
    x.innerHTML = '';
  });
  for (const tcPath of testCases) {
    compare(subjectPath, truthPath, tcPath);
  }
});
