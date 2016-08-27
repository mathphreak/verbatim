const fs = require('fs');
const _ = require('lodash');

const React = require('react');
const ReactDOM = require('react-dom');

const Exes = require('./exes');
const Cases = require('./cases');
const ErrorDisplay = require('./error');
const Output = require('./output');
const UpdateNotification = require('./update-notification');

const runCases = require('./run-cases');

const Persistence = {
  save(fullState) {
    const realState = _.pick(fullState, ['watchSubject', 'subject', 'truth', 'cases']);
    localStorage.verbatimData = JSON.stringify(realState);
  },
  load() {
    const verbatimData = localStorage.verbatimData;
    return verbatimData ? JSON.parse(localStorage.verbatimData) : {};
  }
};

const App = React.createClass({
  getInitialState() {
    return _.defaults(Persistence.load(), {
      err: undefined,
      state: 'waiting',
      watchSubject: false,
      watcher: undefined,
      subject: undefined,
      truth: undefined,
      cases: [{
        name: '1',
        id: Math.random(),
        workdir: {enabled: false},
        args: {enabled: false},
        stdin: {enabled: false}
      }],
      results: undefined
    });
  },
  handleSubjectChange(subject) {
    this.setState({subject});
  },
  handleSubjectWatchChange(watchSubject) {
    this.setState({watchSubject});
  },
  handleTruthChange(truth) {
    this.setState({truth});
  },
  handleCasesChange(cases) {
    this.setState({cases});
  },
  componentDidMount() {
    process.on('uncaughtException', this.handleError);
  },
  componentWillUpdate() {
    Persistence.save(this.state);
  },
  handleError(err) {
    const result = {err};
    if (this.state.state === 'running') {
      result.state = this.state.watcher ? 'watching' : 'waiting';
    }
    this.setState(result);
  },
  runTests() {
    let handle = runCases(this.state.subject, this.state.truth, this.state.cases);
    handle = handle.then(results => {
      this.setState({
        results,
        state: this.state.watcher ? 'watching' : 'waiting'
      });
    }).catch(this.handleError);
    this.setState({state: 'running', results: undefined});
  },
  handleStateAdvance() {
    this.setState({err: undefined});
    if (this.state.state === 'waiting') {
      this.runTests();
      if (this.state.watchSubject) {
        const watcher = fs.watch(this.state.subject, _.debounce(this.runTests, 2000, {trailing: true}));
        this.setState({watcher});
      }
    } else if (this.state.state === 'running') {
      runCases.abort();
      this.setState({
        state: this.state.watcher === undefined ? 'waiting' : 'watching'
      });
    } else if (this.state.state === 'watching') {
      let watcher = this.state.watcher;
      watcher.close();
      watcher = undefined;
      this.setState({watcher, state: 'waiting'});
    }
  },
  render() {
    const inProgress = this.state.state !== 'waiting';
    return (
      <div className="container">
        <UpdateNotification />
        <Exes
          subject={this.state.subject}
          watchSubject={this.state.watchSubject}
          truth={this.state.truth}
          disabled={inProgress}
          onSubjectChange={this.handleSubjectChange}
          onSubjectWatchChange={this.handleSubjectWatchChange}
          onTruthChange={this.handleTruthChange}
          />
        <Cases
          cases={this.state.cases}
          onChange={this.handleCasesChange}
          disabled={inProgress}
          />
        <ErrorDisplay err={this.state.err} />
        <Output
          state={this.state.state}
          results={this.state.results}
          onStateAdvance={this.handleStateAdvance}
          />
      </div>
    );
  }
});

ReactDOM.render(
  <App />,
  document.getElementById('app')
);
