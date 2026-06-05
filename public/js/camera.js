const video =
document.getElementById("camera");

navigator.mediaDevices
.getUserMedia({
  video:true
})
.then(stream => {
  video.srcObject = stream;
})
.catch(err => {
  console.error(err);
});