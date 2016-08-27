const React = require('react');
const request = require('request');
const semver = require('semver');
const electron = require('electron');

const packageInfo = require('../package.json');

const UpdateNotification = React.createClass({
  getInitialState() {
    return {
      link: undefined
    };
  },
  componentDidMount() {
    const params = {
      url: 'https://api.github.com/repos/mathphreak/verbatim/releases/latest',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ReliefValve update check'
      },
      json: true
    };
    if (process.env.GITHUB_API_TOKEN) {
      params.headers.Authorization = `token ${process.env.GITHUB_API_TOKEN}`;
    }
    request(params, (err, response, release) => {
      if (!err) {
        const latestVersion = release.tag_name;
        const assets = release.assets;
        const outdated = latestVersion && semver.lt(packageInfo.version, latestVersion);
        if (outdated && assets.length > 0) {
          this.setState({
            latest: latestVersion,
            current: packageInfo.version,
            link: release.html_url
          });
        }
      }
    });
  },
  handleLinkClick(evt) {
    if (this.state.link) {
      electron.shell.openExternal(this.state.link);
      evt.preventDefault();
    }
  },
  render() {
    const outdated = Boolean(this.state.link);
    if (!outdated) {
      return false;
    }
    return (
      <section id="update-notification">
        <p>
          An update to
          {' '}
          <a href={this.state.link} onClick={this.handleLinkClick}>Verbatim {this.state.latest}</a>
          {' '}
          is available (you're running {this.state.current}).
        </p>
      </section>
    );
  }
});

module.exports = UpdateNotification;
