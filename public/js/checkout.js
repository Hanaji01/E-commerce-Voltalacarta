document.addEventListener('DOMContentLoaded', () => {
    const checkoutCartItemsDiv = document.getElementById('checkoutCartItems');
    const checkoutTotalSpan = document.getElementById('checkoutTotal');
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    const checkoutMessage = document.getElementById('checkoutMessage'); // Questo div sarà usato per messaggi utente

    // Funzione per caricare e visualizzare il carrello (presuppone getCart() e clearCart() siano disponibili globalmente da cart_global.js)
    function loadCartSummary() {
        const cart = getCart(); // Funzione per ottenere il carrello

        checkoutCartItemsDiv.innerHTML = ''; // Pulisci i precedenti elementi

        if (cart.length === 0) {
            checkoutCartItemsDiv.innerHTML = '<p>Il tuo carrello è vuoto. <a href="index.html">Torna allo shopping</a>.</p>';
            checkoutTotalSpan.textContent = '0.00€';
            placeOrderBtn.disabled = true; // Disabilita il pulsante se il carrello è vuoto
            return;
        }

        let total = 0;
        cart.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('checkout-item');
            const itemPrice = parseFloat(item.price);
            const itemSubtotal = itemPrice * item.quantity;
            total += itemSubtotal;

            itemElement.innerHTML = `
                <p><strong>${item.name}</strong> x ${item.quantity} (${itemPrice.toFixed(2)}€ cad.)</p>
                <p>Subtotale: ${itemSubtotal.toFixed(2)}€</p>
            `;
            checkoutCartItemsDiv.appendChild(itemElement);
        });

        checkoutTotalSpan.textContent = `${total.toFixed(2)}€`;
        placeOrderBtn.disabled = false; // Abilita il pulsante se ci sono articoli
    }

    // Carica il riepilogo del carrello all'apertura della pagina
    loadCartSummary();

    // Gestore per il pulsante "Conferma Ordine"
    placeOrderBtn.addEventListener('click', async () => {
        const shippingForm = document.getElementById('shippingForm');
        const paymentForm = document.getElementById('paymentForm');

        // Validazione HTML5 dei form
        if (!shippingForm.checkValidity() || !paymentForm.checkValidity()) {
            checkoutMessage.textContent = 'Per favore, compila tutti i campi obbligatori di spedizione e pagamento.';
            checkoutMessage.style.color = 'red';
            return;
        }

        // Raccogli i dati di spedizione
        const shippingInfo = {
            fullName: document.getElementById('nomeCompleto').value,
            email: document.getElementById('emailSpedizione').value,
            address: document.getElementById('indirizzo').value,
            city: document.getElementById('citta').value,
            zipCode: document.getElementById('cap').value,
            country: document.getElementById('paese').value
            // Puoi aggiungere il telefono qui se vuoi inviarlo al backend, anche se non è nel DB 'ordini'
            // phone: document.getElementById('telefono').value,
        };

        // Raccogli i dati di pagamento
        const paymentInfo = {
            method: document.getElementById('metodoPagamento').value
        };

        const cart = getCart(); // Recupera il carrello più aggiornato
        const totalAmount = parseFloat(checkoutTotalSpan.textContent); // Prendi il totale dal riepilogo

        // Prepara gli items per il backend, mappando i campi del carrello a quelli attesi dal DB `dettagli_ordine`
        const itemsForBackend = cart.map(item => ({
            id: item.product_id || item.id, // Usa product_id o id, a seconda di come lo hai nel carrello
            name: item.name, // Corrisponde a prodotto_nome
            type: item.category === 'bouquets' ? 'bouquet' : 'fiore', // Corrisponde a prodotto_tipo
            quantity: item.quantity, // Corrisponde a quantita
            price: parseFloat(item.price), // Corrisponde a prezzo_unitario
            subtotal: parseFloat((parseFloat(item.price) * item.quantity).toFixed(2)) // Corrisponde a sottototale
        }));

        const orderData = {
            items: itemsForBackend,
            shippingInfo: shippingInfo,
            paymentInfo: paymentInfo,
            totalAmount: totalAmount,
        };

        console.log('Dati ordine da inviare:', orderData);

        // RECUPERO E INVIO DEL TOKEN JWT: Cruciale per l'autenticazione
        const token = localStorage.getItem('jwt_token'); // Assumi che il token sia salvato qui dopo il login
        if (!token) {
            checkoutMessage.textContent = 'Errore: Non sei autenticato. Effettua il login per completare l\'ordine.';
            checkoutMessage.style.color = 'red';
            console.error('Token JWT non trovato. L\'utente non è autenticato.');
            return; // Ferma l'esecuzione se il token manca
        }

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(orderData)
            });

            // Gestione della risposta: controlla prima se la risposta non è OK (es. 401, 400, 500)
            if (!response.ok) {
                const contentType = response.headers.get("content-type"); // Controlla il tipo di contenuto della risposta
                if (contentType && contentType.includes("application/json")) {// Se la risposta è JSON, prova a leggerla come tale
                    const errorData = await response.json();
                    console.error('Errore dal server (JSON):', errorData); 
                    checkoutMessage.textContent = errorData.error || 'Errore durante la finalizzazione dell\'ordine.';
                } else { // Se la risposta non è JSON, gestisci come testo normale
                    const errorText = await response.text();
                    console.error('Errore non JSON dal server:', response.status, errorText);
                    checkoutMessage.textContent = `Si è verificato un errore (${response.status}). Riprova più tardi.`;
                }
                checkoutMessage.style.color = 'red';
                return; // Ferma l'esecuzione
            }

            // Se la risposta è OK, procedi con il parsing JSON
            const result = await response.json();

            if (result.success) {
                checkoutMessage.textContent = result.message + ` Il tuo ID ordine è: ${result.orderId}`;
                checkoutMessage.style.color = 'green';
                clearCart(); // Svuota il carrello dopo l'ordine riuscito
                loadCartSummary(); // Aggiorna il riepilogo del carrello sulla pagina
                // Opzionale: Reindirizza l'utente a una pagina di conferma
                // setTimeout(() => { window.location.href = 'ordine_confermato.html?orderId=' + result.orderId; }, 2000);
            } else {
                checkoutMessage.textContent = result.message || 'Errore durante la finalizzazione dell\'ordine.';
                checkoutMessage.style.color = 'red';
            }
        } catch (error) {
            console.error('Si è verificato un errore durante l\'invio dell\'ordine (catch):', error);
            checkoutMessage.textContent = 'Si è verificato un errore di rete o server non raggiungibile. Riprova più tardi.';
            checkoutMessage.style.color = 'red';
        }
    });
});
