const React = require('react');
const _ = require('lodash');

const FileInput = require('./file-input');

const ToggleInput = React.createClass({
  propTypes: {
    name: React.PropTypes.string.isRequired,
    label: React.PropTypes.string.isRequired,
    active: React.PropTypes.bool.isRequired,
    onChange: React.PropTypes.func.isRequired,
    disabled: React.PropTypes.bool,
    children: React.PropTypes.element.isRequired
  },
  handleChange(evt) {
    this.props.onChange(evt.currentTarget.checked);
  },
  render() {
    return (
      <p className={this.props.name}>
        <label>
          <input
            type="checkbox"
            name={`${this.props.name}-enable`}
            checked={this.props.active}
            onChange={this.handleChange}
            disabled={this.props.disabled}
            />
          {this.props.label + ':'}
        </label>
        {this.props.children}
      </p>
    );
  }
});

function toggleable(valueType) {
  return React.PropTypes.shape({
    enabled: React.PropTypes.bool.isRequired,
    value: valueType
  });
}

const Case = React.createClass({
  propTypes: {
    name: React.PropTypes.string,
    workdir: toggleable(React.PropTypes.string),
    args: toggleable(React.PropTypes.string),
    stdin: toggleable(React.PropTypes.string),
    id: React.PropTypes.number.isRequired,
    onChange: React.PropTypes.func.isRequired,
    disabled: React.PropTypes.bool,
    onRemove: React.PropTypes.func.isRequired
  },
  getDefaultProps() {
    return {
      workdir: {enabled: false},
      args: {enabled: false},
      stdin: {enabled: false}
    };
  },
  doToggle(field) {
    return enabled => {
      const result = _.cloneDeep(this.props);
      result[field].enabled = enabled;
      this.props.onChange(result);
    };
  },
  doUpdate(field) {
    return value => {
      const result = _.cloneDeep(this.props);
      result[field].value = value;
      this.props.onChange(result);
    };
  },
  handleNameChange(evt) {
    const result = _.cloneDeep(this.props);
    result.name = evt.currentTarget.value;
    this.props.onChange(result);
  },
  handleArgsChange(evt) {
    const result = _.cloneDeep(this.props);
    result.args.value = evt.currentTarget.value;
    this.props.onChange(result);
  },
  render() {
    return (
      <div className="case-wrapper">
        <div className="case">
          <p className="name">
            <input
              type="text"
              name="name"
              value={this.props.name}
              onChange={this.handleNameChange}
              disabled={this.props.disabled}
              />
          </p>
          <ToggleInput
            active={this.props.workdir.enabled}
            name="workdir"
            label="Working directory"
            onChange={this.doToggle('workdir')}
            disabled={this.props.disabled}
            >
            <FileInput
              name="workdir"
              type="folder"
              disabled={!this.props.workdir.enabled || this.props.disabled}
              path={this.props.workdir.value}
              onChange={this.doUpdate('workdir')}
              />
          </ToggleInput>
          <ToggleInput
            active={this.props.args.enabled}
            name="args"
            label="Command line arguments"
            onChange={this.doToggle('args')}
            disabled={this.props.disabled}
            >
            <input
              type="text"
              name="args"
              data-name="args"
              disabled={!this.props.args.enabled || this.props.disabled}
              value={this.props.args.value || ''}
              onChange={this.handleArgsChange}
              />
          </ToggleInput>
          <ToggleInput
            active={this.props.stdin.enabled}
            name="stdin"
            label="Console input file"
            onChange={this.doToggle('stdin')}
            disabled={this.props.disabled}
            >
            <FileInput
              name="stdin"
              type="file"
              disabled={!this.props.stdin.enabled || this.props.disabled}
              path={this.props.stdin.value}
              onChange={this.doUpdate('stdin')}
              />
          </ToggleInput>
        </div>
        <button
          type="button"
          onClick={this.props.onRemove}
          disabled={this.props.disabled}
          >
          {'\u2718'}
        </button>
      </div>
    );
  }
});

const Cases = React.createClass({
  propTypes: {
    cases: React.PropTypes.array.isRequired,
    onChange: React.PropTypes.func.isRequired,
    disabled: React.PropTypes.bool
  },
  handleChange(val) {
    const result = _.cloneDeep(this.props.cases);
    const valIdx = _.findIndex(result, {id: val.id});
    result[valIdx] = val;
    this.props.onChange(result);
  },
  doRemove(id) {
    return () => {
      let result = _.cloneDeep(this.props.cases);
      result = result.filter(v => v.id !== id);
      this.props.onChange(result);
    };
  },
  handleNew() {
    const cases = _.cloneDeep(this.props.cases);
    const lastCase = cases[cases.length - 1];
    const hasLastCase = Boolean(lastCase);
    const nextCase = {
      name: String(cases.length + 1),
      id: Math.random(),
      workdir: {
        enabled: hasLastCase && lastCase.workdir.enabled
      },
      args: {
        enabled: hasLastCase && lastCase.args.enabled
      },
      stdin: {
        enabled: hasLastCase && lastCase.stdin.enabled
      }
    };
    cases.push(nextCase);
    this.props.onChange(cases);
  },
  render() {
    const makeCase = c => (
      <Case
        {...c}
        key={c.id}
        disabled={this.props.disabled}
        onChange={this.handleChange}
        onRemove={this.doRemove(c.id)}
        />
    );
    return (
      <section id="cases-wrapper">
        <h1>
          Test cases
          <button type="button" id="new-case" onClick={this.handleNew} disabled={this.props.disabled}>+</button>
        </h1>
        <div id="cases">
          {this.props.cases.map(makeCase)}
        </div>
      </section>
    );
  }
});

module.exports = Cases;
