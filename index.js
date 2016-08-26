const child = require('child_process');
const fs = require('fs');

const concat = require('concat-stream');
const merge = require('merge-stream');
const shellQuote = require('shell-quote');
const _ = require('lodash');

let runningProcesses = [];
let subjectWatcher;

function buildCaseLabel(context, name, text) {
  const enable = document.createElement('input');
  enable.type = 'checkbox';
  enable.name = name + '-enable';
  enable.addEventListener('change', () => {
    context.querySelector(`input[name="${name}"]`).disabled = !enable.checked;
    context.querySelector(`input[name="${name}"]`).dataset.disabled = enable.checked ? '' : true;
  });
  const label = document.createElement('label');
  label.appendChild(enable);
  label.appendChild(document.createTextNode(' ' + text));
  return label;
}

function buildEmptyCase() {
  const result = document.createElement('div');
  result.className = 'case';

  const name = document.createElement('input');
  name.type = 'text';
  name.name = 'name';
  const nameP = document.createElement('p');
  nameP.className = 'name';
  nameP.appendChild(name);

  const workdirLabel = buildCaseLabel(result, 'workdir', 'Working directory:');
  const workdir = document.createElement('input');
  workdir.disabled = true;
  workdir.dataset.disabled = true;
  workdir.type = 'file';
  workdir.name = 'workdir';
  workdir.webkitdirectory = true;
  const workdirP = document.createElement('p');
  workdirP.className = 'workdir';
  workdirP.appendChild(workdirLabel);
  workdirP.appendChild(workdir);

  const argsLabel = buildCaseLabel(result, 'args', 'Command line arguments:');
  const args = document.createElement('input');
  args.disabled = true;
  args.dataset.disabled = true;
  args.type = 'text';
  args.name = 'args';
  const argsP = document.createElement('p');
  argsP.className = 'args';
  argsP.appendChild(argsLabel);
  argsP.appendChild(args);

  const stdinLabel = buildCaseLabel(result, 'stdin', 'Console input file:');
  const stdin = document.createElement('input');
  stdin.disabled = true;
  stdin.dataset.disabled = true;
  stdin.type = 'file';
  stdin.name = 'stdin';
  const stdinP = document.createElement('p');
  stdinP.className = 'stdin';
  stdinP.appendChild(stdinLabel);
  stdinP.appendChild(stdin);

  result.appendChild(nameP);
  result.appendChild(workdirP);
  result.appendChild(argsP);
  result.appendChild(stdinP);

  const resultWrapper = document.createElement('div');
  resultWrapper.className = 'case-wrapper';

  const removeButton = document.createElement('button');
  removeButton.type = 'button';
  removeButton.innerText = '\u2718';
  removeButton.addEventListener('click', evt => {
    resultWrapper.remove();
    evt.preventDefault();
  });

  resultWrapper.appendChild(result);
  resultWrapper.appendChild(removeButton);

  return resultWrapper;
}

function handleError(err) {
  document.querySelector('#error').hidden = false;
  document.querySelector('#error .name').innerText = err.name;
  document.querySelector('#error .stack').innerText = err.stack;
  console.error(err);
}

process.on('uncaughtException', handleError);

function updateForms() {
  document.querySelector('#error').hidden = true;

  if (runningProcesses.length > 0 || subjectWatcher !== undefined) {
    document.getElementById('run').innerText = 'Stop!';
  } else {
    document.getElementById('run').innerText = 'Run!';
  }

  Array.from(document.querySelectorAll('input')).forEach(e => {
    e.disabled = (subjectWatcher !== undefined) || e.dataset.disabled;
  });
}

function run(exePath, options, handleOutput) {
  function finished(result) {
    handleOutput(result.toString('utf8'));
  }
  const output = concat(finished);
  const process = child.spawn(exePath, options.args, {cwd: options.workdir});
  runningProcesses.push(process);
  if (options.stdin) {
    const input = fs.createReadStream(options.stdin);
    input.pipe(process.stdin);
  }
  merge(process.stdout, process.stderr).pipe(output);
  process.on('error', handleError);
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
  label.innerText = testCase.name || JSON.stringify(testCase);
  const result = document.createElement('div');
  result.className = 'exe-output';
  result.appendChild(label);
  result.appendChild(row);
  return result;
}

function parseCase(caseDiv) {
  const result = {};
  function input(name) {
    return caseDiv.querySelector(`input[name="${name}"]`);
  }
  if (input('workdir-enable').checked && input('workdir').files[0]) {
    result.workdir = input('workdir').files[0].path;
  }
  if (input('args-enable').checked) {
    result.args = shellQuote.parse(input('args').value);
  }
  if (input('stdin-enable').checked && input('stdin').files[0]) {
    result.stdin = input('stdin').files[0].path;
  }
  if (input('name').value.length > 0) {
    result.name = input('name').value;
  }
  return result;
}

function addNewCase() {
  const newCase = buildEmptyCase();
  function enable(name) {
    newCase.querySelector(`input[name="${name}-enable"]`).checked = true;
    newCase.querySelector(`input[name="${name}`).disabled = false;
    newCase.querySelector(`input[name="${name}`).dataset.disabled = '';
  }
  let lastCase = document.querySelector('.case-wrapper:last-child .case');
  if (lastCase) {
    lastCase = parseCase(lastCase);
    if (lastCase.workdir !== undefined) {
      enable('workdir');
    }
    if (lastCase.args !== undefined) {
      enable('args');
    }
    if (lastCase.stdin !== undefined) {
      enable('stdin');
    }
  }
  document.getElementById('cases').appendChild(newCase);
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
      document.getElementById('output').appendChild(buildResults(results, testCase));
    }
  }
}

function runTest() {
  runningProcesses.forEach(p => p.kill());
  const subjectPath = document.querySelector('input[name="subject"]').files[0].path;
  const truthPath = document.querySelector('input[name="truth"]').files[0].path;
  const testCases = Array.from(document.querySelectorAll('.case')).map(parseCase);

  document.getElementById('output').innerHTML = '';
  for (const testCase of testCases) {
    compare(subjectPath, truthPath, testCase);
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

document.getElementById('new-case').addEventListener('click', addNewCase);

addNewCase();
