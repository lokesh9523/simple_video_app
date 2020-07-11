const ws = new WebSocket('ws://localhost:8080')

ws.onopen = () => {
  console.log('Connected to the signaling server')
}

ws.onerror = err => {
  console.error(err)
}

ws.onmessage = msg => {
  console.log('Got message', msg.data)

  const data = JSON.parse(msg.data)

  switch (data.type) {
    case 'login':
      handleLogin(data.success)
      break
    case 'offer':
      handleOffer(data.offer, data.username)
      break
    case 'answer':
      handleAnswer(data.answer)
      break
    case 'candidate':
      console.log(data.candidate,"datecandiate")
      handleCandidate(data.candidate)
      break
    case 'close':
      handleClose()
      break
    default:
      break
  }
}

let connection = null
let name = null
let otherUsername = null

const sendMessage = message => {
  if (otherUsername) {
    message.otherUsername = otherUsername
  }

  ws.send(JSON.stringify(message))
}

document.querySelector('div#call').style.display = 'none'

document.querySelector('button#login').addEventListener('click', event => {
  username = document.querySelector('input#username').value

  if (username.length < 0) {
    alert('Please enter a username 🙂')
    return
  }

  sendMessage({
    type: 'login',
    username: username
  })
})

const handleLogin = async success => {
  if (success === false) {
    alert('😞 Username already taken')
  } else {
    document.querySelector('div#login').style.display = 'none'
    document.querySelector('div#call').style.display = 'block'
    // var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    // var cameraStream;
    
    // getUserMedia.call(navigator, {
    //     video: true,
    //     audio: true //optional
    // }, function (stream) {
    //     /*
    //     Here's where you handle the stream differently. Chrome needs to convert the stream
    //     to an object URL, but Firefox's stream already is one.
    //     */
    //     if (window.webkitURL) {
    //         video.src = window.webkitURL.createObjectURL(stream);
    //     } else {
    //         video.src = stream;
    //     }
    
    //     //save it for later
    //     cameraStream = stream;
    
    //     video.play();
    // });
    let localStream
    try {
       navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      }).then(stream=>{
localStream = stream;
console.log(stream,"==============");

console.log(localStream,"========================")
    document.querySelector('video#local').srcObject = localStream

    const configuration = {
      iceServers: [{ url: 'stun:stun2.1.google.com:19302' }]
    }

    connection = new RTCPeerConnection(configuration)

    connection.addStream(localStream)

    connection.onaddstream = event => {
      document.querySelector('video#remote').srcObject = event.stream
    }

    connection.onicecandidate = event => {
      if (event.candidate) {
        sendMessage({
          type: 'candidate',
          candidate: event.candidate
        })
      }
    }
      }).catch(error=>{

      })
    } catch (error) {
      alert(`${error.name}`)
      console.error(error)
    }
  }
}

document.querySelector('button#call').addEventListener('click', () => {
  const callToUsername = document.querySelector('input#username-to-call').value

  if (callToUsername.length === 0) {
    alert('Enter a username 😉')
    return
  }

  otherUsername = callToUsername

  connection.createOffer(
    offer => {
      sendMessage({
        type: 'offer',
        offer: offer
      })

      connection.setLocalDescription(offer)
    },
    error => {
      alert('Error when creating an offer')
      console.error(error)
    }
  )
})

const handleOffer = (offer, username) => {
  otherUsername = username;
  console.log(offer)
  connection.setRemoteDescription(new RTCSessionDescription(offer),function(){
    connection.createAnswer(
      answer => {
        connection.setLocalDescription(answer)
        sendMessage({
          type: 'answer',
          answer: answer
        })
      },
      error => {
        alert('Error when creating an answer')
        console.error(error)
      }
    )

  }, function(e) {
    console.log("Could not set remote description. Reason: " + e);
});
}

const handleAnswer = answer => {
  connection.setRemoteDescription(new RTCSessionDescription(answer))
}

const handleCandidate = candidate => {
  console.log(candidate)
  connection.addIceCandidate(new RTCIceCandidate(candidate))
}

document.querySelector('button#close-call').addEventListener('click', () => {
  sendMessage({
    type: 'close'
  })
  handleClose()
})

const handleClose = () => {
  otherUsername = null
  document.querySelector('video#remote').src = null
  connection.close()
  connection.onicecandidate = null
  connection.onaddstream = null
}