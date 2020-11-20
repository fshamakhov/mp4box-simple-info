const myVideos = [];

window.URL = window.URL || window.webkitURL;

document.getElementById('fileUp').onchange = processFile;

const errorBox = document.getElementById('error');

const chunkSize  = 1024 * 1024;

function parseFile(fileObj, cb) {
  const fileSize = fileObj.size;
  let offset = 0;
  let readBlock = null;

  const mp4BoxFile = MP4Box.createFile(false);

  mp4BoxFile.onError = function (e) {
    console.log("Failed to parse ISOBMFF data");
    throw e;
  };

  const onParsedBuffer = function (mp4BoxFileObj, buffer) {
    // console.log("Appending buffer with offset " + offset);
    buffer.fileStart = offset;
    mp4BoxFileObj.appendBuffer(buffer);
  };

  const onBlockRead = function (evt) {
    if (evt.target.error == null) {
      onParsedBuffer(mp4BoxFile, evt.target.result); // callback for handling read chunk
      offset += evt.target.result.byteLength;
    } else {
      console.error("Read error: " + evt.target.error);
      return;
    }
    if (offset >= fileSize) {
      // console.log("Done reading file (" + fileSize + " bytes) in " + (new Date() - startDate) + " ms");
      mp4BoxFile.flush();
      cb(fileObj, mp4BoxFile.getInfo());
      return;
    }

    readBlock(offset, chunkSize, fileObj);
  };

  readBlock = function (_offset, length, _file) {
    const r = new FileReader();
    const blob = _file.slice(_offset, length + _offset);
    r.onload = onBlockRead;
    r.readAsArrayBuffer(blob);
  };

  readBlock(offset, chunkSize, fileObj);
}

function setFileInfo(file, info) {
  console.log(info);
  if (!info.hasMoov || info.mime.indexOf('video/mp4') < 0) {
    const msg = 'Invalid video format';
    errorBox.textContent = msg;
    console.error(msg);
    return;
  }
  const videoTrack = info.videoTracks 
    ? info.videoTracks[0]
    : info.tracks.find(t => t.name.indexOf('Video') > -1);
  if (!videoTrack) {
    const msg = 'No video tracks found';
    errorBox.textContent = msg;
    console.error(msg);
    return;
  }
  const audioTrack = info.audioTracks
    ? info.audioTracks[0]
    : info.tracks.find(t => t.name.indexOf('Audio') > -1);
  if (!audioTrack) {
    const msg = 'No audio tracks found';
    errorBox.textContent = msg;
    console.error(msg);
    return;
  }
  myVideos.push({
    name: file.name,
    video: {
      ...videoTrack.video,
      bitrate: videoTrack.bitrate,
      codec: videoTrack.codec,
    },
    audio: {
      codec: audioTrack.codec,
      bitrate: audioTrack.bitrate,
    }
  });
  updateInfos();
}

function processFile() {
  errorBox.textContent = '';
  try {
    parseFile(this.files[0], setFileInfo);
  } catch (e) {
    console.error(e);
  }
}


function updateInfos() {
  const infos = document.getElementById('infos');
  infos.textContent = JSON.stringify(myVideos, undefined, 2);
}