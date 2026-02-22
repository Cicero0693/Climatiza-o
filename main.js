// --- Global State ---
window.currentUser = JSON.parse(localStorage.getItem('climaUser')) || null;
window.simulationsLeft = localStorage.getItem('climaCredits') === null ? 1 : parseInt(localStorage.getItem('climaCredits'));
window.historyData = JSON.parse(localStorage.getItem('climaHistory')) || [];
window.isRegisterMode = false;
window.economyChart = null;
window.hasShownWelcome = false;

// --- Tab Management ---
window.switchTab = function (tabId) {
    const contents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < contents.length; i++) {
        contents[i].classList.remove('active');
        contents[i].style.display = 'none';
    }

    const buttons = document.getElementsByClassName('tab-btn');
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('active');
    }

    const target = document.getElementById(tabId);
    if (target) {
        target.classList.add('active');
        // Handle Sun Tab Flex layout
        target.style.display = (tabId === 'sun-tab') ? 'flex' : 'block';
    }

    if (tabId === 'sun-tab' && typeof initSunSim === 'function') {
        setTimeout(initSunSim, 100);
    }

    if (tabId === 'history-tab') {
        renderHistory();
    }

    const activeBtn = document.querySelector(`.tab-btn[onclick*="${tabId}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    window.dispatchEvent(new Event('resize'));
};

// --- Auth Logic ---
window.showAuthModal = function () {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'block';
};

window.hideAuthModal = function () {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'none';
};

window.toggleAuthMode = function () {
    window.isRegisterMode = !window.isRegisterMode;
    const title = document.getElementById('modal-title');
    const submitBtn = document.querySelector('.btn-auth');
    const toggleText = document.getElementById('auth-toggle-text');
    const toggleLink = toggleText.nextElementSibling;

    if (window.isRegisterMode) {
        if (title) title.innerHTML = '<h2>Crie sua conta</h2><p>Comece a simular agora mesmo.</p>';
        if (submitBtn) submitBtn.innerText = 'Cadastrar';
        if (toggleText) toggleText.innerText = 'Já tem uma conta?';
        if (toggleLink) toggleLink.innerText = 'Faça login';
    } else {
        if (title) title.innerHTML = '<h2>Bem-vindo!</h2><p>Faça login para continuar.</p>';
        if (submitBtn) submitBtn.innerText = 'Entrar';
        if (toggleText) toggleText.innerText = 'Não tem uma conta?';
        if (toggleLink) toggleLink.innerText = 'Cadastre-se';
    }
};

window.handleAuth = async function (event) {
    if (event) event.preventDefault();
    const passwordInput = document.getElementById('auth-password');
    const emailInput = document.getElementById('auth-email');

    if (!passwordInput || !emailInput) return;

    const password = passwordInput.value;
    const email = emailInput.value;

    if (!email || !email.includes('@')) {
        alert('Por favor, insira um email válido.');
        return;
    }

    if (!password || password.length < 6) {
        alert('A senha deve ter pelo menos 6 caracteres.');
        return;
    }

    try {
        console.log('Tentando autenticação segura:', email);
        console.log('Modo:', window.isRegisterMode ? 'Cadastro' : 'Login');

        // Verificar se o Supabase está configurado
        if (typeof supabase === 'undefined') {
            console.warn('⚠️ Supabase não configurado');
            throw new Error('Supabase client missing');
        }

        let userToSet = null;

        if (window.isRegisterMode) {
            // --- CADASTRO ---
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: { name: email.split('@')[0] } // Metadados do usuário
                }
            });

            if (error) throw error;
            if (data.user) userToSet = data.user;

            // Verifica se precisa confirmar email (Supabase padrão pede, mas vamos avisar)
            if (data.user && !data.session) {
                alert('Cadastro realizado! Verifique seu email para confirmar.');
                return;
            }
        } else {
            // --- LOGIN ---
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;
            if (data.user) userToSet = data.user;
        }

        // Se chegou aqui, autenticou com sucesso no Auth
        console.log('Autenticação bem-sucedida:', userToSet);

        // Agora busca os dados da tabela pública (créditos)
        // O Trigger no banco deve ter criado a entrada automaticamente
        // Vamos tentar buscar com algumas tentativas caso o trigger tenha delay
        let publicUser = null;
        for (let i = 0; i < 3; i++) {
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userToSet.id)
                .maybeSingle();

            if (userData) {
                publicUser = userData;
                break;
            }
            // Espera pequena se não achou (delay do trigger)
            await new Promise(r => setTimeout(r, 500));
        }

        // Se mesmo assim não achou (trigger falhou?), usa dados básicos
        if (!publicUser) {
            console.warn('Trigger demorou ou falhou, usando dados de fallback');
            publicUser = {
                id: userToSet.id,
                email: userToSet.email,
                name: userToSet.user_metadata?.name || email.split('@')[0],
                credits: 1
            };
        }

        window.currentUser = publicUser;
        window.simulationsLeft = publicUser.credits;

        // Sucesso: Salvar sessão
        localStorage.setItem('climaUser', JSON.stringify(window.currentUser));
        localStorage.setItem('climaCredits', window.simulationsLeft);

        window.updateAuthUI();
        window.hideAuthModal();
        if (typeof window.renderInput === 'function') window.renderInput();

        // Evitar mensagens duplicadas
        if (!window.hasShownWelcome) {
            window.addMessage(`Bem-vindo, ${window.currentUser.name}!`, 'bot');
            window.hasShownWelcome = true;
        }

    } catch (error) {
        console.error('Falha na Autenticação:', error);
        alert(`Erro: ${error.message || 'Falha na autenticação'}`);
        // Remove fallback offline logic for secure auth to force real login fixes
    }

};

window.updateAuthUI = function () {
    const statusDiv = document.getElementById('auth-status');
    const historyBtn = document.getElementById('history-btn');

    if (window.currentUser) {
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div class="auth-user">
                    <span class="user-tag">${window.simulationsLeft} Créditos</span>
                    <span>Olá, ${window.currentUser.name}</span>
                    <button class="btn-login" style="border-color: #ef4444; color: #ef4444;" onclick="logout()">Sair</button>
                </div>`;
        }
        if (historyBtn) historyBtn.style.display = 'block';
    } else {
        if (statusDiv) statusDiv.innerHTML = '<button class="btn-login" onclick="showAuthModal()">Entrar</button>';
        if (historyBtn) historyBtn.style.display = 'none';
    }
};

window.logout = async function () {
    if (typeof supabase !== 'undefined') {
        await supabase.auth.signOut();
    }
    window.currentUser = null;
    localStorage.removeItem('climaUser');
    window.location.reload();
};

window.handlePurchase = async function (plan) {
    if (!window.currentUser) {
        alert('Por favor, faça login primeiro.');
        window.showAuthModal();
        return;
    }

    let creditsToAdd = 0;
    if (plan === 'premium') creditsToAdd = 10;
    if (plan === 'pro') creditsToAdd = 100;

    try {
        const newCredits = window.simulationsLeft + creditsToAdd;

        // Verificar se Supabase está configurado
        if (typeof supabase !== 'undefined' && window.currentUser.id) {
            // Atualizar no Supabase
            const { error } = await supabase
                .from('users')
                .update({ credits: newCredits })
                .eq('id', window.currentUser.id);

            if (error) throw error;

            window.currentUser.credits = newCredits;
            localStorage.setItem('climaUser', JSON.stringify(window.currentUser));
        } else {
            // Fallback para localStorage
            localStorage.setItem('climaCredits', newCredits);
        }

        window.simulationsLeft = newCredits;
        window.updateAuthUI();
        alert(`Plano ${plan} ativado com sucesso!`);

        // Redirect back to bot and refresh input
        window.switchTab('bot-tab');
        if (typeof window.renderInput === 'function') {
            window.renderInput();
        }
    } catch (error) {
        console.error('Erro ao atualizar créditos:', error);
        alert('Erro ao processar compra. Tente novamente.');
    }
};

// --- Snowflake Generation ---
window.createSnowflakes = function () {
    let container = document.getElementById('snow-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'snow-container';
        document.body.appendChild(container);
    }
    for (let i = 0; i < 30; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        snowflake.innerHTML = '❄';
        snowflake.style.left = (Math.random() * 100) + 'vw';
        snowflake.style.animationDuration = (Math.random() * 5 + 5) + 's';
        snowflake.style.opacity = Math.random();
        snowflake.style.fontSize = (Math.random() * 1 + 0.5) + 'rem';
        snowflake.style.position = 'fixed';
        snowflake.style.top = '-20px';
        snowflake.style.zIndex = '999';
        snowflake.style.pointerEvents = 'none';
        snowflake.style.color = 'white';
        container.appendChild(snowflake);
    }
};

// --- ClimaBot Logic ---
var userData = {
    area: 0,
    windowArea: 0,
    hasWindows: false,
    orientation: 'N',
    isTopFloor: false,
    insulation: 'medium',
    occupants: 1,
    appliances: 0,
    lighting: 'led'
};
var currentStep = 0;
var steps = [
    { question: "Qual o tamanho do cômodo em m²?", key: 'area', type: 'number' },
    { question: "O cômodo possui janelas?", type: 'options', options: [{ label: 'Sim', value: true }, { label: 'Não', value: false }], key: 'hasWindows' },
    { question: "Qual a área aproximada das janelas em m²?", key: 'windowArea', type: 'number', condition: (data) => data.hasWindows },
    { question: "Para que lado as janelas principais estão voltadas?", type: 'options', options: [{ label: 'Norte/Oeste (Forte)', value: 'NW' }, { label: 'Sul/Leste (Suave)', value: 'SE' }], key: 'orientation', condition: (data) => data.hasWindows },
    { question: "Como é a isolação térmica das paredes?", type: 'options', options: [{ label: 'Boa', value: 'good' }, { label: 'Média', value: 'medium' }, { label: 'Ruim', value: 'poor' }], key: 'insulation' },
    { question: "Está no último andar (sol no teto)?", type: 'options', options: [{ label: 'Sim', value: true }, { label: 'Não', value: false }], key: 'isTopFloor' },
    { question: "Tipo de iluminação?", type: 'options', options: [{ label: 'LED', value: 'led' }, { label: 'Incandescente', value: 'hot' }], key: 'lighting' },
    { question: "Quantas pessoas?", key: 'occupants', type: 'number' },
    { question: "Quantos aparelhos eletrônicos?", key: 'appliances', type: 'number' }
];

window.addMessage = function (text, sender) {
    const win = document.getElementById('chat-window');
    if (!win) return;
    const div = document.createElement('div');
    div.className = `message ${sender || 'bot'}`;
    div.innerText = text;
    win.appendChild(div);
    win.scrollTop = win.scrollHeight;
};

window.renderInput = function () {
    const inputArea = document.getElementById('input-area');
    if (!inputArea) return;

    if (!window.currentUser) {
        inputArea.innerHTML = '<button class="btn-send" onclick="window.showAuthModal()">Entrar para Começar</button>';
        return;
    }

    if (window.simulationsLeft <= 0) {
        inputArea.innerHTML = '<button class="btn-send" onclick="window.switchTab(\'pricing-tab\')">Ver Planos</button>';
        return;
    }

    const step = steps[currentStep];
    if (step && step.condition && !step.condition(userData)) {
        currentStep++;
        window.renderInput();
        return;
    }

    if (!step) {
        showResult();
        return;
    }

    if (step.type === 'options') {
        inputArea.innerHTML = '<div class="options-container"></div>';
        const container = inputArea.querySelector('.options-container');
        step.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'btn-option';
            btn.innerText = opt.label;
            btn.onclick = () => window.handleChoice(opt.value, opt.label);
            container.appendChild(btn);
        });
    } else {
        inputArea.innerHTML = `
            <input type="number" id="bot-input" placeholder="Ex: 15">
            <button class="btn-send" onclick="window.handleBotInput()">Enviar</button>
        `;
    }
};

window.handleBotInput = function () {
    const input = document.getElementById('bot-input');
    const val = parseFloat(input.value) || 0;
    const step = steps[currentStep];
    userData[step.key] = val;
    window.addMessage(val, 'user');
    currentStep++;
    processNextStep();
};

window.handleChoice = function (val, label) {
    const step = steps[currentStep];
    userData[step.key] = val;
    window.addMessage(label, 'user');
    currentStep++;
    processNextStep();
};

function processNextStep() {
    if (currentStep < steps.length) {
        setTimeout(() => {
            window.addMessage(steps[currentStep].question, 'bot');
            window.renderInput();
        }, 400);
    } else {
        showResult();
    }
}

function showResult() {
    let btuPerM2 = 600;
    if (userData.insulation === 'good') btuPerM2 -= 50;
    if (userData.insulation === 'poor') btuPerM2 += 100;

    let total = userData.area * btuPerM2;
    if (userData.hasWindows) {
        const solarFactor = (userData.orientation === 'NW' ? 800 : 400);
        total += userData.windowArea * solarFactor;
    }
    if (userData.occupants > 1) total += (userData.occupants - 1) * 600;
    total += userData.appliances * 500;
    if (userData.lighting === 'hot') total += 300;
    if (userData.isTopFloor) total *= 1.2;

    window.addMessage(`Cálculo concluído: ${Math.round(total).toLocaleString()} BTUs`, 'bot');

    // --- Affiliate Recommendations ---
    const recommendAC = (btu) => {
        let recommendation = "";
        // Link único do perfil conforme solicitado
        const link = "https://www.mercadolivre.com.br/pampa/profile";

        if (btu <= 9000) {
            recommendation = "Split Inverter 9.000 BTUs (Ideal para quartos)";
        } else if (btu <= 12000) {
            recommendation = "Split Inverter 12.000 BTUs (Ideal para salas pequenas)";
        } else if (btu <= 18000) {
            recommendation = "Split Inverter 18.000 BTUs (Para ambientes médios)";
        } else {
            recommendation = "Split Inverter 24.000 BTUs+ (Para grandes espaços)";
        }

        return { text: recommendation, url: link };
    };

    const rec = recommendAC(total);
    setTimeout(() => {
        window.addMessage(`💡 Recomendação: ${rec.text}`, 'bot');

        setTimeout(() => {
            window.addMessage(`O que deseja fazer agora?`, 'bot');

            // Criar container de opções customizado
            const choicesDiv = document.createElement('div');
            choicesDiv.className = 'choice-container';
            choicesDiv.style.marginTop = '10px';

            const btnNew = document.createElement('button');
            btnNew.className = 'choice-btn';
            btnNew.innerText = '🔄 Nova Simulação';
            btnNew.onclick = () => {
                window.addMessage('🔄 Nova Simulação', 'user');
                currentStep = 0;
                processNextStep();
            };

            const btnContact = document.createElement('button');
            btnContact.className = 'choice-btn';
            btnContact.innerText = '📞 Entre em Contato';
            btnContact.onclick = () => {
                window.addMessage('📞 Entre em Contato', 'user');
                window.addMessage('Perfeito! Se você possui a **planta baixa da sua residência**, nossa equipe pode fazer um cálculo de carga térmica profissional para você.', 'bot');
                window.addMessage('Clique no link abaixo para falar comigo no WhatsApp:', 'bot');
                window.addMessage('<a href="https://wa.me/5554991515252" target="_blank" style="color: #38bdf8; text-decoration: underline; font-weight: bold;">Falar com Engenheiro no WhatsApp ➚</a>', 'bot');
            };

            choicesDiv.appendChild(btnNew);
            choicesDiv.appendChild(btnContact);

            document.getElementById('chat-window').appendChild(choicesDiv);
            const win = document.getElementById('chat-window');
            win.scrollTop = win.scrollHeight;
        }, 1500);
    }, 1000);

    document.getElementById('results-explained').style.display = 'block';

    window.simulationsLeft--;
    localStorage.setItem('climaCredits', window.simulationsLeft);

    // Atualizar créditos no Supabase
    if (typeof supabase !== 'undefined' && window.currentUser && window.currentUser.id) {
        supabase
            .from('users')
            .update({ credits: window.simulationsLeft })
            .eq('id', window.currentUser.id)
            .then(({ error }) => {
                if (error) console.error('Erro ao atualizar créditos:', error);
            });
    }

    saveHistory(total);
    window.updateAuthUI();
    renderEconomyChart(total);

    // Add Restart Button
    const inputArea = document.getElementById('input-area');
    if (inputArea) {
        inputArea.innerHTML = '<button class="btn-send" onclick="window.restartBot()">Novo Cálculo</button>';
    }
}

window.restartBot = function () {
    currentStep = 0;
    const win = document.getElementById('chat-window');
    if (win) win.innerHTML = '<div class="message bot">Olá! Vamos começar um novo cálculo?</div>';
    window.addMessage(steps[0].question, 'bot');
    window.renderInput();
};

async function saveHistory(btu) {
    if (!window.currentUser) return;

    try {
        // Verificar se Supabase está configurado
        if (typeof supabase !== 'undefined' && window.currentUser.id) {
            // Salvar no Supabase
            const { error } = await supabase
                .from('calculations')
                .insert([{
                    user_id: window.currentUser.id,
                    btu_result: Math.round(btu),
                    area: userData.area,
                    window_area: userData.windowArea || 0,
                    orientation: userData.orientation,
                    is_top_floor: userData.isTopFloor,
                    insulation: userData.insulation,
                    occupants: userData.occupants,
                    appliances: userData.appliances,
                    lighting: userData.lighting
                }]);

            if (error) throw error;
        } else {
            // Fallback para localStorage
            const item = {
                btu,
                date: new Date().toLocaleDateString('pt-BR'),
                area: userData.area
            };
            window.historyData.unshift(item);
            localStorage.setItem('climaHistory', JSON.stringify(window.historyData));
        }
    } catch (error) {
        console.error('Erro ao salvar histórico:', error);
    }
}

async function renderHistory() {
    const list = document.getElementById('history-list');
    if (!list || !window.currentUser) return;

    try {
        // Verificar se Supabase está configurado
        if (typeof supabase !== 'undefined' && window.currentUser.id) {
            // Carregar do Supabase
            const { data: calculations, error } = await supabase
                .from('calculations')
                .select('*')
                .eq('user_id', window.currentUser.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            if (!calculations || calculations.length === 0) {
                list.innerHTML = '<p style="text-align: center; opacity: 0.5;">Nenhum cálculo salvo ainda.</p>';
                return;
            }

            list.innerHTML = calculations.map(calc => `
                <div class="history-item">
                    <div class="history-info">
                        <h4>${calc.btu_result.toLocaleString()} BTUs</h4>
                        <p>${new Date(calc.created_at).toLocaleDateString('pt-BR')} - Ambiente de ${calc.area}m²</p>
                    </div>
                    <button class="btn-small" onclick="window.switchTab('bot-tab'); renderEconomyChart(${calc.btu_result}); document.getElementById('results-explained').scrollIntoView();">Ver</button>
                </div>
            `).join('');
        } else {
            // Fallback para localStorage
            if (window.historyData.length === 0) {
                list.innerHTML = '<p style="text-align: center; opacity: 0.5;">Nenhum cálculo salvo.</p>';
                return;
            }
            list.innerHTML = window.historyData.map(h => `
                <div class="history-item">
                    <div class="history-info">
                        <h4>${h.btu.toLocaleString()} BTUs</h4>
                        <p>${h.date} - Ambiente de ${h.area}m²</p>
                    </div>
                    <button class="btn-small" onclick="window.switchTab('bot-tab'); renderEconomyChart(${h.btu}); document.getElementById('results-explained').scrollIntoView();">Ver</button>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        list.innerHTML = '<p style="color: #ef4444;">Erro ao carregar histórico.</p>';
    }
}

function renderEconomyChart(btu) {
    const ctx = document.getElementById('economyChart');
    if (!ctx) return;

    if (window.economyChart) window.economyChart.destroy();

    const costConv = (btu / 3.41 / 2.8 / 1000) * 8 * 30 * 0.9;
    const costInv = costConv * 0.6;

    window.economyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Convencional', 'Inverter'],
            datasets: [{
                label: 'Custo Mensal (R$)',
                data: [costConv.toFixed(2), costInv.toFixed(2)],
                backgroundColor: ['rgba(255,255,255,0.2)', 'rgba(56,189,248,0.8)']
            }]
        },
        options: {
            scales: { y: { beginAtZero: true, ticks: { color: '#fff' } }, x: { ticks: { color: '#fff' } } },
            plugins: { legend: { display: false } }
        }
    });
}

window.exportToPDF = () => window.print();

// --- Sun Simulator Logic ---
var simInitialized = false;
var scene, camera, renderer, simControls, sunSphere, houseGroup;

window.initSunSim = function () {
    if (simInitialized) return;
    if (typeof THREE === 'undefined') return;

    const container = document.getElementById('canvas-container');
    if (!container || container.clientWidth === 0) return;

    simInitialized = true;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c4a6e);

    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 1, 1000);
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    if (THREE.OrbitControls) {
        simControls = new THREE.OrbitControls(camera, renderer.domElement);
    }

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshLambertMaterial({ color: 0x075985 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    houseGroup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 8), new THREE.MeshLambertMaterial({ color: 0xf0f9ff }));
    body.position.y = 2.5;
    houseGroup.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(7, 4, 4), new THREE.MeshLambertMaterial({ color: 0x38bdf8 }));
    roof.position.y = 7;
    roof.rotation.y = Math.PI / 4;
    houseGroup.add(roof);

    // Door
    const door = new THREE.Mesh(new THREE.BoxGeometry(2, 3.5, 0.2), new THREE.MeshLambertMaterial({ color: 0x78350f }));
    door.position.set(0, 1.75, 4.01);
    houseGroup.add(door);

    // Front Window
    const windowFront = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 0.2), new THREE.MeshLambertMaterial({ color: 0xbae6fd }));
    windowFront.position.set(2.5, 2.5, 4.01);
    houseGroup.add(windowFront);

    // Side Window
    const windowSide = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 1.5), new THREE.MeshLambertMaterial({ color: 0xbae6fd }));
    windowSide.position.set(4.01, 2.5, 0);
    houseGroup.add(windowSide);

    scene.add(houseGroup);

    sunSphere = new THREE.Mesh(new THREE.SphereGeometry(2, 24, 24), new THREE.MeshBasicMaterial({ color: 0xffff00 }));
    scene.add(sunSphere);

    setupSimUI();
    animateSim();
};

function setupSimUI() {
    const sunSlider = document.getElementById('sun-slider');
    const houseSlider = document.getElementById('house-slider');

    function update() {
        if (sunSlider) {
            const time = parseFloat(sunSlider.value);
            const angle = ((time - 6) / 12) * Math.PI - Math.PI / 2;
            sunSphere.position.set(Math.sin(angle) * 35, Math.cos(angle) * 35, 0);
            document.getElementById('sun-time').innerText = `${Math.floor(time).toString().padStart(2, '0')}:00`;
        }
        if (houseSlider) {
            const rot = parseFloat(houseSlider.value);
            houseGroup.rotation.y = rot * (Math.PI / 180);
            document.getElementById('house-rotation').innerText = `${rot}°`;
            const needle = document.getElementById('compass-needle');
            if (needle) needle.style.transform = `rotate(${rot}deg)`;
        }
    }

    if (sunSlider) sunSlider.addEventListener('input', update);
    if (houseSlider) houseSlider.addEventListener('input', update);
    update();
}

function animateSim() {
    requestAnimationFrame(animateSim);
    if (simControls) simControls.update();
    if (renderer) renderer.render(scene, camera);
}

window.onWindowResize = function () {
    if (renderer && camera) {
        const container = document.getElementById('canvas-container');
        if (container && container.clientWidth > 0) {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }
    }
};

// --- Initialization ---
window.onload = function () {
    window.createSnowflakes();
    window.updateAuthUI();
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.onclick = function () {
            if (!window.currentUser) {
                window.showAuthModal();
            } else {
                window.addMessage(steps[0].question, 'bot');
                window.renderInput();
            }
        };
    }
    window.addEventListener('resize', window.onWindowResize);
};
