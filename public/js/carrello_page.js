document.addEventListener('DOMContentLoaded', () => {
    // personalizzare il titolo del carrello ---
    const userName = localStorage.getItem('userName'); // Recupera il nome utente da localStorage
    const cartTitleElement = document.getElementById('cartTitle'); // Trova l'elemento h1 con ID "cartTitle"

    if (userName && cartTitleElement) {
        cartTitleElement.textContent = `Ecco il tuo carrello ${userName}`; // Aggiorna il testo del titolo
        document.title = `Carrello di ${userName}`; // Aggiorna il titolo della scheda del browser
    } else if (cartTitleElement) {
        // Se non c'è un nome utente (es. l'utente non ha fatto il login),
        // lascia il titolo di default o imposta uno generico.
        cartTitleElement.textContent = `Il Tuo Carrello`;
        document.title = `Il Mio Carrello`;
    }


    const cartItemsContainer = document.getElementById('cart-items-container');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const cartSummary = document.getElementById('cart-summary');
    const cartTotalPriceElement = document.getElementById('cart-total-price');

    // Funzione per renderizzare gli elementi del carrello nella pagina carrello.html
    function renderCartPage() {
        // Usiamo la funzione getCart() definita in cart_global.js
        let cart = window.getCart ? window.getCart() : []; 
        
        cartItemsContainer.innerHTML = ''; // Pulisci il container

        if (cart.length === 0) {
            emptyCartMessage.style.display = 'block';
            cartSummary.style.display = 'none';
        } else {
            emptyCartMessage.style.display = 'none';
            cartSummary.style.display = 'block';
            let totalPrice = 0;

            cart.forEach(item => {
                const itemTotal = item.price * item.quantity;
                totalPrice += itemTotal;

                const cartItemDiv = document.createElement('div');
                cartItemDiv.classList.add('cart-item');
                // Salva tutte le informazioni per identificare l'item, inclusi type e color
                cartItemDiv.dataset.name = item.name;
                cartItemDiv.dataset.type = item.type || ''; 
                cartItemDiv.dataset.color = item.color || ''; 

                // Aggiungi il colore al display se presente
                const colorDisplay = item.color ? `<span class="cart-item-color">Colore: ${item.color}</span>` : ''; // Se il colore non è presente, non mostrare nulla
                // Aggiungi il tipo al display se presente e diverso da 'product' (il default)
                // Puoi decidere se mostrare il tipo solo per 'bouquet' o 'single-flower'
                const typeDisplay = item.type && item.type !== 'product' && item.type !== 'single-flower' ? `<span class="cart-item-type">Tipo: ${item.type}</span>` : ''; // Mostra il tipo solo se è diverso da 'product' o 'single-flower'


                cartItemDiv.innerHTML = `
                    <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-details">
                        <h3 class="cart-item-name">${item.name}</h3>
                        ${colorDisplay} 
                        ${typeDisplay}
                        <p class="cart-item-price">€${parseFloat(item.price).toFixed(2)}</p>
                        <div class="cart-item-quantity-control">
                            <button class="quantity-minus" data-name="${item.name}" data-type="${item.type || ''}" data-color="${item.color || ''}">-</button>
                            <span class="quantity-display">${item.quantity}</span>
                            <button class="quantity-plus" data-name="${item.name}" data-type="${item.type || ''}" data-color="${item.color || ''}">+</button>
                        </div>
                        <p class="cart-item-total">Totale: €${itemTotal.toFixed(2)}</p>
                    </div>
                    <button class="remove-item-btn" data-name="${item.name}" data-type="${item.type || ''}" data-color="${item.color || ''}">Rimuovi</button>
                `;
                cartItemsContainer.appendChild(cartItemDiv);
            });

            cartTotalPriceElement.textContent = `€${totalPrice.toFixed(2)}`;
        }
    }

    // Event listeners per i bottoni di quantità e rimozione (delegazione eventi)
    cartItemsContainer.addEventListener('click', (event) => {
        const target = event.target;
        // Recupera tutti i data-attributes necessari per identificare l'elemento univocamente
        const name = target.dataset.name;
        // Normalizza a null se stringa vuota per una migliore consistenza con il modello dati
        const type = target.dataset.type === '' ? null : target.dataset.type; 
        const color = target.dataset.color === '' ? null : target.dataset.color; 

        if (!name) return; // Se il nome non è presente, non è un pulsante di un item del carrello

        const itemIdentifier = { name, type, color }; // Oggetto identificatore

        if (target.classList.contains('quantity-minus')) {
            const quantityDisplay = target.nextElementSibling;
            let currentQuantity = parseInt(quantityDisplay.textContent);
            // Chiama la funzione globale per aggiornare la quantità
            // Assicurati che `window.updateItemQuantity()` sia disponibile da `cart_global.js`
            if (window.updateItemQuantity) {
                window.updateItemQuantity(itemIdentifier, currentQuantity - 1); 
                renderCartPage(); // Rerenderizza la pagina del carrello dopo la modifica
            }
        } else if (target.classList.contains('quantity-plus')) {
            const quantityDisplay = target.previousElementSibling;
            let currentQuantity = parseInt(quantityDisplay.textContent);
            // Chiama la funzione globale per aggiornare la quantità
            // Assicurati che `window.updateItemQuantity()` sia disponibile da `cart_global.js`
            if (window.updateItemQuantity) {
                window.updateItemQuantity(itemIdentifier, currentQuantity + 1); 
                renderCartPage(); // Rerenderizza la pagina del carrello dopo la modifica
            }
        } else if (target.classList.contains('remove-item-btn')) {
            // Chiama la funzione globale per rimuovere l'articolo
            // Assicurati che `window.removeFromCart()` sia disponibile da `cart_global.js`
            if (window.removeFromCart) {
                window.removeFromCart(itemIdentifier); 
                renderCartPage(); // Rerenderizza la pagina del carrello dopo la rimozione
            }
        }
    });

    // Inizializza il carrello al caricamento della pagina carrello.html
    renderCartPage();

    // Ascolta i cambiamenti di localStorage (es. se l'utente modifica il carrello da un'altra tab)
    window.addEventListener('storage', (event) => {
        if (event.key === 'cart') {
            renderCartPage(); // Rerenderizza la pagina del carrello se il localStorage cambia
        }
    });
});