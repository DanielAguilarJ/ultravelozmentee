document.addEventListener('DOMContentLoaded', () => {
    // Initialize AOS
    AOS.init({
        duration: 800,
        once: true,
        offset: 100
    });

    // --- Glow Effect ---
    const glowCards = document.querySelectorAll('.glow-card');

    glowCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    // --- Scrollytelling Logic ---
    const triggerSection = document.getElementById('trigger-solution');
    const morphCard = document.getElementById('morphCard');

    if (triggerSection && morphCard) {
        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -20% 0px', // Trigger when element is in the middle 60% of viewport
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    morphCard.classList.add('active');
                } else {
                    // Optional: Remove active class if scrolling back up
                    // Check if we are above or below
                    const bounding = triggerSection.getBoundingClientRect();
                    if (bounding.top > 0) {
                        // We scrolled up past it
                        morphCard.classList.remove('active');
                    }
                }
            });
        }, observerOptions);

        observer.observe(triggerSection);
    }
});
