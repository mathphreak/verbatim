'use strict';

const child = require('child_process');
const fs = require('fs');

const concat = require('concat-stream');
const merge = require('merge-stream');
const shellQuote = require('shell-quote');

let runningProcesses = [];

function run(exePath, options) {
  return new Promise((resolve, reject) => {
    function finished(result) {
      resolve(result.toString('utf8'));
    }
    const output = concat(finished);
    let args = [];
    if (options.args.enabled) {
      args = shellQuote.parse(options.args.value);
    }
    const opts = {};
    if (options.workdir.enabled) {
      opts.cwd = options.workdir.value;
    }
    const process = child.spawn(exePath, args, opts);
    runningProcesses.push(process);
    if (options.stdin.enabled) {
      const input = fs.createReadStream(options.stdin.value);
      input.pipe(process.stdin);
    }
    merge(process.stdout, process.stderr).pipe(output);
    process.on('error', reject);
    process.on('exit', () => {
      runningProcesses = runningProcesses.filter(p => p !== process);
    });
  });
}

function compare(subjectPath, truthPath, testCase) {
  return new Promise((resolve, reject) => {
    const results = {};
    run(subjectPath, testCase).then(out => {
      results.subject = out;
      handleResults();
    }).catch(reject);
    run(truthPath, testCase).then(out => {
      results.truth = out;
      handleResults();
    }).catch(reject);

    function handleResults() {
      if (results.subject !== undefined && results.truth !== undefined) {
        resolve({testCase, results});
      }
    }
  });
}

function runTest(subjectPath, truthPath, testCases) {
  return Promise.all(testCases.map(testCase => compare(subjectPath, truthPath, testCase)));
}

module.exports = runTest;
module.exports.abort = () => {
  runningProcesses.forEach(p => p.kill());
};
