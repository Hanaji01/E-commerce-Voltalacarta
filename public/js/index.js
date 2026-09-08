document.addEventListener('DOMContentLoaded', function() {
    // Gestione del bottone "Scopri tutti..." nella sezione galleria
    const scopriTuttiBtn = document.getElementById('scopri-tutti-btn');

    // Verifica che il bottone esista prima di aggiungere il listener
    if (scopriTuttiBtn) {
        scopriTuttiBtn.addEventListener('click', function() {
            // Reindirizza l'utente alla pagina che mostra tutti i fiori singoli
            window.location.href = 'fiorisingoli.html';
        });
    }
});