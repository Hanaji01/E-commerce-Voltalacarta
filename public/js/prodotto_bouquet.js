// prodotto_bouquet.js
let currentBouquetData = null;

/**
 * Visualizza un messaggio di stato (es. errore o informazione) sulla pagina del bouquet.
 * @param {string} title - Il titolo principale del messaggio.
 * @param {string} message - Il testo dettagliato del messaggio.
 * @param {boolean} isError - Se true, il messaggio è trattato come errore (testo rosso, disabilita controlli).
 */
const displayProductStatus = (title, message, isError = false) => {
    const productPageContainer = document.querySelector('.product-page');
    if (!productPageContainer) {
        console.error("Contenitore '.product-page' non trovato. Impossibile visualizzare lo stato.");
        return;
    }
    
    document.title = `${title} - Volta la Carta`;
    productPageContainer.innerHTML = `
        <div class="product-details" style="text-align: center; padding: 50px;">
            <h4 style="color: ${isError ? 'red' : 'inherit'};">${title}</h4>
            <p>${message}</p>
            <p><a href="bouquet.html">Torna alla galleria dei bouquet</a></p>
        </div>
    `;
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Script prodotto_bouquet.js caricato e DOM pronto.');

    // Aggiorna il contatore del carrello nella navbar all'avvio della pagina
    if (typeof window.updateCartCount === 'function') {
        window.updateCartCount();
    } else {
        console.warn("La funzione 'updateCartCount' non è disponibile. Assicurati che 'cart_global.js' sia caricato correttamente.");
    }

    // Recupero di tutti gli elementi DOM necessari una sola volta
    const mainBouquetImageElement = document.getElementById('mainBouquetImage');
    const bouquetThumbnailsContainer = document.getElementById('bouquetThumbnails');
    const bouquetNameElement = document.getElementById('bouquetName');
    const productPriceElement = document.getElementById('productPrice');
    const productDescriptionElement = document.getElementById('productDescription');
    const counterInput = document.getElementById('counter');
    const minusButton = document.getElementById('minus');
    const plusButton = document.getElementById('plus');
    const addToCartButton = document.getElementById('add-to-cart-btn');
    const buyNowButton = document.querySelector('.btn.buy');


    // Funzione per estrarre il nome del bouquet dall'URL
    const getBouquetNameFromUrl = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('name'); // Questo estrarrà "PRIMAVERA" o "BOUQUET20TERRACOTTA"
    };

    // Funzione per popolare i dettagli del bouquet nella pagina HTML
    const populateBouquetDetails = (bouquet) => {
        currentBouquetData = bouquet;

        document.title = `Bouquet ${bouquet.name} - Volta la Carta`;
        if (bouquetNameElement) bouquetNameElement.textContent = bouquet.name;
        if (productPriceElement) productPriceElement.textContent = `€${parseFloat(bouquet.price).toFixed(2).replace('.', ',')}`;
        if (productDescriptionElement) productDescriptionElement.textContent = bouquet.description;

        const mainImageUrl = (typeof bouquet.image_url === 'string' && bouquet.image_url.trim() !== '') 
                             ? bouquet.image_url 
                             : 'https://placehold.co/400x400/cccccc/000000?text=Immagine+non+disponibile';

        if (mainBouquetImageElement) { // Imposta l'immagine principale del bouquet
            mainBouquetImageElement.src = mainImageUrl;
            mainBouquetImageElement.alt = `Bouquet ${bouquet.name}`;
        }
        
        if (bouquetThumbnailsContainer) bouquetThumbnailsContainer.innerHTML = ''; // Pulisce le miniature esistenti
        
        let parsedThumbnails = [];
        try {
            // Assumiamo che thumbnail_urls possa essere una stringa JSON o un array diretto.
            // Se è una stringa JSON, deve essere parsificata.
            parsedThumbnails = Array.isArray(bouquet.thumbnail_urls) 
                                ? bouquet.thumbnail_urls 
                                : (typeof bouquet.thumbnail_urls === 'string' && bouquet.thumbnail_urls.trim() !== '' 
                                   ? JSON.parse(bouquet.thumbnail_urls) 
                                   : []);
        } catch (e) {
            console.warn("Impossibile parsificare thumbnail_urls, userò un array vuoto.", e);
            parsedThumbnails = [];
        }
        
        const allImages = [mainImageUrl].concat(parsedThumbnails)
            .filter(url => typeof url === 'string' && url.trim() !== ''); // Filtra gli URL validi

        const uniqueImages = Array.from(new Set(allImages));

        uniqueImages.forEach((url, index) => { // Crea una miniatura per ogni URL unico
            const thumbImg = document.createElement('img');
            thumbImg.src = url;
            thumbImg.alt = `Miniatura ${bouquet.name} ${index + 1}`;
            thumbImg.classList.add('thumbnail');
            
            if (mainBouquetImageElement && url === mainBouquetImageElement.src) { // Se l'URL corrisponde all'immagine principale, aggiungi la classe 'active'
                thumbImg.classList.add('active');
            }

            thumbImg.addEventListener('click', () => {
                if (mainBouquetImageElement) mainBouquetImageElement.src = url;
                document.querySelectorAll('#bouquetThumbnails img').forEach(img => img.classList.remove('active'));
                thumbImg.classList.add('active');
            });

            if (bouquetThumbnailsContainer) bouquetThumbnailsContainer.appendChild(thumbImg); // Aggiunge la miniatura al contenitore
        });
    };

    // Funzione per recuperare i dati del bouquet dal server tramite API (AJAX)
    const fetchBouquetDetails = async (bouquetName) => {
        if (!bouquetName) {
            displayProductStatus('Errore', 'Nessun nome del bouquet specificato nell\'URL.', true);
            return null;
        }

        // === SCELTA DEFINITIVA: Nessun prefisso come 'PRODOTTO-B_' è necessario ===
        // Poiché la colonna 'name' nel DB contiene già il nome esatto come nell'URL (es. "PRIMAVERA", "BOUQUET TERRACOTTA")
        let bouquetIdentifierForApi = bouquetName;
        
        const apiEndpoint = `/api/bouquets/${encodeURIComponent(bouquetIdentifierForApi)}`;
        console.log(`Tentativo di fetch da: ${apiEndpoint}`); 
        
        try {
            const response = await fetch(apiEndpoint);
            if (!response.ok) {
                // Tenta di leggere l'errore dal server, se disponibile
                const errorData = await response.json().catch(() => ({ message: 'Errore generico durante la comunicazione con il server.' }));
                throw new Error(errorData.error || errorData.message || `Impossibile caricare il bouquet. Stato: ${response.status}`);
            }
            const data = await response.json();
            console.log('Dati ricevuti dal server per il bouquet:', data);

            if (data.success && data.bouquet) { 
                return data.bouquet; // Restituisce direttamente l'oggetto bouquet
            } else {
                displayProductStatus('Bouquet non trovato', data.error || 'Il bouquet richiesto non è disponibile o non esiste.', false);
                return null;
            }
        } catch (error) {
            console.error('Errore nel fetch dei dettagli del bouquet:', error);
            // Il messaggio di errore qui potrebbe includere il debugError se lo abiliti nel server.js
            displayProductStatus('Errore di Caricamento', error.message, true);
            return null;
        }
    };

    // Configura i controlli di quantità (+/- e input)
    if (minusButton && plusButton && counterInput) {
        minusButton.addEventListener('click', (e) => {
            e.preventDefault();
            let currentValue = parseInt(counterInput.value);
            if (isNaN(currentValue) || currentValue < 1) currentValue = 1;
            if (currentValue > 1) counterInput.value = currentValue - 1;
        });

        plusButton.addEventListener('click', (e) => {
            e.preventDefault();
            let currentValue = parseInt(counterInput.value);
            if (isNaN(currentValue) || currentValue < 1) currentValue = 1;
            counterInput.value = currentValue + 1;
        });

        counterInput.addEventListener('change', () => {
            let currentValue = parseInt(counterInput.value);
            if (isNaN(currentValue) || currentValue < 1) {
                counterInput.value = 1;
            }
        });
    }

    // Configura i bottoni "Aggiungi al Carrello" e "Acquista Subito"
    if (addToCartButton) {
        addToCartButton.addEventListener('click', () => {
            console.log('Click su AGGIUNGI AL CARRELLO'); 
            if (!currentBouquetData) {
                console.error('Dati del bouquet non caricati. currentBouquetData è null o undefined.'); 
                alert('Dati del bouquet non caricati. Impossibile aggiungere al carrello.');
                return;
            }

            const quantity = parseInt(counterInput.value);
            if (isNaN(quantity) || quantity <= 0) {
                console.error('Quantità non valida:', quantity); 
                alert('Seleziona una quantità valida.');
                return;
            }

            const itemToAdd = {
                id: currentBouquetData.id,
                name: currentBouquetData.name,
                price: parseFloat(currentBouquetData.price), 
                quantity: quantity,
                image: (mainBouquetImageElement && mainBouquetImageElement.src) || (typeof currentBouquetData.image_url === 'string' && currentBouquetData.image_url.trim() !== '' ? currentBouquetData.image_url : 'https://placehold.co/50x50/cccccc/000000?text=NoImg'),
                type: 'bouquet',
                color: null // Colore impostato a null in quanto non applicabile
            };

            console.log('Articolo da aggiungere al carrello:', itemToAdd); 

            if (typeof window.addToCart === 'function') {
                console.log('Chiamata a window.addToCart...'); 
                window.addToCart(itemToAdd);
                alert(`Aggiunto al carrello: ${quantity} x ${currentBouquetData.name}`);
                counterInput.value = 1;
            } else {
                console.error("Errore: La funzione 'addToCart' non è disponibile. Assicurati che 'cart_global.js' sia caricato correttamente e la funzione sia esposta globalmente."); 
                alert("Impossibile aggiungere al carrello: problema con il sistema del carrello.");
            }
        });
    }

    if (buyNowButton) {
        buyNowButton.addEventListener('click', async () => {
            console.log('Click su ACQUISTA SUBITO'); 
            if (!currentBouquetData) {
                console.error('Dati del bouquet non caricati. currentBouquetData è null o undefined.'); 
                alert('Dati del bouquet non caricati. Impossibile procedere con l\'acquisto.');
                return;
            }

            const quantity = parseInt(counterInput.value);
            if (isNaN(quantity) || quantity <= 0) {
                console.error('Quantità non valida:', quantity); 
                alert('Seleziona una quantità valida.');
                return;
            }

            const itemToBuy = { // Oggetto da passare alla funzione addToCart
                id: currentBouquetData.id,
                name: currentBouquetData.name,
                price: parseFloat(currentBouquetData.price),
                quantity: quantity,
                image: (mainBouquetImageElement && mainBouquetImageElement.src) || (typeof currentBouquetData.image_url === 'string' && currentBouquetData.image_url.trim() !== '' ? currentBouquetData.image_url : 'https://placehold.co/50x50/cccccc/000000?text=NoImg'),
                type: 'bouquet',
                color: null // Colore impostato a null in quanto non applicabile
            };
            
            console.log('Articolo da acquistare:', itemToBuy); 

            if (typeof window.addToCart === 'function') { 
                console.log('Chiamata a window.addToCart per Acquista Subito...'); 
                window.addToCart(itemToBuy);
                window.location.href = 'carrello.html'; 
            } else {
                console.error("Errore: La funzione 'addToCart' non è disponibile. Assicurati che 'cart_global.js' sia caricato correttamente e la funzione sia esposta globalmente."); 
                alert("Impossibile procedere con l'acquisto: problema con il sistema del carrello.");
            }
        });
    }

    // Logica di Avvio Effettiva della Pagina
    const bouquetName = getBouquetNameFromUrl();

    if (bouquetName) {
        const bouquetDetails = await fetchBouquetDetails(bouquetName);
        if (bouquetDetails) {
            populateBouquetDetails(bouquetDetails);
        }
    } else {
        displayProductStatus('Nessun Bouquet Specificato', 'Per visualizzare un bouquet, utilizza un link che specifichi il suo nome (es. ?name=PRIMAVERA).', false);
    }
});