
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
			title : `New Message From ${chatObject.senderId}`,
			cover:  urlFunc(chatObject['imageUrl'] || chatObject.imgUrl,'L'),
			body:`${chatObject.senderId}: ${chatObject.prompt.length > 100 ? chatObject.prompt.slice(0,100)+'...':chatObject.prompt}`,
			quary: `room=${chatObject.userkey}&${chatObject.chatId}`
		}


	    await this.showNotificaton(notfctn)
		this.seenMsgs[chatObject.chatId] = 1
	}
}


class Course {
	constructor(courseName,goal,img,id) {
		this.name = courseName
		this.goal = goal
		this.img = img
		this.id = id
	}

	coursepreveiw() {
		const section = document.createElement("section");

		section.style = `
		min-height:100vh;
		width:100%;
		display:flex;
		flex-direction:column;
		justify-content:center;
		align-items:center;
		padding:25px;
		box-sizing:border-box;
		background:
		linear-gradient(
		rgba(0,0,0,0.65),
		rgba(0,0,0,0.65)
		),
		url("https://www.sourcesplash.com/i/random?q=${this.name}");
		background-size:cover;
		background-position:center;
		background-repeat:no-repeat;
		font-family:Arial,sans-serif;
		text-align:center;
		color:white;
		gap:18px;
		`;
		
		section.innerHTML = `
		<h1 style="
		font-size:clamp(2rem,8vw,4rem);
		margin:0;
		font-weight:800;
		line-height:1.1;
		letter-spacing:1px;
		">
		${this.name}
		</h1>
		
		<img 
		src="https://www.sourcesplash.com/i/random?q=${this.name} logo"
		style="
		width:120px;
		height:120px;
		object-fit:cover;
		border-radius:24px;
		box-shadow:0 10px 30px rgba(0,0,0,0.4);
		background:white;
		padding:10px;
		"
		/>

		<button style="
		padding:14px 28px;
		border:none;
		border-radius:14px;
		background:white;
		color:#111;
		font-size:1rem;
		font-weight:700;
		cursor:pointer;
		box-shadow:0 8px 20px rgba(0,0,0,0.25);
		transition:0.3s;
		"
		onclick="showCourse('${this.id}');
		document.getElementById(lastSeenMsg[activeKey]).scrollIntoView({ behavior: 'smooth' });"
		>
		Get Started
		</button>
		
		<p style="
		max-width:700px;
		font-size:1rem;
		line-height:1.7;
		margin:0;
		color:rgba(255,255,255,0.9);
		">
		${this.goal}
		</p>
		
		
		`;

		
		return section
	}

}
