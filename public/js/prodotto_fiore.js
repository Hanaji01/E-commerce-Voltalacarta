// public/js/prodotto_fiore.js

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Script prodotto_fiore.js caricato e DOM pronto.');

    // Recupero diretto del nome del fiore dall'URL (inlined)
    const urlParams = new URLSearchParams(window.location.search);
    const flowerName = urlParams.get('name');

    // Aggiorna il contatore del carrello nella navbar all'avvio della pagina
    if (typeof window.updateCartCount === 'function') {
        window.updateCartCount();
    } else {
        console.warn("La funzione 'updateCartCount' non è disponibile. Assicurati che 'cart_global.js' sia caricato correttamente.");
    }

    // Recupero di tutti gli elementi DOM necessari una sola volta
    const pageTitleElement = document.getElementById('pageTitle');
    const mainProductImage = document.getElementById('mainFlowerImage');
    const flowerNameElement = document.getElementById('flowerName');
    const productPriceElement = document.getElementById('productPrice');
    const productDescriptionElement = document.getElementById('productDescription');
    const colorsContainer = document.getElementById('colorGrid');
    const selectedColorInput = document.getElementById('selected-color');
    const colorOptionsSection = document.querySelector('.color-options');
    const thumbnailContainer = document.getElementById('flowerThumbnails');
    const quantityInput = document.getElementById('counter');
    const decreaseBtn = document.getElementById('minus');
    const increaseBtn = document.getElementById('plus');
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    const buyNowBtn = document.getElementById('buy-now-btn');
    const productGallery = document.querySelector('.product-gallery');
    const counterContainer = document.querySelector('.counter-container');


    let currentProductData = null; // Variabile per memorizzare i dati del fiore attualmente visualizzato
    let currentMainImageSrc = ''; // Variabile per memorizzare l'URL dell'immagine principale visualizzata

    // Funzione per recuperare i dettagli del prodotto dal server
    const fetchProductDetails = async (name) => {
        if (!name) {
            console.error('Nome del fiore non specificato nell\'URL.');
            return null;
        }

        try {
            // L'endpoint deve essere allineato con quello in server.js per i fiori singoli
            const response = await fetch(`/api/prodotto-fiore?name=${encodeURIComponent(name)}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Errore generico durante la comunicazione con il server.' }));
                throw new Error(errorData.error || `Impossibile caricare il fiore. Stato: ${response.status}`);
            }
            const data = await response.json();
            console.log('Dati ricevuti dal server per il fiore:', data); // Log per debug

            // Assicurati che 'fiori' sia un array e contenga almeno un elemento
            // Questa logica si aspetta che il backend ritorni { success: true, fiori: [ {...} ] }
            if (data.success && Array.isArray(data.fiori) && data.fiori.length > 0) {
                return data.fiori[0]; // Restituisce il primo oggetto fiore
            } else {
                console.error('Risposta del server non valida o fiore non trovato nel formato atteso:', data);
                return null;
            }
        } catch (error) {
            console.error('Errore nel recupero dei dettagli del prodotto:', error);
            return null;
        }
    };

    // Funzione per visualizzare un messaggio di stato (es. errore o informazione)
    const displayProductStatus = (title, message, isError = false) => {
        // Aggiorna il titolo della pagina
        if (pageTitleElement) pageTitleElement.textContent = title;
        // Inserisce il messaggio nel contentore principale, nascondendo gli altri elementi
        if (productGallery) productGallery.style.display = 'none';
        if (colorsContainer) colorsContainer.style.display = 'none';
        if (counterContainer) counterContainer.style.display = 'none';
        if (addToCartBtn) addToCartBtn.style.display = 'none';
        if (buyNowBtn) buyNowBtn.style.display = 'none';
        if (flowerNameElement) flowerNameElement.textContent = title;
        if (productPriceElement) productPriceElement.textContent = '';
        if (productDescriptionElement) productDescriptionElement.textContent = message;

        const productDetailsContainer = document.querySelector('.product-details');
        if (productDetailsContainer) {
            productDetailsContainer.innerHTML = `
                <div style="text-align: center; padding: 50px;">
                    <h4 style="color: ${isError ? 'red' : 'inherit'};">${title}</h4>
                    <p>${message}</p>
                    <p><a href="fiori.html">Torna alla galleria dei fiori</a></p>
                </div>
            `;
        }
    };

    // Funzione per popolare i dettagli del prodotto sulla pagina
    const populateProductDetails = (fiore) => {
        currentProductData = fiore;

        if (pageTitleElement) pageTitleElement.textContent = `Dettaglio Fiore: ${fiore.name}`;
        if (flowerNameElement) flowerNameElement.textContent = fiore.name;

        // Fallback per image_url
        const defaultMainImageUrl = (typeof fiore.image_url === 'string' && fiore.image_url.trim() !== '')
                                     ? fiore.image_url
                                     : 'https://placehold.co/400x400/cccccc/000000?text=Immagine+non+disponibile';

        if (mainProductImage) {
            mainProductImage.src = defaultMainImageUrl;
            mainProductImage.alt = fiore.name;
            currentMainImageSrc = defaultMainImageUrl; // Inizializza con l'immagine principale di default
        }

        // Fallback per il prezzo
        const price = parseFloat(fiore.price);
        if (productPriceElement) productPriceElement.textContent = `€ ${isNaN(price) ? 'N/A' : price.toFixed(2).replace('.', ',')}`;
        if (productDescriptionElement) productDescriptionElement.textContent = fiore.description;

        // Gestione dei colori disponibili
        if (colorsContainer) {
            colorsContainer.innerHTML = '';
            let availableColors = fiore.available_colors;
            if (typeof availableColors === 'string') {
                try {
                    availableColors = JSON.parse(availableColors);
                } catch (e) {
                    console.error('Errore nel parsing di available_colors (client-side):', e, 'Valore:', fiore.available_colors);
                    availableColors = [];
                }
            }
            if (!Array.isArray(availableColors)) {
                availableColors = [];
            }

            if (availableColors.length > 0) {
                if (colorOptionsSection) colorOptionsSection.style.display = 'block';
                let firstColorName = null;
                availableColors.forEach(color => {
                    const colorSwatch = document.createElement('div');
                    colorSwatch.classList.add('color-swatch');
                    colorSwatch.style.backgroundColor = color.hex_code;
                    colorSwatch.title = color.name;
                    colorSwatch.dataset.colorName = color.name;

                    const colorImageUrl = (color.image_url && typeof color.image_url === 'string' && color.image_url.trim() !== '') ? color.image_url : null;
                    if (colorImageUrl) {
                        colorSwatch.dataset.imageUrl = colorImageUrl;
                    }

                    if (!firstColorName) firstColorName = color.name; // Prende il primo colore per la selezione iniziale

                    colorSwatch.addEventListener('click', () => {
                        document.querySelectorAll('.color-swatch').forEach(swatch => {
                            swatch.classList.remove('selected');
                        });
                        colorSwatch.classList.add('selected');
                        if (selectedColorInput) selectedColorInput.value = color.name;

                        if (mainProductImage && colorSwatch.dataset.imageUrl) {
                            mainProductImage.src = colorSwatch.dataset.imageUrl;
                            currentMainImageSrc = colorSwatch.dataset.imageUrl;
                        } else if (mainProductImage) {
                            mainProductImage.src = defaultMainImageUrl;
                            currentMainImageSrc = defaultMainImageUrl;
                        }
                        console.log(`Colore selezionato: ${color.name}, Immagine principale aggiornata: ${currentMainImageSrc}`);
                    });
                    colorsContainer.appendChild(colorSwatch);
                });
                if (firstColorName) {
                    const defaultColorSwatch = colorsContainer.querySelector(`[data-color-name="${firstColorName}"]`);
                    if (defaultColorSwatch) defaultColorSwatch.click(); // Simula il click per selezionare il primo colore
                }
            } else {
                if (colorOptionsSection) colorOptionsSection.style.display = 'none';
                console.warn("Nessun colore disponibile per questo fiore o struttura dati dei colori non valida.");
            }
        }

        // Gestione delle miniature
        if (thumbnailContainer) {
            thumbnailContainer.innerHTML = '';
            let allThumbnails = fiore.thumbnail_urls;
            if (typeof allThumbnails === 'string') {
                try {
                    allThumbnails = JSON.parse(allThumbnails);
                } catch (e) {
                    console.error('Errore nel parsing di thumbnail_urls (client-side):', e, 'Valore:', fiore.thumbnail_urls);
                    allThumbnails = [];
                }
            }
            if (!Array.isArray(allThumbnails)) {
                allThumbnails = [];
            }

            const imagesToDisplay = [defaultMainImageUrl].concat(allThumbnails.filter(url => typeof url === 'string' && url.trim() !== ''));
            const uniqueImages = Array.from(new Set(imagesToDisplay));


            uniqueImages.forEach((url, index) => { // Crea una miniatura per ogni URL unico
                const img = document.createElement('img');
                img.src = url;
                img.alt = fiore.name + ' thumbnail ' + (index + 1); // Aggiungi un alt descrittivo
                img.classList.add('thumbnail-img'); // Aggiungi una classe per lo stile delle miniature
                if (url === mainProductImage.src) {
                    img.classList.add('active');
                }

                img.addEventListener('click', () => {
                    if (mainProductImage) mainProductImage.src = url;
                    currentMainImageSrc = url;

                    document.querySelectorAll('#flowerThumbnails img').forEach(tImg => {
                        tImg.classList.remove('active');
                    });
                    img.classList.add('active');
                });
                thumbnailContainer.appendChild(img);
            });
        }

        // Configura i controlli di quantità (+/- e input)
        if (quantityInput && decreaseBtn && increaseBtn) {
            decreaseBtn.addEventListener('click', () => {
                let currentVal = parseInt(quantityInput.value);
                if (currentVal > 1) {
                    quantityInput.value = currentVal - 1;
                }
            });

            increaseBtn.addEventListener('click', () => {
                let currentVal = parseInt(quantityInput.value);
                quantityInput.value = currentVal + 1;
            });
            quantityInput.addEventListener('change', () => {
                let currentVal = parseInt(quantityInput.value);
                if (isNaN(currentVal) || currentVal < 1) {
                    quantityInput.value = 1;
                }
            });
        }

        // Configura i bottoni "Aggiungi al Carrello" e "Acquista Subito"
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', () => {
                if (!currentProductData) {
                    alert('Impossibile aggiungere al carrello: dati prodotto non caricati.');
                    return;
                }

                const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
                const selectedColor = selectedColorInput ? selectedColorInput.value : null;

                const itemToAdd = {
                    id: currentProductData.id,
                    name: currentProductData.name,
                    price: parseFloat(currentProductData.price),
                    quantity: quantity,
                    image: currentMainImageSrc,
                    type: 'single-flower',
                    color: selectedColor
                };

                console.log('Articolo da aggiungere al carrello:', itemToAdd);

                if (typeof window.addToCart === 'function') {
                    window.addToCart(itemToAdd);
                    alert(`${quantity} x ${currentProductData.name} ${selectedColor ? '(' + selectedColor + ')' : ''} aggiunti al carrello!`);
                } else {
                    console.error("Errore: la funzione addToCart non è disponibile. Assicurati che 'cart_global.js' sia caricato prima di 'prodotto_fiore.js'.");
                }
            });
        }

        if (buyNowBtn) {
            buyNowBtn.addEventListener('click', () => {
                if (!currentProductData) {
                    alert('Impossibile acquistare: dati prodotto non caricati.');
                    return;
                }

                const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
                const selectedColor = selectedColorInput ? selectedColorInput.value : null;


                const itemToBuy = {
                    id: currentProductData.id,
                    name: currentProductData.name,
                    price: parseFloat(currentProductData.price),
                    quantity: quantity,
                    image: currentMainImageSrc,
                    type: 'single-flower',
                    color: selectedColor
                };

                // Si assume che 'buyNow' chiami internamente 'addToCart' e poi reindirizzi
                if (window.buyNow) { // Se hai una funzione buyNow specifica nel tuo cart_global.js
                    window.buyNow(itemToBuy);
                } else { // Altrimenti, usa addToCart e reindirizza manualmente
                    if (typeof window.addToCart === 'function') {
                        window.addToCart(itemToBuy);
                        window.location.href = 'carrello.html';
                    } else {
                        alert('Funzione acquista subito non disponibile.');
                    }
                }
            });
        }
    };

    // --- Inizializzazione della pagina del prodotto ---
    if (flowerName) {
        const productDetails = await fetchProductDetails(flowerName);
        if (productDetails) {
            populateProductDetails(productDetails);
        } else {
            // Se i dettagli del prodotto non vengono trovati, visualizza un messaggio di stato
            displayProductStatus('Fiore non trovato', 'Siamo spiacenti, il fiore richiesto non è disponibile o non esiste.', true);
        }
    } else {
        // Se nessun nome di fiore è presente nell'URL, visualizza un messaggio informativo
        displayProductStatus('Nessun Fiore Specificato', 'Per visualizzare un fiore, utilizza un link che specifichi il suo nome (es. ?name=ROSA).', false);
    }
});