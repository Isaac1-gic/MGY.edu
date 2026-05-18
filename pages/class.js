let mediaRecorder;
let chucks = [];
let stream ;

const tempVideo = document.createElement('video')
const audioRecBt = document.getElementById('audioRecBt')

audioRecBt.onclick = async () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        return
    }
    const stream = await navigator.mediaDevices.getUserMedia({audio : true})
    mediaRecorder = new MediaRecorder(stream)
    chucks = [];

    mediaRecorder.ondataavailable = (event) =>{
        chucks.push(event.data)
    }

    mediaRecorder.onstop = async () =>{
        const audioBlob = new Blob(chucks, {type: 'audio/webm'})
        const fileUrl = URL.createObjectURL(audioBlob)
        console.log(fileUrl)
        document.getElementById("o").src = fileUrl//await upload(audioBlob)
        stream.getTracks().forEach(track => track.stop());
        mediaRecorder = null;
    }

    mediaRecorder.start();

}

async function takePhoto(shot) {
        if (!shot) {
            stream = navigator.mediaDevices.getUserMedia({video: true})
            tempVideo.srcObject = stream 
        } else {
              tempVideo.onloadedmetadata = async () =>{
                tempVideo.play()
    
                const canvas = document.createElement('canvas');
                canvas.width = tempVideo.videoWidth
                canvas.height = tempVideo.videoHeight
                canvas.getContext('2d').drawImage(tempVideo,0,0)
                const fileUrl = canvas.toDataURL('image/png')
                stream.getTracks.forEach(track => track.stop())
            }  
        }
        
}


class GICai {
    constructor(history,element) {
        this.history = history
		this.element = element
        this.aiChat = history ? model.startChat(
                {history : history}
            ) : model.startChat()
    }
    writing(id,user){
		const div = document.createElement('div');
		div.className = `msg-bubble ${user ? 'sent':'recv'}`
		div.id = id
		return div;
	}

	async init(){
		if(! this.history) return
		this.element.innerHTML = ''
		let i = 0
		this.history.forEach(chat =>{
			const qID = Date.now()+i
			i ++;
			this.element.append(this.writing(qID,chat.role == 'user'))
			if (chat.role == 'user') {
				document.getElementById(qID).textContent = chat.parts[0].text;
			} else {
				document.getElementById(qID).innerHTML = marked.parse(chat.parts[0].text);
			}
			
		})
	}
	
    async chat(msg){
		const qID = Date.now()
		this.element.append(this.writing(qID,true))
		document.getElementById(qID).textContent = msg;
        const result = await this.aiChat.sendMessageStream(msg)
        let text = ''
		this.fillHistory('user',msg)
		const ansID = Date.now()
		this.element.append(this.writing(ansID))
		const elem = document.getElementById(ansID)
        for await(const chunk of result.stream){
            const chunkText = chunk.text();
			elem.innerHTML += marked.parse(chunkText);;
            text += chunkText;

        }
		
		this.fillHistory('model',text)
        await localDB.saveData('history',this.history)
        return text;
    }

	fillHistory(user,text){
		this.history = this.history || []
		this.history.push({
		        "role": user,
		        "parts": [
		            {
		                "text": text
		            }
		        ]
		    }
		)
	}
}

class MGYNotification {
	constructor(seenMsgs,userkey) {
		this.seenMsgs = seenMsgs
		this.userkey = userkey
		this.ready = false
		this.init()
	}

	async init() {
		await this.registerSW()
		await navigator.serviceWorker.ready
		if (! navigator.serviceWorker.controller) location.reload()
		await this.requestPermission()
		this.ready = true
	}

	async requestPermission() {
		if (!('Notification' in window)) throw new Error("Notifications are not supported.")
		const result = await Notification.requestPermission()
		if (!(result === "granted")) throw new Error("Notifications permission denied.")
		return true
	}

	async registerSW() {
		if ('serviceWorker' in navigator) {
			const reg = await navigator.serviceWorker.register('serviceworker.js', {scope: './'})
			if ('periodicSync' in reg) {
				try {
					await reg.periodicSync.register('Notifications',{minInterval: 15 * 60 * 1000})
				} catch (e) {
					
				}
				return reg
			}
		}
	}

	async showNotificaton(notificationObject) {
		const response = await fetch(notificationObject.img);
		const Blod = await response.blob();
		const fileReader = new FileReader()
		fileReader.onloadend = async () =>{
			notificationObject.img = fileReader.result;
			await navigator.serviceWorker.controller.postMessage(
				{
					type: "SHOW_NOTIFICATION",
					payload: notificationObject
				}
			)
				
		};
		fileReader.readAsDataURL(Blod)
		
	}

	async createNotification(chatObject,urlFunc) {
		if (chatObject.userkey == this.userkey || !chatObject || !this.ready || this.seenMsgs[chatObject.chatId]) return
		const notfctn = {
			id:chatObject.chatId,
			sender:chatObject.senderId,
			img:chatObject.imgUrl,
			body:chatObject.prompt.length > 45 ? chatObject.prompt.slice(0,45)+'...':chatObject.prompt,
			quary: `room=${chatObject.userkey}&${chatObject.chatId}`,
			cover: urlFunc(chatObject['imageUrl'],'L') || './img/mgy.jpg'
		}
	    await this.showNotificaton(notfctn)
		this.seenMsgs[chatObject.chatId] = 1
	}
}


class course {
	constructor(courseName,goal,img,id) {
		this.name = courseName
		this.goal = goal
		this.img = img
		this.id = id
	}

	coursepreveiw() {
		section = document.createElement('section')
		section.style = `max-height: 30vh; background-image: url(${this.img});`
		h1 = document.createElement('h1')
		h1.textContent = this.name
		button = document.createElement('button')
		button.className = 'btn'
		button.textContent = 'Get Started'
		button.onclick = () => {
			showCourse(this.id)
		}
		p = document.createElement('p')
		p.textContent = this.goal

		section.append(h1,button,p)
		return section
	}

}
