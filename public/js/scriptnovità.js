document.addEventListener('DOMContentLoaded', () => {
    // Logica dello Slideshow per la sezione "Novità"
    let slideIndex = 0;
    const slideshowTrack = document.getElementById("slideshow-track");
    const slideshowContainer = document.getElementById("slideshow-container");
    const slides = document.querySelectorAll('#slideshow-track .slide');

    if (slideshowTrack && slideshowContainer && slides.length > 0) {
        const totalSlides = slides.length;

        function updateSlideshow() {
            const slideWidth = slideshowContainer.offsetWidth;
            const offset = -(slideIndex * slideWidth);
            slideshowTrack.style.transform = `translateX(${offset}px)`;
        }

        slideshowContainer.addEventListener("click", () => {
            slideIndex++;
            if (slideIndex >= totalSlides) {
                slideIndex = 0;
            }
            updateSlideshow();
        });

        window.addEventListener('resize', updateSlideshow);
        updateSlideshow(); // Inizializza lo slideshow
    }

    // Gestione della Data di Scadenza e Funzionalità "Aggiungi al Carrello"
    const addToCartButton = document.getElementById('add-to-cart');

    function checkDeadlineAndSetupCartButton() {
        const now = new Date();
        // Data di scadenza impostata al 9 maggio 2025
        const deadline = new Date(2025, 4, 9); // Mese 4 = Maggio

        if (addToCartButton) {
            if (now > deadline) {
                addToCartButton.disabled = true;
                addToCartButton.textContent = "SCADUTO!";
                addToCartButton.classList.add('disabled');
            } else {
                addToCartButton.disabled = false;
                addToCartButton.textContent = "Aggiungi al carrello";
                addToCartButton.classList.remove('disabled');

                addToCartButton.addEventListener('click', function() {
                    // Recupera i dettagli del prodotto. Adatta i selettori CSS se necessario.
                    const productName = document.querySelector('.novità_text p:first-of-type').textContent.trim();
                    const productPriceText = document.querySelector('.novità_text p:last-of-type').textContent;
                    const productPrice = parseFloat(productPriceText.replace('€', '').replace(',', '.'));
                    const productImage = document.querySelector('#slideshow-track .slide').src;

                    if (!productName || isNaN(productPrice) || productPrice <= 0 || !productImage) {
                        alert("Impossibile aggiungere il prodotto al carrello: dettagli mancanti o non validi.");
                        return;
                    }

                    const itemToAdd = {
                        id: 'novita-bouquet-mamma', // ID univoco del prodotto
                        name: productName,
                        price: productPrice,
                        quantity: 1,
                        image: productImage,
                        type: 'bouquet-novita',
                        color: null
                    };

                    if (typeof window.addToCart === 'function') {
                        window.addToCart(itemToAdd);
                        alert(`"${productName}" aggiunto al carrello!`);
                    } else {
                        console.error("La funzione 'addToCart' non è disponibile.");
                    }
                });
            }
        }
    }

    checkDeadlineAndSetupCartButton(); // Esegue la funzione all'avvio
});