// public/scriptform.js

document.addEventListener('DOMContentLoaded', function() { // Preferibile a window.onload
    // Prende il form tramite il suo ID 'eventoForm'
    const form = document.getElementById('eventoForm'); // Corretto: 'eventoForm' e non 'form'
    // Prende l'elemento dove mostreremo la risposta (il <p id="risposta"></p>)
    const rispostaElement = document.getElementById('risposta');

    if (form) { // Assicurati che il form sia stato trovato
        form.addEventListener('submit', async (event) => {
            event.preventDefault(); // Previene il submit normale del form

            const data = {
                // Corretto: 'document.' prima di getElementById e nomi degli ID corretti (camelCase)
                tipoEvento: document.getElementById('tipoEvento').value,
                dataPrevista: document.getElementById('dataPrevista').value,
                numeroPezzi: document.getElementById('numeroPezzi').value,
                ideePreferenze: document.getElementById('ideePreferenze').value,
                nome: document.getElementById('nome').value,
                telefono: document.getElementById('telefono').value,
                email: document.getElementById('email').value
            };

            // Log per debug: mostra i dati che verranno inviati
            console.log('Dati del form da inviare:', data);

            try {
                // Invia i dati all'endpoint API corretto
                const response = await fetch('/api/richieste-personalizzate', { // Corretto: '/api/richieste-personalizzate'
                    method: 'POST', // Metodo HTTP corretto
                    headers: {
                        'Content-Type': 'application/json' // Dichiara che stai inviando JSON
                    },
                    body: JSON.stringify(data) // Converte l'oggetto dati in una stringa JSON
                });

                // Controlla se la risposta del server è OK (status 200-299)
                if (!response.ok) { // Corretto: 'response.ok' (era 'res.ok' o 'response.ok')
                    // Leggi il messaggio di errore dal server se presente
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Errore nella richiesta al server: ' + response.statusText);
                }

                const result = await response.json(); // Parsa la risposta JSON dal server

                // Controlla la proprietà 'success' nella risposta del server
                if (result.success) {
                    rispostaElement.textContent = result.message || 'Richiesta inviata con successo!'; // Corretto: 'result.message'
                    rispostaElement.style.color = 'green';
                    form.reset(); // Resetta tutti i campi del form
                } else {
                    rispostaElement.textContent = 'Errore nell\'invio della richiesta: ' + (result.message || 'Errore sconosciuto.');
                    rispostaElement.style.color = 'red';
                }

            } catch (error) {
                console.error('Si è verificato un errore durante l\'invio del form:', error);
                rispostaElement.textContent = 'Si è verificato un errore: ' + error.message;
                rispostaElement.style.color = 'red';
                //alert('Si è verificato un errore: ' + error.message); // Rimosso alert per migliorare UX
            }
        });
    } else {
        console.error("Errore: Form con ID 'eventoForm' non trovato. Assicurati che lo script sia caricato dopo il form.");
    }
});