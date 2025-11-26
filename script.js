// ==================== CORE APPLICATION STATE ====================
const AppState = {
    sets: new Map(),
    nextSetId: 1,
    universalSets: {
        'ℕ': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        '𝕎': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        'ℤ': [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5],
        'ℚ': [0.5, 1.5, 2.5, 3.5, 0.333, 0.666, 0.25, 1, 2, 3],
        'ℝ': [1, 1.5, 2, 2.5, 3, Math.PI, Math.E, 0.5, 2.7],
        'ℚ′': [Math.PI, Math.E, Math.sqrt(2), Math.sqrt(3), Math.sqrt(5)]
    }
};

// ==================== HISTORY MANAGER ====================
const HistoryManager = {
    history: [],
    currentIndex: -1,
    
    pushState(state) {
        this.history = this.history.slice(0, this.currentIndex + 1);
        this.history.push(JSON.parse(JSON.stringify(state)));
        this.currentIndex = this.history.length - 1;
        this.updateUndoButton();
    },
    
    undo() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            const state = this.history[this.currentIndex];
            this.restoreState(state);
            return state;
        }
        return null;
    },
    
    restoreState(state) {
        AppState.sets = new Map(state.sets);
        AppState.nextSetId = state.nextSetId;
        StorageManager.saveState();
        this.updateUndoButton();
        showMainMenu();
    },
    
    updateUndoButton() {
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) {
            undoBtn.disabled = this.currentIndex <= 0;
        }
    },
    
    getCurrentState() {
        return {
            sets: Array.from(AppState.sets.entries()),
            nextSetId: AppState.nextSetId
        };
    }
};

// ==================== STORAGE MANAGER ====================
const StorageManager = {
    saveState() {
        try {
            const stateToSave = HistoryManager.getCurrentState();
            localStorage.setItem('setLabState', JSON.stringify(stateToSave));
        } catch (error) {
            console.error('خطا در ذخیره‌سازی:', error);
        }
    },
    
    loadState() {
        try {
            const saved = localStorage.getItem('setLabState');
            if (saved) {
                const state = JSON.parse(saved);
                AppState.sets = new Map(state.sets);
                AppState.nextSetId = state.nextSetId;
                HistoryManager.pushState(state);
                return true;
            }
        } catch (error) {
            console.error('خطا در بارگذاری:', error);
        }
        return false;
    }
};

// ==================== SMART KEYBOARD ====================
const SmartKeyboard = {
    isOpen: false,
    
    init() {
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        document.getElementById('kbBtn').addEventListener('click', () => this.toggle());
        document.querySelector('.btn-close-kb').addEventListener('click', () => this.hide());
        
        document.querySelectorAll('.btn-keyboard[data-symbol]').forEach(button => {
            button.addEventListener('click', (e) => {
                const symbol = e.target.getAttribute('data-symbol');
                this.insertSymbol(symbol);
            });
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.hide();
            }
        });
    },
    
    toggle() {
        if (this.isOpen) {
            this.hide();
        } else {
            this.show();
        }
    },
    
    show() {
        const keyboard = document.getElementById('keyboard');
        const body = document.body;
        keyboard.classList.add('show');
        body.classList.add('keyboard-open');
        this.isOpen = true;
    },
    
    hide() {
        const keyboard = document.getElementById('keyboard');
        const body = document.body;
        keyboard.classList.remove('show');
        body.classList.remove('keyboard-open');
        this.isOpen = false;
    },
    
    insertSymbol(symbol) {
        const activeInput = document.activeElement;
        if (!activeInput || (activeInput.tagName !== 'INPUT' && activeInput.tagName !== 'TEXTAREA')) {
            showMessage('لطفاً ابتدا یک فیلد ورودی را انتخاب کنید', 'warning');
            return;
        }
        
        if (symbol === 'backspace') {
            this.backspace(activeInput);
            return;
        }
        
        const start = activeInput.selectionStart;
        const end = activeInput.selectionEnd;
        const currentValue = activeInput.value;
        
        activeInput.value = currentValue.substring(0, start) + symbol + currentValue.substring(end);
        const newPosition = start + symbol.length;
        activeInput.setSelectionRange(newPosition, newPosition);
        activeInput.focus();
    },
    
    backspace(activeInput) {
        const start = activeInput.selectionStart;
        const end = activeInput.selectionEnd;
        const value = activeInput.value;
        
        if (start === end && start > 0) {
            activeInput.value = value.substring(0, start - 1) + value.substring(end);
            activeInput.setSelectionRange(start - 1, start - 1);
        } else if (start !== end) {
            activeInput.value = value.substring(0, start) + value.substring(end);
            activeInput.setSelectionRange(start, start);
        }
        activeInput.focus();
    }
};

// ==================== SET OPERATIONS ====================
function union(setA, setB) {
    const result = [...new Set([...setA, ...setB])];
    return result.sort((a, b) => a - b);
}

function intersection(setA, setB) {
    const result = setA.filter(x => setB.includes(x));
    return result.sort((a, b) => a - b);
}

function difference(setA, setB) {
    const result = setA.filter(x => !setB.includes(x));
    return result.sort((a, b) => a - b);
}

function parseSet(input) {
    try {
        if (typeof input !== 'string' || !input.trim()) {
            return [];
        }
        
        let processedInput = input.trim();
        
        if (processedInput === '∅' || processedInput === '{}') return [];
        
        if (processedInput.startsWith('{') && processedInput.endsWith('}')) {
            processedInput = processedInput.slice(1, -1).trim();
        }
        
        if (processedInput === '') return [];
        
        const elements = processedInput.split(',')
            .map(item => item.trim())
            .filter(item => item !== '');
        
        if (elements.length === 0) return [];
        
        const uniqueElements = [];
        const seen = new Set();
        
        for (const item of elements) {
            let num = Number(item);
            if (!isNaN(num)) {
                const key = num.toString();
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueElements.push(num);
                }
            } else {
                if (!seen.has(item)) {
                    seen.add(item);
                    uniqueElements.push(item);
                }
            }
        }
        
        const numbers = uniqueElements.filter(x => typeof x === 'number');
        const strings = uniqueElements.filter(x => typeof x === 'string');
        
        return [...numbers.sort((a, b) => a - b), ...strings];
        
    } catch (error) {
        console.error('Error parsing set:', error);
        showMessage(`خطا در تجزیه مجموعه: ${error.message}`, 'error');
        return [];
    }
}

// ==================== UI FUNCTIONS ====================
function showMessage(message, type = 'info', duration = 5000) {
    const messagesContainer = document.getElementById('systemMessages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message message-fade`;
    messageDiv.textContent = message;
    
    messagesContainer.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.style.opacity = '0';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }
    }, duration);
}

function start() {
    AppState.sets.clear();
    AppState.nextSetId = 1;
    HistoryManager.pushState(HistoryManager.getCurrentState());
    StorageManager.saveState();
    showMainMenu();
}

function showMainMenu() {
    document.getElementById("step").innerHTML = `
        <div class="step-container">
            <h3>منوی اصلی آزمایشگاه مجموعه‌ها</h3>
            <p>تعداد مجموعه‌های موجود: <strong>${AppState.sets.size}</strong></p>
            <p>لطفاً عملیات مورد نظر را انتخاب کنید:</p>
            <div class="operations-grid">
                <button onclick="addNewSet()" class="btn-operation">➕ ایجاد مجموعه جدید</button>
                <button onclick="showAllSets()" class="btn-operation">📋 نمایش همه مجموعه‌ها</button>
                <button onclick="showSetOperations()" class="btn-operation">🧮 عملیات روی مجموعه‌ها</button>
                <button onclick="checkMembership()" class="btn-operation">🔍 بررسی عضویت</button>
                <button onclick="checkSubsets()" class="btn-operation">📊 بررسی زیرمجموعه‌ها</button>
                <button onclick="showUniversalSets()" class="btn-operation">🌍 مجموعه‌های جهانی</button>
                <button onclick="showVisualizations()" class="btn-operation">📈 نمایش گرافیکی</button>
            </div>
        </div>
    `;
}

function addNewSet() {
    document.getElementById("step").innerHTML = `
        <div class="step-container">
            <h3>ایجاد مجموعه جدید</h3>
            <p>تعداد مجموعه‌های موجود: <strong>${AppState.sets.size}</strong></p>
            <p>لطفاً نوع ورودی مجموعه را انتخاب کنید:</p>
            
            <div class="input-type-selector">
                <button onclick="showNormalInput()" class="btn-type">
                    <strong>حالت عادی</strong><br>
                    <small>مثال: 1,2,3,4,5</small>
                </button>
                
                <button onclick="showSymbolicInput()" class="btn-type">
                    <strong>روش نمادین</strong><br>
                    <small>مثال: { x | x ∈ ℕ , 3 ≤ x ≤ 8 }</small>
                </button>
                
                <button onclick="showVerbalInput()" class="btn-type">
                    <strong>حالت کلامی</strong><br>
                    <small>مثال: اعداد فرد بین ۱ تا ۱۰</small>
                </button>
            </div>
            
            <div class="button-group">
                <button onclick="showMainMenu()" class="btn btn-secondary">🔙 بازگشت</button>
            </div>
        </div>
    `;
}

function showNormalInput() {
    document.getElementById("step").innerHTML = `
        <div class="step-container">
            <h3>🔢 ایجاد مجموعه با حالت عادی</h3>
            <p>اعضای مجموعه را با کاما جدا کنید:</p>
            
            <div class="form-group">
                <label class="form-label">نام مجموعه:</label>
                <input type="text" id="setName" class="form-input" placeholder="مثال: A, B, C, ...">
            </div>
            
            <div class="form-group">
                <label class="form-label">اعضای مجموعه (با کاما جدا کنید):</label>
                <input type="text" id="setElements" class="form-input" placeholder="مثال: 1, 2, 3, 4, 5">
                <small>💡 اعضای تکراری به طور خودکار حذف می‌شوند</small>
            </div>
            
            <div class="button-group">
                <button onclick="saveNormalSet()" class="btn btn-success">💾 ذخیره مجموعه</button>
                <button onclick="addNewSet()" class="btn btn-secondary">🔙 بازگشت</button>
            </div>
        </div>
    `;
}

function showSymbolicInput() {
    document.getElementById("step").innerHTML = `
        <div class="step-container">
            <h3>📐 ایجاد مجموعه با روش نمادین</h3>
            <p>مجموعه را به صورت نمادین ریاضی وارد کنید:</p>
            
            <div class="form-group">
                <label class="form-label">نام مجموعه:</label>
                <input type="text" id="setName" class="form-input" placeholder="مثال: A, B, C, ...">
            </div>
            
            <div class="form-group">
                <label class="form-label">مجموعه نمادین:</label>
                <textarea id="setExpression" class="form-input" rows="2" placeholder="مثال: { x | x ∈ ℕ , 3 ≤ x ≤ 8 }"></textarea>
                <small>💡 نکته: از "|" برای جدا کردن متغیر از شرایط استفاده کنید</small>
            </div>
            
            <div class="examples">
                <strong>🎯 نمونه‌های آماده:</strong>
                <div class="example-buttons">
                    <button onclick="document.getElementById('setExpression').value = '{ x | x ∈ ℕ , 3 ≤ x ≤ 8 }'" class="btn-example">
                        { x | x ∈ ℕ , 3 ≤ x ≤ 8 }
                    </button>
                    <button onclick="document.getElementById('setExpression').value = '{ x | x ∈ ℤ , -2 ≤ x ≤ 2 }'" class="btn-example">
                        { x | x ∈ ℤ , -2 ≤ x ≤ 2 }
                    </button>
                </div>
            </div>
            
            <div class="button-group">
                <button onclick="saveSymbolicSet()" class="btn btn-success">💾 ذخیره مجموعه</button>
                <button onclick="addNewSet()" class="btn btn-secondary">🔙 بازگشت</button>
            </div>
        </div>
    `;
}

function showVerbalInput() {
    document.getElementById("step").innerHTML = `
        <div class="step-container">
            <h3>🗣️ ایجاد مجموعه با حالت کلامی</h3>
            <p>مجموعه را با توصیف کلامی وارد کنید:</p>
            
            <div class="form-group">
                <label class="form-label">نام مجموعه:</label>
                <input type="text" id="setName" class="form-input" placeholder="مثال: اعداد_فرد, اعداد_اول, ...">
            </div>
            
            <div class="form-group">
                <label class="form-label">توصیف مجموعه:</label>
                <textarea id="setDescription" class="form-input" rows="3" placeholder="مثال: اعداد طبیعی فرد بین ۱ تا ۱۰"></textarea>
            </div>
            
            <div class="examples">
                <strong>نمونه‌های حالت کلامی:</strong>
                <ul>
                    <li>اعداد طبیعی فرد بین ۱ تا ۱۰</li>
                    <li>اعداد اول کوچکتر از ۲۰</li>
                    <li>مضرب‌های ۳ بین ۱ تا ۳۰</li>
                </ul>
            </div>
            
            <div class="button-group">
                <button onclick="saveVerbalSet()" class="btn btn-success">💾 ذخیره مجموعه</button>
                <button onclick="addNewSet()" class="btn btn-secondary">🔙 بازگشت</button>
            </div>
        </div>
    `;
}

function validateSetName(name) {
    if (!name || name.trim() === '') {
        return 'نام مجموعه نمی‌تواند خالی باشد';
    }
    
    if (AppState.sets.has(name)) {
        return `مجموعه با نام "${name}" از قبل وجود دارد`;
    }
    
    return null;
}

function saveNormalSet() {
    const nameInput = document.getElementById("setName");
    const elementsInput = document.getElementById("setElements");
    
    const name = nameInput.value.trim();
    const elementsText = elementsInput.value.trim();
    
    const nameError = validateSetName(name);
    if (nameError) {
        showMessage(nameError, 'error');
        nameInput.focus();
        return;
    }
    
    if (!elementsText) {
        showMessage('لطفاً اعضای مجموعه را وارد کنید', 'error');
        elementsInput.focus();
        return;
    }
    
    const elements = parseSet(elementsText);
    
    AppState.sets.set(name, {
        type: 'normal',
        elements: elements,
        createdAt: new Date().toISOString()
    });
    
    HistoryManager.pushState(HistoryManager.getCurrentState());
    StorageManager.saveState();
    showMessage(`✅ مجموعه "${name}" با ${elements.length} عضو ذخیره شد`, 'success');
    showMainMenu();
}

function saveSymbolicSet() {
    const nameInput = document.getElementById("setName");
    const expressionInput = document.getElementById("setExpression");
    
    const name = nameInput.value.trim();
    const expression = expressionInput.value.trim();
    
    const nameError = validateSetName(name);
    if (nameError) {
        showMessage(nameError, 'error');
        nameInput.focus();
        return;
    }
    
    if (!expression) {
        showMessage('لطفاً عبارت نمادین مجموعه را وارد کنید', 'error');
        expressionInput.focus();
        return;
    }
    
    const elements = parseSymbolicExpression(expression);
    
    AppState.sets.set(name, {
        type: 'symbolic',
        expression: expression,
        elements: elements,
        createdAt: new Date().toISOString()
    });
    
    HistoryManager.pushState(HistoryManager.getCurrentState());
    StorageManager.saveState();
    showMessage(`✅ مجموعه نمادین "${name}" ذخیره شد`, 'success');
    showMainMenu();
}

function saveVerbalSet() {
    const nameInput = document.getElementById("setName");
    const descriptionInput = document.getElementById("setDescription");
    
    const name = nameInput.value.trim();
    const description = descriptionInput.value.trim();
    
    const nameError = validateSetName(name);
    if (nameError) {
        showMessage(nameError, 'error');
        nameInput.focus();
        return;
    }
    
    if (!description) {
        showMessage('لطفاً توصیف مجموعه را وارد کنید', 'error');
        descriptionInput.focus();
        return;
    }
    
    const elements = parseVerbalDescription(description);
    
    AppState.sets.set(name, {
        type: 'verbal',
        description: description,
        elements: elements,
        createdAt: new Date().toISOString()
    });
    
    HistoryManager.pushState(HistoryManager.getCurrentState());
    StorageManager.saveState();
    showMessage(`✅ مجموعه کلامی "${name}" ذخیره شد`, 'success');
    showMainMenu();
}

function parseSymbolicExpression(expression) {
    // پیاده‌سازی ساده برای نمایش
    return [1, 2, 3, 4, 5];
}

function parseVerbalDescription(description) {
    // پیاده‌سازی ساده برای نمایش
    if (description.includes('فرد') && description.includes('۱') && description.includes('۱۰')) {
        return [1, 3, 5, 7, 9];
    } else if (description.includes('اول') && description.includes('۲۰')) {
        return [2, 3, 5, 7, 11, 13, 17, 19];
    } else if (description.includes('مضرب') && description.includes('۳')) {
        return [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
    }
    return [1, 2, 3, 4, 5];
}

function showAllSets() {
    if (AppState.sets.size === 0) {
        document.getElementById("step").innerHTML = `
            <div class="step-container">
                <h3>مجموعه‌های موجود</h3>
                <p>هنوز هیچ مجموعه‌ای ایجاد نشده است.</p>
                <button onclick="addNewSet()" class="btn btn-primary">➕ ایجاد مجموعه جدید</button>
                <button onclick="showMainMenu()" class="btn btn-secondary">🔙 بازگشت</button>
            </div>
        `;
        return;
    }
    
    let setsHTML = '<div class="step-container"><h3>مجموعه‌های موجود</h3>';
    setsHTML += `<p>تعداد مجموعه‌ها: <strong>${AppState.sets.size}</strong></p>`;
    
    AppState.sets.forEach((setData, name) => {
        let content = '';
        
        if (setData.type === 'symbolic') {
            content = `
                <div class="set-expression">${setData.expression}</div>
                <div class="set-content">مقادیر: { ${setData.elements.join(', ')} }</div>
            `;
        } else if (setData.type === 'verbal') {
            content = `
                <div class="set-description">${setData.description}</div>
                <div class="set-content">مقادیر: { ${setData.elements.join(', ')} }</div>
            `;
        } else {
            content = `<div class="set-content">{ ${setData.elements.join(', ')} }</div>`;
        }
        
        setsHTML += `
            <div class="set-item">
                <div class="set-name">${name}</div>
                ${content}
                <div class="set-actions">
                    <button onclick="deleteSet('${name}')" class="btn btn-danger">🗑️ حذف</button>
                </div>
            </div>
        `;
    });
    
    setsHTML += `
        <div class="button-group">
            <button onclick="addNewSet()" class="btn btn-success">➕ مجموعه جدید</button>
            <button onclick="showMainMenu()" class="btn btn-secondary">🔙 بازگشت</button>
        </div>
    </div>`;
    
    document.getElementById("step").innerHTML = setsHTML;
}

function deleteSet(name) {
    if (confirm(`آیا از حذف مجموعه "${name}" مطمئن هستید؟`)) {
        AppState.sets.delete(name);
        HistoryManager.pushState(HistoryManager.getCurrentState());
        StorageManager.saveState();
        showMessage(`✅ مجموعه "${name}" حذف شد`, 'success');
        showAllSets();
    }
}

function showSetOperations() {
    if (AppState.sets.size < 2) {
        showMessage('برای انجام عملیات حداقل به ۲ مجموعه نیاز دارید', 'warning');
        return;
    }
    
    let setsHTML = '';
    AppState.sets.forEach((setData, name) => {
        const elementCount = setData.elements ? setData.elements.length : 0;
        setsHTML += `<option value="${name}">${name} (${elementCount} عضو)</option>`;
    });
    
    document.getElementById("step").innerHTML = `
        <div class="step-container">
            <h3>عملیات روی مجموعه‌ها</h3>
            <p>تعداد مجموعه‌های موجود: <strong>${AppState.sets.size}</strong></p>
            <div class="form-group">
                <label class="form-label">مجموعه اول:</label>
                <select id="setA" class="form-input">${setsHTML}</select>
            </div>
            <div class="form-group">
                <label class="form-label">عملیات:</label>
                <select id="operation" class="form-input">
                    <option value="union">اتحاد (A ∪ B)</option>
                    <option value="intersection">اشتراک (A ∩ B)</option>
                    <option value="difference">تفاضل (A - B)</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">مجموعه دوم:</label>
                <select id="setB" class="form-input">${setsHTML}</select>
            </div>
            <div class="button-group">
                <button onclick="performSetOperation()" class="btn btn-primary">🧮 انجام عملیات</button>
                <button onclick="showMainMenu()" class="btn btn-secondary">🔙 بازگشت</button>
            </div>
            <div id="operationResult"></div>
        </div>
    `;
}

function performSetOperation() {
    const setA = document.getElementById("setA").value;
    const setB = document.getElementById("setB").value;
    const operation = document.getElementById("operation").value;
    
    const setDataA = AppState.sets.get(setA);
    const setDataB = AppState.sets.get(setB);
    
    const elementsA = setDataA.elements || [];
    const elementsB = setDataB.elements || [];
    
    let result = [];
    let operationName = '';
    let operationSymbol = '';
    
    switch(operation) {
        case 'union':
            result = union(elementsA, elementsB);
            operationName = 'اتحاد';
            operationSymbol = '∪';
            break;
        case 'intersection':
            result = intersection(elementsA, elementsB);
            operationName = 'اشتراک';
            operationSymbol = '∩';
            break;
        case 'difference':
            result = difference(elementsA, elementsB);
            operationName = 'تفاضل';
            operationSymbol = '−';
            break;
    }
    
    const resultDiv = document.getElementById("operationResult");
    resultDiv.innerHTML = `
        <div class="success-message">
            <h4>✅ نتیجه ${operationName}:</h4>
            <p><strong>${setA} ${operationSymbol} ${setB} =</strong></p>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 12px 0; border: 2px solid #e9ecef;">
                { ${result.join(', ')} }
            </div>
            <p><small>تعداد اعضا: ${result.length}</small></p>
        </div>
    `;
}

function checkMembership() {
    if (AppState.sets.size === 0) {
        showMessage('ابتدا باید مجموعه‌ای ایجاد کنید', 'warning');
        return;
    }
    
    let setsHTML = '';
    AppState.sets.forEach((setData, name) => {
        const elementCount = setData.elements ? setData.elements.length : 0;
        setsHTML += `<option value="${name}">${name} (${elementCount} عضو)</option>`;
    });
    
    document.getElementById("step").innerHTML = `
        <div class="step-container">
            <h3>🔍 بررسی عضویت</h3>
            <p>تعداد مجموعه‌های موجود: <strong>${AppState.sets.size}</strong></p>
            <div class="form-group">
                <label class="form-label">عنصر مورد بررسی:</label>
                <input type="text" id="elementToCheck" class="form-input" placeholder="مثال: 5, 3.14, x">
            </div>
            <div class="form-group">
                <label class="form-label">مجموعه:</label>
                <select id="setToCheck" class="form-input">${setsHTML}</select>
            </div>
            <div class="button-group">
                <button onclick="performMembershipCheck()" class="btn btn-primary">بررسی عضویت</button>
                <button onclick="showMainMenu()" class="btn btn-secondary">🔙 بازگشت</button>
            </div>
            <div id="membershipResult"></div>
        </div>
    `;
}

function performMembershipCheck() {
    const elementInput = document.getElementById("elementToCheck");
    const element = elementInput.value.trim();
    const setName = document.getElementById("setToCheck").value;
    
    if (!element) {
        showMessage('لطفاً عنصر مورد بررسی را وارد کنید', 'error');
        return;
    }
    
    const setData = AppState.sets.get(setName);
    const elements = setData.elements || [];
    
    let elementToCheck;
    if (!isNaN(element)) {
        elementToCheck = Number(element);
    } else {
        elementToCheck = element;
    }
    
    const isMember = elements.includes(elementToCheck);
    const symbol = isMember ? '∈' : '∉';
    
    const resultDiv = document.getElementById("membershipResult");
    resultDiv.innerHTML = `
        <div class="${isMember ? 'success' : 'warning'}-message">
            <h4>${isMember ? '✅ عضو مجموعه است' : '❌ عضو مجموعه نیست'}</h4>
            <p><strong>${element} ${symbol} ${setName}</strong></p>
            <p>مجموعه ${setName}: { ${elements.join(', ')} }</p>
        </div>
    `;
}

function checkSubsets() {
    if (AppState.sets.size < 2) {
        showMessage('برای بررسی زیرمجموعه‌ها حداقل به ۲ مجموعه نیاز دارید', 'warning');
        return;
    }
    
    let setsHTML = '';
    AppState.sets.forEach((setData, name) => {
        const elementCount = setData.elements ? setData.elements.length : 0;
        setsHTML += `<option value="${name}">${name} (${elementCount} عضو)</option>`;
    });
    
    document.getElementById("step").innerHTML = `
        <div class="step-container">
            <h3>📊 بررسی زیرمجموعه‌ها</h3>
            <p>تعداد مجموعه‌های موجود: <strong>${AppState.sets.size}</strong></p>
            <div class="form-group">
                <label class="form-label">مجموعه اول:</label>
                <select id="subsetA" class="form-input">${setsHTML}</select>
            </div>
            <div class="form-group">
                <label class="form-label">مجموعه دوم:</label>
                <select id="subsetB" class="form-input">${setsHTML}</select>
            </div>
            <div class="button-group">
                <button onclick="performSubsetCheck()" class="btn btn-primary">🔍 بررسی زیرمجموعه</button>
                <button onclick="showMainMenu()" class="btn btn-secondary">🔙 بازگشت</button>
            </div>
            <div id="subsetResult"></div>
        </div>
    `;
}

function performSubsetCheck() {
    const setA = document.getElementById("subsetA").value;
    const setB = document.getElementById("subsetB").value;
    
    const setDataA = AppState.sets.get(setA);
    const setDataB = AppState.sets.get(setB);
    
    const elementsA = setDataA.elements || [];
    const elementsB = setDataB.elements || [];
    
    const isSubset = elementsA.every(x => elementsB.includes(x));
    const isProperSubset = isSubset && elementsA.length < elementsB.length;
    const isEqual = isSubset && elementsA.length === elementsB.length;
    
    let resultText = '';
    if (isEqual) {
        resultText = `${setA} برابر با ${setB} است (${setA} = ${setB})`;
    } else if (isProperSubset) {
        resultText = `${setA} زیرمجموعهٔ سره ${setB} است (${setA} ⊂ ${setB})`;
    } else if (isSubset) {
        resultText = `${setA} زیرمجموعهٔ ${setB} است (${setA} ⊆ ${setB})`;
    } else {
        resultText = `${setA} زیرمجموعهٔ ${setB} نیست`;
    }
    
    const resultDiv = document.getElementById("subsetResult");
    resultDiv.innerHTML = `
        <div class="${isSubset ? 'success' : 'warning'}-message">
            <h4>${isSubset ? '✅ زیرمجموعه است' : '❌ زیرمجموعه نیست'}</h4>
            <p><strong>${resultText}</strong></p>
            <p><small>مجموعه ${setA}: { ${elementsA.join(', ')} }</small></p>
            <p><small>مجموعه ${setB}: { ${elementsB.join(', ')} }</small></p>
            <p><small>تعداد اعضای ${setA}: ${elementsA.length}</small></p>
            <p><small>تعداد اعضای ${setB}: ${elementsB.length}</small></p>
        </div>
    `;
}

function showUniversalSets() {
    let setsHTML = '';
    for (const [name, elements] of Object.entries(AppState.universalSets)) {
        setsHTML += `
            <div class="set-item">
                <div class="set-name">${name}</div>
                <div class="set-content">{ ${elements.join(', ')} }</div>
                <div class="set-actions">
                    <button onclick="addUniversalSet('${name}')" class="btn btn-success">➕ افزودن به مجموعه‌ها</button>
                </div>
            </div>
        `;
    }
    
    document.getElementById("step").innerHTML = `
        <div class="step-container">
            <h3>مجموعه‌های جهانی</h3>
            ${setsHTML}
            <button onclick="showMainMenu()" class="btn btn-secondary">🔙 بازگشت</button>
        </div>
    `;
}

function addUniversalSet(name) {
    if (AppState.sets.has(name)) {
        showMessage(`مجموعه ${name} از قبل وجود دارد`, 'warning');
        return;
    }
    
    AppState.sets.set(name, {
        type: 'universal',
        elements: [...AppState.universalSets[name]],
        createdAt: new Date().toISOString()
    });
    
    HistoryManager.pushState(HistoryManager.getCurrentState());
    StorageManager.saveState();
    showMessage(`✅ مجموعه جهانی "${name}" اضافه شد`, 'success');
    showUniversalSets();
}

function showVisualizations() {
    if (AppState.sets.size === 0) {
        showMessage('برای نمایش گرافیکی حداقل به یک مجموعه نیاز دارید', 'warning');
        return;
    }

    document.getElementById("step").innerHTML = `
        <div class="step-container">
            <h3>📊 نمایش گرافیکی مجموعه‌ها</h3>
            <p>تعداد مجموعه‌های موجود: <strong>${AppState.sets.size}</strong></p>
            <p>نوع نمایش گرافیکی را انتخاب کنید:</p>
            
            <div class="visualization-options">
                <div class="viz-option" onclick="showVennDiagram()">
                    <div class="viz-icon">🔵</div>
                    <div class="viz-title">نمودار ون</div>
                    <div class="viz-desc">نمایش روابط بین ۲ یا ۳ مجموعه</div>
                </div>
                
                <div class="viz-option" onclick="showCardinalityChart()">
                    <div class="viz-icon">📈</div>
                    <div class="viz-title">نمودار اندازه‌ها</div>
                    <div class="viz-desc">مقایسه تعداد اعضای مجموعه‌ها</div>
                </div>
            </div>
            
            <div class="button-group">
                <button onclick="showMainMenu()" class="btn btn-secondary">🔙 بازگشت</button>
            </div>
        </div>
    `;
}

function showVennDiagram() {
    if (AppState.sets.size < 2) {
        showMessage('برای نمایش نمودار ون حداقل به ۲ مجموعه نیاز دارید', 'warning');
        return;
    }

    let setsHTML = '';
    const setNames = Array.from(AppState.sets.keys());
    
    setNames.forEach((name, index) => {
        setsHTML += `
            <div class="form-check">
                <input type="checkbox" id="vennSet${index}" name="vennSets" value="${name}" ${index < 2 ? 'checked' : ''}>
                <label for="vennSet${index}">${name}</label>
            </div>
        `;
    });

    document.getElementById("step").innerHTML = `
        <div class="step-container">
            <h3>🔵 نمودار ون</h3>
            <p>مجموعه‌ها را برای نمایش انتخاب کنید:</p>
            
            <div class="form-group">
                <label class="form-label">مجموعه‌ها:</label>
                <div class="sets-checkbox">
                    ${setsHTML}
                </div>
            </div>
            
            <div class="button-group">
                <button onclick="generateVennDiagram()" class="btn btn-primary">🎨 تولید نمودار</button>
                <button onclick="showVisualizations()" class="btn btn-secondary">🔙 بازگشت</button>
            </div>
            
            <div id="vennResult"></div>
        </div>
    `;
}

function generateVennDiagram() {
    const selectedSets = [];
    const checkboxes = document.querySelectorAll('input[name="vennSets"]:checked');
    
    checkboxes.forEach(checkbox => {
        selectedSets.push(checkbox.value);
    });

    if (selectedSets.length < 2) {
        showMessage('حداقل ۲ مجموعه را انتخاب کنید', 'error');
        return;
    }

    const setsData = selectedSets.map(name => ({
        name: name,
        elements: AppState.sets.get(name).elements || []
    }));

    let vennHTML = '<div class="venn-container"><h4>نمودار ون</h4>';
    
    if (selectedSets.length === 2) {
        const [setA, setB] = setsData;
        const intersectionAB = intersection(setA.elements, setB.elements);
        const onlyA = difference(setA.elements, setB.elements);
        const onlyB = difference(setB.elements, setA.elements);
        
        vennHTML += `
            <div class="venn-regions">
                <div class="venn-region">
                    <strong>فقط ${setA.name}</strong>
                    <div class="region-elements">{ ${onlyA.join(', ')} }</div>
                    <small>${onlyA.length} عضو</small>
                </div>
                
                <div class="venn-region">
                    <strong>${setA.name} ∩ ${setB.name}</strong>
                    <div class="region-elements">{ ${intersectionAB.join(', ')} }</div>
                    <small>${intersectionAB.length} عضو</small>
                </div>
                
                <div class="venn-region">
                    <strong>فقط ${setB.name}</strong>
                    <div class="region-elements">{ ${onlyB.join(', ')} }</div>
                    <small>${onlyB.length} عضو</small>
                </div>
            </div>
        `;
    }
    
    vennHTML += '</div>';
    document.getElementById('vennResult').innerHTML = vennHTML;
}

function showCardinalityChart() {
    if (AppState.sets.size === 0) {
        showMessage('ابتدا باید مجموعه‌ای ایجاد کنید', 'warning');
        return;
    }

    document.getElementById("step").innerHTML = `
        <div class="step-container">
            <h3>📈 نمودار اندازه مجموعه‌ها</h3>
            <p>مقایسه تعداد اعضای مجموعه‌ها:</p>
            
            <div class="button-group">
                <button onclick="generateCardinalityChart()" class="btn btn-primary">📊 تولید نمودار</button>
                <button onclick="showVisualizations()" class="btn btn-secondary">🔙 بازگشت</button>
            </div>
            
            <div id="chartResult"></div>
        </div>
    `;
}

function generateCardinalityChart() {
    const setsArray = Array.from(AppState.sets.entries());
    const maxCardinality = Math.max(...setsArray.map(([_, data]) => data.elements.length));
    
    let chartHTML = `
        <div class="cardinality-chart">
            <h4>نمودار اندازه مجموعه‌ها</h4>
            <div class="chart-bars">
    `;
    
    setsArray.forEach(([name, data]) => {
        const height = (data.elements.length / maxCardinality) * 150 + 20;
        const color = getColorForSet(name);
        
        chartHTML += `
            <div class="chart-bar" style="height: ${height}px; background: ${color}">
                <div class="bar-value">${data.elements.length}</div>
                <div class="bar-label">${name}</div>
            </div>
        `;
    });
    
    chartHTML += `
            </div>
        </div>
    `;
    
    document.getElementById('chartResult').innerHTML = chartHTML;
}

function getColorForSet(name) {
    const colors = ['#4c8bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6c757d'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function undoLastAction() {
    const state = HistoryManager.undo();
    if (state) {
        showMessage('عملیات بازگردانی شد', 'success', 2000);
    }
}

function debugAppState() {
    console.log('🐛 وضعیت برنامه:', {
        sets: Array.from(AppState.sets.entries()),
        history: HistoryManager.history,
        currentHistoryIndex: HistoryManager.currentIndex
    });
    
    showMessage('اطلاعات دیباگ در کنسول نمایش داده شد', 'info', 3000);
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 برنامه در حال راه‌اندازی...');
    
    // رویدادهای اصلی
    document.getElementById('startBtn').addEventListener('click', start);
    document.getElementById('showSetsBtn').addEventListener('click', showAllSets);
    document.getElementById('addSetBtn').addEventListener('click', addNewSet);
    document.getElementById('undoBtn').addEventListener('click', undoLastAction);
    document.getElementById('debugBtn').addEventListener('click', debugAppState);
    
    // راه‌اندازی ماژول‌ها
    SmartKeyboard.init();
    
    // بارگذاری وضعیت ذخیره شده
    if (StorageManager.loadState()) {
        showMessage('داده‌های قبلی بازیابی شد', 'success', 3000);
    } else {
        HistoryManager.pushState(HistoryManager.getCurrentState());
    }
    
    // شروع برنامه
    showMainMenu();
});

// ==================== STYLES FOR VISUALIZATIONS ====================
const style = document.createElement('style');
style.textContent = `
    .sets-checkbox {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        margin: 15px 0;
    }
    
    .form-check {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        background: var(--light-bg);
        border-radius: var(--border-radius);
        font-size: 16px;
    }
    
    .form-check input {
        margin: 0;
        transform: scale(1.2);
    }
    
    .venn-container {
        margin: 25px 0;
        padding: 24px;
        background: white;
        border-radius: var(--border-radius);
        border: 2px solid var(--primary-color);
    }
    
    .venn-container h4 {
        font-size: 1.5rem;
        margin-bottom: 20px;
    }
    
    .venn-regions {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 15px;
        margin-top: 25px;
    }
    
    .venn-region {
        padding: 18px;
        border-radius: var(--border-radius);
        border: 1px solid #ddd;
        font-size: 16px;
    }
    
    .region-elements {
        font-family: monospace;
        font-size: 15px;
        margin-top: 8px;
        background: white;
        padding: 8px;
        border-radius: 4px;
    }
    
    .cardinality-chart {
        margin: 25px 0;
    }
    
    .cardinality-chart h4 {
        font-size: 1.5rem;
        margin-bottom: 20px;
    }
    
    .chart-bars {
        display: flex;
        align-items: end;
        gap: 20px;
        height: 250px;
        margin: 25px 0;
        padding: 24px;
        background: var(--light-bg);
        border-radius: var(--border-radius);
    }
    
    .chart-bar {
        flex: 1;
        background: var(--primary-color);
        border-radius: 5px 5px 0 0;
        position: relative;
        min-height: 10px;
        transition: var(--transition);
    }
    
    .chart-bar:hover {
        opacity: 0.8;
        transform: scale(1.05);
    }
    
    .bar-label {
        position: absolute;
        bottom: -30px;
        left: 0;
        right: 0;
        text-align: center;
        font-weight: bold;
        font-size: 14px;
    }
    
    .bar-value {
        position: absolute;
        top: -30px;
        left: 0;
        right: 0;
        text-align: center;
        font-weight: bold;
        font-size: 16px;
    }
    
    .visualization-options {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 20px;
        margin: 25px 0;
    }
    
    .viz-option {
        background: var(--light-bg);
        border: 2px solid #ddd;
        padding: 24px;
        border-radius: var(--border-radius);
        cursor: pointer;
        transition: var(--transition);
        text-align: center;
    }
    
    .viz-option:hover {
        border-color: var(--primary-color);
        transform: translateY(-5px);
        box-shadow: 0 6px 12px rgba(0,0,0,0.1);
    }
    
    .viz-icon {
        font-size: 3rem;
        margin-bottom: 15px;
    }
    
    .viz-title {
        font-weight: bold;
        font-size: 1.3rem;
        margin-bottom: 8px;
    }
    
    .viz-desc {
        font-size: 1rem;
        color: var(--secondary-color);
    }
`;
document.head.appendChild(style);