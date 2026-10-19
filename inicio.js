document.addEventListener("DOMContentLoaded", () => {
    const userChip = document.getElementById("userChip");
    const loginButton = document.getElementById("btnLogin");
    const publishButton = document.getElementById("btnPublish");
    const mobileMenu = document.getElementById("mobileMenu");
    const nav = document.getElementById("clientNav");
    const user = localStorage.getItem("petconnect_usuario");
    const progress = document.getElementById("scrollProgress");
    const heroArt = document.querySelector(".hero-art");

    if (user) {
        userChip.textContent = `Hola, ${user} · Salir`;
        userChip.classList.remove("hidden");
        loginButton.classList.add("hidden");
        userChip.addEventListener("click", () => {
            localStorage.removeItem("petconnect_usuario");
            window.location.reload();
        });
    }

    loginButton.addEventListener("click", () => {
        window.location.href = "adopciones.html";
    });

    publishButton.addEventListener("click", () => {
        window.location.href = "adopciones.html";
    });

    mobileMenu.addEventListener("click", () => nav.classList.toggle("open"));
    window.addEventListener("scroll", () => {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        if (progress) progress.style.width = `${total > 0 ? (window.scrollY / total) * 100 : 0}%`;
    });

    if (heroArt) {
        heroArt.addEventListener("pointermove", (event) => {
            const bounds = heroArt.getBoundingClientRect();
            const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 10;
            const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 10;
            heroArt.style.transform = `rotate(2deg) translate(${x}px, ${y}px)`;
        });
        heroArt.addEventListener("pointerleave", () => {
            heroArt.style.transform = "rotate(2deg) translate(0, 0)";
        });
    }
    document.querySelectorAll(".reveal-section").forEach((section) => {
        new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) entry.target.classList.add("is-visible");
        }, { threshold: 0.2 }).observe(section);
    });
});
