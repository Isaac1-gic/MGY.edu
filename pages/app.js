		let db = null;
        let scrolled;
        const today = new Date().toISOString().split('T')[0];
        let requestURL = 'https://script.google.com/macros/s/AKfycbxp11rUqcpJotJ9ne1xJmeGS1ClWhWCYyyhwkNcyp7RGyZkpo284PM6WsEg7XWjg6AL/exec';
        const todaycheck = new Date().toISOString().split('T')[0];
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
		const textarea = document.getElementById('textprompt-chat');
		const activeChat = document.getElementById("active-user")
		let profileImg;
		let img;
		let userkey;
		let activeScreen;
		let chatPath;
		let tempPost = {types : []}
		let firstMsg = false;
        let userData = {userInfo:{'Country code': '265'},
						freinds: 'initialized',
						messageBox: 'initialized'	   
			};
        let mgy = {
                    };
		let activeKey = 'mgyPosts';
        let timeStamp = Date.now();
		let SPACE_TIME = 30000;
		let deferredInstallPrompt = null;
		let installAsked = false;

window.addEventListener('beforeinstallprompt', (e) => {    
	e.preventDefault();            
    deferredInstallPrompt = e;        
    maybeShowInstall();                 
});




        
        function showAlert() {
            alert('Welcome to Web School! Registration is opening soon.');
        }
        function toggleMenu() {
            document.getElementById('main-nav').classList.toggle('active');
        }
        async function closeMenuOnMobile(id) {
			
            if (window.innerWidth <= 768) {
                document.getElementById('main-nav').classList.remove('active');
            }
			await switchPage(id)
        }
		async function create_update_account(){
			const formBt = document.getElementById('sgnBt')
			const form = document.getElementById('form')
			function handleLoginFailure() {
			    alert('Failed to create account!');
			    formBt.disabled = false;
				formBt.innerText = "Login";
			}
				
					formBt.disabled = true;
					try{
						await createUserWithEmailAndPassword(userAuth,userData.userInfo['Email'] || userData.userInfo['username'].replaceAll(' ','')+'@mgy.com', userData.userInfo['Password'])
						delete userData.userInfo['Password']
						switchPage('homePage')
						const userNow = userAuth.currentUser; 

						if (userNow) {
							userkey = userNow.uid;
							path = ref(database,`users/${userkey}`)
							await set(path,userData)
							await saveData('key',userkey)
							await saveData('userData',userData)
							alert("Success! Welcome to MGY.");
						}else {
							handleLoginFailure()
						}
					} catch (e){
						if (e.code === 'auth/email-already-in-use') {
						    alert("That username is already taken!");
							return
					    }
						console.warn(e)
						handleLoginFailure()
					}
		}
		async function EmailAndPassword(currentU,currentP){
			const userCredential  = await signInWithEmailAndPassword(userAuth,currentU.replaceAll(' ','')+'@mgy.com',currentP)
			
	        userkey = userCredential.user.uid;
			path = ref(database,`users/${userkey}`)
			const snapshot = await get(path);
			userData = await snapshot.val();    
			await saveData('userData', snapshot.val());
		}

		async function login() {
			const logInFm = document.getElementById("loginForm");
			const loginBtn = document.getElementById("login-btn");
				loginBtn.disabled = true;
				loginBtn.innerText = "Checking...";
				const currentU = document.getElementById("usernameS").value;
				const currentP = document.getElementById("passwordS").value;
				try {
					
					loginBtn.innerText = "Checking...";
					await EmailAndPassword(currentU,currentP)
					alert("Success! Welcome to MGY.");
					switchPage('homePage');
					
			    } catch (err) {
			        console.error(err);
			        handleLoginFailure();
			    }
			
			function handleLoginFailure() {
			    alert("Wrong username or password.");
			    loginBtn.disabled = false;
				loginBtn.innerText = "Login";
			}
			
		}
		async function switchPage(pageId,id){
			document.getElementsByName('page').forEach(pg =>{
				pg.hidden = true
			})
			
			if(id == 'newAcnt'){
				document.getElementById(pageId).hidden = false
				edit('new')
				return
			}
			else if (!userkey && pageId != "signPage"){
				
				switchPage("signPage")
				return
			}
			const page = document.getElementById(pageId)
			page.hidden = false
			if (pageId == "chatPage"){
				manageChat()
			}else if (pageId == "profilePage"){
				if(id){
					profileUpdater(id,true)
					return
				}
				setupImageUpload('profile-input', 'profile-img-preview');
                setupImageUpload('cover-input', 'cover-img-preview');
                profileUpdater(userData)
			}else if (pageId == "homePage") {
				activeKey = "mgyPosts";
			}
		}

		function edit(job){
			document.getElementById("editProfile").hidden = false
			if (job == 'edit'){
				document.getElementById("edit").classList.add('active')
				const inputs = document.getElementsByName('input')
				let i = 0
				const noEdit = [0,1,2,4,5,8]
				inputs.forEach(input => {
					if (noEdit.includes(i)){
						input.hidden = true
					}
					i ++
				})
			}else if(job == 'new'){
				document.getElementsByName('show').forEach(show =>{
					show.hidden = true
				})
			}
		}

		async function message(user,id){
			console.log(userkey , user)
			if(userkey == id){
				alert('Oooh! Why you wanna message yourself?');
				return;
			} 
			let chatKey = `${id}-${userkey}`
			if (!userData['messageBox'][chatKey]){
				userData['messageBox'] = userData['messageBox'] == 'initialized' ? {}:userData['messageBox']
				userData['messageBox'][chatKey] = user.userInfo.username
				user['messageBox'][chatKey] = userData.userInfo.username
				try{
					user_ref = ref(database,`users/${userkey}/messageBox`)
					await set(user_ref,userData['messageBox'])
					user_ref = ref(database,`users/${id}/messageBox`)
					await set(user_ref,user['messageBox'])
					manageChat(chatKey)
					alert('Hello! '+userData.userInfo.username)
					return;
				} catch (error) {console.warn(error)}
			}
			switchPage('chatPage')
			manageChat()
		}

		async function getUser(userKey,users={}) {
			if(users[userKey]){
				return users[userKey]
			}
			try{
				user_ref = ref(database,'users/'+userKey)
				const snapshot = await get(user_ref)
				const user = snapshot.val()
				users[userKey] = user
				return user
			} catch (error) {console.warn(error)}
		}
		async function profileUpdater(userId,get=false){
			if(get){
				const msg = document.getElementById("message")
				msg.hidden = false
				
				document.getElementById("edit").hidden = true
				document.getElementsByName('lebel').forEach(lebel =>{
					lebel.hidden = true
				})
				document.getElementsByName('input').forEach(lebel =>{
					lebel.hidden = true
				})
				user = userId == userkey ? userData:await getUser(userId)
				msg.onclick = () =>{
					message(user,userId)
				}
			}else{
				user = userData;
			}
			document.getElementById('user').textContent = user["userInfo"]['username']
			document.getElementById('friends').textContent = user['freinds']== 'initialized' ? '0' + " Friends" : user['freinds'].length + " Friends"
			document.getElementById('bio').textContent = user["userInfo"]['Bio'] || "Today is your tomorrow history. If you are genius enough, make your famous history today."
			if(user["userInfo"]['profile-img-preview']){
				document.getElementById('pro-img').src = getOptimizedImageUrl(user["userInfo"]['profile-img-preview'])
				document.getElementById('profile-img-preview').src = getOptimizedImageUrl(user["userInfo"]['profile-img-preview'],'M')
			}else{
				document.getElementById('profile-img-preview').src = 'img/mwflag.png'
			}
			if(user["userInfo"]['cover-img-preview']){
				document.getElementById('cover-img-preview').src = getOptimizedImageUrl(user["userInfo"]['cover-img-preview'],'L')
			}else {
				document.getElementById('cover-img-preview').src = 'img/mgyG.jpg'
			}
			document.getElementById('email').textContent = user["userInfo"]['Email']
			document.getElementById('phone-number').textContent = user["userInfo"]['Country code'] + user["userInfo"]['Phone number']
			document.getElementById('dob').textContent = user["userInfo"]['DOB']
			document.getElementById('sex').textContent = user["userInfo"]['Sex']
			document.getElementById('district').textContent = user["userInfo"]['District']
			document.getElementById('work').textContent = user["userInfo"]['Work']
			document.getElementById('mgy-role').textContent = user["userInfo"]['MGY role']
			document.getElementById('edu-level').textContent = user["userInfo"]['Educational level']
			
			
		}

		async function updateProfile(key,value){
			if(!key && !value) return
			userData["userInfo"][key] = value
			if (key == 'Password' && userData["userInfo"]['First name'] && userData["userInfo"]['Last name']){
				userData["userInfo"]['username'] = `${userData["userInfo"]['First name']} ${userData["userInfo"]['Last name']}`
			}
			
		}

		/**
		* HANDLER FOR IMAGE UPLOADS
		* @param {string} inputId - The ID of the hidden file input
		* @param {string} previewId - The ID of the img element to update
		*/
		async function setupImageUpload(inputId, previewId) {
			const input = document.getElementById(inputId);
			let preview;
			if (previewId){
				preview = document.getElementById(previewId);
				
			}
			input.addEventListener('change', async function() {
				const file = input.files[0];
				
				if (file) {
					// 1. Basic Validation (Size check example)
					if (file.size > 1024 * 1024) {
						alert("File is too large (max 1MB)");
						return;
					}
					try {
						
						
						imgUrl = await uploadToCloudinary(file, userkey,previewId)
						if (imgUrl) {
							if (!userData["userInfo"][previewId]){
								let user_ref = ref(database,`users/${userkey}/userInfo/${previewId}`)
								set(user_ref,imgUrl);
								console.log(imgUrl)
								userData["userInfo"][previewId] = imgUrl;
								await saveData('userData', userData)
							}
							// Make sure the image is visible (especially for cover photo)
							if (previewId) {
								preview.src = getOptimizedImageUrl(imgUrl,previewId == 'cover-img-preview' ? 'L':'M');
								preview.hidden = false
							}
						}
						
					} catch (error) {console.warn(error)}
				}
			});
		}
		
		async function fileReader(file){
			// 2. Read the file
			const reader = new FileReader();
			reader.onload = async function(e) {
				// Update the src of our preview image
				img = e.target.result
			};
			reader.readAsDataURL(file);
			return img
		}

		async function promptSwitch(kind = String) {
                const textarea = document.getElementById('textprompt-'+kind);
                
                const sendButton = document.getElementById('send-button-'+kind);
                let newMode;
                const modeButton = document.getElementById('mode-button');
                const modeDropdown = document.getElementById('mode-dropdown');
                const currentModeDisplay = document.getElementById('current-mode-'+kind);
                const HEADER_REMOVE = document.getElementById('headerR-'+kind);
                loading = document.getElementById('loading-'+kind);
                
                 
				 
                
                    let isEmpty = textarea.value.trim().length === 0;
                    
                    
                    sendButton.disabled = isEmpty;

                    // Change button color based on state
                    if (isEmpty) {
                        sendButton.classList.remove('bg-[#8ab4f8]', 'text-white');
                        sendButton.classList.add('bg-[#343436]', 'text-[#7e7e7e]', 'opacity-50');
                    } else {
                        sendButton.classList.remove('bg-[#343436]', 'text-[#7e7e7e]', 'opacity-50');
                        sendButton.classList.add('bg-[#8ab4f8]', 'text-white');
                    }

              



                // --- 3. Action Handlers (Example) ---

                sendButton.addEventListener('click', async () => {
                    const promptText = textarea.value.trim();
					const space_T = Date.now()
                    if (space_T - SPACE_TIME > 2000 && promptText ) {
						SPACE_TIME = space_T;
                        textarea.value = '';
                        
                        try {
                            await chatPrompt(promptText, kind);
						}catch (e){
							textarea.value = promptText;
						} finally {
                            textarea.value = '';
                            textarea.style.height = 'auto';
                        }
                       
                    }
                });

                
                textarea.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault(); 
                        sendButton.click(); 
                    }
                }); 
        }
		
		async function startChatPolling(){
		    const hour = new Date().getHours();
		    const day = new Date().getDay();
		    const isWeekend = (day === 6 || day === 0);
		    const isHappyHour = (hour >= 17 && hour < 20);
			
			const chatD = await loadData('group_chats');
			mgy = chatD ? chatD: pathLink
			if (chatD){
				chatbox()
			} 
		    // If it's NOT the weekend AND NOT happy hour, stop.
		    if (isWeekend || isHappyHour || true){
				
			}
			
		}
		//have chat manager to manage all chat so createChatlist
		//there will be no chaos with onValue fuction
		function manageChat(newId) {
			document.getElementById('chatList').innerHTML = ''
			if(newId){
				activeKey = newId;
				chatbox(activeKey);
				switchPage('chatHome');
				firstMsg = true;
				return;
			}
			try{
				chatPath = ref(database,'mgyPosts')
				onValue(chatPath, async (snapshot) =>{
					chat = Object.entries(snapshot.val()).reverse();
					mgy['mgyPosts'] = chat
					chatbox('mgyPosts')
					
				})
			} catch (error) {console.warn(error)}
			try{
				chatPath = ref(database,'group_chats')
				onValue(chatPath, async (snapshot) =>{
					chat = Object.entries(snapshot.val());
					lastMsg = chat[chat.length - 1][1]
					mgy['mgyforum'] = chat
					createChatlist('MGY Forum',lastMsg.prompt,'img/mgy.jpg','mgyforum')
					chatbox('mgyforum')
					
				})
			} catch (error) {console.warn(error)}
			if (userData['messageBox'] =='initialized') return
			const key_value = Object.entries(userData.messageBox)
			for (let i = 0;i<key_value.length;i++){
				const key = key_value[i][0]
				const value = key_value[i][1]
				try{
					chatPath = ref(database,`messages/${key}`)
					onValue(chatPath, async (snapshot) =>{
						try{
							chat = Object.entries(snapshot.val());
						
							lastMsg = chat[chat.length - 1][1]
							mgy[key] = chat
							const proImg = lastMsg['imgUrl'] == 'img/mgyG.jpg'? lastMsg['imgUrl'] : getOptimizedImageUrl(lastMsg['imgUrl'])
							createChatlist(value,lastMsg.prompt,proImg,key)
							chatbox(key)
						}catch (e){
							console.warn('No chat: ',e)
						}
					})
				}
				catch (e){
					console.warn('manageChat: ',e)
				}
			}
		}
		function stopChatPolling(){
		   
			
			off(chatPath)
		}

           

		async function chatSave(prompt, type, AI) {
		    if (AI !== 'chats') {
		        const sender = AI ? 'GIC AI' : userData.userInfo.username;
		        if(!type.includes(prompt)){
		                type.push({
		                chatId: Date.now(),
		                senderId: sender,
		                prompt: prompt 
		            });
		        }
		    } else {
				
		        
		           if(!mgy.IDs[prompt.chatId] ) {
					    type.push(prompt);
						mgy.IDs[prompt.chatId] = 1;
						await saveData('group_chats', mgy)
		          }
		           
		       
		    }
		}

	function postPre(close) {
		chatHeader = document.getElementById("chatHeader");
		if (close) {
			activeScreen = "posts"
			chatHeader.hidden = true;
			chatSpace = document.getElementById("chatsList");
			chatSpace.innerHTML = '';
			chatSpace.appendChild(makePost({},true))
			switchPage("chatHome")
		} else {
			switchPage("homePage")
			chatSpace.innerHTML = '';
			chatHeader.hidden = false;
			return;
		} 
		textarea.addEventListener("input", ()=>{
		    document.getElementById("post-1").innerText = textarea.value;
		})
	}

		async function chatPrompt(text, kind) {
		    const hour = new Date().getHours();
		    const day = new Date().getDay();
		    if (kind === "ai") {
		        pathLink = mgy.AIchats;
		        chatSave(text, pathLink, false); 
		        try {
		            const answear = await HTTPSrequest('askQuestion', { question: text }, kind);
		            if (answear && answear[0]) {
		                chatSave(answear[1], pathLink, true); 
		                AIchatbox();
		            }
		        } catch (error) {console.warn(error)
		            showMessage("Failed to send. Please try again.",'error');
		        }
		    } else {
		        try {
					
		            const isWeekend = (day === 6 || day === 0);
				    const isHappyHour = (hour >= 17 && hour < 20);
		
				    // If it's NOT the weekend AND NOT happy hour, stop.
				    if (isWeekend || isHappyHour || true){
				        tempPost['chatId'] = Date.now()
			            tempPost['senderId'] = userData.userInfo.username
						tempPost['userkey'] = userkey
						tempPost['imgUrl'] = userData.userInfo['profile-img-preview'] || 'img/mgyG.jpg'
			            tempPost['prompt'] = text
						tempPost.types.push('textMsg')
						console.log(tempPost)
						if (activeScreen) {
							chatref = 'mgyPosts'
							activeScreen = null;
							postPre()
						} else {
							chatref = activeKey == 'mgyforum' ? 'group_chats':'messages/'+activeKey	
						}
						
			            try{
							chatPath = ref(database,chatref)
							await push(chatPath,tempPost)
							tempPost = {types: []};
							
							if(firstMsg == true){
								firstMsg = false;
								manageChat()
							}
						} catch (error) {console.warn(error)}
					}
		        } catch (error) {
					console.error("Firebase error:", error);
		            alert("Failed to send. Please try again.");
		        }
		    }
		}
		function scrollToBottom(divElement){
				if(!scrolled){
					scrolled = true;
					divElement.scrollTop = divElement.scrollHeight;
				}
			}

		async function chatbox(msgKey) {
			console.log(msgKey)
			if (msgKey != activeKey)return
			const msg = mgy[activeKey]
			const chatContainer = document.getElementById(msgKey == 'mgyPosts' ? "courses":'chatsList');
		    chatContainer.innerHTML = '';
			if (!msg)return
		    if (msg.length > 100) {
				const refpath = activeKey == 'mgy' ? 'group_chats/':`message/${activeKey}/`
				try{
					chatPath = ref(database,refpath+msg[0][0])
					await remove(chatPath)
				} catch (error) {console.warn(error)}
			}  
		    for (let i=0; i < msg.length; i++){
				const chat = msg[i][1]
				const msgs = await createMsg(activeKey,chat,msg,i)
		        chatContainer.appendChild(msgs); 
		    };
		    scrollToBottom(chatContainer);	
		}

async function createMsg(activeKey,chat,msg,i) {
	let sessionDiv;
	console.log("MAKE",activeKey)
	if (activeKey == 'mgyPosts') {
		console.log("MAKEPOST")
		sessionDiv = makePost(chat)
	} else {
		const time =  new Date(parseInt(chat["chatId"] || Date.now())).toGMTString().slice(5,22);
	    const me = (chat['userkey'] === userkey);
		sessionDiv = document.createElement('div');
		const img = document.createElement("img");
		img.className = "small_profile_img lazy-media";
		img.onclick = () => switchPage('profilePage',chat['userkey'])
		if (!me) {
	        sessionDiv.className = 'msg-bubble recv';
	        messager = chat.senderId;
			img.name = getOptimizedImageUrl(chat['imgUrl'],'S')
	    } else {
	        sessionDiv.className = 'msg-bubble sent';
	        messager = 'You';
			img.src = getOptimizedImageUrl(userData["userInfo"]['profile-img-preview'],'S')
			sessionDiv.ondblclick = async () =>{
				if(!confirm('This message will be deleted!')) return
				const refpath = activeKey == 'mgyforum' ? 'group_chats/':`messages/${activeKey}/`
				try{
					chatPath = ref(database,`${refpath}${msg[i][0]}`)
					await remove(chatPath)
				} catch (error) {console.warn(error)}
			};
			
	    }
	
	    const header = document.createElement('div')
		const userN = document.createElement('div')
		const chatT = document.createElement('div')
		userN.textContent = messager;
		chatT.textContent = time;
		chatT.className = 'status'
		header.appendChild(userN)
		header.appendChild(chatT)
	    const devsec = document.createElement('div')
		devsec.style = "display: flex;gap: 5px;"
		
		mediaObserver.observe(img)
		devsec.appendChild(img)
		devsec.appendChild(header);
		sessionDiv.appendChild(devsec)
	}
	
	
	console.log(sessionDiv)
    chat.types.forEach(type =>{
        sessionDiv.appendChild(Tswitch(type,chat))
    })
	return sessionDiv;
}

	function Tswitch(type,chat) {
		if (type == 'textMsg') {
			return textMsg(chat)
		}else if (type == 'pdfMsg') {
			return pdfMsg(chat)
		}else if (type == 'videoMsg') {
			return videoMsg(chat)
		} else if (type == 'audioMsg') {
			return audioMsg(chat)
		} else if (type == 'imageMsg') {
			return imageMsg(chat)
		} 
	}

		function createChatlist(name,msg,img,msgKey) {
			if (document.getElementById("chatPage").hidden) return
			const chatPresention = document.createElement('div')
			chatPresention.className = 'card'
			const chatHeader = document.createElement('div')
			chatHeader.className = 'post-box'
			const chatImg = document.createElement('img')
			chatImg.className = 'small_profile_img'
			chatImg.src = img
			const chatName = document.createElement('p')
			chatName.textContent = name 
			const chatMsg = document.createElement('pre')
			const chatCode = document.createElement('code')
			chatCode.textContent = msg.length > 30 ? msg.slice(0,30)+'...':msg
			chatMsg.appendChild(chatCode)
			chatHeader.appendChild(chatImg)
			chatHeader.appendChild(chatName)
			chatPresention.appendChild(chatHeader)
			chatPresention.appendChild(chatMsg)
			chatPresention.onclick = () => {
				activeKey = msgKey;
				activeChat.textContent = name;
				chatbox(activeKey)
				switchPage('chatHome')
				
			}
			document.getElementById('chatList').appendChild(chatPresention)
		}
		async function getPhoto(userKey,imgP={}){
			if (imgP['img-'+userKey]){
				return imgP['img-'+userKey]
			}
			try{
				user_ref = ref(database,'img-/'+userKey)
				const snapshot = await get(user_ref)
				const value = snapshot.val()
				if(value){
					imgP['img-'+userKey] = value
					return value
				}
			} catch (error) {
		console.warn(error)
			}
			imgP['img-'+userKey] = 'img/mwflag.png'
			return 'img/mwflag.png'	
		}

		           
		let loading           
		const stBt = document.getElementById('send-button-ai');   
		document.getElementById('prompt-container-chat').addEventListener('input',function(){
		loading = document.getElementById('loading-chat');
		promptSwitch('chat')});

	
		
        function initDB() {
			  return new Promise((resolve, reject) => {
				const openReq = indexedDB.open('MgyDB', 2);
				openReq.onupgradeneeded = e => {
				  db = e.target.result;
				  if (!db.objectStoreNames.contains('Data')) db.createObjectStore('Data');
				};
				openReq.onsuccess = e => {
				  db = e.target.result;
				 
				  resolve(db);
				};
				openReq.onerror = e => reject(e);
			  });
			}

			
			function loadData(KEY, onloadFlag) {
			  return new Promise((resolve, reject) => {
				if (!db) return reject(new Error('DB not initialized'));
				const tx = db.transaction('Data', 'readonly');
				const store = tx.objectStore('Data');
				const req = store.get(KEY);
				
				req.onsuccess = e => {
				  const val = (e.target.result === undefined) ? null : e.target.result;
					
				  if (onloadFlag === 'onload') {
					
					userData = val ? val:userData;
					
				  }
				  resolve(val);
				};
				req.onerror = e => reject(e.target.error || e);
			  });
			}

			
			function saveData(KEY, dataToSave) {
			  return new Promise((resolve, reject) => {
				if (!db) return reject(new Error('DB not initialized'));
				const tx = db.transaction('Data', 'readwrite');
				const store = tx.objectStore('Data');
				const req = store.put(dataToSave, KEY);
				req.onsuccess = () => resolve();
				req.onerror = e => reject(e.target.error || e);
			  });
			}
        setTimeout(async function (){
            try {
				if (!isStandalone()) {
				maybeShowInstall();
			}

                await initDB();
				
                // Load User Data
                await loadData('userData', 'onload');
				profileUpdater(userkey)
				manageChat()
            } catch (e) {
            }
        },10);
        
window.onload = async function(){
	try{
		userkey = await getAuth().currentUser.uid
	}catch{}
	if (!isStandalone()) {
			maybeShowInstall();
		}
	registerSw()
	await adddbListener(10)
	alert(`🔧 Development Notice:
	MGY is currently in beta and under active development. 
	Please be aware:
	• Features may be unstable or incomplete
	• The page may freeze or crash
	• Data may be lost during updates
	• Your feedback helps us improve!
	
	Thank you for being part of our journey! 🙏`)
	}

function adddbListener(i) {
	if (i == 0) {
		return
	}
	setTimeout(async(e) =>{
		try {
			
			userkey = userAuth.currentUser.uid
			onAuthStateChanged(userAuth, (user) => {
			  if (user) {
			    // User is already logged in! 
			    // The SDK automatically refreshed the token if it was expired.
			    console.log("Welcome back, " + user.uid);
				alert('Welcome back, '+userData.userInfo['First name'])
			  } else {
			    // No user found, show login screen
			    //switchPage('loginPage');
			  }
			});
			const mypath = ref(database,`users/${userkey}/userInfo`)
			
			onChildChanged(mypath, async (snapshot) =>{
				userData.userInfo[snapshot.key] = snapshot.val();
				console.log('Update')
				await saveData('userData',userData)
			})
			const msgpath = ref(database,`users/${userkey}/messageBox`)
			onChildAdded(msgpath, async (snapshot) =>{
				userData.messageBox[snapshot.key] = snapshot.val();
				await saveData('userData',userData)
				console.log('Recevied')
				setTimeout(()=>{manageChat()},1000)
			})
		} catch (error) {
			
			console.warn(error)
			await adddbListener(i-1)
		}
	},5000)
	
}

function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
}

function maybeShowInstall() {
    if (isStandalone()) return;
    if (!deferredInstallPrompt) return;   
    if (installAsked) return;                    

    installAsked = true;
    document.getElementById('install-banner').style.display = 'block';
    setTimeout(() =>{
		 document.getElementById('install-banner').style.display = 'none'; }
    ,10000)
}


async function installApp() {
    if (!deferredInstallPrompt) return;

    deferredInstallPrompt.prompt(); 
    await deferredInstallPrompt.userChoice; 

    deferredInstallPrompt = null;
    document.getElementById('install-banner').style.display = 'none';
}

function registerSw() {
    if ('serviceWorker' in navigator) {
        // Register the service worker, setting the scope to the current directory './'
        navigator.serviceWorker.register('serviceworker.js', {scope: './'})
            .then(function(registration) {
                console.log('sw is ready')
            })
            .catch(function(error) {
                console.log(error)
            });
    }
        
}

async function uploadToCloudinary(file, studentId, type,update) {
    const formData = new FormData();
    const CLOUD_NAME = "dlnnjv1ca"; 
    const UPLOAD_PRESET = "malawian-genius-youths";
    if (update) {
		try {
		    const res = await fetch('/.netlify/functions/delete-old-image', {
		        method: "POST",
		        body: JSON.stringify({
		            publicId: userData.userInfo[type] 
		        })
		    });
		
		    if (!res.ok) {
		        const errorData = await res.json();
		        throw new Error(`Server Error: ${errorData.error || res.statusText}`);
		    }
		
		    const resp = await res.json(); 
		    console.log("File deleted:", resp.result);
		} catch (error) {
		    console.error("Logic Error in uploadToCloudinary():", error);
		}
    }
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("public_id", studentId + type); 
    const ftype = file.type.split('/')[0] === 'image' ? 'image':'video'
	formData.append("resource_type", ftype);
    console.log("Sending to Cloudinary:", file.name, studentId, type);
	
    
    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${ftype}/upload`,
            { method: "POST", body: formData }
        );

        const data = await response.json();
        
        // THE FIX: Check if Cloudinary rejected the upload
        if (!response.ok) {
            console.error("Cloudinary refused the upload:", data.error.message);
            // This alert will tell you exactly what is wrong!
            alert("Upload failed"); 
            return null; // Stop execution
        }
        
        const studentPhotoUrl = data.public_id;
        console.log("Uploaded! URL:", data.secure_url);
        return studentPhotoUrl;

    } catch (error) {
        console.error("Network Error:", error);
        alert("Check your internet connection.");
        return null;
    }
}

function getOptimizedImageUrl(publicId,type) {
	if('img/mgyG.jpg' == publicId || ! publicId) return 'img/mgyG.jpg'
    const CLOUD_NAME = "dlnnjv1ca";
    let transformations = "c_fill,f_auto,q_auto";
	if(type == 'L') transformations += ',w_400,h_200';
	if(type == 'M') transformations += ',w_200,h_200,r_max';
	if(type == 's') transformations += ',w_100,h_100,r_max';
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformations}/${publicId}`;
}

let mediaRecorder;
let chucks = [];
let stream ;

const tempVideo = document.createElement('video')
const audioRecBt = document.getElementById('audioRecBt')

audioRecBt.onclick = async () => {
   

}

async function recoder(type) {
	 if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        return
    }
	const media = type == 'audio' ? {audio : true}:{audio : true, video : true}
    const stream = await navigator.mediaDevices.getUserMedia(media)
    mediaRecorder = new MediaRecorder(stream)
    chucks = [];

    mediaRecorder.ondataavailable = (event) =>{
        chucks.push(event.data)
    }

    mediaRecorder.onstop = async () =>{
        const audioBlob = new Blob(chucks, {type: `${type}/webm`})
        const fileUrl = URL.createObjectURL(audioBlob)
		//await upload(audioBlob)
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



const mediaObserver = new IntersectionObserver((entries,observer) => {
    entries.forEach(entry => {
        const media = entry.target;

        if (entry.isIntersecting) {
            if (!media.src || media.src === window.location.href || media.src.endsWith('/')) {
                media.src = media.name;
                media.preload = "metadata";
                try {
                    media.load();
                } catch (error) {
                    observer.unobserve(media);
                }
                console.log("Downloading :", media.name);
            }
        } else {
            try {
                media.pause();
                if (media.readyState < 4) {
                    console.log("Cancelling active download to save data:", media.name);
                    media.removeAttribute('src'); 
                    media.load();               
                } else {
                    console.log("Keeping data: Video already fully downloaded.",media.name);
                    observer.unobserve(media);
                    
                }  
            } catch (error) {
                
            }
            
        }
    });
}, { threshold: 0.8 });


document.querySelectorAll('.lazy-media').forEach(item => {
    mediaObserver.observe(item);
});

/**
 * Opens a PDF document.
 * @param {string} url - The location of the file.
 */
function openPdf(url) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
       
        window.open(url, '_blank');
    } else {
        createPdfModal(url);
    }
}

function createPdfModal(url) {
    let modal = document.getElementById('pdfModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'pdfModal';
        modal.innerHTML = `
            <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:1000; display:flex; flex-direction:column;">
                <button onclick="document.getElementById('pdfModal').style.display='none'" 
                        style="align-self:flex-end; margin:20px; color:white; background:none; border:none; font-size:30px; cursor:pointer;">&times;</button>
                <iframe id="pdfFrame" style="flex:1; border:none; margin: 0 40px 40px 40px; border-radius:8px; background:white;"></iframe>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Set the source and show it
    document.getElementById('pdfFrame').src = url;
    modal.style.display = 'flex';
}


function imageMsg(msg) {
    const img = document.createElement("img")
    img.preload = "none";
    img.name = getOptimizedImageUrl(msg.imageUrl,'L');
    img.className = "media-file lazy-media"
    img.alt = 'Photo'
	mediaObserver.observe(img)
    return img;
    
}

function videoMsg(msg) {
    const div = document.createElement("div")
    div.className = "msg-bubble recv"
    const vid = document.createElement("video")
    vid.preload = "none";
    vid.name = msg.videoUrl;
    vid.className = "media-file lazy-media"
	vid.controls = true
	mediaObserver.observe(vid)
    return vid;
    
}

function audioMsg(msg) {
    const aud = document.createElement("audio")
    aud.preload = "none";
    aud.name = msg.audioUrl;
    aud.className = "lazy-media"
	aud.controls = true
	mediaObserver.observe(aud)
    return aud;
    
}

function textMsg(msg) {
    const div = document.createElement("div")
	div.style.padding = "5px 10px"
    const urlReg = /https?:\/\/\S*\w/
	try{
		const matchUrl = msg.prompt.match(urlReg)[0].trim();
		if(matchUrl){
            const a = document.createElement("a")
            const p1 = document.createElement("p")
            const p2 = document.createElement("p")
            urlStart = msg.prompt.indexOf(matchUrl)
            p1.textContent = msg.prompt.slice(0,urlStart)
            p1.textContent = msg.prompt.slice(urlStart + matchUrl.length)
			a.href = matchUrl;
            a.textContent = matchUrl
            div.appendChild(p1)
            div.appendChild(a)
            div.appendChild(p2)
		}
	}
	catch(e){
        div.textContent = msg.prompt
    }
    return div;
    
}

function pdfMsg(msg) {
    const div = document.createElement("div")
    div.className = "file-card"
    div.innerHTML = `
        <div class="file-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
        </div>`
    const innerDiv = document.createElement("div")
    innerDiv.className = "file-details"
    const span1 = document.createElement("span")
    span1.className = "file-name"
    span1.textContent = msg.fileName
    const span2 = document.createElement("span")
    span2.textContent = `${msg.metadata} MB • PDF Document`
    span2.className = "file-meta"
    innerDiv.appendChild(span1)
    innerDiv.appendChild(span2)
    div.appendChild(innerDiv)
    div.onclick = () => {openPdf(msg.pdfUrl)}
    return div;
    
}



const input = document.getElementById("input")
input.onchange = async () =>{
	const files = input.files
	for (let i = 0; i < files.length; i++){
		const file = files[i]
        re = /\S*\w\//
		const fName = file.name
        typ = file.type.match(re)[0].trim()
        if (typ == 'video/') {
            tempPost.types.push('videoMsg')
            tempPost['videoUrl'] = await uploadToCloudinary(file, fName, Date.now())
        }else if (typ == 'audio/'){
            tempPost.types.push('audioMsg')
            tempPost['audioUrl'] = await upload(file)
        }else if (typ == 'image/'){
            tempPost.types.push('imageMsg')
            tempPost['imageUrl'] = await uploadToCloudinary(file, fName, Date.now())
        }else if (file.type == 'application/pdf'){
            tempPost.types.push('pdfMsg')
            tempPost['pdfUrl'] = await upload(file)
            tempPost['fileName'] = file.name
            tempPost['metadata'] = file.size/(1024 * 1024)
        }
    }
}


/**
 * Uploads any file type (Video, PDF, Img, Audio) directly to Tebi.io
 */
async function upload(file) {
    // 1. Create a unique name
	const BUCKET_NAME = 'mgy'
    const fileName = file.name
    
    try {
        // 2. Ask our Netlify function for a "permission slip" (Signed URL)
        const tokenResponse = await fetch('/.netlify/functions/get-signed-url', {
            method: 'POST',
            body: JSON.stringify({
                fileName: fileName,
                contentType: file.type
            })
        });

        const { uploadUrl } = await tokenResponse.json();
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type, 'x-amz-acl': 'public-read' },
            body: file
        });

        if (!uploadResponse.ok) throw new Error('Upload to Tebi failed');

        // 4. Construct the final public URL
        const finalUrl = `https://s3.tebi.io/${BUCKET_NAME}/${fileName}`;
        console.log("Success! File is at:", finalUrl);
        return finalUrl;

    } catch (err) {
        console.error("Logic Error:", err);
    }
}


function makePost(post,preview){
	const tm = new Date(post["chatId"] || Date.now()).toGMTString().slice(5,22);
	div = document.createElement('div');
	div.style = "min-height: 225px; background: white;";
	div.className = 'post'
	card = document.createElement('div');
	card.className = 'card';
	card.style.padding = "2px 10px"
	postBox = document.createElement('div');
	postBox.className = "post-box"
	img = document.createElement('img');
	img.className = "small_profile_img lazy-media";
	img.style = "border-radius: 50%";
	img.name = getOptimizedImageUrl(post['imgUrl'],'S') || getOptimizedImageUrl(userData.userInfo['profile-img-preview'] || 'img/mgyG.jpg','S');
	img.onclick = () =>{switchPage('profilePage',post['userkey'])};
	mediaObserver.observe(img)
	cont = document.createElement('div');
	Uname = document.createElement('p');
	Uname.textContent = post["senderId"] || userData.userInfo["username"];
	time = document.createElement('p');
	time.className = 'status';
	time.textContent = tm;
	feed = document.createElement('div');
	feed.className = "feed";
	if (preview) feed.id = "post-1";

	cont.append(Uname,time);
	postBox.append(img,cont);
	card.append(postBox);
	div.append(card,feed);
	return div;
}
