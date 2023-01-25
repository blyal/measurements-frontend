// fetch('http://example.com', {
//     keepalive: true
// });

const filePath = './get-file';
let fileData;

fetch(filePath)
  .then((response) => response.blob())
  .then((data) => {
    console.log(data);
    fileData = data;
  });

const sendFile = () => {
  console.log('sending');
  fetch('http://localhost:1414/uplink', {
    method: 'POST',
    body: fileData,
  })
    .then((response) => {
      console.log(
        'File successfully received by server \n Response: ',
        response
      );
    })
    .catch((error) => {
      console.error('Error sending file to server: ', error);
    });
};

const button = document.getElementById('runTests');
button.addEventListener('click', sendFile);
