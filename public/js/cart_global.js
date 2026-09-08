// Aggiorna il contatore del carrello all'avvio della pagina (DOMContentLoaded gestito da 'defer')
document.addEventListener('DOMContentLoaded', updateCartCount);
// Variabile locale per il carrello, inizializzata da localStorage
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Ottieni il carrello (esposto globalmente)
function getCart() {
    return cart;
}

// Salva il carrello in localStorage e aggiorna il contatore
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

// Aggiorna il contatore del carrello nella navbar
function updateCartCount() {
    const cartItemCountSpan = document.getElementById('cart-item-count');
    if (cartItemCountSpan) {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (totalItems > 0) {
            cartItemCountSpan.textContent = totalItems;
            cartItemCountSpan.style.display = 'inline-block';
        } else {
            cartItemCountSpan.style.display = 'none';
        }
    }
}

/**
 * Aggiungi un articolo al carrello.
 * @param {object} item - Deve contenere name, price, quantity, image e opzionalmente type, color.
 */
function addToCart(item) {
    // Validazione iniziale per assicurarsi che l'oggetto item abbia le proprietà necessarie.
    // Questo previene errori se i dati non sono completi o sono di tipo sbagliato.
    if (!item || typeof item.name !== 'string' || typeof item.price !== 'number' || typeof item.quantity !== 'number' || typeof item.image !== 'string') {
        console.error("Errore: Impossibile aggiungere l'articolo al carrello. Dati dell'articolo mancanti o non validi:", item);
        return; // Esci dalla funzione se i dati non sono validi.
    }
    
    if (item.quantity <= 0) {
        console.warn("Attenzione: Quantità specificata per l'articolo è 0 o meno. Nessun articolo aggiunto al carrello:", item);
        return; // Non aggiungere articoli con quantità zero o negative.
    }

    const existingItemIndex = cart.findIndex(cartItem =>
        cartItem.name === item.name &&
        (item.type ? cartItem.type === item.type : (cartItem.type === undefined || cartItem.type === null)) &&
        (item.color ? cartItem.color === item.color : (cartItem.color === undefined || cartItem.color === null))
    );

    if (existingItemIndex > -1) {
        cart[existingItemIndex].quantity += item.quantity;
    } else {
        cart.push({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            type: item.type || 'product', // Assicura un valore di default
            color: item.color || null
        });
    }
    saveCart();
    console.log('Carrello aggiornato:', cart);
}

/**
 * Rimuove un articolo dal carrello identificandolo per nome, tipo e colore.
 * @param {object} itemIdentifier - Deve contenere name, type, color.
 */
function removeFromCart(itemIdentifier) {
    cart = cart.filter(cartItem => !(
        cartItem.name === itemIdentifier.name &&
        (itemIdentifier.type ? cartItem.type === itemIdentifier.type : (cartItem.type === undefined || itemIdentifier.type === null)) &&
        (itemIdentifier.color ? cartItem.color === itemIdentifier.color : (cartItem.color === undefined || itemIdentifier.color === null))
    ));
    saveCart();
    console.log('Articolo rimosso (globale), carrello aggiornato:', cart);
}

/**
 * Aggiorna la quantità di un articolo nel carrello o lo rimuove se la quantità è zero o meno.
 * @param {object} itemIdentifier - Deve contenere name, type, color.
 * @param {number} newQuantity
 */
function updateItemQuantity(itemIdentifier, newQuantity) {
    const itemIndex = cart.findIndex(cartItem =>
        cartItem.name === itemIdentifier.name &&
        (itemIdentifier.type ? cartItem.type === itemIdentifier.type : (cartItem.type === undefined || itemIdentifier.type === null)) &&
        (itemIdentifier.color ? cartItem.color === itemIdentifier.color : (cartItem.color === undefined || itemIdentifier.color === null))
    );

    if (itemIndex > -1) {
        if (newQuantity <= 0) {
            removeFromCart(itemIdentifier);
        } else {
            cart[itemIndex].quantity = newQuantity;
            saveCart();
        }
    }
    console.log('Quantità articolo aggiornata, carrello:', cart);
}

/**
 * Svuota completamente il carrello.
 */
function clearCart() {
    cart = [];
    saveCart();
    console.log('Carrello svuotato.');
}

// Esposizione globale delle funzioni del carrello
window.getCart = getCart;
window.saveCart = saveCart;
window.addToCart = addToCart;
window.updateCartCount = updateCartCount;
window.removeFromCart = removeFromCart;
window.updateItemQuantity = updateItemQuantity;
window.clearCart = clearCart;



// Sincronizza il carrello tra schede/finestre del browser tramite l'evento 'storage'
window.addEventListener('storage', (event) => {
    if (event.key === 'cart') {
        cart = JSON.parse(event.newValue) || [];
        updateCartCount();
       
    }
});