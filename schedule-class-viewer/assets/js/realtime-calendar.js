// Real-Time Calendar (from <script id="real-time-calendar">)
document.addEventListener('DOMContentLoaded', function() {
  
  function updateDateTime() {
    const now = new Date();
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    const timeOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    if (currentDateElement) {
      currentDateElement.textContent = now.toLocaleDateString('en-US', options);
    }
    if (currentTimeElement) {
      currentTimeElement.textContent = now.toLocaleTimeString('en-US', timeOptions);
    }
  }

  updateDateTime();
  setInterval(updateDateTime, 1000);
});

