		let db = null;
        let scrolled;
        const today = new Date().toISOString().split('T')[0];
        let requestURL = 'https://script.google.com/macros/s/AKfycbxp11rUqcpJotJ9ne1xJmeGS1ClWhWCYyyhwkNcyp7RGyZkpo284PM6WsEg7XWjg6AL/exec';
        const todaycheck = new Date().toISOString().split('T')[0];
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
		let profileImg;
		let img;
		let userkey;
		let firstMsg = false;
        let userData = {userInfo:{'Country code': '265'},
						freinds: 'initialized',
						messageBox: 'initialized'	   
			};
        let mgy = {
                    };
		let activeKey = '';
        let timeStamp = Date.now();
		let SPACE_TIME = 30000;
		let deferredInstallPrompt = null;
		let installAsked = false;

window.addEventListener('beforeinstallprompt', (e) => {    
	e.preventDefault();            
    deferredInstallPrompt = e;        
    maybeShowInstall();                 
});


window.addEventListener('load',async(e) =>{
	try {
		
		if (!isStandalone()) {
				maybeShowInstall();
			}
		const mypath = ref(database,`users/${userkey}/userInfo`)
		const userNow = userAuth.currentUser; 

		if(userNow) userkey = userNow.uid;
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
			setTimeout(()=>{manageChat},1000*10)
		})
	} catch (error) {
		console.warn(error)
	}
})


        
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
							await saveData('userData',userData)
							alert("Success! Welcome to MGY.");
						}else {
							handleLoginFailure()
						}
					} catch (e){
						if (error.code === 'auth/email-already-in-use') {
						    alert("That username is already taken!");
							return
					    }
						handleLoginFailure()
					}
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
					await signInWithEmailAndPassword(userAuth,currentU.replaceAll(' ','')+'@mgy.com',currentP)
						const userNow = userAuth.currentUser; 
	
						if (userNow) {
							userkey = userNow.uid;
							path = ref(database,`users/${userkey}`)
							const snapshot = await get(path);
			                const userData = snapshot.val(); 
			                
			                await saveData('userData', userData);
			                switchPage('homePage');
							alert("Success! Welcome to MGY.");
			            }
			        else {
			            handleLoginFailure();
			        }
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
					profileUpdater(await getUser(id),true)
					return
				}
				setupImageUpload('profile-input', 'profile-img-preview');
                setupImageUpload('cover-input', 'cover-img-preview');
                profileUpdater(userData)
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

		async function message(user){
			if(userkey == user.userkey){
				alert('Oooh! Why you wanna message yourself?');
				return;
			} 
			let chatKey = `${user['userkey']}-${userkey}`
			if (!userData['messageBox'][chatKey]){
				userData['messageBox'] = userData['messageBox'] == 'initialized' ? {}:userData['messageBox']
				userData['messageBox'][chatKey] = user.userInfo.username
				user['messageBox'][chatKey] = userData.userInfo.username
				try{
					user_ref = ref(database,`users/${userkey}/messageBox`)
					await set(user_ref,userData['messageBox'])
					user_ref = ref(database,`users/${user["userkey"]}/messageBox`)
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
		async function profileUpdater(user,get=false){
			if(get){
				const msg = document.getElementById("message")
				msg.hidden = false
				msg.onclick = () =>{
					message(user)
				}
				document.getElementById("edit").hidden = true
				document.getElementsByName('lebel').forEach(lebel =>{
					lebel.hidden = true
				})
				document.getElementsByName('input').forEach(lebel =>{
					lebel.hidden = true
				})
				user = user == userkey ? userData:await getUser(user)
			}
			document.getElementById('user').textContent = user["userInfo"]['username']
			document.getElementById('friends').textContent = user['freinds']== 'initialized' ? '0' + " Friends" : user['freinds'].length + " Friends"
			document.getElementById('bio').textContent = user["userInfo"]['Bio']
			if(user["userInfo"]['profile-img-preview']){
				document.getElementById('pro-img').src = user["userInfo"]['profile-img-preview']
				document.getElementById('profile-img-preview').src = user["userInfo"]['profile-img-preview']
			}
			if(user["userInfo"]['cover-img-preview']){
				document.getElementById('cover-img-preview').src = user["userInfo"]['cover-img-preview']
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
				const file = this.files[0];
				
				if (file) {
					// 1. Basic Validation (Size check example)
					if (file.size > 1024 * 1024) {
						alert("File is too large (max 1MB)");
						return;
					}
					try {
						
						
						const imgUrl = uploadToCloudinary(file, userkey,previewI)
						let user_ref = ref(database,`users/${userkey}/userInfo/${previewI}`)
						set(user_ref,imgUrl);
						userData["userInfo"][previewId] = imgUrl;
						await saveData('userData', userData)
						// Make sure the image is visible (especially for cover photo)
						if (previewId) {
							preview.src = imgUrl;
							preview.hidden = false
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
                
                 // Toggle dropdown
				modeButton.addEventListener('click', (e) => {
				  e.stopPropagation();
				  
				  modeDropdown.style.display = 'block' 
				});
				 // Select mode
				modeDropdown.querySelectorAll('[data-mode]').forEach(el => {
				  el.addEventListener('click', () => {
					
					const m = el.getAttribute('data-mode');
					currentModeDisplay.textContent = m;
					modeDropdown.style.display = 'none';
				  });
				});

				// Close dropdown on outside click
				//document.getElementById("prompt-container-ai").addEventListener('click', () => modeDropdown.style.display = 'none');
			
                
                // --- 1. Textarea Auto-Resize and Send Button Toggle ---

                // Function to resize the textarea height dynamically
                const resizeTextarea = () => {
                    // Reset height to collapse the scrollbar before calculation
                    textarea.style.height = 'auto';
                    
                    // Set the new height, clamped to a max height (15rem)
                    const newHeight = Math.min(textarea.scrollHeight, 15 * 16); // 15rem * 16px/rem
                    textarea.style.height = newHeight+"px";

                    // Enable/Disable Send button based on content
                    let isEmpty = textarea.value.trim().length === 0;
                    
                    if(currentModeDisplay.textContent === 'Quiz'){
						isEmpty = false;
						
					}
                    sendButton.disabled = isEmpty;

                    // Change button color based on state
                    if (isEmpty) {
                        sendButton.classList.remove('bg-[#8ab4f8]', 'text-white');
                        sendButton.classList.add('bg-[#343436]', 'text-[#7e7e7e]', 'opacity-50');
                    } else {
                        sendButton.classList.remove('bg-[#343436]', 'text-[#7e7e7e]', 'opacity-50');
                        sendButton.classList.add('bg-[#8ab4f8]', 'text-white');
                    }
                };

                // Attach event listener for input and change
                textarea.addEventListener('input', resizeTextarea);

                // --- 2. Mode Dropdown Interaction ---

                // Toggle dropdown visibility
                modeButton.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent the document listener from immediately closing it
                    const isVisible = modeDropdown.classList.toggle('opacity-0');
                    modeDropdown.classList.toggle('pointer-events-none');
                });

                // Handle mode selection from dropdown
                modeDropdown.addEventListener('click',  (e) => {
                    const modeElement = e.target;
                    if (modeElement.dataset.mode) {
                        newMode = modeElement.dataset.mode;
                        
                        // 1. Update the display label
                        currentModeDisplay.textContent = newMode;
                        
                        // 2. Hide the dropdown
                        modeDropdown.classList.add('opacity-0', 'pointer-events-none');
                        
        
                    }
                });

                // Close dropdown when clicking anywhere else
                document.addEventListener('click', () => {
                    modeDropdown.classList.add('opacity-0', 'pointer-events-none');
                });


                // --- 3. Action Handlers (Example) ---

                sendButton.addEventListener('click', async () => {
                    const promptText = textarea.value.trim();
                    const currentMode = currentModeDisplay.textContent;
					const space_T = Date.now()
                    if (space_T - SPACE_TIME > 2000 && (promptText || currentMode === 'Quiz')) {
						SPACE_TIME = space_T;
                        textarea.value = '';
                        loading.classList.add('rotate');
                        loading.style.display = 'block';
                        
                        try {
                            if (currentMode === 'Quiz') {
                                await quizMaker('submit');
                            } else if (currentMode === 'Question' || currentMode === 'Chat') {
                                await chatPrompt(promptText, kind);
                            }
                        } finally {
                            loading.classList.remove('rotate');
                            loading.style.display = 'none';
                            textarea.value = '';
                            textarea.style.height = 'auto';
                            HEADER_REMOVE.style.display = 'none';
                        }
                       
                        resizeTextarea(); 
                    }
                });

                
                textarea.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault(); 
                        sendButton.click(); 
                    }
                });

                // Initial resize/check on load
                resizeTextarea();
            

                
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
				let chatPath = ref(database,'group_chats')
				onValue(chatPath, async (snapshot) =>{
					const chat = Object.entries(snapshot.val());
					const lastMsg = chat[chat.length - 1][1]
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
							const chat = Object.entries(snapshot.val());
						
							const lastMsg = chat[chat.length - 1][1]
							mgy[key] = chat
							const proImg = lastMsg['imgUrl'] || 'img/mwflag.png'	//await getPhoto(lastMsg.userkey)
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
			            const messageData = {
			                chatId: Date.now(),
			                senderId: userData.userInfo.username,
							userkey: userkey,
							imgUrl: userData.userInfo['profile-img-preview'],
			                prompt: text,

			            };
						chatref = activeKey == 'mgyforum' ? 'group_chats':'messages/'+activeKey
			            try{
							const chatPath = ref(database,chatref)
							await push(chatPath,messageData)
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
			if (msgKey != activeKey)return
			const msg = mgy[activeKey]
			const chatContainer = document.getElementById('chatsList');
		    chatContainer.innerHTML = '';
			if (!msg)return
		    if (msg.length > 100) {
				const refpath = activeKey == 'mgy' ? 'group_chats/':`message/${activeKey}/`
				try{
					let chatPath = ref(database,refpath+msg[0][0])
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
			const time = new Date(parseInt(chat.chatId)).toLocaleTimeString();
		    const me = (chat['userkey'] === userkey);
			const sessionDiv = document.createElement('div');
			const img = document.createElement("img");
			img.className = "small_profile_img";
			img.onclick = () =>{switchPage('profilePage',chat['userkey'])}
			if (!me) {
		        sessionDiv.className = 'message chat-card';
		        messager = chat.senderId;
				img.src = chat['imgUrl'] || 'img/mwflag.png'	//await getPhoto(chat['userkey'])
		    } else {
		        sessionDiv.className = 'message mychat-card';
		        messager = 'You';
				img.src = userData["userInfo"]['profile-img-preview'] || 'img/mwflag.png'
				sessionDiv.ondblclick = async () =>{
					if(!confirm('This message will be deleted!')) return
					const refpath = activeKey == 'mgyforum' ? 'group_chats/':`messages/${activeKey}/`
					try{
						let chatPath = ref(database,`${refpath}${msg[i][0]}`)
						await remove(chatPath)
					} catch (error) {console.warn(error)}
				}
		    }
		
		    // SAFE DOM CREATION (No innerHTML for user content to prevent XSS)
		    const header = document.createElement('h4')
			header.className = "input-mock"
			header.textContent = `${messager} ${time}`;
		    const devsec = document.createElement('div')
			devsec.className = "post-box"
		    const p = document.createElement('pre');
		    p.textContent = chat.prompt; 
		            
					
			devsec.appendChild(header);
			devsec.appendChild(img)
			sessionDiv.appendChild(devsec)
		    const urlReg = /https?:\/\/\S*\w/
		    try{
				const matchUrl = chat.prompt.match(urlReg)[0].trim();
				if(matchUrl){
					p.href = matchUrl;
				}
			}
			catch(e){}
		    sessionDiv.appendChild(p);
			return sessionDiv;
		}

		function createChatlist(name,msg,img,msgKey) {
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
		document.getElementById('prompt-container-chat').addEventListener('click',function(){
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
				
	
            } catch (e) {
            }
        },1000);
        


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

async function uploadToCloudinary(file, studentId,type) {
    const formData = new FormData();
    const CLOUD_NAME = "dlnnjv1ca"; 
	const UPLOAD_PRESET = "malawian-genius-youths";
	  formData.append("file", file);
	  formData.append("upload_preset", UPLOAD_PRESET);
	  
	  formData.append("public_id", studentId + type); 
	
	  try {
	    const response = await fetch(
	      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
	      { method: "POST", body: formData }
	    );
	
	    const data = await response.json();
	    
	    // We add the timestamp (?t=) so the browser doesn't show the old cached version
	    const studentPhotoUrl = `${data.secure_url}`//?t=${new Date().getTime()}`;
	    
	    console.log("Uploaded! Space saved by replacing old file:", studentPhotoUrl);
	    return studentPhotoUrl;
	
	  } catch (error) {
	    console.error("Cloudinary Error:", error);
	  }
}


	
