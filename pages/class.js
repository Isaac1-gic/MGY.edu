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
		await navigator.serviceWorker.controller.postMessage(
			{
				type: "SHOW_NOTIFICATION",
				payload: notificationObject
			}
		)
		
	}

	async createNotification(chatObject,urlFunc) {
		if (chatObject.userkey == this.userkey || !chatObject || !this.ready || this.seenMsgs[chatObject.chatId]) return
		const notfctn = {
			id:chatObject.chatId,
			sender:chatObject.senderId,
			cover: urlFunc(chatObject.imgUrl,'S'),
			body:chatObject.prompt.length > 45 ? chatObject.prompt.slice(0,45)+'...':chatObject.prompt,
			quary: `room=${chatObject.userkey}&${chatObject.chatId}`,
			img: urlFunc(chatObject['imageUrl'],'L') || './img/mgy.jpg'
		}
		console.log(notfctn.img)
		console.log(notfctn.cover)
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
