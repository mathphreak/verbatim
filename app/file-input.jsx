const pathMod = require('path');

const React = require('react');
const ipc = require('electron').ipcRenderer;

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

const FileInput = React.createClass({
  propTypes: {
    type: React.PropTypes.oneOf(['file', 'folder']).isRequired,
    path: React.PropTypes.string,
    onChange: React.PropTypes.func.isRequired,
    disabled: React.PropTypes.bool,
    name: React.PropTypes.string.isRequired
  },
  handleChoose() {
    ipc.send('open', {
      properties: [this.props.type === 'folder' ? 'openDirectory' : 'openFile']
    });
    ipc.once('open', (evt, path) => {
      if (path) {
        this.props.onChange(path[0]);
      }
    });
  },
  render() {
    const isFolder = this.props.type === 'folder';
    let label = `No ${isFolder ? 'folder' : 'file'} chosen`;
    if (this.props.path) {
      label = abbreviatePath(this.props.path);
    }
    const classes = ['file-input'];
    if (isFolder) {
      classes.push('folder-input');
    }
    if (this.props.disabled) {
      classes.push('disabled');
    }
    return (
      <span
        className={classes.join(' ')}
        data-name={this.props.name}
        data-disabled={this.props.disabled ? 'disabled' : ''}
        >
        <button
          type="button"
          onClick={this.handleChoose}
          disabled={this.props.disabled}
          >Choose {isFolder ? 'Folder' : 'File'}
        </button>
        <span>{label}</span>
      </span>
    );
  }
});

module.exports = FileInput;
