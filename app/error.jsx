const React = require('react');

const ErrorDisplay = React.createClass({
  propTypes: {
    err: React.PropTypes.instanceOf(Error)
  },
  render() {
    const real = Boolean(this.props.err);
    const name = real ? this.props.err.name : false;
    const stack = real ? this.props.err.stack : false;
    return (
      <section id="error" hidden={!real}>
        <h2 className="name">{name}</h2>
        <pre className="stack">{stack}</pre>
      </section>
    );
  }
});

module.exports = ErrorDisplay;
