// ... Your existing index.js code ...
const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/ogg; codecs=opus' });
// When sending the blob to server:
formData.append('audio', blob, 'input.ogg');