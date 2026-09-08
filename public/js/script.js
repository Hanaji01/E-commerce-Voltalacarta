// Funzioni che devono essere accessibili globalmente (es. da onclick nell'HTML)
// Devono essere definite fuori dal DOMContentLoaded.

function clearErrors() {
    document.querySelectorAll('.error-message').forEach(error => {
        error.style.display = 'none';
        error.textContent = '';
    });

    document.querySelectorAll('input').forEach(input => {
        input.classList.remove('error');
    });
}

function switchTab(tab) {
    // Rimuovi la classe 'active' da tutti i bottoni del tab
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    // Rimuovi la classe 'active' da tutti i form
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

    if (tab === 'login') {
        const loginButton = document.querySelector('.auth-tabs button:nth-child(1)');
        if (loginButton) {
            loginButton.classList.add('active');
        }
    } else if (tab === 'register') {
        const registerButton = document.querySelector('.auth-tabs button:nth-child(2)');
        if (registerButton) {
            registerButton.classList.add('active');
        }
    }

    // Aggiungi la classe 'active' al form corrispondente
    const targetForm = document.getElementById(tab + 'Form');
    if (targetForm) {
        targetForm.classList.add('active');
    }

    // Resetta eventuali errori visualizzati quando si cambia tab
    clearErrors();
}

document.addEventListener('DOMContentLoaded', function() {

    // Funzioni di utilità che non devono essere globali (chiamate solo all'interno del DOMContentLoaded scope)
    function showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        const inputElement = errorElement ? errorElement.previousElementSibling : null;

        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        if (inputElement) {
            inputElement.classList.add('error');
        }
    }

    function showLoading(loadingId) {
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) {
            loadingElement.classList.add('active');
            const formButton = document.querySelector(`#${loadingId.replace('Loading', 'Form')} .auth-button`);
            if (formButton) {
                formButton.disabled = true;
            }
        }
    }

    function hideLoading(loadingId) {
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) {
            loadingElement.classList.remove('active');
            const formButton = document.querySelector(`#${loadingId.replace('Loading', 'Form')} .auth-button`);
            if (formButton) {
                formButton.disabled = false;
            }
        }
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function isValidPassword(password) {
        return password.length >= 8 &&
               /[A-Z]/.test(password) &&
               /[a-z]/.test(password) &&
               /\d/.test(password);
    }

    function validateLogin(email, password) {
        clearErrors();
        let isValid = true;

        if (!email) {
            showError('loginEmailError', 'Email richiesta');
            isValid = false;
        } else if (!isValidEmail(email)) {
            showError('loginEmailError', 'Email non valida');
            isValid = false;
        }

        if (!password) {
            showError('loginPasswordError', 'Password richiesta');
            isValid = false;
        }

        return isValid;
    }

    function validateRegister(name, email, password, confirmPassword) {
        clearErrors();
        let isValid = true;

        if (!name.trim()) {
            showError('registerNameError', 'Nome richiesto');
            isValid = false;
        }

        if (!email) {
            showError('registerEmailError', 'Email richiesta');
            isValid = false;
        } else if (!isValidEmail(email)) {
            showError('registerEmailError', 'Email non valida');
            isValid = false;
        }

        if (!password) {
            showError('registerPasswordError', 'Password richiesta');
            isValid = false;
        } else if (!isValidPassword(password)) {
            showError('registerPasswordError', 'La password non soddisfa i requisiti');
            isValid = false;
        }

        if (password !== confirmPassword) {
            showError('registerConfirmPasswordError', 'Le password non coincidono');
            isValid = false;
        }

        return isValid;
    }

    // --- Gestione degli eventi sui form e input ---

    const registerPasswordInput = document.getElementById('registerPassword');
    if (registerPasswordInput) {
        registerPasswordInput.addEventListener('input', function() {
            const password = this.value;

            const lengthReq = document.getElementById('lengthReq');
            const upperReq = document.getElementById('upperReq');
            const lowerReq = document.getElementById('lowerReq');
            const numberReq = document.getElementById('numberReq');

            if (lengthReq) {
                if (password.length >= 8) {
                    lengthReq.classList.add('valid');
                    lengthReq.classList.remove('invalid');
                } else {
                    lengthReq.classList.add('invalid');
                    lengthReq.classList.remove('valid');
                }
            }

            if (upperReq) {
                if (/[A-Z]/.test(password)) {
                    upperReq.classList.add('valid');
                    upperReq.classList.remove('invalid');
                } else {
                    upperReq.classList.add('invalid');
                    upperReq.classList.remove('valid');
                }
            }

            if (lowerReq) {
                if (/[a-z]/.test(password)) {
                    lowerReq.classList.add('valid');
                    lowerReq.classList.remove('invalid');
                } else {
                    lowerReq.classList.add('invalid');
                    lowerReq.classList.remove('valid');
                }
            }

            if (numberReq) {
                if (/\d/.test(password)) {
                    numberReq.classList.add('valid');
                    numberReq.classList.remove('invalid');
                } else {
                    numberReq.classList.add('invalid');
                    numberReq.classList.remove('valid');
                }
            }
        });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            if (!validateLogin(email, password)) {
                return;
            }

            showLoading('loginLoading');

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password })
                });

                // NON chiamare response.json() se response.redirected è true,
                // perché il corpo della risposta sarà HTML e non JSON.
                // Controlla prima se c'è un reindirizzamento.
                if (response.redirected) {
                    // Se il server ha inviato un reindirizzamento (HTTP 302/303),
                    // il browser seguirà automaticamente la nuova URL.
                    // Non c'è bisogno di fare window.location.href qui.
                    console.log('Login riuscito! Il server sta reindirizzando il browser a:', response.url);
                    // Non fare nulla di più, il browser si occuperà del resto.
                    // Il `finally` verrà comunque chiamato.
                    return; // Termina la funzione qui per evitare di processare il JSON o reindirizzare due volte
                }

                const data = await response.json(); // Se non c'è reindirizzamento, processa il JSON

                if (response.ok) {
                    // Login successful (per utenti NON admin, se il server non ha reindirizzato)
                    localStorage.setItem('jwt_token', data.token);
                    localStorage.setItem('userData', JSON.stringify(data.user)); // Salva tutti i dati utente, incluso isAdmin

                    alert('Login effettuato con successo!');

                    // Controlla il ruolo dell'utente dai dati ricevuti dal server
                    if (data.user && data.user.isAdmin) {
                        // Questo ramo dovrebbe essere raggiunto solo se il server NON ha reindirizzato
                        // automaticamente l'admin (es. in un flusso SPA puro)
                        window.location.href = '/admin-dashboard.html'; // Reindirizza alla dashboard admin
                    } else {
                        // Reindirizza l'utente normale al carrello o alla home
                        window.location.href = '/carrello.html'; // O '/index.html'
                    }
                } else {
                    // Login failed (server ha risposto con errore)
                    showError('loginPasswordError', data.error || 'Credenziali non valide'); // Usa data.error come nel tuo server.js
                }
            } catch (error) {
                // Errore di rete o problemi nel parsing JSON (se non era un reindirizzamento)
                console.error('Errore di connessione o parsing risposta:', error);
                showError('loginPasswordError', 'Errore di connessione. Riprova più tardi.');
            } finally {
                hideLoading('loginLoading');
            }
        });
    }
    // Gestione del form di registrazione
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;

            if (!validateRegister(name, email, password, confirmPassword)) {
                return;
            }

            showLoading('registerLoading');

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Registrazione completata con successo! Ora puoi accedere.');
                    switchTab('login');
                    document.getElementById('registerForm').reset();
                    clearErrors();
                } else {
                    showError('registerEmailError', data.error || 'Errore durante la registrazione'); // Usa data.error
                }
            } catch (error) {
                console.error('Errore di connessione o parsing risposta durante la registrazione:', error);
                showError('registerEmailError', 'Errore di connessione. Riprova più tardi.');
            } finally {
                hideLoading('registerLoading');
            }
        });
    }

    // --- Logica per il conteggio del carrello nella navbar (se applicabile a tutte le pagine) ---
    function updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const cartItemCount = document.getElementById('cart-item-count');
        if (cartItemCount) {
            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
            cartItemCount.textContent = totalItems > 0 ? totalItems : '';
            cartItemCount.style.display = totalItems > 0 ? 'inline-block' : 'none'; // Mostra solo se ci sono articoli
        }
    }

    updateCartCount(); // Chiama la funzione all'avvio della pagina
    // Aggiungi un listener per gli eventi di aggiornamento del carrello se il tuo carrello
    // si aggiorna dinamicamente senza ricaricare la pagina (es. con un CustomEvent)
    // window.addEventListener('cartUpdated', updateCartCount);
});