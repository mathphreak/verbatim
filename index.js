'use strict';

const child = require('child_process');
const fs = require('fs');
const pathMod = require('path');

const concat = require('concat-stream');
const merge = require('merge-stream');
const shellQuote = require('shell-quote');
const _ = require('lodash');

const ipc = require('electron').ipcRenderer;

let runningProcesses = [];
let subjectWatcher;

function abbreviatePath(origPath) {
  const pathDetails = pathMod.parse(origPath);
  const fullDir = pathDetails.dir.replace(pathDetails.root, '');
  const segments = fullDir.split(pathMod.sep);
  let shorterSegments = segments;
  if (segments.length >= 6) {
    shorterSegments = segments.slice(0, 1).concat('…').concat(segments.slice(segments.length - 1));
  }
  shorterSegments = shorterSegments.map(segment => {
    if (segment.length < 6) {
      return segment;
    }
    return segment.substr(0, 2) + '…' + segment.substr(segment.length - 2);
  });
  const shortDir = pathDetails.root + pathMod.join(...shorterSegments);
  pathDetails.dir = shortDir;
  return pathMod.format(pathDetails);
}

function buildFileInput(folder = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.innerText = 'Choose File';
  if (folder) {
    button.innerText = 'Choose Folder';
  }
  const span = document.createElement('span');
  span.innerText = 'No file chosen';
  if (folder) {
    span.innerText = 'No folder chosen';
  }
  const result = document.createElement('span');
  result.className = 'file-input';
  if (folder) {
    result.classList.add('folder-input');
  }
  result.appendChild(button);
  result.appendChild(document.createTextNode(' '));
  result.appendChild(span);

  let resultPath;

  button.addEventListener('click', () => {
    ipc.send('open', {
      properties: [folder ? 'openDirectory' : 'openFile']
    });
    ipc.once('open', (evt, path) => {
      if (path) {
        resultPath = path[0];
        span.innerText = abbreviatePath(resultPath);
      }
    });
  });

  // Do some magic
  Object.defineProperty(result, 'disabled', {
    configurable: false,
    enumerable: false,
    get() {
      return result.classList.contains('disabled');
    },
    set(disabled) {
      if (disabled) {
        result.classList.add('disabled');
        result.dataset.disabled = 'disabled';
        button.disabled = true;
      } else {
        result.classList.remove('disabled');
        result.dataset.disabled = '';
        button.disabled = false;
      }
    }
  });
  Object.defineProperty(result, 'name', {
    configurable: false,
    enumerable: false,
    get() {
      return result.dataset.name;
    },
    set(name) {
      result.dataset.name = name;
    }
  });
  Object.defineProperty(result, 'value', {
    configurable: false,
    enumerable: false,
    get() {
      throw new Error('can\'t get a value');
    }
  });
  Object.defineProperty(result, 'files', {
    configurable: false,
    enumerable: false,
    get() {
      if (resultPath === undefined) {
        return [];
      }
      return [{path: resultPath}];
    }
  });
  return result;
}

function buildCaseLabel(context, name, text) {
  const enable = document.createElement('input');
  enable.type = 'checkbox';
  enable.name = name + '-enable';
  enable.addEventListener('change', () => {
    context.querySelector(`[data-name="${name}"]`).disabled = !enable.checked;
    context.querySelector(`[data-name="${name}"]`).dataset.disabled = enable.checked ? '' : true;
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
  const workdir = buildFileInput(true);
  workdir.disabled = true;
  workdir.dataset.disabled = true;
  workdir.type = 'file';
  workdir.name = workdir.dataset.name = 'workdir';
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
  args.name = args.dataset.name = 'args';
  const argsP = document.createElement('p');
  argsP.className = 'args';
  argsP.appendChild(argsLabel);
  argsP.appendChild(args);

  const stdinLabel = buildCaseLabel(result, 'stdin', 'Console input file:');
  const stdin = buildFileInput();
  stdin.disabled = true;
  stdin.dataset.disabled = true;
  stdin.type = 'file';
  stdin.name = stdin.dataset.name = 'stdin';
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
    return caseDiv.querySelector(`input[name="${name}"]`) || caseDiv.querySelector(`[data-name="${name}"]`);
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
    if (newCase.querySelector(`input[name="${name}`)) {
      newCase.querySelector(`input[name="${name}`).disabled = false;
      newCase.querySelector(`input[name="${name}`).dataset.disabled = '';
    } else if (newCase.querySelector(`.file-input[data-name=${name}]`)) {
      newCase.querySelector(`.file-input[data-name=${name}]`).disabled = false;
      newCase.querySelector(`.file-input[data-name=${name}]`).dataset.disabled = '';
    }
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
  const subjectPath = document.querySelector('.file-input[data-name="subject"]').files[0].path;
  const truthPath = document.querySelector('.file-input[data-name="truth"]').files[0].path;
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

Array.from(document.querySelectorAll('.file-input')).forEach(input => {
  const replacement = buildFileInput();
  replacement.dataset.name = input.dataset.name;
  const parent = input.parentNode;
  parent.insertBefore(replacement, input);
  input.remove();
});

document.getElementById('new-case').addEventListener('click', addNewCase);

addNewCase();
