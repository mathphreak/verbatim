const React = require('react');

const FileInput = require('./file-input');

const Exes = React.createClass({
  propTypes: {
    subject: React.PropTypes.string,
    watchSubject: React.PropTypes.bool,
    truth: React.PropTypes.string,
    disabled: React.PropTypes.bool.isRequired,
    onSubjectChange: React.PropTypes.func.isRequired,
    onSubjectWatchChange: React.PropTypes.func.isRequired,
    onTruthChange: React.PropTypes.func.isRequired
  },
  handleWatchChange(evt) {
    this.props.onSubjectWatchChange(evt.currentTarget.checked);
  },
  render() {
    return (
      <section id="exes">
        <h1>Executables</h1>
        <div className="row">
          <form className="exe-input subject">
            <div>
              Your executable:
              <br />
              <FileInput
                type="file"
                path={this.props.subject}
                disabled={this.props.disabled}
                onChange={this.props.onSubjectChange}
                name="subject"
                />
            </div>
            <br />
            <label>
              <input
                type="checkbox"
                name="watch-subject"
                checked={this.props.watchSubject}
                onChange={this.handleWatchChange}
                />
              Watch for changes?
            </label>
          </form>
          <form className="exe-input truth">
            <label>
              Authoritative executable:
              <br />
              <FileInput
                type="file"
                path={this.props.truth}
                disabled={this.props.disabled}
                onChange={this.props.onTruthChange}
                name="truth"
                />
            </label>
          </form>
        </div>
      </section>
    );
  }
});

module.exports = Exes;
