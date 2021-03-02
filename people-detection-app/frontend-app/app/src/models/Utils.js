    // date and time
    formatDate = (date) => {
        // Note: en-EN won't return in year-month-day order
        return date.toLocaleDateString('fr-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    formatTime = (date) => {
        // Note: en-EN won't return in without the AM/PM
        return date.toLocaleTimeString('it-IT');
    }