document.addEventListener('DOMContentLoaded', async () => {
    // Riferimenti agli elementi HTML aggiornati
    const ordersSection = document.getElementById('orders-section');
    const messagesSection = document.getElementById('messages-section');
    const ordersContainer = document.getElementById('orders-container');
    const messagesContainer = document.getElementById('messages-container');
    const adminNavLinks = document.querySelectorAll('.admin-nav .nav-link'); // Seleziona i link con la nuova classe
    const logoutButton = document.querySelector('.logout-btn');

    // Funzione per mostrare un loader/messaggio
    const showInfo = (container, message, isError = false) => {
        container.innerHTML = `<p style="${isError ? 'color: red;' : 'color: gray;'}">${message}</p>`;
    };

    // Funzione per effettuare richieste API con gestione errori di autenticazione
    async function fetchData(url) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // Il token dal cookie HTTP-only viene inviato automaticamente dal browser.
                    // Non è necessario aggiungerlo manualmente nell'header qui.
                },
            });

            if (response.status === 401 || response.status === 403) {
                alert('Sessione scaduta o accesso non autorizzato. Effettua nuovamente il login.');
                localStorage.removeItem('jwt_token');
                localStorage.removeItem('userData');
                // Elimina il cookie JWT sul client.
                document.cookie = 'jwtToken=; Max-Age=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
                window.location.href = '/login.html';
                return null; // Indica fallimento
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Errore HTTP: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Errore durante il recupero dei dati:', error);
            throw error; // Rilancia l'errore per gestirlo nel chiamante
        }
    }

    // --- Funzioni per caricare e visualizzare gli ordini ---
   // --- Funzioni per caricare e visualizzare gli ordini ---
    async function loadOrders() {
        showInfo(ordersContainer, 'Caricamento ordini...');
        try {
            const data = await fetchData('/api/admin/orders');
            if (data && data.orders && data.orders.length > 0) { // Aggiunto controllo su data.orders
                ordersContainer.innerHTML = data.orders.map(order => `
                    <div class="order-card">
                        <h3>Ordine #${order.ordine_id} - ${new Date(order.data_ordine).toLocaleDateString()}</h3>
                        <p><strong>Cliente:</strong> ${order.nome_cliente} (${order.email_cliente})</p>
                        <p><strong>Totale:</strong> €${Number(order.totale_ordine) ? Number(order.totale_ordine).toFixed(2) : 'N/D'}</p>
                        <p><strong>Stato:</strong> <span id="status-${order.ordine_id}">${order.stato_ordine}</span>
                            <select id="statusSelect-${order.ordine_id}" class="status-select" data-order-id="${order.ordine_id}">
                                <option value="In attesa di elaborazione" ${order.stato_ordine === 'In attesa di elaborazione' ? 'selected' : ''}>In attesa di elaborazione</option>
                                <option value="In preparazione" ${order.stato_ordine === 'In preparazione' ? 'selected' : ''}>In preparazione</option>
                                <option value="Spedito" ${order.stato_ordine === 'Spedito' ? 'selected' : ''}>Spedito</option>
                                <option value="Completato" ${order.stato_ordine === 'Completato' ? 'selected' : ''}>Completato</option>
                                <option value="Annullato" ${order.stato_ordine === 'Annullato' ? 'selected' : ''}>Annullato</option>
                            </select>
                            <button class="update-status-btn" data-order-id="${order.ordine_id}">Aggiorna</button>
                        </p>
                        <p><strong>Indirizzo:</strong> ${order.indirizzo_spedizione}, ${order.citta_spedizione} ${order.cap_spedizione}, ${order.paese_spedizione}</p>
                        <p><strong>Metodo Pagamento:</strong> ${order.metodo_pagamento}</p>
                        <h4>Articoli Ordinati:</h4>
                        <ul>
                            ${order.items && Array.isArray(order.items) && order.items.length > 0 ? 
                            order.items.map(item => `
                                    <li>${item.quantita}x ${item.prodotto_nome} (${item.prodotto_tipo}) - €${Number(item.prezzo_unitario) ? Number(item.prezzo_unitario).toFixed(2) : 'N/D'} ciascuno</li>
                                `).join('') 
                            : '<li>Nessun articolo per questo ordine.</li>'}
                        </ul>
                    </div>
                `).join('');

                // Aggiungi listener per i bottoni di aggiornamento stato
                document.querySelectorAll('.update-status-btn').forEach(button => {
                    button.addEventListener('click', async (event) => {
                        const orderId = event.target.dataset.orderId;
                        const selectElement = document.getElementById(`statusSelect-${orderId}`);
                        const newStatus = selectElement.value;
                        const statusSpan = document.getElementById(`status-${orderId}`);

                        event.target.disabled = true; // Disabilita il bottone durante la richiesta

                        try {
                            const response = await fetch(`/api/admin/orders/${orderId}/status`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                    // Assumi che fetchData gestisca l'header di autorizzazione,
                                    // altrimenti dovresti aggiungerlo qui se non lo fa:
                                    // 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                                },
                                body: JSON.stringify({ newStatus })
                            });

                            if (response.status === 401 || response.status === 403) {
                                alert('Sessione scaduta o accesso non autorizzato. Effettua nuovamente il login.');
                                localStorage.removeItem('jwt_token');
                                localStorage.removeItem('userData');
                                document.cookie = 'jwtToken=; Max-Age=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
                                window.location.href = '/login.html';
                                return;
                            }

                            if (!response.ok) {
                                const errorData = await response.json();
                                throw new Error(errorData.error || `Errore durante l'aggiornamento: ${response.status}`);
                            }

                            const result = await response.json();
                            alert(result.message);
                            if (statusSpan) {
                                statusSpan.textContent = newStatus; // Aggiorna lo stato nello span
                            }
                        } catch (error) {
                            console.error('Errore nell\'aggiornamento dello stato:', error);
                            alert(`Errore nell'aggiornamento dello stato: ${error.message}`);
                        } finally {
                            event.target.disabled = false; // Riabilita il bottone
                        }
                    });
                });
            } else {
                ordersContainer.innerHTML = '<p>Nessun ordine trovato.</p>'; // Messaggio se non ci sono ordini
            }
        } catch (error) {
            console.error('Errore nel caricamento degli ordini:', error);
            showError(ordersContainer, `Errore nel caricamento degli ordini: ${error.message}`); // Assumi che showError esista
        }
    }

    // --- Funzioni per caricare e visualizzare le richieste personalizzate (messaggi) ---
    async function loadMessages() {
        showInfo(messagesContainer, 'Caricamento richieste...');
        try {
            const data = await fetchData('/api/admin/custom-requests');
            if (data && data.requests.length > 0) {
                messagesContainer.innerHTML = data.requests.map(request => `
                    <div class="request-card">
                        <h3>Richiesta #${request.request_id} - ${request.tipoEvento}</h3>
                        <p><strong>Nome:</strong> ${request.nome || 'N/D'}</p>
                        <p><strong>Email:</strong> ${request.email}</p>
                        <p><strong>Telefono:</strong> ${request.telefono || 'N/D'}</p>
                        <p><strong>Data Prevista:</strong> ${new Date(request.dataPrevista).toLocaleDateString()}</p>
                        <p><strong>Numero Pezzi:</strong> ${request.numeroPezzi || 'N/D'}</p>
                        <p><strong>Idee/Preferenze:</strong> ${request.ideePreferenze || 'N/D'}</p>
                        <p><strong>Data Ricezione:</strong> ${new Date(request.data_richiesta).toLocaleString()}</p>
                    </div>
                `).join('');
            } else {
                showInfo(messagesContainer, 'Nessuna richiesta personalizzata trovata.');
            }
        } catch (error) {
            showInfo(messagesContainer, error.message, true); // Mostra errore
        }
    }

    // --- Gestione della navigazione tra le sezioni ---
    adminNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // Impedisce il salto all'ancora

            // Rimuovi la classe 'active' da tutti i link di navigazione
            adminNavLinks.forEach(navLink => navLink.classList.remove('active'));
            // Nascondi tutte le sezioni di dati
            document.querySelectorAll('.data-section').forEach(section => section.classList.remove('active'));

            // Aggiungi la classe 'active' al link cliccato
            link.classList.add('active');

            // Ottieni l'ID della sezione da mostrare dal data-target
            const targetSectionId = link.dataset.target;
            const targetSection = document.getElementById(targetSectionId);

            if (targetSection) {
                targetSection.classList.add('active'); // Mostra la sezione target
                if (targetSectionId === 'orders-section') {
                    loadOrders();
                } else if (targetSectionId === 'messages-section') {
                    loadMessages();
                }
            }
        });
    });

    // Gestione del logout (la funzione logout è definita direttamente nell'HTML per il bottone)
    // Se preferisci gestirla completamente da qui:
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Sei sicuro di voler effettuare il logout?')) {
                localStorage.removeItem('jwt_token');
                localStorage.removeItem('userData');
                document.cookie = 'jwtToken=; Max-Age=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
                window.location.href = '/login.html';
            }
        });
    }


    // Carica gli ordini per default all'avvio della dashboard
    loadOrders();
    // Assicurati che la sezione ordini sia visibile all'inizio (dovrebbe esserlo grazie a 'active' nell'HTML)
    ordersSection.classList.add('active');
});