const React = require('react');

const buttonText = {
  waiting: 'Run!',
  running: 'Abort!',
  watching: 'Stop!'
};

const Result = React.createClass({
  propTypes: {
    testCase: React.PropTypes.shape({
      name: React.PropTypes.string
    }),
    results: React.PropTypes.shape({
      subject: React.PropTypes.string.isRequired,
      truth: React.PropTypes.string.isRequired
    })
  },
  render() {
    const {testCase, results} = this.props;
    const resultClass = (results.subject === results.truth ? 'success' : 'failure');
    return (
      <div className="exe-output">
        <p>{testCase.name || JSON.stringify(testCase)}</p>
        <div className="row">
          <div className="exe-output subject">
            <div className={resultClass}>
              <pre>{results.subject}</pre>
            </div>
          </div>
          <div className="exe-output truth">
            <div className={resultClass}>
              <pre>{results.truth}</pre>
            </div>
          </div>
        </div>
      </div>
    );
  }
});

const Output = React.createClass({
  propTypes: {
    state: React.PropTypes.oneOf(['waiting', 'running', 'watching']).isRequired,
    results: React.PropTypes.array,
    onStateAdvance: React.PropTypes.func.isRequired
  },
  getDefaultProps() {
    return {
      results: []
    };
  },
  render() {
    return (
      <section id="output-wrapper">
        <button type="button" id="run" onClick={this.props.onStateAdvance}>
          {buttonText[this.props.state]}
        </button>
        <h1>Output</h1>
        <article id="output">
          {this.props.results.map(r => <Result {...r} key={r.testCase.id} />)}
        </article>
      </section>
    );
  }
});

module.exports = Output;
