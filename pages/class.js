
class MGYNotification {
	constructor(seenMsgs) {
		this.seenMsgs = seenMsgs
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
			const reg = await navigator.serviceWorker.register('serviceWorker.js', {scope: './'})
			if ('periodicSync' in reg) {
				try {
					await reg.periodicSync.register('Notifications',{minInterval: 15: 60: 1000})
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

	async createNotification(chatObject) {
		if !chatObject || !this.ready || this.seenMsgs[chatObject.chatId] return
		const notfctn = {
			id:chatObject.chatId,
			sender:chatObject.senderId,
			img:chatObject.imgUrl,
			body:chatObject.prompt.length > 45 ? chatObject.prompt.slice(0,45)+'...':chatObject.prompt,
			quary: chatObject.userkey + '=' + chatObject.chatId
		}
	    await this.showNotificaton(notfctn)
		this.seenMsgs[chatObject.chatId] = 1
	}
}
